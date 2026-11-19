import { access, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const majors = ['computer', 'business', 'health', 'engineering', 'humanities'];
const levels = ['basic', 'intermediate', 'advanced'];
const source = (name) => new URL(`../content/${name}.json`, import.meta.url);
const target = new URL('../src/content.generated.js', import.meta.url);

async function readRows(name) {
  const rows = JSON.parse((await readFile(source(name), 'utf8')).replace(/^\uFEFF/, ''));
  if (!Array.isArray(rows) || !rows.length) throw new Error(`${name}.json: 목록에 항목이 있어야 합니다.`);
  return rows;
}

function requiredText(row, keys, label) {
  for (const key of keys) {
    if (typeof row?.[key] !== 'string' || !row[key].trim() || row[key] !== row[key].trim() || /[<>\r\n]/.test(row[key])) {
      throw new Error(`${label}: ${key} 항목은 앞뒤 공백과 HTML 태그가 없는 한 줄 문자열이어야 합니다.`);
    }
  }
}

export async function generateContent({ checkAudio = false } = {}) {
  const vocabulary = await readRows('vocabulary');
  const smallTalk = await readRows('small-talk');
  const ids = new Set();
  const wordsByMajor = new Set();
  for (const [index, row] of vocabulary.entries()) {
    const label = `vocabulary.json #${index + 1}`;
    requiredText(row, ['id', 'word', 'meaning', 'example', 'translation', 'major', 'difficulty'], label);
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(row.id) || ids.has(row.id)) throw new Error(`${label}: ID가 잘못되었거나 중복됩니다.`);
    if (!/^[a-z]+$/i.test(row.word)) throw new Error(`${label}: word는 영문 알파벳 단어 하나여야 합니다.`);
    if (!majors.includes(row.major) || !levels.includes(row.difficulty)) throw new Error(`${label}: 전공 또는 난이도 코드가 올바르지 않습니다.`);
    const wordKey = `${row.major}:${row.word.toLowerCase()}`;
    if (wordsByMajor.has(wordKey)) throw new Error(`${label}: 같은 전공에 단어가 중복됩니다.`);
    ids.add(row.id);
    wordsByMajor.add(wordKey);
  }
  const talksByLevel = Object.fromEntries(levels.map((level) => [level, []]));
  for (const [index, row] of smallTalk.entries()) {
    const label = `small-talk.json #${index + 1}`;
    requiredText(row, ['difficulty', 'english', 'korean', 'context'], label);
    if (!levels.includes(row.difficulty)) throw new Error(`${label}: 난이도 코드가 올바르지 않습니다.`);
    const entries = talksByLevel[row.difficulty];
    if (entries.some(([english]) => english === row.english)) throw new Error(`${label}: 문장이 중복됩니다.`);
    entries.push([row.english, row.korean, row.context]);
  }
  for (const level of levels) {
    if (!talksByLevel[level].length) throw new Error(`small-talk.json: ${level} 문장이 하나 이상 필요합니다.`);
  }

  if (checkAudio) {
    const { speechClips } = await import('../src/speech-clips.js');
    const texts = new Map(vocabulary.flatMap(({ word, example }) => [[word, 1], [example, 1]]));
    smallTalk.forEach(({ english }) => texts.set(english, english.split(/\s+/).length));
    const fileChecks = await Promise.all([...texts].map(async ([text, cueCount]) => {
      const clip = Object.hasOwn(speechClips, text) ? speechClips[text] : null;
      if (!clip || clip[1].length < cueCount) return text;
      try { await access(new URL(`../src/audio/${clip[0]}`, import.meta.url)); }
      catch { return text; }
      return null;
    }));
    const missing = fileChecks.filter(Boolean);
    if (missing.length) throw new Error(`발음 파일을 생성해야 합니다. python scripts/generate-speech.py\n${missing.slice(0, 8).join('\n')}`);
  }

  const output = '// Generated from content/*.json. Run npm run content to update.\n' +
    `export const vocabulary = ${JSON.stringify(vocabulary, null, 2)};\n` +
    `export const smallTalks = ${JSON.stringify(talksByLevel, null, 2)};\n`;
  if (await readFile(target, 'utf8').catch(() => null) !== output) await writeFile(target, output);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try { await generateContent({ checkAudio: process.argv.includes('--check-audio') }); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { validateContent } from './content.mjs';

const vocabularyFields = ['id', 'word', 'meaning', 'example', 'translation', 'major', 'difficulty'];
const phraseFields = ['difficulty', 'english', 'korean', 'context'];

async function fetchRows({ base, key, release, request }, table, fields) {
  const rows = [];
  let lastPosition = -1;
  for (;;) {
    const url = new URL(`/rest/v1/${table}`, base);
    url.searchParams.set('select', ['position', ...fields].join(','));
    url.searchParams.set('release', `eq.${release}`);
    url.searchParams.set('position', `gt.${lastPosition}`);
    url.searchParams.set('order', 'position.asc');
    url.searchParams.set('limit', '500');
    const headers = { apikey: key };
    if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
    const response = await request(url, { headers, signal: AbortSignal.timeout(15000), redirect: 'error' });
    if (!response.ok) throw new Error(`${table}: 데이터 요청 실패 (${response.status})`);
    const page = await response.json();
    if (!Array.isArray(page)) throw new Error(`${table}: 목록 응답이 필요합니다.`);
    if (!page.length) return rows;
    for (const row of page) {
      if (!Number.isSafeInteger(row?.position) || row.position <= lastPosition) {
        throw new Error(`${table}: position이 없거나 중복되었습니다.`);
      }
      lastPosition = row.position;
      rows.push(Object.fromEntries(fields.map((field) => [field, row[field]])));
    }
  }
}

export async function readCatalog({ url, key, release, request = fetch }) {
  if (!url || !key || !/^[a-zA-Z0-9_-]+$/.test(release || '')) {
    throw new Error('SUPABASE_URL, SUPABASE_SECRET_KEY, CONTENT_RELEASE 환경 변수를 설정하세요.');
  }
  const base = new URL(url);
  if (base.protocol !== 'https:' || base.username || base.password) throw new Error('SUPABASE_URL에는 HTTPS 프로젝트 주소가 필요합니다.');
  const config = { base, key, release, request };
  const [vocabulary, smallTalk] = await Promise.all([
    fetchRows(config, 'smalltalk_vocabulary', vocabularyFields),
    fetchRows(config, 'smalltalk_phrases', phraseFields),
  ]);
  validateContent(vocabulary, smallTalk);
  return { vocabulary, smallTalk };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const { SUPABASE_URL: url, SUPABASE_SECRET_KEY: key, CONTENT_RELEASE: release } = process.env;
    const { vocabulary, smallTalk } = await readCatalog({ url, key, release });
    if (!process.argv.includes('--check')) {
      await Promise.all([['vocabulary', vocabulary], ['small-talk', smallTalk]].map(([name, rows]) =>
        writeFile(new URL(`../content/${name}.json`, import.meta.url), JSON.stringify(rows, null, 2) + '\n')));
    }
    console.log(`${release}: 단어 ${vocabulary.length}개, 스몰토크 ${smallTalk.length}개 확인`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

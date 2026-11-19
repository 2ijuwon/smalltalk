import { vocabulary } from './content.generated.js';
export { vocabulary, smallTalks } from './content.generated.js';

export const majorLabels = {
  computer: '컴퓨터공학', business: '경영·경제', health: '간호·보건',
  engineering: '기계·전자', humanities: '인문·사회',
};

export const difficultyLabels = {
  basic: '기초 · 가볍게 시작', intermediate: '중급 · 한 단계 더', advanced: '고급 · 실전처럼',
};

export const lessonSize = 5;
export const stageCount = Math.ceil(vocabulary.length / lessonSize);

export function itemsForMajor(major) {
  const items = vocabulary.filter((item) => item.major === major);
  return items.length ? items : vocabulary.filter((item) => item.major === 'computer');
}

export function stageWords(major, stage) {
  const order = { basic: 0, intermediate: 1, advanced: 2 };
  const sort = (a, b) => order[a.difficulty] - order[b.difficulty] || a.word.length - b.word.length;
  const own = itemsForMajor(major).sort(sort);
  const rest = vocabulary.filter((item) => !own.includes(item)).sort(sort);
  return [...own, ...rest].slice((stage - 1) * lessonSize, stage * lessonSize).map((item) => item.id);
}

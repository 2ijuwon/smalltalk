import { randomInt } from './ui.js';

export function buildWordGrid(items, rules, retry = 0) {
  const words = items.map((item) => item.word.toUpperCase().replace(/[^A-Z]/g, ''));
  const size = Math.max(rules.gridSize, ...words.map((word) => word.length));
  const cells = Array(size * size).fill('');
  const directions = [[0,1],[1,0],[1,1],[-1,1],[0,-1],[-1,0],[-1,-1],[1,-1]];
  const placements = [];
  let failed = false;
  words.forEach((word, wordIndex) => {
    if (failed) return;
    let placed = false;
    for (let attempt = 0; attempt < 240 && !placed; attempt += 1) {
      const [dr, dc] = directions[randomInt(directions.length)];
      const rowMin = dr < 0 ? word.length - 1 : 0;
      const rowMax = dr > 0 ? size - word.length : size - 1;
      const colMin = dc < 0 ? word.length - 1 : 0;
      const colMax = dc > 0 ? size - word.length : size - 1;
      if (rowMax < rowMin || colMax < colMin) continue;
      const row = rowMin + randomInt(rowMax - rowMin + 1);
      const col = colMin + randomInt(colMax - colMin + 1);
      const indices = [...word].map((_, index) => (row + dr * index) * size + col + dc * index);
      if (indices.every((position, index) => !cells[position] || cells[position] === word[index])) {
        indices.forEach((position, index) => { cells[position] = word[index]; });
        placements.push({ id: items[wordIndex].id, word, indices });
        placed = true;
      }
    }
    if (!placed) failed = true;
  });
  if (failed) {
    if (retry < 8) return buildWordGrid(items, rules, retry + 1);
    throw new Error('단어 퍼즐을 배치하지 못했어요.');
  }
  cells.forEach((letter, index) => { if (!letter) cells[index] = String.fromCharCode(65 + randomInt(26)); });
  return { size, cells, placements };
}

export function straightPath(start, end, size) {
  const sr = Math.floor(start / size), sc = start % size, er = Math.floor(end / size), ec = end % size;
  const rowDiff = er - sr, colDiff = ec - sc;
  if (rowDiff && colDiff && Math.abs(rowDiff) !== Math.abs(colDiff)) return [start];
  const dr = Math.sign(rowDiff), dc = Math.sign(colDiff);
  const length = Math.max(Math.abs(rowDiff), Math.abs(colDiff)) + 1;
  return Array.from({ length }, (_, index) => (sr + dr * index) * size + sc + dc * index);
}

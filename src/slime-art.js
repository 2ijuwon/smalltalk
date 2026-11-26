export const slimeColors = {
  o: '#173d64', l: '#bde7ff', k: '#101b2a', m: '#afb3ec',
};

const widths = [0, 6, 10, 12, 14, 14, 16, 16, 16, 16, 14, 14, 12, 10, 6, 0];
const eyes = [[5, 6], [10, 6], [5, 7], [10, 7]];
const blink = [[5, 7], [6, 7], [9, 7], [10, 7]];
const smile = [[6, 9], [8, 9], [7, 10]];
const bossMouth = [[6, 10], [7, 9], [8, 9], [9, 10]];
const dotMouth = [[7, 9], [8, 9], [7, 10], [8, 10]];

function inBody(x, y) {
  const edge = (16 - (widths[y] || 0)) / 2;
  return x >= edge && x < 16 - edge;
}

export function slimeRows(name = 'mascot', frame = 0) {
  const boss = name === 'boss';
  const mouth = name === 'surprised' ? dotMouth : boss && frame !== 2 ? bossMouth : frame === 1 ? [[7, 10], [8, 10]] : smile;
  const face = [...(frame ? blink : eyes), ...mouth];
  return widths.map((_, y) => Array.from({ length: 16 }, (_, x) => {
    if (!inBody(x, y)) return '.';
    if (face.some(([px, py]) => x === px && y === py)) return 'k';
    const edge = !inBody(x - 1, y) || !inBody(x + 1, y) || !inBody(x, y - 1) || !inBody(x, y + 1);
    if (edge) return 'o';
    return boss ? 'm' : 'l';
  }).join(''));
}

export function slimePaths(rows, step = 1, offsetX = 0, offsetY = offsetX) {
  const shapes = new Map();
  rows.forEach((row, y) => {
    for (const match of row.matchAll(/(.)\1*/g)) {
      const cell = match[1];
      if (!slimeColors[cell]) continue;
      const length = match[0].length * step;
      const part = `M${offsetX + match.index * step} ${offsetY + y * step}h${length}v${step}h-${length}z`;
      shapes.set(cell, (shapes.get(cell) || '') + part);
    }
  });
  return [...shapes];
}

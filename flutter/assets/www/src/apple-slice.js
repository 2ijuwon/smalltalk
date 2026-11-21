export const sliceDuration = 60_000;
export function sliceBonusTime(elapsedMs) {
  if (elapsedMs < 60_000) return 5000;
  if (elapsedMs < 120_000) return 3000;
  if (elapsedMs < 180_000) return 2000;
  return 1000;
}

export function sliceAnswerCount(elapsedMs, roll) {
  if (elapsedMs >= 120_000) return roll < .18 ? 3 : roll < .65 ? 2 : 1;
  if (elapsedMs >= 60_000) return roll < .4 ? 2 : 1;
  return roll < .18 ? 2 : 1;
}

export function sliceBladeColor(combo) {
  const blue = [74, 190, 255], gold = [255, 204, 57], red = [255, 59, 39];
  const [from, to, progress] = combo <= 10 ? [blue, gold, combo / 10] : [gold, red, Math.min(1, (combo - 10) / 8)];
  return `rgb(${from.map((channel, index) => Math.round(channel + (to[index] - channel) * progress)).join(', ')})`;
}
export const sliceFlight = (round) => Math.max(2100, 3600 - (round - 1) * 105);

const sliceLanes = [50, 18, 82, 50, 18, 82, 50, 18, 82];
const sliceDelays = [0, .095, .12, .25, .285, .39, .49, .57, .64];
const sliceHeights = [91, 89, 80, 68, 64, 76, 87, 73, 60];
export const sliceFlightEnd = (index) => 1 + sliceDelays[index];

export function sliceDifficulty(elapsedMs) {
  if (elapsedMs >= 180_000) return { slots: 9, bombChance: .92, maxBombs: 3, dualChance: .55 };
  if (elapsedMs >= 120_000) return { slots: 8, bombChance: .78, maxBombs: 3, dualChance: .4 };
  if (elapsedMs >= 60_000) return { slots: 7, bombChance: .6, maxBombs: 2, dualChance: .25 };
  if (elapsedMs >= 30_000) return { slots: 6, bombChance: .45, maxBombs: 2, dualChance: 0 };
  return { slots: 5, bombChance: .28, maxBombs: 1, dualChance: 0 };
}

export function slicePosition(round, index, progress) {
  const flight = progress - sliceDelays[index];
  if (flight <= 0 || flight >= 1) return null;
  const lane = round % 2 ? sliceLanes[index] : 100 - sliceLanes[index];
  const drift = (index % 2 ? -1 : 1) * Math.sin(Math.PI * flight) * 3;
  const height = sliceHeights[index];
  return { x: lane + drift, y: 110 - height * 4 * flight * (1 - flight) };
}

export function sliceBonusPosition(progress) {
  if (progress <= 0 || progress >= 1) return null;
  const rise = Math.min(1, progress / .14);
  const fall = Math.max(0, (progress - .86) / .14);
  return { x: 50 + Math.sin(progress * Math.PI * 2) * 13, y: 108 - 62 * rise + 66 * fall };
}

export function sliceOutcome(fruit, targets) {
  if (fruit.bomb) return 'bomb';
  return targets.some(target => fruit.id === target.id) ? 'correct' : 'wrong';
}

export function sliceCutShape(rect, from, to) {
  const size = rect.width;
  const points = [[0, 0], [100, 0], [100, 100], [0, 100]];
  if (size <= 0) return null;
  const x = (from.x - rect.left) / size * 100;
  const y = (from.y - rect.top) / size * 100;
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const nx = -Math.sin(angle), ny = Math.cos(angle);
  const offset = nx * (x - 50) + ny * (y - 50);
  const distance = ([px, py]) => nx * (px - 50) + ny * (py - 50) - offset;
  const halves = [-1, 1].map(side => {
    const polygon = [];
    for (let i = 0; i < points.length; i += 1) {
      const start = points[i], end = points[(i + 1) % points.length];
      const a = distance(start), b = distance(end);
      if (a * side >= 0) polygon.push(start);
      if (a * b < 0) {
        const t = a / (a - b);
        polygon.push(start.map((value, axis) => value + (end[axis] - value) * t));
      }
    }
    return `polygon(${polygon.map(point => point.map(value => `${value.toFixed(2)}%`).join(' ')).join(', ')})`;
  });
  return { halves, x: 50 + nx * offset, y: 50 + ny * offset, angle: angle * 180 / Math.PI, nx, ny };
}

export function sliceBodyHit(from, to, rect, field) {
  const radiusX = (rect.right - rect.left) / 2;
  const radiusY = (rect.bottom - rect.top) / 2;
  if (radiusX <= 0 || radiusY <= 0) return null;
  const fieldEntry = swipeHit(from, to, field);
  const reverseEntry = swipeHit(to, from, field);
  if (fieldEntry === null || reverseEntry === null) return null;
  const x = (from.x - rect.left) / radiusX - 1;
  const y = (from.y - rect.top) / radiusY - 1;
  const dx = (to.x - from.x) / radiusX;
  const dy = (to.y - from.y) / radiusY;
  const a = dx * dx + dy * dy;
  const b = x * dx + y * dy;
  const c = x * x + y * y - 1;
  if (!a) return c <= 0 ? 0 : null;
  const discriminant = b * b - a * c;
  if (discriminant < 0) return null;
  const root = Math.sqrt(discriminant);
  const enter = Math.max(fieldEntry, (-b - root) / a);
  const exit = Math.min(1 - reverseEntry, (-b + root) / a);
  return enter <= exit ? enter : null;
}

export function sliceReward(combo) {
  const critical = combo > 0 && combo % 3 === 0;
  return { critical, points: 100 + Math.min(combo - 1, 8) * 25 + (critical ? 150 : 0) };
}

// Return where the swipe enters the rectangle, so the nearest apple wins.
export function swipeHit(from, to, rect) {
  let enter = 0;
  let exit = 1;
  for (const [start, end, low, high] of [
    [from.x, to.x, rect.left, rect.right],
    [from.y, to.y, rect.top, rect.bottom],
  ]) {
    const distance = end - start;
    if (!distance) {
      if (start < low || start > high) return null;
      continue;
    }
    const first = (low - start) / distance;
    const last = (high - start) / distance;
    enter = Math.max(enter, Math.min(first, last));
    exit = Math.min(exit, Math.max(first, last));
    if (enter > exit) return null;
  }
  return enter;
}

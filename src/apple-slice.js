export const sliceDuration = 45_000;
export const sliceBonusLimit = 15_000;
export const sliceFlight = (round) => Math.max(2100, 4250 - (round - 1) * 135);

export function slicePosition(round, index, count, progress) {
  const order = round % 2 ? index : count - 1 - index;
  const stagger = round <= 2 ? .035 : round % 3 === 0 ? .1 : .055;
  const delay = order * stagger;
  const flight = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)));
  const lane = 50 + (index - (count - 1) / 2) * 32;
  const drift = round <= 2 ? 0 : (index % 2 ? -1 : 1) * Math.sin(Math.PI * flight) * 4;
  const height = round <= 2 ? 90 : 86 + (order % 2) * 7;
  return { x: lane + drift, y: 110 - height * 4 * flight * (1 - flight) };
}

export function sliceOutcome(fruit, target) {
  if (fruit.bomb) return 'bomb';
  return fruit.id === target.id ? 'correct' : 'wrong';
}

export function sliceReward(combo) {
  const critical = combo > 0 && combo % 3 === 0;
  return { critical, points: 100 + Math.min(combo - 1, 8) * 25 + (critical ? 150 : 0), extraMs: critical ? 3000 : 0 };
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

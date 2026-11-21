export const sliceDuration = 45_000;
export const sliceBonusLimit = 15_000;
export const sliceFlight = (round) => Math.max(2100, 4250 - (round - 1) * 135);

const sliceLanes = [50, 18, 82, 50, 18];
const sliceDelays = [0, .18, .22, .48, .51];
export const sliceFlightEnd = (index) => 1 + sliceDelays[index];

export function slicePosition(round, index, progress) {
  const flight = progress - sliceDelays[index];
  if (flight <= 0 || flight >= 1) return null;
  const lane = round % 2 ? sliceLanes[index] : 100 - sliceLanes[index];
  const drift = (index % 2 ? -1 : 1) * Math.sin(Math.PI * flight) * 3;
  const height = [91, 89, 80, 68, 64][index];
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

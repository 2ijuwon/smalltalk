export const sliceDuration = 60_000;
export const sliceBonusTime = (elapsedMs) => elapsedMs < 60_000 ? 5000 : elapsedMs < 120_000 ? 3000 : 2000;

export function sliceAnswerCount(elapsedMs, roll) {
  if (elapsedMs >= 120_000) return roll < .18 ? 3 : roll < .65 ? 2 : 1;
  if (elapsedMs >= 60_000) return roll < .4 ? 2 : 1;
  return roll < .18 ? 2 : 1;
}
export const sliceFlight = (round) => Math.max(2100, 3600 - (round - 1) * 105);

const sliceLanes = [50, 18, 82, 50, 18];
const sliceDelays = [0, .095, .12, .25, .285];
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

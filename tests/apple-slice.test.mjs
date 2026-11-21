import test from 'node:test';
import assert from 'node:assert/strict';
import { sliceAnswerCount, sliceBodyHit, sliceBonusTime, sliceDuration, sliceReward, sliceFlight, sliceFlightEnd, sliceOutcome, slicePosition, swipeHit } from '../src/apple-slice.js';

test('시간 보상은 플레이 경과 1분과 2분에 줄어들고 이후에는 2초다', () => {
  assert.equal(sliceDuration, 60_000);
  assert.deepEqual([0, 59_999, 60_000, 119_999, 120_000, 999_999].map(sliceBonusTime), [5000, 5000, 3000, 3000, 2000, 2000]);
});

test('시간이 지날수록 복수 정답이 자주 나오고 2분부터는 세 개도 나온다', () => {
  assert.deepEqual([0, 60_000, 120_000].map(time => sliceAnswerCount(time, .15)), [2, 2, 3]);
  assert.deepEqual([0, 60_000, 120_000].map(time => sliceAnswerCount(time, .3)), [1, 2, 2]);
  assert.deepEqual([0, 60_000, 120_000].map(time => sliceAnswerCount(time, .55)), [1, 1, 2]);
});

test('몸통 판정은 모서리와 화면 밖을 제외하고 스와이프의 첫 접점을 반환한다', () => {
  const body = { left: 10, top: 10, right: 30, bottom: 30 };
  const field = { left: 0, top: 0, right: 40, bottom: 40 };
  assert.equal(sliceBodyHit({ x: 11, y: 11 }, { x: 11, y: 11 }, body, field), null);
  assert.equal(sliceBodyHit({ x: 20, y: 20 }, { x: 20, y: 20 }, body, field), 0);
  assert.equal(sliceBodyHit({ x: 0, y: 20 }, { x: 40, y: 20 }, body, field), .25);
  assert.equal(sliceBodyHit({ x: 0, y: 20 }, { x: 40, y: 20 }, body, { ...field, left: 32 }), null);
});

test('첫 표적이 공중에 있는 동안 새 표적들이 시차를 두고 올라온다', () => {
  const visibleAt = (progress) => [0, 1, 2, 3, 4].filter(index => slicePosition(1, index, progress)?.y < 95);
  assert.deepEqual(visibleAt(.1), [0]);
  assert.deepEqual(visibleAt(.22), [0, 1, 2]);
  assert.deepEqual(visibleAt(.44), [0, 1, 2, 3, 4]);
  assert.equal(slicePosition(1, 0, sliceFlightEnd(0)), null);
  assert.ok(slicePosition(1, 4, 1.2));
  assert.ok(slicePosition(1, 1, .4).x < 50 && slicePosition(2, 1, .4).x > 50);
});

test('정답 단어가 적힌 폭탄은 폭발하고 같은 단어가 적힌 사과만 정답이다', () => {
  const target = { id: 'apple', word: 'apple', meaning: '사과' };
  assert.equal(sliceOutcome(target, target), 'correct');
  assert.equal(sliceOutcome({ ...target, bomb: true }, target), 'bomb');
  assert.equal(sliceOutcome({ id: 'apples', word: 'apples', meaning: target.meaning }, target), 'wrong');
});

test('세 번째 연속 정답은 금빛 베기 점수를 준다', () => {
  assert.deepEqual(sliceReward(2), { critical: false, points: 125 });
  assert.deepEqual(sliceReward(3), { critical: true, points: 300 });
  assert.equal(sliceReward(6).critical, true);
  assert.ok(sliceFlight(8) < sliceFlight(1));
  assert.equal(sliceFlight(200), sliceFlight(201));
});

test('빠른 드래그가 사과를 통과하면 첫 충돌 위치를 반환한다', () => {
  const fruit = { left: 20, right: 40, top: 30, bottom: 50 };
  assert.equal(swipeHit({ x: 0, y: 40 }, { x: 100, y: 40 }, fruit), .2);
  assert.equal(swipeHit({ x: 100, y: 40 }, { x: 0, y: 40 }, fruit), .6);
  assert.equal(swipeHit({ x: 30, y: 0 }, { x: 30, y: 100 }, fruit), .3);
  assert.equal(swipeHit({ x: 0, y: 20 }, { x: 100, y: 20 }, fruit), null);
  assert.equal(swipeHit({ x: 0, y: 40 }, { x: 15, y: 40 }, fruit), null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { sliceReward, sliceFlight, sliceOutcome, swipeHit } from '../src/apple-slice.js';

test('정답 단어가 적힌 폭탄은 폭발하고 같은 단어가 적힌 사과만 정답이다', () => {
  const target = { id: 'apple', word: 'apple', meaning: '사과' };
  assert.equal(sliceOutcome(target, target), 'correct');
  assert.equal(sliceOutcome({ ...target, bomb: true }, target), 'bomb');
  assert.equal(sliceOutcome({ id: 'apples', word: 'apples', meaning: target.meaning }, target), 'wrong');
});

test('세 번째 연속 정답은 금빛 베기 점수와 시간을 준다', () => {
  assert.deepEqual(sliceReward(2), { critical: false, points: 125, extraMs: 0 });
  assert.deepEqual(sliceReward(3), { critical: true, points: 300, extraMs: 3000 });
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

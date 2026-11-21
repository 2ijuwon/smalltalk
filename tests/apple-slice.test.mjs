import test from 'node:test';
import assert from 'node:assert/strict';
import { sliceReward, sliceFlight, sliceOutcome, slicePosition, swipeHit } from '../src/apple-slice.js';

test('발사 순서는 번갈아 바뀌며 사과는 자기 레인 안에서 움직인다', () => {
  assert.ok(slicePosition(3, 0, 3, .12).y < slicePosition(3, 2, 3, .12).y);
  assert.ok(slicePosition(4, 2, 3, .12).y < slicePosition(4, 0, 3, .12).y);
  for (const round of [1, 2, 3, 4, 6, 30]) {
    for (const progress of [0, .1, .4, .75, 1]) {
      const positions = [0, 1, 2].map(index => slicePosition(round, index, 3, progress));
      assert.ok(positions[0].x >= 12 && positions[2].x <= 88);
      assert.ok(positions[2].x - positions[1].x >= 24);
      assert.ok(positions[1].x - positions[0].x >= 24);
    }
  }
});

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

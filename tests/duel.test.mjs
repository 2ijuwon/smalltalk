import assert from 'node:assert/strict';
import test from 'node:test';
import { addDuelPoints, DUEL_SCORE_CAP, duelDifficulties, duelPoints, opponentAttackMs } from '../src/duel-rules.js';

test('사과 베기 점수 배율은 쉬움 0.5, 보통 1, 어려움 5다', () => {
  assert.equal(duelPoints('easy', 0, 1), 5);
  assert.equal(duelPoints('normal', 0, 1), 10);
  assert.equal(duelPoints('hard', 0, 1), 50);
  assert.equal(duelPoints('hard', 1, 0, true), 1000);
});

test('승리할수록 상대 공격이 빨라지고 어려움의 감소 폭은 작다', () => {
  for (const level of ['easy', 'normal', 'hard']) {
    assert.ok(opponentAttackMs(level, 1, () => .5) < opponentAttackMs(level, 0, () => .5));
    assert.ok(opponentAttackMs(level, 100, () => 0) >= duelDifficulties[level].minimumMs);
  }
  assert.ok(duelDifficulties.hard.fasterPerWinMs < duelDifficulties.normal.fasterPerWinMs);
});

test('세 난이도 점수의 상한은 동일하다', () => {
  for (const level of ['easy', 'normal', 'hard']) {
    assert.equal(addDuelPoints(DUEL_SCORE_CAP - 1, duelPoints(level, 5, 3, true)), DUEL_SCORE_CAP);
  }
});

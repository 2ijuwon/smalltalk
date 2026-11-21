import test from 'node:test';
import assert from 'node:assert/strict';
import { applyLearningBatch, initialState } from '../src/domain.js';
import { enemyHealth, fallSeconds, hitEnemy, missDamage, rollAugments, typingPoints, waveSize } from '../src/typing-game.js';

test('학습 XP는 홈에서 흡수할 때까지 보류된다', () => {
  const next = applyLearningBatch(initialState, ['one', 'two', 'three', 'four', 'five'], 'new', new Date('2026-11-17T00:00:00Z'), { deferReward: true });
  assert.equal(next.xp, 0);
  assert.equal(next.pendingXp, 25);
});

test('타자 게임은 라운드가 올라가도 낙하와 피해에 상한이 있다', () => {
  assert.ok(waveSize(9) > waveSize(1));
  assert.equal(waveSize(10), 1);
  assert.ok(enemyHealth(10, () => .5) >= enemyHealth(9, () => .5) * 5);
  assert.ok(fallSeconds(100, 0) >= 5.5);
  assert.ok(missDamage(1, 0) < missDamage(20, 0));
  assert.ok(missDamage(1, 9) >= 3);
});

test('방패는 한 번 막고 직접 대상의 방어 무시는 체력에만 적용된다', () => {
  const protectedEnemy = { hp: 8, shield: true };
  assert.deepEqual(hitEnemy(protectedEnemy, 4), { shieldBroken: true, damage: 0, defeated: false });
  assert.equal(protectedEnemy.hp, 8);
  const bypassed = { hp: 8, shield: true };
  assert.deepEqual(hitEnemy(bypassed, 3, true), { shieldBroken: false, damage: 3, defeated: false });
  assert.equal(bypassed.hp, 5);
  assert.equal(bypassed.shield, true);
});

test('타자 게임 난이도 배율은 일반 적과 보스 점수에 동일하게 적용된다', () => {
  const levels = ['easy', 'normal', 'hard', 'extreme'];
  assert.deepEqual(levels.map((level) => typingPoints(level, false)), [30, 50, 100, 150]);
  assert.deepEqual(levels.map((level) => typingPoints(level, true)), [300, 500, 1000, 1500]);
});

test('방패가 남아 있으면 바닥에 닿을 때 피해가 50% 증가한다', () => {
  assert.equal(missDamage(1, 0, false), 10);
  assert.equal(missDamage(1, 0, true), 15);
  assert.equal(missDamage(1, 9, true), 5);
});

test('증강 뽑기 경계가 60/25/10/5를 따른다', () => {
  const values = [.599, .60, .85, .95];
  assert.deepEqual(values.map((value) => rollAugments(() => value)[0].rarity), ['basic', 'rare', 'epic', 'legendary']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { applyLearningBatch, initialState } from '../src/domain.js';
import { bossChargeSeconds, bossChargeThreshold, bossEliteHealth, enemyHealth, fallSeconds, hitEnemy, missDamage, rollAugments, typingPoints, waveSize } from '../src/typing-game.js';

test('학습 XP는 홈에서 흡수할 때까지 보류된다', () => {
  const next = applyLearningBatch(initialState, ['one', 'two', 'three', 'four', 'five'], 'new', new Date('2026-11-17T00:00:00Z'), { deferReward: true });
  assert.equal(next.xp, 0);
  assert.equal(next.pendingXp, 25);
});

test('타자 게임은 라운드가 올라가도 낙하 속도에 상한이 있다', () => {
  assert.ok(waveSize(9) > waveSize(1));
  assert.equal(waveSize(10), 1);
  assert.ok(enemyHealth(10, () => .5) >= enemyHealth(9, () => .5) * 5);
  assert.ok(fallSeconds(100, 0) >= 5.5);
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

test('낙하 피해는 남은 체력에 비례하고 방패가 남아 있으면 50% 증가한다', () => {
  assert.equal(missDamage(1, 0), 4);
  assert.equal(missDamage(3, 0), 12);
  assert.equal(missDamage(3, 0, true), 18);
  assert.ok(missDamage(3, 9) < missDamage(3, 0));
});

test('보스는 ⅔와 ⅓에서 각각 5초 충전하고 정예 체력은 현재 체력의 절반이다', () => {
  assert.equal(bossChargeSeconds, 5);
  assert.equal(bossChargeThreshold(61, 90, 0), 0);
  assert.equal(bossChargeThreshold(60, 90, 0), 2);
  assert.equal(bossChargeThreshold(31, 90, 1), 0);
  assert.equal(bossChargeThreshold(30, 90, 1), 1);
  assert.equal(bossChargeThreshold(29, 90, 0), 2);
  assert.equal(bossChargeThreshold(29, 90, 2), 0);
  assert.equal(bossChargeThreshold(0, 90, 0), 0);
  assert.equal(bossEliteHealth(61), 31);
});

test('증강 뽑기 경계가 60/25/10/5를 따른다', () => {
  const values = [.599, .60, .85, .95];
  assert.deepEqual(values.map((value) => rollAugments(() => value)[0].rarity), ['basic', 'rare', 'epic', 'legendary']);
});

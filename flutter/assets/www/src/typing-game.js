export const upgradeCost = (level) => 6 + level * 5;
export const waveSize = (round) => round % 10 === 0 ? 1 : Math.min(24, 4 + Math.ceil(round * 1.1));
export const fallSeconds = (round, sight) => Math.max(5.5, 13 - round * .38 + Math.min(sight, 4) * 1.2);
export const missDamage = (round, vitality) => Math.max(3, 10 + Math.floor((round - 1) / 3) * 2 - vitality * 2);
export const enemyHealth = (round, random = Math.random) => {
  const base = 1 + Math.floor((round - 1) / 2);
  const variance = Math.max(1, Math.floor((round - 1) / 3) + 1);
  const normal = Math.max(1, base + Math.floor(random() * (variance * 2 + 1)) - variance);
  return round % 10 === 0 ? normal * 10 : normal;
};
export const hitEnemy = (enemy, damage, bypassShield = false) => {
  if (enemy.shield && !bypassShield) { enemy.shield = false; return { shieldBroken: true, damage: 0, defeated: false }; }
  const dealt = Math.min(enemy.hp, Math.max(1, Math.floor(damage)));
  enemy.hp -= dealt;
  return { shieldBroken: false, damage: dealt, defeated: enemy.hp <= 0 };
};
export const augments = [
  { id: 'splash', name: '연쇄 타격', rarity: 'basic', text: '근처 적 1명 추가 타격 · 중첩 가능' },
  { id: 'bounty', name: '현상금', rarity: 'basic', text: '처치 코인 +1' },
  { id: 'guard', name: '안전망', rarity: 'rare', text: '매 라운드 체력 +8' },
  { id: 'pierce', name: '방어 무시', rarity: 'rare', text: '직접 입력한 대상의 방어막 무시' },
  { id: 'slow', name: '시간 벌기', rarity: 'epic', text: '낙하 시간 +25%' },
  { id: 'double', name: '강타', rarity: 'epic', text: '공격력 +1' },
  { id: 'renew', name: '재생', rarity: 'legendary', text: '처치할 때 체력 +2' },
  { id: 'fortune', name: '황금 손', rarity: 'legendary', text: '처치 코인 +3' },
];
export function rollAugments(random = Math.random) {
  const tiers = ['basic', 'rare', 'epic', 'legendary'];
  const odds = [60, 25, 10, 5];
  return Array.from({ length: 3 }, () => {
    const roll = random() * 100;
    let tier = 0, sum = 0;
    for (; tier < odds.length - 1; tier += 1) { sum += odds[tier]; if (roll < sum) break; }
    const pool = augments.filter((item) => item.rarity === tiers[tier]);
    return pool[Math.floor(random() * pool.length)];
  });
}

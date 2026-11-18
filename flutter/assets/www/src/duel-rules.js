export const DUEL_SCORE_CAP = 3000;

export const duelDifficulties = {
  easy: { multiplier: .5, firstAttackMs: 5000, fasterPerWinMs: 500, minimumMs: 800 },
  normal: { multiplier: 1, firstAttackMs: 3500, fasterPerWinMs: 350, minimumMs: 750 },
  hard: { multiplier: 5, firstAttackMs: 2000, fasterPerWinMs: 160, minimumMs: 700 },
};

export function opponentAttackMs(difficulty, victories, random = Math.random) {
  const rule = duelDifficulties[difficulty] || duelDifficulties.normal;
  const base = rule.firstAttackMs - Math.max(0, victories) * rule.fasterPerWinMs;
  return Math.max(rule.minimumMs, Math.round(base + (random() - .5) * 1000));
}

export function duelPoints(difficulty, victories, scars, won = false) {
  const multiplier = (duelDifficulties[difficulty] || duelDifficulties.normal).multiplier;
  const base = scars * 10 + (won ? (victories + 1) * 100 : 0);
  return Math.round(base * multiplier);
}

export function addDuelPoints(score, points) {
  return Math.min(DUEL_SCORE_CAP, Math.max(0, score + points));
}

import { stageCount, stageWords } from './data.js';

export const STORAGE_KEY = 'small-talk-state-v1';
export const REVIEW_INTERVALS = [0, 1, 3, 7, 14, 30];

export const initialState = {
  version: 1, onboarded: false,
  preferences: { major: 'computer', difficulty: 'basic', dailyGoal: 5, reminderTime: '20:00' },
  events: [], reviews: [], favorites: [], lastBatchIds: [], sessions: [], xp: 0, pendingXp: 0,
  bestScores: { search: 0, duel: 0, typing: 0 },
};

export function loadState(storage = localStorage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { state: structuredClone(initialState), error: '' };
    const state = JSON.parse(raw);
    if (state.version !== 1) return { state: structuredClone(initialState), error: '저장 데이터 버전을 확인할 수 없어 새 상태로 열었어요.' };
    return { state: { ...structuredClone(initialState), ...state, preferences: { ...initialState.preferences, ...state.preferences, dailyGoal: 5 }, lastBatchIds: Array.isArray(state.lastBatchIds) ? state.lastBatchIds : [], sessions: Array.isArray(state.sessions) ? state.sessions : [], bestScores: { ...initialState.bestScores, ...(state.bestScores || {}), typing: Math.max(state.bestScores?.typing || 0, state.bestTypingScore || 0) } }, error: '' };
  } catch {
    return { state: structuredClone(initialState), error: '저장된 학습 기록을 불러오지 못했어요.' };
  }
}

export function bestScore(state, game) {
  return Math.max(0, Number(state.bestScores?.[game]) || 0);
}

export function withBestScore(state, game, score) {
  if (!['search', 'duel', 'typing'].includes(game) || !Number.isFinite(score) || score <= bestScore(state, game)) return state;
  return { ...state, bestScores: { ...initialState.bestScores, ...state.bestScores, [game]: Math.floor(score) } };
}

export function saveState(state, storage = localStorage) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); return ''; }
  catch { return '학습 기록을 저장하지 못했어요. 저장 공간을 확인해 주세요.'; }
}

function createEvent(itemId, kind, result, now) {
  return { id: `${itemId}-${now.getTime()}-${Math.random().toString(16).slice(2)}`, itemId, kind, result, createdAt: now.toISOString() };
}

export function addReview(entries, itemId, reason, now = new Date()) {
  const existing = entries.find((entry) => entry.itemId === itemId);
  const nextReviewAt = new Date(now);
  nextReviewAt.setDate(nextReviewAt.getDate() + REVIEW_INTERVALS[0]);
  if (!existing) return [...entries, { itemId, reasons: [reason], lastAddedAt: now.toISOString(), nextReviewAt: nextReviewAt.toISOString(), stage: 0 }];
  return entries.map((entry) => entry.itemId === itemId ? { ...entry, reasons: entry.reasons.includes(reason) ? entry.reasons : [...entry.reasons, reason], lastAddedAt: now.toISOString(), nextReviewAt: nextReviewAt.toISOString() } : entry);
}

export function applySelfCheck(state, itemId, result, now = new Date()) {
  return { ...state, events: [...state.events, createEvent(itemId, 'self-check', result, now)], reviews: result === 'again' ? addReview(state.reviews, itemId, 'manual', now) : state.reviews };
}

export function applyGradedResult(state, itemId, result, now = new Date(), { reward = true } = {}) {
  const reason = result === 'incorrect' ? 'incorrect' : result === 'timeout' ? 'timeout' : null;
  return { ...state, events: [...state.events, createEvent(itemId, 'graded', result, now)], reviews: reason ? addReview(state.reviews, itemId, reason, now) : state.reviews, xp: result === 'correct' && reward ? state.xp + 10 : state.xp };
}

export function applyLearningBatch(state, itemIds, mode = 'new', now = new Date(), summary = {}) {
  const kind = mode === 'review' ? 'review-game' : 'learn-game';
  const events = itemIds.map((itemId, index) => createEvent(itemId, kind, 'completed', new Date(now.getTime() + index)));
  const session = { id: `session-${now.getTime()}`, completedAt: now.toISOString(), mode, perfect: Boolean(summary.perfect), itemCount: itemIds.length, itemIds: [...itemIds], curriculumMajor: summary.major, stage: summary.stage };
  const reward = mode === 'review' ? 0 : itemIds.length * 5;
  return { ...state, events: [...state.events, ...events], sessions: [...(state.sessions || []), session], lastBatchIds: [...itemIds], xp: state.xp + (summary.deferReward ? 0 : reward), pendingXp: (state.pendingXp || 0) + (summary.deferReward ? reward : 0) };
}

export function nextStage(state, major) {
  const sessions = state.sessions.filter((session) => session.mode === 'new' && session.curriculumMajor === major);
  for (let stage = 1; stage <= stageCount; stage += 1) {
    const ids = stageWords(major, stage);
    const done = sessions.some((session) => Array.isArray(session.itemIds)
      ? session.itemIds.length === ids.length && ids.every((id) => session.itemIds.includes(id))
      : session.stage === stage);
    if (!done) return stage;
  }
  return stageCount + 1;
}

export function rankedWords(state) {
  const scores = new Map(getLearnedIds(state).map((id) => [id, { id, score: 0, mistakes: 0 }]));
  for (const { itemId } of state.reviews) if (!scores.has(itemId)) scores.set(itemId, { id: itemId, score: 0, mistakes: 0 });
  for (const { itemId, kind, result } of state.events) {
    if (kind !== 'graded') continue;
    const word = scores.get(itemId);
    if (!word) continue;
    if (result === 'correct') word.score += 1;
    if (result === 'incorrect' || result === 'timeout') { word.score -= 2; word.mistakes += 1; }
  }
  return [...scores.values()].sort((a, b) => a.score - b.score || b.mistakes - a.mistakes || a.id.localeCompare(b.id));
}

export function pickReviewWords(words, random = Math.random) {
  const priority = words.filter(({ mistakes }) => mistakes > 0);
  const fallback = words.filter(({ mistakes }) => mistakes === 0);
  const selected = [];
  while ((priority.length || fallback.length) && selected.length < 5) {
    const pool = priority.length ? priority : fallback;
    const index = Math.floor(random() ** 2 * Math.min(6, pool.length));
    selected.push(pool.splice(index, 1)[0].id);
  }
  return selected;
}

export function getLearnedIds(state) {
  return [...new Set(state.events.filter((event) => event.kind === 'learn-game').map((event) => event.itemId))];
}

export function getStats(state, now = new Date()) {
  const graded = state.events.filter((item) => item.kind === 'graded');
  const correct = graded.filter((item) => item.result === 'correct').length;
  const sessionTimes = (state.sessions || []).filter((session) => session.mode === 'new').map((session) => session.completedAt);
  const eventTimes = state.events.filter((item) => item.kind === 'learn-game').map((item) => item.createdAt);
  const activeDays = new Set([...sessionTimes, ...eventTimes].map(localDayNumber).filter(Number.isFinite));
  let cursor = localDayNumber(now);
  if (!activeDays.has(cursor)) cursor -= 1;
  let learningStreak = 0;
  while (activeDays.has(cursor)) { learningStreak += 1; cursor -= 1; }
  let perfectStreak = 0;
  for (let index = (state.sessions || []).length - 1; index >= 0 && state.sessions[index].perfect; index -= 1) perfectStreak += 1;
  return { learned: getLearnedIds(state).length, learningStreak, perfectStreak, gradedCount: graded.length, correct, accuracy: graded.length ? Math.round(correct / graded.length * 100) : 0 };
}

function localDayNumber(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return Number.NaN;
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

function localDayKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function getTodayStats(state, now = new Date()) {
  const today = localDayKey(now);
  const events = state.events.filter((event) => event.kind === 'learn-game' && localDayKey(event.createdAt) === today);
  return { learned: new Set(events.map((event) => event.itemId)).size, activityCount: events.length };
}

export function getTodayLearnedIds(state, now = new Date()) {
  const today = localDayKey(now);
  return [...new Set(state.events.filter((event) => event.kind === 'learn-game' && localDayKey(event.createdAt) === today).map((event) => event.itemId))];
}

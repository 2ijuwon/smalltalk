import assert from 'node:assert/strict';
import test from 'node:test';
import { majorLabels, stageWords } from '../src/data.js';
import { nextStage, rankedWords, pickReviewWords } from '../src/domain.js';
import { addReview, applyGradedResult, applyLearningBatch, applySelfCheck, bestScore, withBestScore, loadState, getLearnedIds, getStats, getTodayStats, initialState } from '../src/domain.js';

test('게임별 최고 점수는 서로 독립적이고 낮은 기록으로 덮이지 않는다', () => {
  const search = withBestScore(initialState, 'search', 450);
  const duel = withBestScore(search, 'duel', 275);
  const lower = withBestScore(duel, 'search', 100);
  assert.equal(lower, duel);
  assert.equal(bestScore(lower, 'search'), 450);
  assert.equal(bestScore(lower, 'duel'), 275);
  assert.equal(bestScore(lower, 'typing'), 0);
});

test('기존 타자 게임 최고 점수는 새 점수 저장 구조로 이어진다', () => {
  const old = { ...initialState, bestScores: undefined, bestTypingScore: 320 };
  const storage = { getItem: () => JSON.stringify(old) };
  const loaded = loadState(storage).state;
  assert.equal(bestScore(loaded, 'typing'), 320);
  assert.equal(bestScore(loaded, 'search'), 0);
});

test('자기 확인은 실제 채점 정답률에 포함되지 않는다', () => {
  const state = applySelfCheck(initialState, 'algorithm', 'remembered', new Date('2026-11-05T00:00:00Z'));
  assert.equal(state.events[0].kind, 'self-check');
  assert.equal(getStats(state).gradedCount, 0);
});

test('직접 저장과 다른 답 선택은 별도 사유로 보존한다', () => {
  const manual = applySelfCheck(initialState, 'algorithm', 'again', new Date('2026-11-05T00:00:00Z'));
  const result = applyGradedResult(manual, 'algorithm', 'incorrect', new Date('2026-11-05T01:00:00Z'));
  assert.deepEqual(result.reviews[0].reasons, ['manual', 'incorrect']);
});

test('동일 사유는 중복 추가하지 않는다', () => {
  const once = addReview([], 'database', 'timeout');
  const twice = addReview(once, 'database', 'timeout');
  assert.equal(twice.length, 1);
  assert.deepEqual(twice[0].reasons, ['timeout']);
});

test('실제 정답만 XP를 지급한다', () => {
  const incorrect = applyGradedResult(initialState, 'algorithm', 'incorrect');
  const correct = applyGradedResult(incorrect, 'algorithm', 'correct');
  assert.equal(incorrect.xp, 0);
  assert.equal(correct.xp, 10);
});

test('오늘 학습 수는 누적 기록과 분리한다', () => {
  const yesterday = applyLearningBatch(initialState, ['computer-algorithm'], 'new', new Date('2026-11-06T03:00:00Z'));
  const today = applyLearningBatch(yesterday, ['computer-database'], 'new', new Date('2026-11-08T03:00:00Z'));
  assert.equal(getStats(today).learned, 2);
  assert.equal(getTodayStats(today, new Date('2026-11-08T12:00:00Z')).learned, 1);
});

test('5단어 게임 학습 완료는 마지막 묶음과 XP를 저장한다', () => {
  const ids = ['a', 'b', 'c', 'd', 'e'];
  const state = applyLearningBatch(initialState, ids);
  assert.deepEqual(state.lastBatchIds, ids);
  assert.deepEqual(getLearnedIds(state), ids);
  assert.equal(state.xp, 25);
});

test('다시 학습은 새 단어 수와 XP를 중복 증가시키지 않는다', () => {
  const learned = applyLearningBatch(initialState, ['a', 'b', 'c', 'd', 'e']);
  const reviewed = applyLearningBatch(learned, ['a', 'b', 'c', 'd', 'e'], 'review');
  assert.equal(getLearnedIds(reviewed).length, 5);
  assert.equal(reviewed.xp, 25);
});

test('연속 학습 일수는 이어진 학습 날짜만 계산한다', () => {
  const first = applyLearningBatch(initialState, ['a'], 'new', new Date(2026, 10, 7, 12));
  const second = applyLearningBatch(first, ['b'], 'new', new Date(2026, 10, 8, 12));
  assert.equal(getStats(second, new Date(2026, 10, 9, 12)).learningStreak, 2);
});

test('완벽 학습 스택은 오답 없는 연속 세션만 센다', () => {
  const first = applyLearningBatch(initialState, ['a'], 'new', new Date(2026, 10, 7, 12), { perfect: true });
  const second = applyLearningBatch(first, ['b'], 'new', new Date(2026, 10, 8, 12), { perfect: true });
  const broken = applyLearningBatch(second, ['c'], 'new', new Date(2026, 10, 9, 12), { perfect: false });
  assert.equal(getStats(second).perfectStreak, 2);
  assert.equal(getStats(broken).perfectStreak, 0);
});

test('전공별 Level 1은 중복 없이 5단어씩 10개 스테이지를 순차 해금한다', () => {
  for (const major of Object.keys(majorLabels)) {
    let state = structuredClone(initialState);
    const words = [];
    for (let stage = 1; stage <= 10; stage += 1) {
      assert.equal(nextStage(state, major), stage);
      const batch = stageWords(major, stage);
      assert.equal(batch.length, 5);
      words.push(...batch);
      state = applyLearningBatch(state, batch, 'new', new Date(), { major, stage });
    }
    assert.equal(new Set(words).size, 50);
    assert.equal(nextStage(state, major), 11);
  }
});

test('오답 점수는 정답 뒤에도 남고 복습은 오답 단어를 먼저 고른다', () => {
  let state = applyLearningBatch(initialState, ['a', 'b', 'c', 'd', 'e', 'f']);
  state = applyGradedResult(state, 'b', 'incorrect');
  state = applyGradedResult(state, 'a', 'incorrect');
  state = applyGradedResult(state, 'a', 'correct');
  const ranked = rankedWords(state);
  assert.deepEqual(ranked.slice(0, 2), [
    { id: 'b', score: -2, mistakes: 1 },
    { id: 'a', score: -1, mistakes: 1 },
  ]);
  const first = pickReviewWords(ranked, () => 0);
  const second = pickReviewWords(ranked, () => .999);
  assert.equal(new Set(first).size, 5);
  assert.deepEqual(new Set(first.slice(0, 2)), new Set(['a', 'b']));
  assert.notDeepEqual(first, second);
});

test('퀴즈 채점과 복습 완료만으로는 학습 스트릭이 늘지 않는다', () => {
  const day = new Date(2026, 10, 12, 12);
  const graded = applyGradedResult(initialState, 'a', 'correct', day);
  const reviewed = applyLearningBatch(graded, ['a'], 'review', day);
  assert.equal(getStats(reviewed, day).learningStreak, 0);
  const learned = applyLearningBatch(reviewed, ['a'], 'new', day, { major: 'computer', stage: 1 });
  assert.equal(getStats(learned, day).learningStreak, 1);
});

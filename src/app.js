import { buildWordGrid, straightPath } from './word-search.js';
import { escapeHtml, shuffle, randomInt, pixelIcon, pixelSprite, brandMark, button, card, progress, gameOverActions } from './ui.js';
import { initializeTheme, reactToSlime, showLaunch, playEffect, specialEffect } from './effects.js';
import { createLayoutMotion } from './layout-motion.js';
import { createSpeech } from './speech.js';
import { createConversation } from './conversation.js';
import { createOrchard } from './orchard.js';
import { createTypingArcade } from './typing-arcade.js';
import { commonMeanings } from './slime-dialogue.js';
import { difficultyLabels, itemsForMajor, majorLabels, smallTalks, stageCount, stageWords, vocabulary } from './data.js';
import {
  applyGradedResult, applyLearningBatch, getStats, getTodayStats, loadState, saveState,
  STORAGE_KEY, initialState, nextStage, rankedWords, pickReviewWords, getLearnedIds, bestScore, withBestScore,
  wordSearchRules, wordSearchPoints,
} from './domain.js';

const root = document.querySelector('#app');
const loaded = loadState();
let state = loaded.state;
const storedId = (id) => vocabulary.find((item) => item.id === id || item.word === id)?.id || id;
state = {
  ...state,
  events: state.events.map((event) => ({ ...event, itemId: storedId(event.itemId) })),
  reviews: state.reviews.map((entry) => ({ ...entry, itemId: storedId(entry.itemId) })),
  favorites: state.favorites.map(storedId),
  lastBatchIds: state.lastBatchIds.map(storedId),
};

let screen = state.onboarded ? 'home' : 'onboarding';
let onboardingStep = 0;
let draftMajor = state.preferences.major;
let draftDifficulty = state.preferences.difficulty;
let notice = loaded.error;
let learningSession = null;
let quickSession = null;
let resetOpen = false;
let draggedToken = '';
let matchFeedbackTimer = 0;
let searchTimer = 0;
let searchTransitionTimer = 0;
let searchPointer = null;
let sentencePointer = null;
let suppressTokenClick = '';
let paintedViewKey = '';
let pressedControl = null;
let pressedSlime = null;
let celebration = null;
let celebrationTimer = 0;
let celebrationSequence = 0;
let renderedCelebrationId = 0;
let lastPraise = '';
let reviewPage = 0;
let talkQuiz = null;
let talkChoice = { day: '', difficulty: '', index: -1, seen: [] };
let talkPointer = null;
let dragGhost = null;
let suppressTalkClick = -1;
let resultGrade = null;
let resultWordCount = 0;
let resultReward = 0;
let resultBossHp = 0;
let xpClaimTimer = 0;
let bossHitSequence = 0;
let bossHitSeen = 0;
let searchPuzzleSequence = 0;

const praiseMessages = ['맞혔어요!', '잘했어요!', '좋아요!'];

const vocabularyById = new Map(vocabulary.map(item => [item.id, item]));
const byId = (id) => vocabularyById.get(id);
const validIds = (ids) => [...new Set(ids)].filter((id) => byId(id));

function triggerCelebration(detail, kind = '') {
  playEffect('finish');
  const candidates = praiseMessages.filter((message) => message !== lastPraise);
  lastPraise = candidates[randomInt(candidates.length)];
  celebrationSequence += 1;
  celebration = { praise: kind === 'talk' ? '멋져요!' : lastPraise, detail, kind, id: celebrationSequence };
  window.clearTimeout(celebrationTimer);
  celebrationTimer = window.setTimeout(() => {
    celebration = null;
    root.querySelector('.success-burst')?.remove();
  }, kind === 'talk' ? 1500 : 750);
}

function successBurst() {
  if (!celebration || renderedCelebrationId === celebration.id) return '';
  renderedCelebrationId = celebration.id;
  return `<div class="success-burst ${celebration.kind === 'talk' ? 'success-burst--talk' : ''}" role="status" aria-live="assertive" aria-atomic="true" data-celebration="${celebration.id}">${celebration.kind === 'talk' ? `<div class="talk-sparks" aria-hidden="true">${Array.from({ length: 16 }, (_, i) => `<i style="--spark:${i};--angle:${i * 22.5}deg"></i>`).join('')}</div>` : ''}<div class="success-burst__message"><span>✓</span><strong>${celebration.praise}</strong><small>${celebration.detail}</small></div></div>`;
}

function persist() {
  const error = saveState(state);
  if (error) notice = error;
}

function saveBest(game, score) {
  const updated = withBestScore(state, game, score);
  if (updated === state) return;
  state = updated;
  persist();
}

function stopSearchTimer() {
  if (searchTimer) window.clearInterval(searchTimer);
  searchTimer = 0;
  searchPointer = null;
}

function navigate(next) {
  stopSpeech();
  if (screen === 'conversation') conversation.leave();
  if (next !== 'home') { window.clearTimeout(xpClaimTimer); xpClaimTimer = 0; }
  if (screen === 'learn') {
    stopSearchTimer();
    window.clearTimeout(searchTransitionTimer);
    searchTransitionTimer = 0;
  }
  if (screen === 'duel') orchard.stop();
  if (next !== 'settings') resetOpen = false;
  if (screen === 'typing') typingGame.leave();
  screen = next;
  notice = '';
  render({ resetScroll: true });
}

function goHome(message) {
  stopSearchTimer();
  window.clearTimeout(searchTransitionTimer);
  searchTransitionTimer = 0;
  screen = 'home';
  learningSession = null;
  quickSession = null;
  notice = message;
  render({ resetScroll: true });
}

function absorbPendingXp() {
  if (screen !== 'home' || !(state.pendingXp > 0) || xpClaimTimer) return;
  const source = root.querySelector('.quest');
  const target = root.querySelector('.xp');
  if (!source || !target) return;
  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  for (let index = 0; index < 12; index += 1) {
    const dot = document.createElement('i');
    dot.className = 'xp-particle';
    dot.style.left = `${from.left + from.width * (.22 + (index % 4) * .17)}px`;
    dot.style.top = `${from.top + from.height * .44}px`;
    document.body.append(dot);
    dot.animate([{ transform: 'translate(0, 0) scale(1)', opacity: 1 }, { transform: `translate(${to.left - from.left - from.width * (.22 + (index % 4) * .17) + to.width / 2}px, ${to.top - from.top - from.height * .44 + to.height / 2}px) scale(.5)`, opacity: .85 }], { duration: 450 + index * 42, delay: index * 28, fill: 'forwards', easing: 'steps(8, end)' }).finished.then(() => dot.remove()).catch(() => dot.remove());
  }
  xpClaimTimer = window.setTimeout(() => {
    xpClaimTimer = 0;
    if (screen !== 'home') return;
    state = { ...state, xp: state.xp + state.pendingXp, pendingXp: 0 };
    persist();
    render();
  }, 1200);
}

function header() {
  return `<header class="topbar"><button class="brand" data-nav="home" aria-label="smalltalk 홈">${brandMark()}<strong>smalltalk</strong></button><div class="xp"><span>XP</span><strong>${state.xp}</strong></div></header>`;
}

function nav() {
  const items = [['home', 'home', '홈'], ['smalltalk', 'talk', '스몰토크'], ['review', 'review', '복습'], ['stats', 'stats', '통계'], ['settings', 'settings', '설정']];
  return `<nav class="bottom-nav" aria-label="주요 메뉴">${items.map(([value, icon, label]) => `<button data-nav="${value}"${screen === value ? ' class="active" aria-current="page"' : ''}>${pixelIcon(icon)}${label}</button>`).join('')}</nav>`;
}

function onboarding() {
  if (onboardingStep === 0) return `<div class="onboarding"><div class="splash"><div class="splash-scene" aria-hidden="true">${pixelSprite("mascot")}</div><div class="splash-copy"><h1>전공 영어</h1><p class="eyebrow">하루 5단어 · 약 5분</p><p>단어 뜻, 문장, 퍼즐로 학습합니다.</p></div>${button('시작하기', 'onboarding-next')}</div></div>`;
  const isMajor = onboardingStep === 1;
  const values = isMajor ? Object.entries(majorLabels) : Object.entries(difficultyLabels);
  const selected = isMajor ? draftMajor : draftDifficulty;
  return `<div class="onboarding"><div class="selection"><button class="onboarding-back" data-action="onboarding-back" aria-label="이전 단계로 돌아가기">← 뒤로</button><div class="selection-intro"><p class="eyebrow">${isMajor ? '01 / 02 · 전공' : '02 / 02 · 난이도'}</p><h1>${isMajor ? '전공 선택' : '난이도 선택'}</h1><p>${isMajor ? '전공에 맞는 단어를 추천해요.' : '처음에는 짧고 쉬운 단어부터 나와요.'}</p></div><div class="choices" role="radiogroup">${values.map(([value, label]) => `<button class="choice ${selected === value ? 'choice--selected' : ''}" data-select="${isMajor ? 'major' : 'difficulty'}" data-value="${value}" role="radio" aria-checked="${selected === value}"><span class="radio-dot"></span>${label}</button>`).join('')}</div>${button(isMajor ? '다음' : '학습 시작', isMajor ? 'onboarding-next' : 'onboarding-finish')}</div></div>`;
}

function home() {
  const major = state.preferences.major;
  const stage = nextStage(state, major);
  const count = Math.min(getTodayStats(state).learned, 5);
  const hasLesson = state.sessions.some((session) => session.mode === 'new');
  const learned = validIds(getLearnedIds(state)).map(byId);
  const canPlay = hasLesson && learned.length >= 3;
  const canSlice = canPlay && new Set(learned.map(({ word }) => word.toLowerCase())).size >= 3;
  const reviewFirst = (count >= 5 || stage > stageCount) && learned.length > 0;
  const questAction = reviewFirst
    ? `<div class="dashboard-grid">${button('다시 볼 단어', 'review-game')}${stage <= stageCount ? button('다음 레슨', 'start-new', 'secondary') : ''}</div>`
    : button('학습 시작', 'start-new', 'primary', stage > stageCount);
  return `<div class="page home-page">
    <section class="home-hero">${pixelSprite('mascot')}<div><p class="eyebrow">${majorLabels[major]}</p><h1>오늘의 학습</h1></div>
      <div class="daily-count"><strong>${count}<small> / 5</small></strong><div class="pixel-meter" aria-label="오늘 5단어 중 ${count}개">${Array.from({ length: 5 }, (_, i) => `<i class="${i < count ? 'filled' : ''}"></i>`).join('')}</div></div></section>
    <section class="card quest"><div class="quest-title"><div><p class="eyebrow">다음 목표 · ${Math.min(stage, stageCount)}/${stageCount}</p><h2>${stage > stageCount ? '학습 완료' : `레슨 ${String(stage).padStart(2, '0')}`}</h2></div>${pixelSprite('book')}</div>
      ${progress(stage - 1, stageCount, '레벨 진행')}${questAction}</section>
    <section class="card practice-panel"><h2>연습</h2><div class="dashboard-grid">${button('빠른 확인', 'start-quick', 'secondary', stage === 1 && !validIds(state.lastBatchIds).length)}<button class="button button--secondary" data-nav="review">복습</button></div></section>
    <section class="card game-links"><h2>게임</h2><div class="dashboard-grid">${button(`${pixelSprite('search')}단어 찾기<small>최고 ${bestScore(state, 'search')}점</small>`, 'arcade-search', 'secondary', !canPlay)}${button(`${pixelSprite('duel')}사과 베기<small>최고 ${bestScore(state, 'slice')}점</small>`, 'arcade-duel', 'secondary', !canSlice)}${button(`<span class="game-emoji" aria-hidden="true">⌨</span>타자 게임<small>최고 ${bestScore(state, 'typing')}점</small>`, 'arcade-typing', 'secondary', !canPlay)}</div>${canPlay ? '' : hasLesson ? '<p>단어를 3개 이상 배우면 게임을 할 수 있어요.</p>' : '<p>첫 학습을 마치면 게임을 할 수 있어요.</p>'}</section>
  </div>`;
}

function stageHeader(stage, title, description) {
  const labels = ['뜻 확인', '매칭', '문장', '찾기'];
  const remaining = 4 - (learningSession.bossHits || 0);
  return `<div class="game-header"><div><p class="eyebrow">0${stage} / 04</p><h1>${title}</h1>${description ? `<p>${description}</p>` : ''}</div><button class="game-exit" data-nav="home">나가기</button></div><div class="boss-status" aria-label="보스 슬라임 체력 ${remaining}/4"><div class="boss-avatar">${pixelSprite('boss')}<i class="boss-impact" aria-hidden="true"></i></div><div class="boss-meter"><span>보스 슬라임</span><div class="boss-pips" aria-hidden="true">${Array.from({ length: 4 }, (_, index) => `<i class="${index < remaining ? 'filled' : ''}"></i>`).join('')}</div><strong>${remaining}/4</strong></div></div><div class="stage-track stage-track--four">${labels.map((label, index) => `<span class="${stage >= index + 1 ? 'active' : ''}">${label}</span>`).join('')}</div>`;
}

function hitLessonBoss(milestone) {
  if (!learningSession || learningSession.mode === 'arcade' || learningSession.bossMilestones.includes(milestone)) return;
  learningSession.bossMilestones.push(milestone);
  learningSession.bossHits += 1;
  bossHitSequence += 1;
}

function animateBossHit() {
  if (screen !== 'learn' || bossHitSeen === bossHitSequence) return;
  const avatar = root.querySelector('.boss-avatar');
  if (!avatar) return;
  bossHitSeen = bossHitSequence;
  avatar.classList.remove('boss-avatar--hit');
  void avatar.offsetWidth;
  avatar.classList.add('boss-avatar--hit');
  const status = avatar.closest('.boss-status');
  status?.classList.add('boss-status--hit');
  root.querySelector('.main')?.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(2px)' }, { transform: 'none' }], { duration: 300, easing: 'steps(4, end)' });
  window.setTimeout(() => avatar.classList.remove('boss-avatar--hit'), 530);
  window.setTimeout(() => status?.classList.remove('boss-status--hit'), 530);
}

function startLearning(ids, mode = 'new', curriculum = {}) {
  const items = validIds(ids).map(byId).slice(0, 5);
  if (!items.length) return goHome('학습할 단어가 없어요.');
  stopSearchTimer();
  learningSession = {
    mode, items, curriculum, stage: 'intro', previewIndex: 0, itemIndex: 0, matched: [],
    selectedWord: '', selectedMeaning: '', feedback: null,
    wordOrder: shuffle(items.map((item) => item.id)), meaningOrder: [],
    sentenceBank: [], sentenceAnswer: [], sentenceTokens: [], sentenceSolved: false,
    grid: null, foundIds: [], dragPath: [], wrongPath: [], remaining: 60, searchEnded: false, mistakes: 0, bossHits: 0, bossMilestones: [],
  };
  learningSession.meaningOrder = shuffle(items.map((item) => item.id));
  if (items.length > 1 && learningSession.meaningOrder.every((id, index) => id === learningSession.wordOrder[index])) learningSession.meaningOrder.push(learningSession.meaningOrder.shift());
  screen = 'learn';
  notice = '';
  render({ resetScroll: true });
}

function previewGame() {
  const session = learningSession;
  const item = session.items[session.previewIndex];
  return `<div class="page game-page">${stageHeader(1, '단어 확인', '')}${progress(session.previewIndex + 1, session.items.length, '단어 확인')}<section class="preview-word-card"><div class="preview-word-content"><span>${session.previewIndex + 1} / ${session.items.length}</span><h2>${clickableWord(item.word, item.meaning)}</h2><p class="preview-meaning">${item.meaning}</p><button class="listen-button" data-action="speak-word" aria-label="${item.word} 발음 듣기"><b>▶</b> 발음 듣기</button><p class="micro-copy">소리를 듣고 단어와 뜻을 함께 기억해 보세요.</p></div>${button(session.previewIndex === session.items.length - 1 ? '뜻 맞추기' : '다음 단어', 'preview-next')}</section></div>`;
}

function matchingGame() {
  const session = learningSession;
  const done = session.matched.length === session.items.length;
  const feedback = session.feedback;
  const tileClass = (id, side) => {
    if (session.matched.includes(id)) return `matched ${feedback?.type === 'correct' && feedback.word === id ? 'just-matched' : ''}`;
    if (feedback?.type === 'try' && feedback[side] === id) return 'try-again';
    if (session[side === 'word' ? 'selectedWord' : 'selectedMeaning'] === id) return 'selected';
    return '';
  };
  return `<div class="page game-page">${stageHeader(2, '뜻 맞추기', '')}${progress(session.matched.length, session.items.length, '매칭')}<div class="match-board"><div class="match-column"><p>ENGLISH</p>${session.wordOrder.map((id) => { const item = byId(id); return `<button data-match-side="word" data-id="${id}" class="match-tile ${tileClass(id, 'word')}" ${session.matched.includes(id) ? 'disabled' : ''}><strong>${item.word}</strong></button>`; }).join('')}</div><svg class="match-lines" aria-hidden="true"></svg><div class="match-column"><p>한국어 뜻</p>${session.meaningOrder.map((id) => { const item = byId(id); return `<button data-match-side="meaning" data-id="${id}" class="match-tile ${tileClass(id, 'meaning')}" ${session.matched.includes(id) ? 'disabled' : ''}>${item.meaning}</button>`; }).join('')}</div></div><p class="game-message ${feedback?.type || ''}" role="status">${feedback?.text || (done ? '모든 짝을 찾았어요!' : '영어 단어와 그에 맞는 뜻을 하나씩 고르세요.')}</p><div class="match-actions">${button('다시 보기', 'review-words', 'quiet')}${done ? button('문장 조립', 'start-sentence') : ''}</div></div>`;
}

function drawMatchLines() {
  if (screen !== 'learn' || learningSession?.stage !== 'match') return;
  const board = root.querySelector('.match-board');
  const svg = board?.querySelector('.match-lines');
  if (!board || !svg) return;
  const bounds = board.getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
  const paths = new Map([...svg.children].map((path) => [path.dataset.id, path]));
  for (const id of learningSession.matched) {
    const left = [...board.querySelectorAll('[data-match-side="word"]')].find((node) => node.dataset.id === id);
    const right = [...board.querySelectorAll('[data-match-side="meaning"]')].find((node) => node.dataset.id === id);
    if (!left || !right) continue;
    const a = left.getBoundingClientRect(), b = right.getBoundingClientRect();
    const x1 = a.right - bounds.left, y1 = a.top + a.height / 2 - bounds.top;
    const x2 = b.left - bounds.left, y2 = b.top + b.height / 2 - bounds.top;
    const path = paths.get(id) || document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const stub = Math.min(14, Math.max(0, (x2 - x1) / 4));
    path.setAttribute('d', `M${x1} ${y1} H${x1 + stub} L${x2 - stub} ${y2} H${x2}`);
    if (!paths.has(id)) {
      path.dataset.id = id;
      path.setAttribute('pathLength', '1');
      path.setAttribute('class', id === learningSession.pendingMatchLine ? 'match-line match-line--draw' : 'match-line');
      svg.append(path);
    }
  }
  learningSession.pendingMatchLine = null;
}

function sentenceLimit() { return state.preferences.difficulty === 'advanced' ? 5 : state.preferences.difficulty === 'intermediate' ? 4 : 3; }
function letterOptions(letter) {
  const answer = letter.toUpperCase();
  const distractors = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].filter((value) => value !== answer);
  return shuffle([answer, distractors[randomInt(distractors.length)]]);
}

function prepareSentence(index = 0) {
  learningSession.itemIndex = index;
  const item = learningSession.items[index];
  const tokens = item.example.split(/\s+/).map((text, tokenIndex) => ({ id: `${item.id}-${tokenIndex}`, text }));
  learningSession.sentenceTokens = tokens;
  learningSession.sentenceBank = shuffle(tokens.map((token) => token.id));
  learningSession.sentenceAnswer = [];
  learningSession.sentenceSolved = false;
  learningSession.feedback = null;
}

function tokenMarkup(tokenId, zone, index = -1) {
  const token = learningSession.sentenceTokens.find((item) => item.id === tokenId);
  if (zone === 'answer' && learningSession.sentenceSolved) return clickableWord(token.text);
  const wrong = zone === 'answer' && learningSession.feedback?.wrongPositions?.includes(index);
  const correct = zone === 'answer' && learningSession.feedback?.type === 'correct';
  return `<button class="word-token ${wrong ? 'misplaced' : ''} ${correct ? 'placed-correct' : ''}" draggable="true" data-token="${tokenId}" data-zone="${zone}">${escapeHtml(token.text)}</button>`;
}

function sentenceGame() {
  const session = learningSession;
  const total = Math.min(sentenceLimit(), session.items.length);
  const item = session.items[session.itemIndex];
  return `<div class="page game-page">${stageHeader(3, '문장 조립', '')}${progress(session.itemIndex + 1, total, '문장')}<section class="sentence-card"><div class="sentence-prompt"><span>${clickableWord(item.word, item.meaning)}</span><h2>${item.translation}</h2></div><div class="sentence-zone ${session.sentenceAnswer.length ? '' : 'empty'}" data-drop-zone="answer">${session.sentenceAnswer.length ? session.sentenceAnswer.map((id, index) => tokenMarkup(id, 'answer', index)).join('') : '<p>단어를 순서대로 놓으세요</p>'}</div><div class="sentence-bank" data-drop-zone="bank">${session.sentenceBank.map((id) => tokenMarkup(id, 'bank')).join('')}</div><p class="game-message ${session.feedback?.type || ''}" role="status">${session.feedback?.text || '단어를 누르거나 끌어 옮기세요.'}</p>${session.sentenceSolved ? button(session.itemIndex === total - 1 ? '단어찾기로 이어가기' : '다음 문장', 'sentence-next') : button('문장 확인', 'check-sentence', 'primary', session.sentenceBank.length > 0)}</section></div>`;
}

function prepareWordSearch() {
  stopSearchTimer();
  const targets = learningSession.items.slice(0, 3);
  learningSession.spelling = targets.map((item) => ({ item, index: learningSession.mode === 'arcade' ? item.word.length : 0, options: letterOptions(item.word[0]) }));
  learningSession.stage = 'search';
  learningSession.searchRules = wordSearchRules[state.preferences.difficulty] || wordSearchRules.basic;
  learningSession.grid = buildWordGrid(targets, learningSession.searchRules);
  learningSession.targets = targets;
  learningSession.foundIds = [];
  learningSession.dragPath = [];
  learningSession.wrongPath = [];
  learningSession.remaining = 60;
  learningSession.searchEnded = false;
  learningSession.searchStarted = false;
  if (learningSession.mode === 'arcade') {
    learningSession.score = 0;
    learningSession.setsCleared = 0;
    learningSession.elapsed = 0;
    learningSession.penalty = null;
    learningSession.searchTransitioning = false;
  }
  learningSession.puzzleId = ++searchPuzzleSequence;
  learningSession.feedback = null;
  render({ resetScroll: true });
}

function nextArcadeTargets(previousIds) {
  const pool = learningSession.gamePool.map(({ id }) => id);
  const fresh = shuffle(pool.filter((id) => !previousIds.includes(id)));
  const reused = shuffle(pool.filter((id) => previousIds.includes(id)));
  return [...fresh, ...reused].slice(0, 3).map(byId);
}

function nextArcadeBoard() {
  searchTransitionTimer = 0;
  if (screen !== 'learn' || learningSession?.mode !== 'arcade') return;
  const session = learningSession;
  const targets = nextArcadeTargets(session.targets.map(({ id }) => id));
  session.items = targets;
  session.targets = targets;
  session.spelling = targets.map((item) => ({ item, index: item.word.length, options: [] }));
  session.grid = buildWordGrid(targets, session.searchRules);
  session.foundIds = [];
  session.dragPath = [];
  session.wrongPath = [];
  session.searchEnded = false;
  session.searchTransitioning = false;
  session.puzzleId = ++searchPuzzleSequence;
  session.feedback = { type: 'correct', text: `${session.setsCleared + 1}번째 퍼즐` };
  render();
  startSearchTimer();
}

function startSearchPenalty(session) {
  const round = session.elapsed / 60;
  const type = round % 2 === 1 ? 'fog' : 'hint';
  const occupied = new Set(session.grid.placements.flatMap(({ id, indices }) => session.foundIds.includes(id) ? indices : [indices[0]]));
  const candidates = shuffle(session.grid.cells.map((_, index) => index).filter((index) => !occupied.has(index)));
  session.penalty = { type, until: session.elapsed + 10, cells: candidates.slice(0, 5) };
  session.feedback = { type: 'try', text: type === 'fog' ? '안개: 5칸이 10초간 가려져요. 드래그는 계속 가능해요.' : '힌트 숨김: 시작 칸 표시가 10초간 사라져요.' };
  render();
}

function formatTime(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }

function updateTimerUI() {
  if (!learningSession || learningSession.stage !== 'search') return;
  const timer = root.querySelector('[data-search-timer]');
  if (timer) {
    timer.textContent = formatTime(learningSession.remaining);
    timer.classList.toggle('ending', learningSession.remaining <= 20);
    root.querySelector('.search-page')?.classList.toggle('search-page--ending', learningSession.remaining <= 20);
  }
  const penalty = root.querySelector('[data-search-penalty]');
  if (penalty && learningSession.penalty) penalty.textContent = `${learningSession.penalty.type === 'fog' ? '안개' : '힌트 숨김'} ${Math.max(0, learningSession.penalty.until - learningSession.elapsed)}초`;
}

function startSearchTimer() {
  stopSearchTimer();
  searchTimer = window.setInterval(() => {
    if (!learningSession || learningSession.stage !== 'search' || learningSession.searchEnded) return stopSearchTimer();
    learningSession.remaining = Math.max(0, learningSession.remaining - 1);
    if (learningSession.mode === 'arcade') {
      learningSession.elapsed += 1;
      if (learningSession.penalty && learningSession.elapsed >= learningSession.penalty.until) {
        learningSession.penalty = null;
        learningSession.feedback = null;
        render();
      }
      if (learningSession.elapsed >= 60 && learningSession.elapsed % 60 === 0 && learningSession.remaining > 0) startSearchPenalty(learningSession);
    }
    updateTimerUI();
    if (!learningSession.remaining) {
      learningSession.searchEnded = true;
      if (learningSession.mode === 'arcade') specialEffect(learningSession.score > learningSession.startingBest ? 'record' : 'over');
      learningSession.penalty = null;
      learningSession.mistakes += 1;
      if (learningSession.mode !== 'arcade') learningSession.targets.filter(({ id }) => !learningSession.foundIds.includes(id)).forEach(({ id }) => recordLearningAnswer(id, 'timeout'));
      learningSession.feedback = { type: 'try', text: learningSession.mode === 'arcade' ? `시간이 다 됐어요 · ${learningSession.score}점 · ${learningSession.setsCleared}세트 완료` : '시간이 다 됐어요.' };
      stopSearchTimer();
      render();
    }
  }, 1000);
}

function wordSearchGame() {
  const session = learningSession;
  const arcade = session.mode === 'arcade';
  const header = arcade ? '<div class="game-header"><h1>단어 찾기</h1><button class="game-exit" data-nav="home">나가기</button></div>' : stageHeader(4, '단어 찾기', '');
  if (!session.searchStarted) return `<div class="page game-page search-page">${header}<section class="card search-ready">${pixelSprite('search')}<h2>단어 찾기</h2><p>뜻에 맞는 영어 단어를 격자에서 찾으세요. 첫 글자부터 마지막 글자까지 가로, 세로 또는 대각선으로 끌면 돼요.</p><small>철자 고르기는 힌트예요. 바로 격자를 끌어도 돼요.</small><small>60초 · 단어마다 +10초${arcade ? ' · 세트마다 +20초' : ''}</small>${arcade ? `<small>1분마다 10초 방해 · 점수 ×${session.searchRules.multiplier}</small>` : ''}${button('시작하기', 'search-start')}</section></div>`;
  const grid = session.grid;
  const foundCells = new Set(grid.placements.filter((placement) => session.foundIds.includes(placement.id)).flatMap((placement) => placement.indices));
  const justFoundCells = new Set(grid.placements.find((placement) => placement.id === session.feedback?.targetId)?.indices || []);
  const firstLetters = new Set(grid.placements.filter(({ id }) => !session.searchEnded && !session.foundIds.includes(id)
    && session.spelling.some(({ item, index }) => item.id === id && index === item.word.length)).map(({ indices }) => indices[0]));
  const fogged = new Set(session.penalty?.type === 'fog' ? session.penalty.cells : []);
  const clues = session.spelling.map(({ item, index, options }, slot) => {
    const done = session.foundIds.includes(item.id);
    const spelling = item.word.slice(0, index).toUpperCase();
    return `<div class="spell-clue"><strong>${escapeHtml(item.meaning)}</strong>
      ${done ? `<span class="spell-found">✓ ${escapeHtml(item.word.toUpperCase())}</span>` : arcade ? '' : index === item.word.length ? '<small>첫 칸 표시됨</small>' :
      `<div class="spell-choices" role="group" aria-label="${escapeHtml(item.meaning)} 철자 힌트"><small>${index + 1}번째</small>${options.map((letter) => button(letter, `spell:${slot}:${letter}`, 'secondary', session.searchEnded)).join('')}${spelling ? `<span class="spell-progress">${escapeHtml(spelling)}</span>` : ''}</div>`}</div>`;
  }).join('');
  const puzzle = `<div class="letter-grid letter-grid--drag" style="--grid-size:${grid.size}" role="grid" aria-label="단어 찾기 퍼즐">
    ${grid.cells.map((letter, index) => `<button type="button" role="gridcell" data-grid-index="${index}" class="${foundCells.has(index) ? 'found' : ''} ${justFoundCells.has(index) ? 'just-found' : ''} ${session.wrongPath.includes(index) ? 'try-again' : ''} ${firstLetters.has(index) ? 'first-letter' : ''} ${fogged.has(index) && !foundCells.has(index) ? 'fogged' : ''}" aria-label="${letter}${firstLetters.has(index) ? ', 시작 글자' : ''}">${fogged.has(index) && !foundCells.has(index) ? '?' : letter}</button>`).join('')}</div>`;
  return `<div class="page game-page search-page${arcade ? ' search-page--arcade' : ''}${session.penalty?.type === 'hint' ? ' search-page--no-hint' : ''}">${header}
    <div class="search-toolbar"><div><span>남은 시간</span><strong data-search-timer>${formatTime(session.remaining)}</strong></div><div><span>찾은 단어</span><strong>${session.foundIds.length}/${session.targets.length}</strong></div>${arcade ? `<div class="search-score"><span>${session.setsCleared + 1}세트 · ${session.score}점</span><strong>최고 ${bestScore(state, 'search')}점</strong>${session.penalty ? `<em data-search-penalty>${session.penalty.type === 'fog' ? '안개' : '힌트 숨김'} ${session.penalty.until - session.elapsed}초</em>` : ''}</div>` : ''}</div>
    <div class="search-workspace"><div class="spell-list">${clues}</div><div class="puzzle-space">${puzzle}</div></div>
    <p class="game-message ${session.feedback?.type || ''}" role="status">${session.feedback?.text || '첫 글자부터 끝까지 드래그'}</p>
    ${session.searchEnded ? (arcade ? gameOverActions('arcade-search', session.score, session.startingBest) : button('학습 마치기', 'finish-search')) : ''}</div>`;
}

function learn() {
  if (learningSession.stage === 'intro') {
    return `<div class="page game-page boss-intro"><div class="game-header"><h1>보스 슬라임</h1><button class="game-exit" data-nav="home">나가기</button></div><div class="boss-intro-scene">${pixelSprite('boss')}<p>학습을 완료해 보스 슬라임을 물리치세요!</p></div>${button('시작하기', 'boss-intro-start')}</div>`;
  }
  if (!learningSession) return `<div class="page">${card(`<h2>진행 중인 학습이 없어요</h2>${button('홈으로', 'go-home')}`, 'empty')}</div>`;
  if (learningSession.stage === 'preview') return previewGame();
  if (learningSession.stage === 'match') return matchingGame();
  if (learningSession.stage === 'sentence') return sentenceGame();
  return wordSearchGame();
}

function finishLearning() {
  if (!learningSession) return;
  stopSearchTimer();
  const ids = learningSession.items.map((item) => item.id);
  if (learningSession.mode === 'arcade') return goHome('단어 찾기를 마쳤어요.');
  const mistakes = learningSession.mistakes;
  resultWordCount = ids.length;
  resultGrade = mistakes === 0 ? 'perfect' : mistakes <= 3 ? 'excellent' : 'good';
  resultReward = learningSession.mode === 'review' ? 0 : ids.length * 5;
  resultBossHp = 4 - learningSession.bossHits;
  state = applyLearningBatch(state, ids, learningSession.mode, new Date(), { ...learningSession.curriculum, perfect: mistakes === 0, deferReward: true });
  persist();
  learningSession = null;
  screen = 'result';
  specialEffect('lesson');
  render({ resetScroll: true });
}

function resultView() {
  const label = { perfect: 'PERFECT!', excellent: 'EXCELLENT!', good: 'GOOD!' }[resultGrade] || 'GOOD!';
  const sparks = resultGrade === 'perfect' ? 16 : resultGrade === 'excellent' ? 6 : 0;
  return `<div class="page page--narrow result-page result-page--${resultGrade}"><div class="result-mascot">${pixelSprite('mascot')}${Array.from({ length: sparks }, (_, index) => `<i style="--angle:${index * 360 / sparks}deg;--delay:${index % 4 * 80}ms"></i>`).join('')}</div><p class="eyebrow">LESSON CLEAR</p><h1>${label}</h1><p>보스 슬라임 ${resultBossHp}/4 · ${resultWordCount}단어 완료</p><div class="result-reward">획득 XP <strong>+${resultReward}</strong></div>${button('홈으로', 'result-home')}</div>`;
}

function quickOptions(item, items) {
  const pool = [...items, ...itemsForMajor(state.preferences.major)].filter((candidate) => candidate.meaning !== item.meaning).map((candidate) => candidate.meaning);
  return shuffle([item.meaning, ...shuffle([...new Set(pool)]).slice(0, 3)]);
}

function startQuickCheck(ids, reviewMode = false) {
  const items = validIds(ids).map(byId).slice(-5);
  if (!items.length) return goHome('먼저 오늘 학습을 시작해 주세요.');
  quickSession = { items, reviewMode, combo: 0, index: 0, score: 0, selection: '', submitted: false, options: quickOptions(items[0], items) };
  screen = 'quick';
  notice = '';
  render({ resetScroll: true });
}

function quickCheck() {
  const session = quickSession;
  if (!session) return `<div class="page">${card('<h2>확인할 단어가 없어요.</h2>', 'empty')}</div>`;
  const item = session.items[session.index];
  const correct = session.selection === item.meaning;
  return `<div class="page page--narrow"><div class="game-header"><div><p class="eyebrow">${session.reviewMode ? `복습 · ${session.combo} 콤보` : '빠른 확인'}</p><h1>${clickableWord(item.word, item.meaning)}</h1></div><button class="game-exit" data-nav="home">나가기</button></div>${progress(session.index + 1, session.items.length, '뜻 확인')}<button class="listen-button" data-action="speak-quick">▶ 발음 듣기</button><div class="choices quiz-choices">${session.options.map((option) => `<button class="choice ${session.selection === option ? 'choice--selected' : ''} ${session.submitted && option === item.meaning ? 'choice--correct' : ''} ${session.submitted && session.selection === option && !correct ? 'choice--try' : ''}" data-quick-answer="${escapeHtml(option)}" ${session.submitted ? 'disabled' : ''}>${escapeHtml(option)}${session.submitted && option === item.meaning ? '<span>✓</span>' : ''}</button>`).join('')}</div>${session.submitted ? card(`<h2>${correct ? '정답' : '정답 확인'}</h2><p>${clickableWord(item.word, item.meaning)} · ${item.meaning}</p>${button(session.index === session.items.length - 1 ? '홈으로' : '다음', 'quick-next')}`, `feedback ${correct ? 'feedback--correct' : 'feedback--try'}`) : button('확인', 'quick-submit', 'primary', !session.selection)}</div>`;
}

function currentTalk() {
  const entries = smallTalks[state.preferences.difficulty] || smallTalks.basic;
  const day = new Date().toLocaleDateString('sv-SE');
  const saved = state.talkRotation;
  if (!saved || saved.day !== day || saved.difficulty !== state.preferences.difficulty || !Array.isArray(saved.seen) || !entries[saved.index]) {
    const index = (new Date().getDate() + Object.keys(majorLabels).indexOf(state.preferences.major)) % entries.length;
    talkChoice = { day, difficulty: state.preferences.difficulty, index, seen: [index] };
    state.talkRotation = talkChoice;
    persist();
  } else talkChoice = saved;
  return { entries, selected: entries[talkChoice.index] };
}

function rotateTalk() {
  const { entries } = currentTalk();
  const alternatives = entries.map((_, index) => index).filter((index) => index !== talkChoice.index);
  const unseen = alternatives.filter((index) => !talkChoice.seen.includes(index));
  const remaining = unseen.length ? unseen : alternatives;
  if (!remaining.length) return;
  stopSpeech();
  const index = remaining[randomInt(remaining.length)];
  talkChoice = { ...talkChoice, index, seen: unseen.length ? [...talkChoice.seen, index] : [index] };
  state.talkRotation = talkChoice;
  persist();
  render();
}

function smallTalk() {
  const { entries, selected } = currentTalk();
  const spoken = clickableSentence(selected[0]);
  return `<div class="page page--narrow"><div class="page-intro"><p class="eyebrow">TODAY'S SMALL TALK</p><h1>스몰토크</h1></div>${card(`<span class="talk-level">${difficultyLabels[state.preferences.difficulty].split(' · ')[0]}</span><div class="talk-sentence-row"><h2 class="talk-sentence">${spoken}</h2><button class="talk-refresh" data-action="talk-refresh" aria-label="다른 스몰토크 보기" title="다른 스몰토크" ${entries.length < 2 ? 'disabled' : ''}>${pixelIcon('refresh')}</button></div><button class="listen-button" data-action="speak-smalltalk">▶ 발음 듣기</button><div class="talk-detail"><div><span>뜻</span><p>${selected[1]}</p></div><div><span>언제 쓰나요?</span><p>${selected[2]}</p></div></div>`, 'small-talk-card')}${button('맞춰보기', 'talk-quiz')}${button('대화하기', 'talk-conversation', 'secondary')}</div>`;
}

function openTalkQuiz() {
  const { selected } = currentTalk();
  const tokens = selected[0].split(/\s+/).map((word, index) => ({ id: index, word }));
  talkQuiz = { translation: selected[1], tokens, bank: shuffle(tokens.map(({ id }) => id)), answer: [], feedback: '', solved: false, wrongIndex: -1 };
  screen = 'smalltalkquiz';
  render({ resetScroll: true });
}

function talkQuizView() {
  const quiz = talkQuiz;
  const word = (id, zone, index) => quiz.solved && zone === 'answer' ? clickableWord(quiz.tokens[id].word) : `<button class="word-token ${zone === 'answer' && index === quiz.wrongIndex ? 'misplaced' : ''}" data-talk-token="${id}" data-talk-zone="${zone}" draggable="true">${escapeHtml(quiz.tokens[id].word)}</button>`;
  return `<div class="page page--narrow game-page"><div class="game-header"><h1>스몰토크 맞춰보기</h1><button class="game-exit" data-nav="smalltalk">나가기</button></div><section class="sentence-card"><div class="sentence-prompt"><span>뜻</span><h2>${quiz.translation}</h2></div><div class="sentence-zone" data-talk-drop="answer">${quiz.answer.map((id, index) => word(id, 'answer', index)).join('') || '<p>단어를 순서대로 놓으세요</p>'}</div><div class="sentence-bank" data-talk-drop="bank">${quiz.bank.map((id, index) => word(id, 'bank', index)).join('')}</div><p class="game-message" role="status">${quiz.feedback || '단어를 누르거나 끌어서 문장을 만드세요.'}</p>${quiz.solved ? button('스몰토크로', 'talk-done') : button('문장 확인', 'talk-check', 'primary', quiz.bank.length > 0)}</section></div>`;
}

function moveTalkToken(id, zone, index = null) {
  if (!talkQuiz || talkQuiz.solved) return;
  playEffect('place');
  talkQuiz.bank = talkQuiz.bank.filter((value) => value !== id);
  talkQuiz.answer = talkQuiz.answer.filter((value) => value !== id);
  const list = zone === 'answer' ? talkQuiz.answer : talkQuiz.bank;
  list.splice(index === null ? list.length : Math.min(index, list.length), 0, id);
  talkQuiz.feedback = '';
  talkQuiz.wrongIndex = -1;
  render();
}

function clickableWord(text, meaning = '') {
  const word = text.toLowerCase().replace(/[^a-z']/g, '');
  const gloss = meaning || vocabulary.find((item) => item.word.toLowerCase() === word)?.meaning || commonMeanings[word];
  if (!word) return escapeHtml(text);
  return `<button type="button" class="inline-word" data-dictionary-word="${escapeHtml(word)}" data-meaning="${escapeHtml(gloss)}">${escapeHtml(text)}</button>`;
}

function clickableSentence(text) {
  return text.split(/\s+/).map((word) => `<span data-spoken-start>${clickableWord(word)}</span>`).join(' ');
}

function speakSmallTalk(manual = false) {
  return speakText(currentTalk().selected[0], [...root.querySelectorAll('[data-spoken-start]')], { manual });
}

function learnedGamePool() {
  return shuffle(validIds(getLearnedIds(state)).map(byId)).slice(0, 5);
}

function review() {
  const words = rankedWords(state).filter(({ id }) => byId(id));
  const pageSize = 4;
  const pages = Math.max(1, Math.ceil(words.length / pageSize));
  reviewPage = Math.min(reviewPage, pages - 1);
  const list = words.slice(reviewPage * pageSize, (reviewPage + 1) * pageSize);
  return `<div class="page review-page"><div class="page-intro"><h1>복습</h1></div>
    ${button('복습하기', 'review-game', 'primary', !words.length)}
    <section class="review-words"><h2>배운 단어 보기</h2>
    ${list.length ? `<ul>${list.map(({ id, score }) => `<li><strong>${clickableWord(byId(id).word, byId(id).meaning)}</strong><span>${byId(id).meaning}</span><small>${score}점</small></li>`).join('')}</ul>` : '<p>학습을 마치면 여기에 단어가 표시돼요.</p>'}</section>
    ${pages > 1 ? `<div class="review-pager">${button('이전', 'review-prev', 'secondary', !reviewPage)}<span>${reviewPage + 1} / ${pages}</span>${button('다음', 'review-next', 'secondary', reviewPage === pages - 1)}</div>` : ''}
  </div>`;
}

function stats() {
  const value = getStats(state);
  return `<div class="page"><div class="page-intro"><p class="eyebrow">PROGRESS</p><h1>학습 기록</h1></div><div class="stats-grid stats-grid--three">${card(`<strong>${value.learned}</strong><span>배운 단어</span>`)}${card(`<strong>${value.learningStreak}</strong><span>연속 학습 일</span>`)}${card(`<strong>${value.perfectStreak}</strong><span>연속 완벽 학습</span>`)}</div><section class="card game-records"><h2>게임 최고 점수</h2><div><span>단어 찾기 <strong>${bestScore(state, 'search')}점</strong></span><span>사과 베기 <strong>${bestScore(state, 'slice')}점</strong></span><span>타자 게임 <strong>${bestScore(state, 'typing')}점</strong></span></div></section></div>`;
}

function resetLocalData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    notice = '저장 데이터를 지우지 못했어요. 다시 시도해 주세요.';
    return render();
  }
  stopSpeech();
  window.clearTimeout(xpClaimTimer);
  window.clearTimeout(celebrationTimer);
  xpClaimTimer = 0;
  celebration = null;
  state = structuredClone(initialState);
  draftMajor = state.preferences.major;
  draftDifficulty = state.preferences.difficulty;
  onboardingStep = 0;
  reviewPage = 0;
  resetOpen = false;
  navigate('onboarding');
}

function settings() {
  const reset = resetOpen
    ? `<p role="alert">현재 접속 주소에 저장된 학습 기록, 점수, 설정이 지워져요. 되돌릴 수 없어요.</p><div class="game-over-actions">${button('취소', 'settings-reset-cancel', 'secondary')}${button('모두 지우기', 'settings-reset-confirm', 'danger')}</div>`
    : button('데이터 초기화', 'settings-reset', 'quiet');
  return `<div class="page page--narrow"><h1>설정</h1>${card(`<label>전공<select data-setting="major">${Object.entries(majorLabels).map(([value, label]) => `<option value="${value}" ${state.preferences.major === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label>난이도<select data-setting="difficulty">${Object.entries(difficultyLabels).map(([value, label]) => `<option value="${value}" ${state.preferences.difficulty === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label><div class="fixed-goal"><span>하루 목표</span><strong>5단어 · 약 5분</strong></div><label>희망 시간<input data-setting="reminderTime" type="time" value="${state.preferences.reminderTime}"></label>`, 'form-card')}${button('저장', 'settings-done')}<section class="card settings-reset"><h2>저장 데이터</h2>${reset}</section></div>`;
}

function paint() {
  const views = { onboarding, home, learn, quick: quickCheck, smalltalk: smallTalk, smalltalkquiz: talkQuizView, conversation: conversation.view, review, stats, settings, duel: orchard.view, result: resultView, typing: typingGame.view };
  const isOnboarding = screen === 'onboarding';
  const isImmersive = ['learn', 'quick', 'duel', 'result', 'typing', 'smalltalkquiz', 'conversation'].includes(screen);
  const activeStage = screen === 'learn' ? learningSession?.stage || '' : screen;
  root.className = [isOnboarding ? 'app--onboarding' : '', isImmersive ? 'app--immersive' : ''].filter(Boolean).join(' ');
  root.innerHTML = `${isOnboarding ? '' : header()}${notice ? `<div class="notice" role="status">${escapeHtml(notice)}</div>` : ''}<main id="main" data-screen="${screen}" data-stage="${activeStage}" class="${isOnboarding ? 'main main--onboarding' : 'main'}">${(views[screen] || home)()}</main>${isOnboarding || isImmersive ? '' : nav()}${successBurst()}`;
  animateBossHit();
  if (screen === 'home') absorbPendingXp();
  if (screen === 'learn' && learningSession?.stage === 'search') updateTimerUI();

}

function currentViewKey() {
  if (screen === 'onboarding') return `${screen}:${onboardingStep}`;
  if (screen === 'learn' && learningSession) {
    if (learningSession.stage === 'preview') return `${screen}:preview:${learningSession.previewIndex}`;
    if (learningSession.stage === 'sentence') return `${screen}:sentence:${learningSession.itemIndex}`;
    if (learningSession.stage === 'search') return `${screen}:search:${learningSession.puzzleId}:${learningSession.searchStarted}`;
    return `${screen}:${learningSession.stage}`;
  }
  if (screen === 'quick' && quickSession) return `${screen}:${quickSession.index}`;
  return screen;
}

function render({ resetScroll = false } = {}) {
  document.documentElement.dataset.webviewSwitchSafe = String(
    screen === 'home' || screen === 'onboarding' && onboardingStep === 0
  );
  const nextViewKey = currentViewKey();
  const isViewChange = paintedViewKey && paintedViewKey !== nextViewKey;
  const previousScreen = paintedViewKey?.split(':')[0];
  const isPageTurn = isViewChange && previousScreen === screen && ['learn', 'quick', 'onboarding'].includes(screen);
  const focusedElement = document.activeElement;
  const previousFocusKey = motionNodes().find(({ element }) => element === focusedElement)?.key || '';
  const previousLayout = !isViewChange && screen !== 'duel' && !(screen === 'learn' && learningSession?.stage === 'match') && paintedViewKey ? captureMotionLayout() : null;
  const previousMain = root.querySelector('.main');
  const previousScroll = resetScroll ? 0 : previousMain?.scrollTop || 0;
  paintedViewKey = nextViewKey;
  const restoreScroll = () => {
    const main = root.querySelector('.main');
    if (!main) return;
    const maximum = Math.max(0, main.scrollHeight - main.clientHeight);
    main.scrollTop = Math.min(previousScroll, maximum);
  };
  const paintAndRestore = () => {
    paint();
    fitVisibleText();
    if (previousFocusKey) {
      const nextFocus = motionNodes().find(({ key }) => key === previousFocusKey)?.element;
      if (nextFocus && !nextFocus.disabled) {
        nextFocus.focus({ preventScroll: true });
      } else if (focusedElement?.matches?.('[data-match-side], [data-token], [data-quick-answer]')) {
        const feedback = root.querySelector('.game-message');
        if (feedback) {
          feedback.tabIndex = -1;
          feedback.focus({ preventScroll: true });
        }
      }
    }
    restoreScroll();
    drawMatchLines();
  };
  paintAndRestore();
  const main = root.querySelector('.main');
  if (isViewChange) main?.classList.add(isPageTurn ? 'main--turn' : 'main--enter');
  if (previousLayout) requestAnimationFrame(() => {
    if (main?.isConnected) animateFluidLayout(previousLayout);
  });
}
window.addEventListener('resize', drawMatchLines);

function recordLearningAnswer(id, result) {
  if (result === 'incorrect') playEffect('retry');
  state = applyGradedResult(state, id, result, new Date(), { reward: false });
  persist();
}

function evaluateMatch() {
  const session = learningSession;
  if (!session.selectedWord || !session.selectedMeaning) return;
  window.clearTimeout(matchFeedbackTimer);
  const word = session.selectedWord;
  const meaning = session.selectedMeaning;
  if (word === meaning) {
    session.matched.push(word);
    session.pendingMatchLine = word;
    playEffect('correct');
    recordLearningAnswer(word, 'correct');
    session.feedback = { type: 'correct', text: `좋아요! ${byId(word).word}의 뜻을 찾았어요.`, word };
    if (session.matched.length === session.items.length) { hitLessonBoss('match'); triggerCelebration('단어를 모두 연결했어요'); }
  } else {
    session.mistakes += 1;
    recordLearningAnswer(word, 'incorrect');
    session.feedback = { type: 'try', text: '이 단어의 뜻이 아니에요. 표시된 카드를 다시 확인해 보세요.', word, meaning };
    matchFeedbackTimer = window.setTimeout(() => {
      if (!learningSession || learningSession.stage !== 'match') return;
      learningSession.feedback = null;
      render();
    }, 850);
  }
  session.selectedWord = '';
  session.selectedMeaning = '';
}

function moveToken(tokenId, destination, insertionIndex = null) {
  const session = learningSession;
  if (session.sentenceSolved) return;
  playEffect('place');
  session.sentenceBank = session.sentenceBank.filter((id) => id !== tokenId);
  session.sentenceAnswer = session.sentenceAnswer.filter((id) => id !== tokenId);
  const destinationItems = destination === 'answer' ? session.sentenceAnswer : session.sentenceBank;
  const index = insertionIndex === null ? destinationItems.length : Math.max(0, Math.min(insertionIndex, destinationItems.length));
  destinationItems.splice(index, 0, tokenId);
  session.feedback = null;
  render();
}

function clearDropPreview() {
  root.querySelectorAll('.drop-preview').forEach((marker) => marker.remove());
  root.querySelectorAll('.drop-active').forEach((zone) => zone.classList.remove('drop-active'));
}

function showDragGhost(token, x, y) {
  if (!token) return;
  dragGhost?.remove();
  dragGhost = token.cloneNode(true);
  dragGhost.removeAttribute('data-token');
  dragGhost.removeAttribute('data-talk-token');
  dragGhost.classList.remove('dragging', 'is-pressed');
  dragGhost.classList.add('drag-ghost');
  dragGhost.style.left = `${x}px`;
  dragGhost.style.top = `${y}px`;
  document.body.append(dragGhost);
  token.classList.add('dragging');
}

function moveDragGhost(x, y) {
  if (!dragGhost) return;
  dragGhost.style.left = `${x}px`;
  dragGhost.style.top = `${y}px`;
}

function clearDragGhost() {
  dragGhost?.remove();
  dragGhost = null;
  root.querySelectorAll('.word-token.dragging').forEach((token) => token.classList.remove('dragging'));
}

function showDropPreview(zone, event) {
  clearDropPreview();
  const tokens = [...zone.querySelectorAll('[data-token]')].filter((token) => token.dataset.token !== draggedToken);
  let insertionIndex = tokens.length;
  for (let index = 0; index < tokens.length; index += 1) {
    const rect = tokens[index].getBoundingClientRect();
    const beforeRow = event.clientY < rect.top + rect.height * .35;
    const sameRow = event.clientY <= rect.bottom && event.clientY >= rect.top;
    if (beforeRow || (sameRow && event.clientX < rect.left + rect.width / 2)) {
      insertionIndex = index;
      break;
    }
  }
  const marker = document.createElement('span');
  marker.className = 'drop-preview';
  marker.dataset.insertionIndex = String(insertionIndex);
  marker.setAttribute('aria-hidden', 'true');
  if (tokens[insertionIndex]) zone.insertBefore(marker, tokens[insertionIndex]);
  else zone.append(marker);
  zone.classList.add('drop-active');
}

function paintDragPath(path) {
  root.querySelectorAll('.letter-grid button.selecting').forEach((cell) => cell.classList.remove('selecting'));
  path.forEach((index) => root.querySelector(`[data-grid-index="${index}"]`)?.classList.add('selecting'));
}

function resolveSearchPath(path) {
  const session = learningSession;
  const target = session.grid.placements.find((placement) => {
    if (session.foundIds.includes(placement.id)) return false;
    return path.length === placement.indices.length
      && (path.every((cell, index) => cell === placement.indices[index])
      || path.every((cell, index) => cell === placement.indices.at(-1 - index)));
  });
  if (target) {
    playEffect('correct');
    session.foundIds.push(target.id);
    session.remaining += 10;
    if (session.mode === 'arcade') {
      session.score += wordSearchPoints(session.searchRules, 100);
      saveBest('search', session.score);
    } else recordLearningAnswer(target.id, 'correct');
    session.feedback = { type: 'correct', text: `${byId(target.id).word} · +10초`, targetId: target.id };
    session.wrongPath = [];
    if (session.foundIds.length === session.targets.length) {
      stopSearchTimer();
      if (session.mode === 'arcade') {
        session.remaining += 20;
        const bonus = wordSearchPoints(session.searchRules, 150);
        session.score += bonus;
        session.setsCleared += 1;
        session.searchTransitioning = true;
        session.feedback = { type: 'correct', text: `3개 완료! +20초 · 세트 보너스 +${bonus}점` };
        saveBest('search', session.score);
        searchTransitionTimer = window.setTimeout(nextArcadeBoard, 400);
      } else {
        session.searchEnded = true;
        hitLessonBoss('search');
        triggerCelebration('퍼즐 속 단어를 모두 찾았어요');
      }
    }
  } else {
    session.mistakes += 1;
    const attempted = session.grid.placements.find(({ indices }) => indices.includes(path[0]));
    if (session.mode !== 'arcade' && attempted && !session.foundIds.includes(attempted.id)) recordLearningAnswer(attempted.id, 'incorrect');
    playEffect('retry');
    session.wrongPath = path;
    session.feedback = { type: 'try', text: '찾는 단어가 아니에요. 첫 글자부터 끝까지 일직선으로 끌어 보세요.' };
  }
  session.dragPath = [];
  render();
}

function playTouchEffect(event) {
  const word = event.target.closest('[data-dictionary-word], [data-match-side="word"], .word-token, [data-apple-index]');
  if (event.target.closest('.pixel-sprite--slime, .typing-enemy:not(.typing-item)')) return playEffect('place');
  const control = event.target.closest('button, input, select, label, a');
  playEffect(word ? 'word' : control ? 'tap' : 'surface');
}

document.addEventListener('pointerup', (event) => {
  if (event.isPrimary && event.button === 0) playTouchEffect(event);
}, { capture: true });

root.addEventListener('click', (event) => {
  if (event.detail === 0) playTouchEffect(event);
}, { capture: true });

root.addEventListener('click', (event) => {
  const sprite = event.target.closest('.pixel-sprite--slime, .typing-enemy:not(.typing-item)');
  if (sprite) {
    reactToSlime(sprite);
    if (sprite.closest('.brand')) return;
  }
  const target = event.target.closest('button');
  if (!target) return;
  if (target.dataset.appleIndex !== undefined) return orchard.click(event, target);
  if (target.dataset.gridIndex !== undefined) return;
  if (target.dataset.dictionaryWord) return showWordMeaning(target);
  if (target.dataset.nav) return navigate(target.dataset.nav);
  if (target.dataset.talkToken !== undefined) {
    const id = Number(target.dataset.talkToken);
    if (suppressTalkClick === id) return;
    return moveTalkToken(id, target.dataset.talkZone === 'bank' ? 'answer' : 'bank');
  }
  if (target.dataset.select === 'major') { draftMajor = target.dataset.value; return render(); }
  if (target.dataset.select === 'difficulty') { draftDifficulty = target.dataset.value; return render(); }
  if (target.dataset.matchSide) {
    if (target.dataset.matchSide === "word") speakText(byId(target.dataset.id).word);
    if (learningSession.feedback?.type === 'correct') learningSession.feedback = null;
    learningSession[target.dataset.matchSide === 'word' ? 'selectedWord' : 'selectedMeaning'] = target.dataset.id;
    evaluateMatch();
    return render();
  }
  if (target.dataset.token) {
    if (suppressTokenClick === target.dataset.token) return;
    return moveToken(target.dataset.token, target.dataset.zone === 'bank' ? 'answer' : 'bank');
  }
  if (target.dataset.quickAnswer !== undefined && !quickSession.submitted) { quickSession.selection = target.dataset.quickAnswer; return render(); }
  const action = target.dataset.action;
  if (!action) return;
  if (action === 'boss-intro-start') {
    learningSession.stage = 'preview';
    return render({ resetScroll: true });
  }
  if (action === 'talk-conversation' || action.startsWith('conversation-')) return conversation.handleAction(action, target);
  if (action === 'talk-refresh') return rotateTalk();
  if (action === 'talk-quiz') return openTalkQuiz();
  if (action === 'talk-done') return navigate('smalltalk');
  if (action === 'talk-check') {
    if (!talkQuiz || talkQuiz.bank.length) return;
    const wrong = talkQuiz.answer.findIndex((id, index) => id !== index);
    talkQuiz.solved = wrong < 0;
    if (talkQuiz.solved) speakSmallTalk();
    playEffect(wrong < 0 ? 'correct' : 'retry');
    talkQuiz.wrongIndex = wrong;
    talkQuiz.feedback = wrong < 0 ? '문장 완성!' : `${wrong + 1}번째 단어부터 다시 확인하세요.`;
    if (wrong < 0) triggerCelebration('문장을 정확하게 완성했어요', 'talk');
    return render();
  }
  if (['arcade-typing', 'arcade-duel', 'arcade-search'].includes(action) && !state.sessions.some((session) => session.mode === 'new')) return;
  if (action === 'arcade-typing' || action.startsWith('typing-')) return typingGame.handleAction(action);
  if (action === 'result-home') return goHome(`단어 ${resultWordCount}개를 학습했어요!`);
  if (['arcade-duel', 'duel-start', 'duel-restart'].includes(action) || action.startsWith('apple-')) return orchard.handleAction(action);
  if (action === 'onboarding-next') { onboardingStep += 1; return render(); }
  if (action === 'onboarding-back') { onboardingStep = Math.max(0, onboardingStep - 1); return render(); }
  if (action === 'onboarding-finish') {
    state = { ...state, onboarded: true, preferences: { ...state.preferences, major: draftMajor, difficulty: draftDifficulty, dailyGoal: 5 } };
    persist();
    return goHome('오늘 학습이 준비됐어요.');
  }
  if (action === 'start-new') {
    const major = state.preferences.major;
    const stage = nextStage(state, major);
    if (stage <= stageCount) return startLearning(stageWords(major, stage), 'new', { major, stage });
    return;
  }
  if (action === 'start-quick') {
    const major = state.preferences.major;
    const stage = nextStage(state, major);
    return startQuickCheck(stage > 1 ? stageWords(major, stage - 1) : state.lastBatchIds);
  }
  if (action === 'review-game') return startQuickCheck(pickReviewWords(rankedWords(state).filter(({ id }) => byId(id))), true);
  if (action === 'review-prev') { reviewPage = Math.max(0, reviewPage - 1); return render(); }
  if (action === 'review-next') { reviewPage += 1; return render(); }
  if (action === 'go-home') return navigate('home');
  if (action === 'preview-next') {
    if (learningSession.previewIndex < learningSession.items.length - 1) learningSession.previewIndex += 1;
    else {
      hitLessonBoss('preview');
      learningSession.stage = 'match';
      return render({ resetScroll: true });
    }
    return render();
  }
  if (action === 'review-words') {
    window.clearTimeout(matchFeedbackTimer);
    learningSession.stage = 'preview';
    learningSession.previewIndex = 0;
    learningSession.selectedWord = '';
    learningSession.selectedMeaning = '';
    learningSession.feedback = null;
    return render({ resetScroll: true });
  }
  if (action === 'start-sentence') { learningSession.stage = 'sentence'; prepareSentence(0); return render({ resetScroll: true }); }
  if (action === 'check-sentence') {
    const expected = learningSession.sentenceTokens.map((token) => token.id);
    const wrongPositions = learningSession.sentenceAnswer.map((id, index) => id === expected[index] ? -1 : index).filter((index) => index >= 0);
    if (learningSession.sentenceSolved || learningSession.sentenceBank.length) return;
    recordLearningAnswer(learningSession.items[learningSession.itemIndex].id, wrongPositions.length ? 'incorrect' : 'correct');
    if (wrongPositions.length) {
      learningSession.mistakes += 1;
      learningSession.feedback = { type: 'try', text: '표시된 단어를 다른 자리에 놓아 보세요.', wrongPositions };
    } else {
      learningSession.sentenceSolved = true;
      speakText(learningSession.items[learningSession.itemIndex].example);
      learningSession.feedback = { type: 'correct', text: '문장을 맞혔어요!' };
      if (learningSession.itemIndex === Math.min(sentenceLimit(), learningSession.items.length) - 1) hitLessonBoss('sentence');
      triggerCelebration('단어를 순서대로 모두 놓았어요!');
    }
    return render();
  }
  if (action === 'sentence-next') {
    const total = Math.min(sentenceLimit(), learningSession.items.length);
    if (learningSession.itemIndex < total - 1) { prepareSentence(learningSession.itemIndex + 1); return render(); }
    return prepareWordSearch();
  }
  if (action === 'arcade-search') {
    const pool = learnedGamePool();
    if (pool.length < 3) return;
    const targets = pool.slice(0, 3);
    screen = 'learn';
    learningSession = { mode: 'arcade', items: targets, gamePool: pool, mistakes: 0, startingBest: bestScore(state, 'search') };
    return prepareWordSearch();
  }
  if (action === 'search-start' && learningSession?.stage === 'search' && !learningSession.searchStarted) {
    learningSession.searchStarted = true;
    render({ resetScroll: true });
    return startSearchTimer();
  }
  if (action.startsWith('spell:') && !learningSession.searchEnded) {
    const [, slot, letter] = action.split(':');
    const spell = learningSession.spelling[Number(slot)];
    if (!spell || spell.index >= spell.item.word.length) return;
    if (letter === spell.item.word[spell.index].toUpperCase()) {
      playEffect('place');
      spell.index += 1;
      if (spell.index === spell.item.word.length) {
        learningSession.feedback = { type: 'correct', text: '격자에서 빛나는 칸을 찾아보세요.' };
      }
    } else {
      spell.index = 0;
      learningSession.mistakes += 1;
      recordLearningAnswer(spell.item.id, 'incorrect');
      learningSession.feedback = { type: 'try', text: '첫 글자부터 다시 골라 보세요.' };
    }
    if (spell.index < spell.item.word.length) spell.options = letterOptions(spell.item.word[spell.index]);
    return render();
  }
  if (action === 'finish-search') return finishLearning();
  if (action === 'speak-word') return speakText(learningSession.items[learningSession.previewIndex].word, [], { manual: true });
  if (action === 'speak-quick') return speakText(quickSession.items[quickSession.index].word, [], { manual: true });
  if (action === 'speak-smalltalk') return speakSmallTalk(true);
  if (action === 'quick-submit' && quickSession.selection && !quickSession.submitted) {
    const item = quickSession.items[quickSession.index];
    const correct = quickSession.selection === item.meaning;
    playEffect(correct ? 'correct' : 'retry');
    quickSession.submitted = true;
    quickSession.score += correct ? 1 : 0;
    quickSession.combo = correct ? quickSession.combo + 1 : 0;
    if (correct && quickSession.index === quickSession.items.length - 1 && quickSession.score === quickSession.items.length) triggerCelebration('단어 뜻을 모두 맞혔어요!');
    state = applyGradedResult(state, item.id, correct ? 'correct' : 'incorrect');
    persist();
    return render();
  }
  if (action === 'quick-next') {
    if (quickSession.index === quickSession.items.length - 1) {
      specialEffect('review');
      return goHome(`${quickSession.items.length}개 중 ${quickSession.score}개 정답이에요.`);
    }
    quickSession.index += 1;
    quickSession.selection = '';
    quickSession.submitted = false;
    quickSession.options = quickOptions(quickSession.items[quickSession.index], quickSession.items);
    return render();
  }
  if (action === 'settings-reset') { resetOpen = true; return render(); }
  if (action === 'settings-reset-cancel') { resetOpen = false; return render(); }
  if (action === 'settings-reset-confirm' && resetOpen) return resetLocalData();
  if (action === 'settings-done') return goHome('설정을 저장했어요.');
});

root.addEventListener('submit', (event) => {
  if (event.target.matches('.conversation-form')) {
    event.preventDefault();
    return conversation.submit(event.target.querySelector('input').value);
  }
  if (!event.target.matches('.typing-form')) return;
  event.preventDefault();
  typingGame.submit(event.target.querySelector('input')?.value || '');
});

root.addEventListener('change', (event) => {
  const key = event.target.dataset.setting;
  if (!key) return;
  const value = event.target.value;
  state = { ...state, preferences: { ...state.preferences, [key]: value, dailyGoal: 5 } };
  persist();
});

root.addEventListener('dragstart', (event) => {
  const talkToken = event.target.closest('[data-talk-token]');
  if (talkToken) { event.dataTransfer.setData('text/plain', `talk:${talkToken.dataset.talkToken}`); talkToken.classList.add('dragging'); return; }
  const token = event.target.closest('[data-token]');
  if (!token) return;
  draggedToken = token.dataset.token;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', draggedToken);
  token.classList.add('dragging');
});
root.addEventListener('dragover', (event) => {
  if (event.target.closest('[data-talk-drop]')) { event.preventDefault(); return; }
  const zone = event.target.closest('[data-drop-zone]');
  if (!zone) return;
  event.preventDefault();
  showDropPreview(zone, event);
});
root.addEventListener('drop', (event) => {
  const talkZone = event.target.closest('[data-talk-drop]');
  if (talkZone) {
    event.preventDefault();
    const value = event.dataTransfer.getData('text/plain');
    if (!value.startsWith('talk:')) return;
    const tokens = [...talkZone.querySelectorAll('[data-talk-token]')];
    const index = tokens.findIndex((token) => event.clientX < token.getBoundingClientRect().left + token.getBoundingClientRect().width / 2);
    return moveTalkToken(Number(value.slice(5)), talkZone.dataset.talkDrop, index < 0 ? tokens.length : index);
  }
  const zone = event.target.closest('[data-drop-zone]');
  if (!zone) return;
  event.preventDefault();
  const tokenId = event.dataTransfer.getData('text/plain') || draggedToken;
  const insertionIndex = Number(zone.querySelector('.drop-preview')?.dataset.insertionIndex ?? zone.querySelectorAll('[data-token]').length);
  clearDropPreview();
  if (tokenId) moveToken(tokenId, zone.dataset.dropZone, insertionIndex);
});
root.addEventListener('dragend', () => {
  clearDropPreview();
  clearDragGhost();
  draggedToken = '';
});

root.addEventListener('pointerdown', (event) => {
  if (event.isPrimary && event.button === 0) {
    const sprite = event.target.closest('.pixel-sprite--slime, .typing-enemy:not(.typing-item)');
    if (sprite) {
      releasePressedSlime();
      sprite.classList.add('slime-pressed');
      pressedSlime = { sprite, pointerId: event.pointerId };
    }
  }
  const talkToken = event.target.closest('[data-talk-token]');
  if (talkToken && event.pointerType !== 'mouse' && !talkQuiz?.solved) {
    talkPointer = { id: Number(talkToken.dataset.talkToken), pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    talkToken.setPointerCapture?.(event.pointerId);
  }
  const control = event.target.closest('.button, .choice, .match-tile, .word-token, .listen-button, .game-exit, .bottom-nav button');
  if (control && !control.disabled) {
    pressedControl = control;
    control.classList.add('is-pressed');
  }
  const sentenceToken = event.target.closest('[data-token]');
  if (sentenceToken && event.pointerType !== 'mouse' && learningSession?.stage === 'sentence' && !learningSession.sentenceSolved) {
    draggedToken = sentenceToken.dataset.token;
    sentencePointer = { pointerId: event.pointerId, tokenId: draggedToken, startX: event.clientX, startY: event.clientY, moved: false };
    sentenceToken.setPointerCapture?.(event.pointerId);
  }
  const cell = event.target.closest('[data-grid-index]');
  if (!cell || !learningSession || learningSession.stage !== 'search' || !learningSession.searchStarted || learningSession.searchEnded || learningSession.searchTransitioning) return;
  event.preventDefault();
  const index = Number(cell.dataset.gridIndex);
  searchPointer = { active: true, start: index, pointerId: event.pointerId };
  learningSession.dragPath = [index];
  cell.setPointerCapture?.(event.pointerId);
  paintDragPath([index]);
});

root.addEventListener('pointermove', (event) => {
  if (talkPointer?.pointerId === event.pointerId) {
    if (Math.hypot(event.clientX - talkPointer.x, event.clientY - talkPointer.y) > 8) talkPointer.moved = true;
    if (talkPointer.moved) {
      event.preventDefault();
      if (!dragGhost) showDragGhost(root.querySelector(`[data-talk-token="${talkPointer.id}"]`), event.clientX, event.clientY);
      moveDragGhost(event.clientX, event.clientY);
    }
    return;
  }
  if (sentencePointer?.pointerId === event.pointerId) {
    const distance = Math.hypot(event.clientX - sentencePointer.startX, event.clientY - sentencePointer.startY);
    if (distance > 8) sentencePointer.moved = true;
    if (sentencePointer.moved) {
      event.preventDefault();
      if (!dragGhost) showDragGhost(root.querySelector(`[data-token="${sentencePointer.tokenId}"]`), event.clientX, event.clientY);
      moveDragGhost(event.clientX, event.clientY);
      const zone = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-drop-zone]');
      if (zone) showDropPreview(zone, event);
      else clearDropPreview();
    }
    return;
  }
  if (!searchPointer?.active || !learningSession) return;
  event.preventDefault();
  const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-grid-index]');
  if (!cell) return;
  const path = straightPath(searchPointer.start, Number(cell.dataset.gridIndex), learningSession.grid.size);
  learningSession.dragPath = path;
  paintDragPath(path);
});

function endSentencePointer(event) {
  if (!sentencePointer || sentencePointer.pointerId !== event.pointerId) return;
  const pointer = sentencePointer;
  sentencePointer = null;
  if (!pointer.moved) return;
  event.preventDefault();
  suppressTokenClick = pointer.tokenId;
  window.setTimeout(() => { suppressTokenClick = ''; }, 0);
  clearDragGhost();
  const zone = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-drop-zone]');
  if (zone) {
    const insertionIndex = Number(zone.querySelector('.drop-preview')?.dataset.insertionIndex ?? zone.querySelectorAll('[data-token]').length);
    clearDropPreview();
    moveToken(pointer.tokenId, zone.dataset.dropZone, insertionIndex);
  } else {
    clearDropPreview();
    root.querySelector(`[data-token="${pointer.tokenId}"]`)?.classList.remove('dragging');
  }
}

function endSearchPointer(event) {
  if (!searchPointer?.active || !learningSession) return;
  event.preventDefault();
  const path = learningSession.dragPath;
  searchPointer = null;
  if (event.type !== 'pointercancel' && path.length > 1) resolveSearchPath(path);
  else paintDragPath([]);
}
root.addEventListener('pointerup', endSearchPointer);
root.addEventListener('pointerup', (event) => {
  if (talkPointer?.pointerId !== event.pointerId) return;
  const pointer = talkPointer; talkPointer = null;
  clearDragGhost();
  if (!pointer.moved) return;
  event.preventDefault();
  suppressTalkClick = pointer.id;
  window.setTimeout(() => { suppressTalkClick = -1; }, 0);
  const zone = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-talk-drop]');
  if (!zone) return;
  const tokens = [...zone.querySelectorAll('[data-talk-token]')].filter((token) => Number(token.dataset.talkToken) !== pointer.id);
  const index = tokens.findIndex((token) => event.clientX < token.getBoundingClientRect().left + token.getBoundingClientRect().width / 2);
  moveTalkToken(pointer.id, zone.dataset.talkDrop, index < 0 ? tokens.length : index);
});
root.addEventListener('pointercancel', endSearchPointer);
root.addEventListener('pointercancel', () => { talkPointer = null; clearDragGhost(); });
root.addEventListener('pointerup', endSentencePointer);
root.addEventListener('pointercancel', () => {
  sentencePointer = null;
  clearDragGhost();
  clearDropPreview();
  root.querySelectorAll('.word-token.dragging').forEach((token) => token.classList.remove('dragging'));
});

function releasePressedSlime(event) {
  if (!pressedSlime || (event?.pointerId !== undefined && event.pointerId !== pressedSlime.pointerId)) return;
  pressedSlime.sprite.classList.remove('slime-pressed');
  pressedSlime = null;
}

document.addEventListener('contextmenu', (event) => event.preventDefault());
window.addEventListener('pointerup', releasePressedSlime);
window.addEventListener('pointercancel', releasePressedSlime);
window.addEventListener('blur', releasePressedSlime);

function releasePressedControl() {
  const control = pressedControl;
  pressedControl = null;
  if (!control?.isConnected) return;
  control.classList.remove('is-pressed');
  control.animate([
    { transform: 'translateY(1px)' },
    { transform: 'none' },
  ], { duration: 100, easing: 'steps(2, end)' });
}

window.addEventListener('pointerup', releasePressedControl);
window.addEventListener('pointercancel', releasePressedControl);
window.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || event.repeat || event.isComposing) return;
  if (event.target.closest('button, input, select, textarea, [contenteditable="true"]')) return;
  const nextActions = ['boss-intro-start', 'preview-next', 'start-sentence', 'sentence-next', 'check-sentence', 'search-start', 'finish-search', 'quick-submit', 'quick-next', 'talk-check', 'talk-done', 'result-home', 'typing-start', 'typing-next', 'duel-start', 'duel-restart', 'onboarding-next', 'onboarding-finish', 'settings-done'];
  const control = nextActions.map((action) => root.querySelector(`[data-action="${action}"]:not(:disabled)`)).find(Boolean);
  if (control) { event.preventDefault(); control.click(); }
});

const getState = () => state;
const getScreen = () => screen;
const setScreen = (next) => { screen = next; };
const { fitVisibleText, motionNodes, captureMotionLayout, animateFluidLayout } = createLayoutMotion(root);
const { stopSpeech, speakText, showWordMeaning } = createSpeech({
  root, getScreen, showAppleSpeechError: () => orchard.showSpeechError(),
  showPlaybackError: () => { notice = '발음 파일을 재생하지 못했어요. 다시 눌러 주세요.'; render(); },
});
const conversation = createConversation({ root, getState, getScreen, render, navigate, persist, speakText, clickableSentence });
const orchard = createOrchard({
  root, getState, getScreen, setScreen, render, validIds, byId, speakText, saveBest, startQuickCheck,
  recordMistake: (id) => { state = applyGradedResult(state, id, 'incorrect', new Date(), { reward: false }); persist(); },
});
const typingGame = createTypingArcade({ root, getState, getScreen, setScreen, render, learnedGamePool, saveBest });
initializeTheme();

render();
showLaunch();
window.addEventListener('pageshow', (event) => {
  if (event.persisted) showLaunch();
});

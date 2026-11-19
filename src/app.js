import { speechClips } from './speech-clips.js';
import { commonMeanings, slimeReply } from './slime-dialogue.js';
import { difficultyLabels, itemsForMajor, majorLabels, stageWords, vocabulary } from './data.js';
import { animateDuelEffect, strikeDuration } from './duel-motion.js';
import { addDuelPoints, duelDifficulties, duelPoints, opponentAttackMs } from './duel-rules.js';
import { upgradeCost, waveSize, fallSeconds, missDamage, enemyHealth, hitEnemy, rollAugments } from './typing-game.js';
import {
  applyGradedResult, applyLearningBatch, getStats, getTodayStats, loadState, saveState,
  nextStage, rankedWords, pickReviewWords, getLearnedIds, bestScore, withBestScore,
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
let duel = null;
let duelTimer = 0;
let duelOpponentTimer = 0;
let duelClockTimer = 0;
let duelClockDisplay = 0;
let duelChimeTimer = 0;
let duelShakeTimer = 0;
let effectAudio;
let draggedToken = '';
let matchFeedbackTimer = 0;
let searchTimer = 0;
let searchTransitionTimer = 0;
let searchPointer = null;
let sentencePointer = null;
let suppressTokenClick = '';
let paintedViewKey = '';
let pressedControl = null;
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
let speechAudio;
let speechFrame;
let conversation = [];
let conversationEpoch = 0;
let resultGrade = null;
let resultReward = 0;
let resultBossHp = 0;
let xpClaimTimer = 0;
let typing = null;
let typingFrame = 0;
let typingLast = 0;
let bossHitSequence = 0;
let bossHitSeen = 0;
let searchPuzzleSequence = 0;

const praiseMessages = ['맞혔어요!', '잘했어요!', '좋아요!'];

const smallTalks = {
  basic: [
    ['Could you help me?', '도와주실 수 있나요?', '도움이 필요할 때 정중하게 말해요.'],
    ['That sounds good.', '좋은 것 같아요.', '상대방의 제안에 편하게 동의할 때 써요.'],
    ['See you tomorrow.', '내일 봐요.', '헤어지면서 다음 만남을 약속할 때 써요.'],
  ],
  intermediate: [
    ['Let me think about it.', '생각해 볼게요.', '바로 결정하기 어려울 때 시간을 요청해요.'],
    ['Could you explain that again?', '다시 설명해 주시겠어요?', '설명을 놓쳤을 때 정중하게 부탁해요.'],
  ],
  advanced: [
    ['I appreciate your perspective.', '당신의 관점을 소중하게 생각해요.', '다른 의견을 존중하며 대화를 이어갈 때 써요.'],
    ['Let us revisit this later.', '이 내용은 나중에 다시 논의해요.', '논의를 잠시 미루고 싶을 때 써요.'],
  ],
};

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = randomInt(index + 1);
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}
const byId = (id) => vocabulary.find((item) => item.id === id);
const validIds = (ids) => [...new Set(ids)].filter((id) => byId(id));
const randomInt = (max) => Math.floor(Math.random() * max);

const pixelPatterns = {
  talk: ['0111110', '1111111', '1101011', '1111111', '1111110', '0111000', '0100000'],
  home: ['0001000', '0011100', '0111110', '1111111', '0110110', '0110110', '0110110'],
  review: ['0011110', '0100001', '1100001', '1110010', '0000100', '0101000', '0010000'],
  stats: ['0000011', '0000011', '0011011', '0011011', '1111011', '1111011', '1111111'],
  settings: ['0011100', '0111110', '1100011', '1101011', '1100011', '0111110', '0011100'],
  search: ['0111000', '1000100', '1000100', '1000100', '0111100', '0000010', '0000001'],
  duel: ['0000011', '0000111', '0001110', '1011100', '0111000', '1110000', '1100000'],
  refresh: ['0011100', '0100010', '1000000', '1011100', '1000010', '0100010', '0011100'],
};

function pixelIcon(name) {
  const cells = pixelPatterns[name].flatMap((row, y) => [...row].flatMap((cell, x) =>
    cell === '1' ? [`${x * 2}px ${y * 2}px`] : []));
  return `<span class="pixel-icon" aria-hidden="true" style="--pixels:${cells.join(',')}"></span>`;
}

const spriteColors = {
  o: '#173d64', b: '#3379b3', s: '#6eb6e9', l: '#bde7ff', w: '#fff', y: '#ffdc83', k: '#101b2a', p: '#f48eae', v: '#7e82cc', m: '#afb3ec', t: '#e2e5ff',
};
const spriteRows = {
  mascot: [
    '................', '.....oooooo.....', '...oossssssoo...', '..osssssssssso..',
    '.osssllllllssso.', '.osllllllllllso.', 'osllllkllkllllso', 'osllllkllkllllso',
    'osllllllllllllso', 'osllllkllkllllso', '.osllllkkllllso.', '.osllllllllllso.',
    '..osllllllllso..', '...oossssssoo...', '.....oooooo.....', '................',
  ],
  boss: [
    '................', '.....oooooo.....', '...oovvvvvvoo...', '..ovvvvvvvvvvo..',
    '.ovvvmmmmmmvvvo.', '.ovmmmmmmmmmmvo.', 'ovmmmmkmmkmmmmvo', 'ovmmmmkmmkmmmmvo',
    'ovmmmmmmmmmmmmvo', 'ovmmmmkkkkmmmmvo', '.ovmmmkkkkmmmvo.', '.ovmmmmmmmmmmvo.',
    '..ovmmmmmmmmvo..', '...oovvvvvvoo...', '.....oooooo.....', '................',
  ],
  book: [
    '................', '................', '...oooo.oooo....', '..ollllollllo...',
    '..olwllolwllo...', '..ollllollllo...', '..olwwlolwwlo...', '..ollllollllo...',
    '..olwwlolwwlo...', '..ollllollllo...', '..ossssosssso...', '..ooooooooooo...',
    '...bbbbbbbbb....', '................', '................', '................',
  ],
  search: [
    '................', '................', '..ooooooo.......', '..olllwlo.......',
    '..olwlllo.......', '..olllwlo.......', '..olwlooooo.....', '..oloolsslooo...',
    '..oooolsslooo...', '......ooooosoo..', '........oossso..', '.........ooooo..',
    '................', '................', '................', '................',
  ],
  duel: [
    '................', '............ooo.', '...........owwo.', '..........owlo..',
    '.........owlo...', '........owlo....', '.......owlo.....', '......owlo......',
    '...ooowlo.......', '...oyyoo........', '....oyyoo.......', '...obyyo........',
    '..oboooo........', '..ooo...........', '................', '................',
  ],
};

const spriteFrames = {
  mascot: [
    '................', '.....oooooo.....', '...oossssssoo...', '..osssssssssso..',
    '.osssllllllssso.', '.osllllllllllso.', 'osllllkllkllllso', 'osllllkllkllllso',
    'osllllllllllllso', 'osllllkllkllllso', '.oslllllkklllso.', '.osllllllllllso.',
    '..osllllllllso..', '...oossssssoo...', '....oooooooo....', '................',
  ],
  boss: [
    '................', '.....oooooo.....', '...oovvvvvvoo...', '..ovvvvvvvvvvo..',
    '.ovvvmmmmmmvvvo.', '.ovmmmmmmmmmmvo.', 'ovmmmmkmmkmmmmvo', 'ovmmmmkmmkmmmmvo',
    'ovmmmmmmmmmmmmvo', 'ovmmmmkkkkmmmmvo', '.ovmmmmkkmmmmvo.', '.ovmmmmmmmmmmvo.',
    '..ovmmmmmmmmvo..', '...oovvvvvvoo...', '....oooooooo....', '................',
  ],
};

function pixelSprite(name) {
  if (name === 'mascot' || name === 'boss') {
    const frames = slimeFrames(name).map((rows, frame) => `<g class="slime-frame slime-frame--${frame}">${rows.flatMap((row, y) => [...row].map((cell, x) => spriteColors[cell] ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${spriteColors[cell]}"/>` : '')).join('')}</g>`).join('');
    return `<span class="pixel-sprite pixel-sprite--slime" aria-hidden="true"><svg viewBox="0 0 16 16" shape-rendering="crispEdges" focusable="false">${frames}</svg></span>`;
  }
  const spriteCells = (rows) => rows.flatMap((row, y) => [...row].flatMap((cell, x) =>
    spriteColors[cell] ? [`${x}px ${y}px ${spriteColors[cell]}`] : []));
  const cells = spriteCells(spriteRows[name]);
  return `<span class="pixel-sprite" aria-hidden="true" style="--sprite:${cells.join(',')}"></span>`;
}

function slimeFrames(name) {
  const base = spriteRows[name];
  const fill = name === 'boss' ? 'v' : 's';
  const light = name === 'boss' ? 'm' : 'l';
  const blink = base.map((row, y) => {
    if (y === 6) return row.replaceAll('k', light);
    if (y === 7) return `o${fill}${light.repeat(3)}kk${light.repeat(2)}kk${light.repeat(3)}${fill}o`;
    return row;
  });
  return [base, blink];
}

function brandMark() { return `<span class="brand-mark">${pixelSprite('mascot')}</span>`; }
function button(label, action, variant = 'primary', disabled = false) { return `<button class="button button--${variant}" data-action="${action}" ${disabled ? 'disabled' : ''}>${label}</button>`; }
function card(content, className = '') { return `<section class="card ${className}">${content}</section>`; }
function progress(value, max, label) {
  const percent = Math.min(100, Math.round(value / Math.max(1, max) * 100));
  return `<div class="progress-wrap"><div class="progress-label"><span>${label}</span><strong data-motion-key="progress-value">${value}/${max}</strong></div><div class="progress" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}"><span data-motion-key="progress-fill" style="width:${percent}%"></span></div></div>`;
}

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
  if (screen === 'conversation') conversationEpoch += 1;
  if (next !== 'home') { window.clearTimeout(xpClaimTimer); xpClaimTimer = 0; }
  if (screen === 'learn') {
    stopSearchTimer();
    window.clearTimeout(searchTransitionTimer);
    searchTransitionTimer = 0;
  }
  if (screen === 'duel') {
    window.clearTimeout(duelTimer);
    window.clearTimeout(duelOpponentTimer);
    window.clearTimeout(duelChimeTimer);
    stopDuelShake();
    pauseDuelClock();
  }
  if (screen === 'typing') { stopTyping(); typing.phase = 'stopped'; }
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
  return `<header class="topbar"><button class="brand" data-nav="home">${brandMark()}<strong>small talk</strong></button><div class="xp"><span>XP</span><strong>${state.xp}</strong></div></header>`;
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
  const canPlay = state.sessions.some((session) => session.mode === 'new');
  return `<div class="page home-page">
    <section class="home-hero">${pixelSprite('mascot')}<div><p class="eyebrow">${majorLabels[major]}</p><h1>오늘의 학습</h1></div>
      <div class="daily-count"><strong>${count}<small> / 5</small></strong><div class="pixel-meter" aria-label="오늘 5단어 중 ${count}개">${Array.from({ length: 5 }, (_, i) => `<i class="${i < count ? 'filled' : ''}"></i>`).join('')}</div></div></section>
    <section class="card quest"><div class="quest-title"><div><p class="eyebrow">다음 목표 · ${Math.min(stage, 10)}/10</p><h2>${stage > 10 ? '학습 완료' : `레슨 ${String(stage).padStart(2, '0')}`}</h2></div>${pixelSprite('book')}</div>
      ${progress(stage - 1, 10, '레벨 진행')}${button('학습 시작', 'start-new', 'primary', stage > 10)}</section>
    <section class="card practice-panel"><h2>연습</h2><div class="dashboard-grid">${button('빠른 확인', 'start-quick', 'secondary', stage === 1 && !validIds(state.lastBatchIds).length)}<button class="button button--secondary" data-nav="review">복습</button></div></section>
    <section class="card game-links"><h2>게임</h2><div class="dashboard-grid">${button(`${pixelSprite('search')}단어 찾기<small>최고 ${bestScore(state, 'search')}점</small>`, 'arcade-search', 'secondary', !canPlay)}${button(`${pixelSprite('duel')}사과 베기<small>최고 ${bestScore(state, 'duel')}점</small>`, 'arcade-duel', 'secondary', !canPlay)}${button(`<span class="game-emoji" aria-hidden="true">⌨</span>타자 게임<small>최고 ${bestScore(state, 'typing')}점</small>`, 'arcade-typing', 'secondary', !canPlay)}</div>${canPlay ? '' : '<p>첫 학습을 마치면 게임을 할 수 있어요.</p>'}</section>
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

function buildWordGrid(items, retry = 0) {
  const words = items.map((item) => item.word.toUpperCase().replace(/[^A-Z]/g, ''));
  const size = Math.max(state.preferences.difficulty === 'advanced' ? 12 : state.preferences.difficulty === 'intermediate' ? 11 : 10, ...words.map((word) => word.length));
  const cells = Array(size * size).fill('');
  const directions = [[0,1],[1,0],[1,1],[-1,1],[0,-1],[-1,0],[-1,-1],[1,-1]];
  const placements = [];
  let failed = false;
  words.forEach((word, wordIndex) => {
    if (failed) return;
    let placed = false;
    for (let attempt = 0; attempt < 240 && !placed; attempt += 1) {
      const [dr, dc] = directions[randomInt(directions.length)];
      const rowMin = dr < 0 ? word.length - 1 : 0;
      const rowMax = dr > 0 ? size - word.length : size - 1;
      const colMin = dc < 0 ? word.length - 1 : 0;
      const colMax = dc > 0 ? size - word.length : size - 1;
      if (rowMax < rowMin || colMax < colMin) continue;
      const row = rowMin + randomInt(rowMax - rowMin + 1);
      const col = colMin + randomInt(colMax - colMin + 1);
      const indices = [...word].map((_, index) => (row + dr * index) * size + col + dc * index);
      if (indices.every((position, index) => !cells[position] || cells[position] === word[index])) {
        indices.forEach((position, index) => { cells[position] = word[index]; });
        placements.push({ id: items[wordIndex].id, word, indices });
        placed = true;
      }
    }
    if (!placed) failed = true;
  });
  if (failed) {
    if (retry < 8) return buildWordGrid(items, retry + 1);
    throw new Error('단어 퍼즐을 배치하지 못했어요.');
  }
  cells.forEach((letter, index) => { if (!letter) cells[index] = String.fromCharCode(65 + randomInt(26)); });
  return { size, cells, placements };
}

function prepareWordSearch() {
  stopSearchTimer();
  const targets = learningSession.items.slice(0, 3);
  learningSession.spelling = targets.map((item) => ({ item, index: learningSession.mode === 'arcade' ? item.word.length : 0, options: letterOptions(item.word[0]) }));
  learningSession.stage = 'search';
  learningSession.grid = buildWordGrid(targets);
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
  const pool = validIds(getLearnedIds(state));
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
  session.grid = buildWordGrid(targets);
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
  if (!session.searchStarted) return `<div class="page game-page search-page">${session.mode === 'arcade' ? '<div class="game-header"><h1>단어 찾기</h1><button class="game-exit" data-nav="home">나가기</button></div>' : stageHeader(4, '단어 찾기', '')}<section class="card search-ready">${pixelSprite('search')}<h2>단어 찾기</h2><p>단어를 완성시키고, 퍼즐 안에서 단어를 맞춰보세요!</p><small>60초 · 단어마다 +10초${session.mode === 'arcade' ? ' · 세트마다 +20초' : ''}</small>${session.mode === 'arcade' ? '<small>시작 1분 뒤부터 1분마다 10초 방해</small>' : ''}${button('시작하기', 'search-start')}</section></div>`;
  const grid = session.grid;
  const foundCells = new Set(grid.placements.filter((placement) => session.foundIds.includes(placement.id)).flatMap((placement) => placement.indices));
  const justFoundCells = new Set(grid.placements.find((placement) => placement.id === session.feedback?.targetId)?.indices || []);
  const firstLetters = new Set(grid.placements.filter(({ id }) => !session.searchEnded && !session.foundIds.includes(id)
    && session.spelling.some(({ item, index }) => item.id === id && index === item.word.length)).map(({ indices }) => indices[0]));
  const arcade = session.mode === 'arcade';
  const fogged = new Set(session.penalty?.type === 'fog' ? session.penalty.cells : []);
  const clues = session.spelling.map(({ item, index, options }, slot) => {
    const done = session.foundIds.includes(item.id);
    return `<div class="spell-clue"><strong>${item.meaning}</strong><span>${arcade ? (done ? item.word.toUpperCase() : '격자에서 찾기') : (item.word.slice(0, index).toUpperCase() || '첫 글자')}</span>
      ${done ? '<small>✓ 찾음</small>' : index === item.word.length ? '<small>빛나는 칸에서 시작하세요</small>' :
      `<div class="spell-choices">${options.map((letter) => button(letter, `spell:${slot}:${letter}`, 'secondary', session.searchEnded)).join('')}</div>`}</div>`;
  }).join('');
  const puzzle = `<div class="letter-grid letter-grid--drag" style="--grid-size:${grid.size}" role="grid" aria-label="단어 찾기 퍼즐">
    ${grid.cells.map((letter, index) => `<button type="button" role="gridcell" data-grid-index="${index}" class="${foundCells.has(index) ? 'found' : ''} ${justFoundCells.has(index) ? 'just-found' : ''} ${session.wrongPath.includes(index) ? 'try-again' : ''} ${firstLetters.has(index) ? 'first-letter' : ''} ${fogged.has(index) && !foundCells.has(index) ? 'fogged' : ''}" aria-label="${letter}${firstLetters.has(index) ? ', 시작 글자' : ''}">${fogged.has(index) && !foundCells.has(index) ? '?' : letter}</button>`).join('')}</div>`;
  return `<div class="page game-page search-page${arcade ? ' search-page--arcade' : ''}${session.penalty?.type === 'hint' ? ' search-page--no-hint' : ''}">${arcade ? '<div class="game-header"><h1>단어 찾기</h1><button class="game-exit" data-nav="home">나가기</button></div>' : stageHeader(4, '단어 찾기', '')}
    <div class="search-toolbar"><div><span>남은 시간</span><strong data-search-timer>${formatTime(session.remaining)}</strong></div><div><span>찾은 단어</span><strong>${session.foundIds.length}/${session.targets.length}</strong></div>${arcade ? `<div class="search-score"><span>${session.setsCleared + 1}세트 · ${session.score}점</span><strong>최고 ${bestScore(state, 'search')}점</strong>${session.penalty ? `<em data-search-penalty>${session.penalty.type === 'fog' ? '안개' : '힌트 숨김'} ${session.penalty.until - session.elapsed}초</em>` : ''}</div>` : ''}</div>
    <div class="search-workspace"><div class="spell-list">${clues}</div><div class="puzzle-space">${puzzle}</div></div>
    <p class="game-message ${session.feedback?.type || ''}" role="status">${session.feedback?.text || '철자 완성 후 격자에서 드래그'}</p>
    ${session.searchEnded ? button(session.mode === 'arcade' ? '홈으로' : '학습 마치기', 'finish-search') : ''}</div>`;
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
  resultGrade = mistakes === 0 ? 'perfect' : mistakes <= 3 ? 'excellent' : 'good';
  resultReward = learningSession.mode === 'review' ? 0 : ids.length * 5;
  resultBossHp = 4 - learningSession.bossHits;
  state = applyLearningBatch(state, ids, learningSession.mode, new Date(), { ...learningSession.curriculum, perfect: mistakes === 0, deferReward: true });
  persist();
  learningSession = null;
  screen = 'result';
  render({ resetScroll: true });
}

function resultView() {
  const label = { perfect: 'PERFECT!', excellent: 'EXCELLENT!', good: 'GOOD!' }[resultGrade] || 'GOOD!';
  const sparks = resultGrade === 'perfect' ? 16 : resultGrade === 'excellent' ? 6 : 0;
  return `<div class="page page--narrow result-page result-page--${resultGrade}"><div class="result-mascot">${pixelSprite('mascot')}${Array.from({ length: sparks }, (_, index) => `<i style="--angle:${index * 360 / sparks}deg;--delay:${index % 4 * 80}ms"></i>`).join('')}</div><p class="eyebrow">LESSON CLEAR</p><h1>${label}</h1><p>보스 슬라임 ${resultBossHp}/4 · 5단어 완료</p><div class="result-reward">획득 XP <strong>+${resultReward}</strong></div>${button('홈으로', 'result-home')}</div>`;
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
  const remaining = entries.map((_, index) => index).filter((index) => !talkChoice.seen.includes(index));
  if (!remaining.length) return;
  stopSpeech();
  const index = remaining[randomInt(remaining.length)];
  talkChoice = { ...talkChoice, index, seen: [...talkChoice.seen, index] };
  state.talkRotation = talkChoice;
  persist();
  render();
}

function smallTalk() {
  const { entries, selected } = currentTalk();
  const spoken = clickableSentence(selected[0]);
  return `<div class="page page--narrow"><div class="page-intro"><p class="eyebrow">TODAY'S SMALL TALK</p><h1>스몰토크</h1></div>${card(`<span class="talk-level">${difficultyLabels[state.preferences.difficulty].split(' · ')[0]}</span><div class="talk-sentence-row"><h2 class="talk-sentence">${spoken}</h2><button class="talk-refresh" data-action="talk-refresh" aria-label="다른 스몰토크 보기" title="다른 스몰토크" ${talkChoice.seen.length >= entries.length ? 'disabled' : ''}>${pixelIcon('refresh')}</button></div><button class="listen-button" data-action="speak-smalltalk">▶ 발음 듣기</button><div class="talk-detail"><div><span>뜻</span><p>${selected[1]}</p></div><div><span>언제 쓰나요?</span><p>${selected[2]}</p></div></div>`, 'small-talk-card')}${button('맞춰보기', 'talk-quiz')}${button('대화하기', 'talk-conversation', 'secondary')}</div>`;
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
  const word = (id, zone, index) => `<button class="word-token ${zone === 'answer' && index === quiz.wrongIndex ? 'misplaced' : ''}" data-talk-token="${id}" data-talk-zone="${zone}" draggable="true">${escapeHtml(quiz.tokens[id].word)}</button>`;
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
  if (!gloss || !speechClips[word]) return escapeHtml(text);
  return `<button type="button" class="inline-word" data-dictionary-word="${escapeHtml(word)}" data-meaning="${escapeHtml(gloss)}">${escapeHtml(text)}</button>`;
}

function clickableSentence(text) {
  return text.split(/\s+/).map((word) => `<span data-spoken-start>${clickableWord(word)}</span>`).join(' ');
}

function stopSpeech() {
  speechAudio?.pause();
  speechAudio = null;
  cancelAnimationFrame(speechFrame);
  root.querySelectorAll('.spoken-active').forEach((part) => part.classList.remove('spoken-active'));
}

function speakSmallTalk() {
  return speakText(currentTalk().selected[0], [...root.querySelectorAll('[data-spoken-start]')]);
}

function conversationView() {
  return `<div class="page conversation-page">
    <div class="game-header"><h1>슬라임과 대화</h1><button class="game-exit" data-nav="smalltalk">나가기</button></div>
    <div class="conversation-log" role="log">${conversation.map(({ english, korean, user }, index) => `<article class="conversation-line${user ? ' conversation-line--user' : ''}">${user ? '' : pixelSprite('mascot')}<div><p lang="en">${clickableSentence(english)}</p>${korean ? `<small>${escapeHtml(korean)}</small>` : ''}</div>${user ? '' : `<button type="button" class="listen-button" data-action="conversation-play" data-line="${index}" aria-label="문장 발음 듣기">▶</button>`}</article>`).join('')}</div>
    <form class="conversation-form"><input aria-label="영어로 대화하기" placeholder="영어로 입력" maxlength="200" required><button type="submit" class="button button--primary">보내기</button><button type="button" class="button button--secondary" data-action="conversation-mic">말하기</button></form>
    <p class="game-message conversation-status" role="status"></p>
  </div>`;
}

function openConversation() {
  const [english, korean] = currentTalk().selected;
  conversation = [{ english, korean }];
  navigate('conversation');
}

function submitConversation(text) {
  if (screen !== 'conversation' || !text.trim()) return;
  const [english, korean] = slimeReply(text);
  conversation.push({ english: text.trim().slice(0, 200), user: true }, { english, korean });
  render();
  const log = root.querySelector('.conversation-log');
  log.scrollTop = log.scrollHeight;
  speakText(english);
}

function recognizeConversation() {
  const epoch = conversationEpoch;
  const status = root.querySelector('.conversation-status');
  const receive = (text) => {
    if (epoch !== conversationEpoch || screen !== 'conversation') return;
    if (text) {
      const input = root.querySelector('.conversation-form input');
      input.value = text.slice(0, 200);
      input.focus();
      status.textContent = '인식한 문장을 확인하고 보내세요.';
    } else {
      status.textContent = '음성을 인식하지 못했어요. 영어를 직접 입력할 수 있어요.';
    }
  };
  if (window.SmalltalkMic) {
    window.receiveSmalltalkSpeech = receive;
    window.SmalltalkMic.postMessage('start');
    return;
  }
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return receive('');
  const recognition = new Recognition();
  recognition.lang = 'en-US';
  recognition.onresult = (event) => receive(event.results[0][0].transcript);
  recognition.onerror = () => receive('');
  status.textContent = '영어로 말하세요.';
  try { recognition.start(); } catch { receive(''); }
}

function duelScore(game) { return game.score; }

function duelView() {
  const phase = duel.phase;
  const canAnswer = phase === 'ready';
  const sparks = (count) => Array.from({ length: count }, (_, index) => {
    const angle = index * 360 / count + randomInt(15);
    return `<i style="--ray:${angle}deg;--reach:${28 + randomInt(65)}px;--spark-size:${2 + randomInt(5)}px"></i>`;
  }).join('');
  const cut = duel.cuts.at(-1);
  const scars = duel.cuts.map(({ angle, x, y }, index) =>
    `<i class="duel-scar ${phase === 'hit' && index === duel.cuts.length - 1 ? 'duel-scar--fresh' : ''}" style="--cut:${angle}deg;--scar-x:${x}%;--scar-y:${y}%"></i>`).join('');
  const strike = phase === 'hit'
    ? `<i class="duel-strike" style="--cut:${cut.angle}deg;--scar-x:${cut.x}%;--scar-y:${cut.y}%"><i class="duel-cut"><i></i><i></i></i><i class="duel-rays">${sparks(16)}</i></i>`
    : '';
  const apple = (scars = '', effect = '') => `<i class="duel-apple"><i class="apple-stem"></i><i class="apple-leaf"></i>${scars}${effect}</i>`;
  const playerScars = duel.playerCuts.map(({ angle, x, y }) => `<i class="duel-scar" style="--cut:${angle}deg;--scar-x:${x}%;--scar-y:${y}%"></i>`).join('');
  return `<div class="page duel-page" data-phase="${phase}" data-difficulty="${duel.difficulty}" data-critical="${duel.critical}">
    <div class="game-header"><div><h1>사과 베기</h1><p class="eyebrow">${duelScore(duel)}점 · 최고 ${bestScore(state, 'duel')}점 · 상대 ${duel.victories + 1}</p></div><button class="game-exit" data-nav="home">나가기</button></div>
    <div class="duel-arena">
      <div class="duel-score"><span>내 상처 <b>${duel.losses}</b></span><strong role="timer" aria-label="남은 시간" data-duel-clock>${Math.ceil(duelTimeLeft() / 1000)}초</strong><span>상대 상처 <b>${duel.cuts.length}</b></span></div>
      <div class="duel-player" aria-hidden="true">${apple(playerScars)}</div><div class="duel-opponent" aria-hidden="true">${apple(scars, strike)}</div>
    </div>
    ${phase === 'idle' ? `<div class="duel-intro"><p>20초 동안 상대보다 상처를 더 많이 내세요. 상대 공격은 막을 수 없어요.</p><div class="duel-difficulties">${[['easy','쉬움'],['normal','보통'],['hard','어려움']].map(([value,label]) => `<button class="button ${duel.difficulty === value ? 'button--primary' : 'button--secondary'}" data-action="duel-difficulty:${value}">${label}<small>×${duelDifficulties[value].multiplier}</small></button>`).join('')}</div><small>승리할 때마다 다음 상대가 빨라집니다 · 최대 3,000점</small></div>` : `<h2>${phase === 'intermission' ? '다음 상대가 옵니다' : phase === 'ended' ? '대결 종료' : duel.item.meaning}</h2>`}
    ${['ready', 'hit', 'locked'].includes(phase) ? `<div class="duel-choices" role="group" aria-label="영단어 선택">
      ${duel.options.map(({ id, word }) => `<button class="button button--secondary ${duel.selected === id ? 'duel-selected' : ''}" data-action="duel-answer:${id}" aria-disabled="${!canAnswer}">${word}</button>`).join('')}
    </div>` : ''}
    <p class="game-message duel-status" role="status">${duel.message}</p>
    ${phase === 'idle' || phase === 'ended' ? button(phase === 'idle' ? '대결 시작' : '다시 대결', 'duel-start') : ''}
  </div>`;
}

function openDuel(start = false) {
  window.clearTimeout(duelTimer);
  const pool = itemsForMajor(state.preferences.major);
  duel = { pool, cuts: [], playerCuts: [], losses: 0, score: 0, victories: 0, difficulty: duel?.difficulty || 'normal', critical: false, remainingMs: 20000, activeSince: null, phase: 'idle', message: '승리하면 다음 상대가 옵니다.' };
  const [item, ...alternatives] = shuffle(pool);
  duel.item = item;
  duel.options = shuffle([item, ...alternatives.slice(0, 3)]);
  screen = 'duel';
  if (start) return startDuelOpponent();
  render();
}

function stopTyping() {
  cancelAnimationFrame(typingFrame);
  typingFrame = 0;
}

function openTyping() {
  const words = validIds(getLearnedIds(state)).map(byId);
  if (words.length < 3) return;
  stopTyping();
  typing = { words, round: 1, hp: 100, maxHp: 100, coins: 0, score: 0, phase: 'ready', enemies: [], spawned: 0, spawnClock: 0, stats: { sight: 0, power: 0, vitality: 0 }, augments: [], offers: [], nextId: 0, message: '떨어지는 단어를 입력해 막으세요.' };
  screen = 'typing';
  render({ resetScroll: true });
}

function typingEnemyMarkup(enemy) {
  return `<div class="typing-enemy ${enemy.shield ? 'typing-enemy--shield' : ''} ${enemy.boss ? 'typing-enemy--boss' : ''}" data-enemy-id="${enemy.id}" style="left:${enemy.x}%;top:${enemy.y}%"><i class="typing-eyes" aria-hidden="true"></i><strong>${enemy.word}</strong><div class="typing-enemy-hp" aria-label="체력 ${enemy.hp}/${enemy.maxHp}"><i style="width:${enemy.hp / enemy.maxHp * 100}%"></i></div><small>${enemy.shield ? '▣ 방패 · ' : ''}${enemy.hp}/${enemy.maxHp}</small></div>`;
}

function typingView() {
  const game = typing;
  const running = game.phase === 'playing';
  return `<div class="page typing-page"><div class="game-header"><div><p class="eyebrow">ROUND ${game.round} · ${game.score}점 · 최고 ${bestScore(state, 'typing')}점</p><h1>타자 게임</h1></div><button class="game-exit" data-nav="home">나가기</button></div><div class="typing-hud"><span>HP ${game.hp}/${game.maxHp}</span><div class="typing-hp"><i style="width:${game.hp / game.maxHp * 100}%"></i></div><span>● ${game.coins}</span></div><div class="typing-field" aria-label="떨어지는 영어 단어">${game.enemies.map(typingEnemyMarkup).join('')}<div class="typing-ground"></div></div>${running ? `<form class="typing-form"><input data-typing-input autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="text" aria-label="떨어지는 영어 단어 입력" placeholder="영어 단어 입력"/><button class="button button--primary" type="submit">입력</button></form>` : `<div class="typing-panel">${game.phase === 'ready' ? `<div class="typing-rules"><strong>떨어지는 단어를 입력하세요</strong><span>가장 가까운 적에게 발사합니다.</span><span>방패는 첫 타격을 막고, 단어는 적중 뒤 바뀝니다.</span><span>10라운드마다 보스가 등장합니다.</span></div>${button('시작하기', 'typing-start')}` : `<p>${game.message}</p>${game.phase === 'over' ? button('다시 시작', 'typing-restart') : `<div class="typing-shop"><div class="typing-upgrades">${[['sight','동체시력','낙하 속도↓'],['power','공격력','타격 +1'],['vitality','체력','최대 HP +12']].map(([key,name,desc]) => `<button class="button button--secondary" data-action="typing-upgrade:${key}" ${game.coins < upgradeCost(game.stats[key]) ? 'disabled' : ''}><strong>${name} ${game.stats[key]}</strong><small>${desc} · ●${upgradeCost(game.stats[key])}</small></button>`).join('')}</div>${game.offers.length ? `<p>증강 선택 · 3라운드 보상</p><div class="typing-offers">${game.offers.map((offer,index) => `<button class="button button--secondary rarity--${offer.rarity}" data-action="typing-augment:${index}"><strong>${offer.name} · ${offer.rarity}</strong><small>${offer.text}</small></button>`).join('')}</div>` : button('다음 라운드', 'typing-next')}</div>`}`}</div>`}<p class="game-message" role="status">${running ? game.message : ''}</p></div>`;
}

function startTypingRound() {
  typing.phase = 'playing';
  typing.enemies = [];
  typing.spawned = 0;
  typing.spawnClock = 0;
  typing.message = '단어를 입력하고 Enter를 누르세요.';
  typingLast = performance.now();
  render();
  root.querySelector('[data-typing-input]')?.focus({ preventScroll: true });
  typingFrame = requestAnimationFrame(tickTyping);
}

function finishTypingRound() {
  stopTyping();
  typing.phase = 'shop';
  typing.message = `${typing.round}라운드 완료 · 코인으로 강화하세요.`;
  typing.offers = typing.round % 3 === 0 ? rollAugments() : [];
  if (typing.augments.includes('guard')) typing.hp = Math.min(typing.maxHp, typing.hp + 8);
  render();
}

function typingImpact(node, defeated = false) {
  if (!node) return;
  const bounds = node.getBoundingClientRect();
  const color = node.classList.contains('typing-enemy--shield') ? '#e5b34e' : '#75b9eb';
  for (let index = 0; index < (defeated ? 10 : 5); index += 1) {
    const spark = document.createElement('i');
    spark.className = 'typing-spark';
    spark.style.background = color;
    spark.style.left = `${bounds.left + bounds.width / 2}px`;
    spark.style.top = `${bounds.top + bounds.height / 2}px`;
    document.body.append(spark);
    const angle = index * Math.PI * 2 / (defeated ? 10 : 5);
    spark.animate([{ transform: 'translate(0, 0) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(angle) * (defeated ? 38 : 22)}px, ${Math.sin(angle) * (defeated ? 38 : 22)}px) scale(.2)`, opacity: 0 }], { duration: defeated ? 410 : 250, easing: 'steps(6, end)' }).finished.finally(() => spark.remove());
  }
  if (defeated) node.animate([{ transform: 'translateX(-50%) scale(1)', opacity: 1 }, { transform: 'translateX(-50%) scale(1.2, .65)', opacity: 1, offset: .35 }, { transform: 'translateX(-50%) scale(.2)', opacity: 0 }], { duration: 260, easing: 'steps(5, end)', fill: 'forwards' }).finished.finally(() => node.remove());
  else node.animate([{ transform: 'translateX(-50%) translateX(-5px)', backgroundColor: '#fff1b5' }, { transform: 'translateX(-50%) translateX(6px)' }, { transform: 'translateX(-50%)', backgroundColor: '#fff' }], { duration: 220, easing: 'steps(4, end)' });
}

function tickTyping(now) {
  if (screen !== 'typing' || typing.phase !== 'playing') return stopTyping();
  const dt = Math.min(.05, (now - typingLast) / 1000);
  typingLast = now;
  typing.spawnClock += dt;
  const interval = Math.max(.85, 2.1 - typing.round * .055);
  if (typing.spawned < waveSize(typing.round) && typing.spawnClock >= interval) {
    typing.spawnClock = 0;
    const item = typing.words[randomInt(typing.words.length)];
    const hp = enemyHealth(typing.round);
    const boss = typing.round % 10 === 0;
    typing.enemies.push({ id: ++typing.nextId, word: item.word.toLowerCase(), x: 10 + randomInt(76), y: 0, hp, maxHp: hp, boss, shield: !boss && typing.round >= 3 && Math.random() < Math.min(.32, .08 + typing.round * .018), pending: false });
    typing.spawned += 1;
    root.querySelector('.typing-field')?.insertAdjacentHTML('beforeend', typingEnemyMarkup(typing.enemies.at(-1)));
  }
  const seconds = fallSeconds(typing.round, typing.stats.sight) * (typing.augments.includes('slow') ? 1.25 : 1);
  for (const enemy of [...typing.enemies]) {
    enemy.y += dt * 100 / (seconds * (enemy.boss ? 5 : 1));
    const node = root.querySelector(`[data-enemy-id="${enemy.id}"]`);
    if (node) node.style.top = `${enemy.y}%`;
    if (enemy.y >= 93) {
      typing.enemies = typing.enemies.filter((entry) => entry !== enemy);
      node?.remove();
      typing.hp = Math.max(0, typing.hp - missDamage(typing.round, typing.stats.vitality));
      typing.message = `${enemy.word} 단어를 놓쳐 체력이 줄었어요.`;
      const field = root.querySelector('.typing-field');
      field?.animate([{ boxShadow: 'inset 0 0 0 8px #d59091' }, { boxShadow: 'inset 0 0 0 0 transparent' }], { duration: 290, easing: 'steps(4, end)' });
      if (!typing.hp) { typing.phase = 'over'; typing.message = `${typing.round}라운드 · ${typing.score}점`; saveBest('typing', typing.score); stopTyping(); render(); return; }
      root.querySelector('.typing-hud > span')?.replaceChildren(`HP ${typing.hp}/${typing.maxHp}`);
      const bar = root.querySelector('.typing-hp i');
      if (bar) bar.style.width = `${typing.hp / typing.maxHp * 100}%`;
      const status = root.querySelector('.typing-page > .game-message');
      if (status) status.textContent = typing.message;
    }
  }
  if (typing.spawned >= waveSize(typing.round) && !typing.enemies.length) return finishTypingRound();
  typingFrame = requestAnimationFrame(tickTyping);
}

function nextTypingWord(previous) {
  const pool = typing.words.filter((item) => item.word.toLowerCase() !== previous);
  return (pool.length ? pool : typing.words)[randomInt((pool.length ? pool : typing.words).length)].word.toLowerCase();
}

function updateTypingEnemy(enemy) {
  const node = root.querySelector(`[data-enemy-id="${enemy.id}"]`);
  if (!node) return;
  node.classList.toggle('typing-enemy--shield', enemy.shield);
  node.querySelector('strong').textContent = enemy.word;
  node.querySelector('small').textContent = `${enemy.shield ? '▣ 방패 · ' : ''}${enemy.hp}/${enemy.maxHp}`;
  node.querySelector('.typing-enemy-hp i').style.width = `${enemy.hp / enemy.maxHp * 100}%`;
}

function typingProjectile(from, to, small = false) {
  if (!from || !to) return Promise.resolve();
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  const dot = document.createElement('i');
  dot.className = `typing-projectile ${small ? 'typing-projectile--small' : ''}`;
  dot.style.left = `${a.left + a.width / 2}px`;
  dot.style.top = `${a.top + a.height / 2}px`;
  document.body.append(dot);
  return dot.animate([{ transform: 'translate(0, 0)' }, { transform: `translate(${b.left + b.width / 2 - a.left - a.width / 2}px, ${b.top + b.height / 2 - a.top - a.height / 2}px)` }], { duration: small ? 160 : 210, easing: 'linear' }).finished.then(() => dot.remove(), () => dot.remove());
}

function applyTypingDamage(enemy, damage, bypassShield, source, chain = false) {
  if (typing.phase !== 'playing' || !typing.enemies.includes(enemy)) return;
  const node = root.querySelector(`[data-enemy-id="${enemy.id}"]`);
  const result = hitEnemy(enemy, damage, bypassShield);
  if (!chain) playEffect(result.defeated ? 'correct' : 'hit');
  if (result.defeated) {
    typing.enemies = typing.enemies.filter((entry) => entry !== enemy);
    typing.score += enemy.boss ? 100 : 10;
    saveBest('typing', typing.score);
    const scoreLabel = root.querySelector('.typing-page .game-header .eyebrow');
    if (scoreLabel) scoreLabel.textContent = `ROUND ${typing.round} · ${typing.score}점 · 최고 ${bestScore(state, 'typing')}점`;
    typing.coins += (enemy.boss ? 15 : 2) + Number(typing.augments.includes('bounty')) + 3 * Number(typing.augments.includes('fortune'));
    typing.hp = Math.min(typing.maxHp, typing.hp + 2 * Number(typing.augments.includes('renew')));
    typingImpact(node, true);
  } else {
    if (!chain) enemy.word = nextTypingWord(enemy.word);
    updateTypingEnemy(enemy);
    typingImpact(node);
  }
  enemy.pending = false;
  if (!chain && typing.augments.includes('splash')) {
    const count = typing.augments.filter((id) => id === 'splash').length;
    const nearby = typing.enemies.filter((other) => other !== enemy && !other.pending && Math.hypot(other.x - enemy.x, other.y - enemy.y) <= 30).sort((a, b) => Math.hypot(a.x - enemy.x, a.y - enemy.y) - Math.hypot(b.x - enemy.x, b.y - enemy.y)).slice(0, count);
    nearby.forEach((other) => {
      other.pending = true;
      typingProjectile(source || node, root.querySelector(`[data-enemy-id="${other.id}"]`), true).then(() => applyTypingDamage(other, Math.max(1, Math.floor(damage / 2)), false, null, true));
    });
  }
  root.querySelector('.typing-hud > span:last-child').textContent = `● ${typing.coins}`;
  root.querySelector('.typing-hud > span:first-child').textContent = `HP ${typing.hp}/${typing.maxHp}`;
}

function submitTyping(value) {
  if (typing?.phase !== 'playing') return;
  const word = value.trim().toLowerCase();
  const enemy = [...typing.enemies].filter((entry) => !entry.pending && entry.word === word).sort((a, b) => b.y - a.y)[0];
  const input = root.querySelector('[data-typing-input]');
  if (input) input.value = '';
  if (!enemy) { playEffect('retry'); typing.message = '화면에 있는 단어를 입력하세요.'; root.querySelector('.typing-page > .game-message').textContent = typing.message; return; }
  enemy.pending = true;
  playEffect('place');
  const node = root.querySelector(`[data-enemy-id="${enemy.id}"]`);
  typingProjectile(input, node).then(() => applyTypingDamage(enemy, 1 + typing.stats.power + Number(typing.augments.includes('double')), typing.augments.includes('pierce'), node));
  typing.message = '';
  root.querySelector('.typing-page > .game-message').textContent = '';
  input?.focus({ preventScroll: true });
}

function duelTimeLeft() {
  const elapsed = duel.activeSince === null ? 0 : performance.now() - duel.activeSince;
  return Math.max(0, duel.remainingMs - elapsed);
}

function pauseDuelClock() {
  window.clearTimeout(duelClockTimer);
  window.clearInterval(duelClockDisplay);
  if (!duel) return;
  duel.remainingMs = duelTimeLeft();
  duel.activeSince = null;
}

function finishDuel() {
  if (screen !== 'duel' || duel.phase === 'ended' || duel.phase === 'intermission') return;
  pauseDuelClock();
  window.clearTimeout(duelTimer);
  window.clearTimeout(duelOpponentTimer);
  duel.remainingMs = 0;
  const difference = duel.cuts.length - duel.losses;
  if (difference > 0) {
    duel.score = addDuelPoints(duel.score, duelPoints(duel.difficulty, duel.victories, 0, true));
    duel.victories += 1;
    duel.phase = 'intermission';
    duel.message = `승리! ${duel.victories}명 격파 · 다음 상대 준비 중`;
    saveBest('duel', duel.score);
    duelTimer = window.setTimeout(startDuelOpponent, 900);
  } else {
    duel.phase = 'ended';
    duel.message = `${difference < 0 ? '패배' : '무승부'} · ${duel.victories}명 격파 · ${duel.score}점`;
    saveBest('duel', duel.score);
  }
  render();
}

function nextDuelRound() {
  if (screen !== 'duel' || !['ready', 'hit', 'locked'].includes(duel.phase)) return;
  const [item, ...alternatives] = shuffle(duel.pool.filter((word) => word !== duel.item));
  duel.item = item;
  duel.options = shuffle([item, ...alternatives.slice(0, 3)]);
  duel.selected = '';
  duel.critical = false;
  duel.phase = 'ready';
  duel.message = '뜻에 맞는 단어를 골라 상대 사과에 상처를 내세요.';
  render();
}

function startDuelOpponent() {
  if (screen !== 'duel') return;
  duel.cuts = [];
  duel.playerCuts = [];
  duel.losses = 0;
  duel.remainingMs = 20000;
  duel.activeSince = performance.now();
  duel.phase = 'ready';
  nextDuelRound();
  duelClockTimer = window.setTimeout(finishDuel, 20000);
  duelClockDisplay = window.setInterval(() => {
    const timer = root.querySelector('[data-duel-clock]');
    if (timer) timer.textContent = `${Math.ceil(duelTimeLeft() / 1000)}초`;
  }, 100);
  scheduleOpponentAttack();
}

function scheduleOpponentAttack() {
  window.clearTimeout(duelOpponentTimer);
  const delay = opponentAttackMs(duel.difficulty, duel.victories);
  duelOpponentTimer = window.setTimeout(takeDuelHit, delay);
}

function takeDuelHit() {
  if (screen !== 'duel' || !['ready', 'hit', 'locked'].includes(duel.phase)) return;
  if (!duelTimeLeft()) return finishDuel();
  duel.losses += 1;
  playEffect('hit');
  const scar = { angle: randomInt(180), x: 38 + randomInt(25), y: 34 + randomInt(33) };
  duel.playerCuts.push(scar);
  root.querySelector('.duel-player .duel-apple')?.insertAdjacentHTML('beforeend', `<i class="duel-scar" style="--cut:${scar.angle}deg;--scar-x:${scar.x}%;--scar-y:${scar.y}%"></i>`);
  const count = root.querySelector('.duel-score span:first-child b');
  if (count) count.textContent = duel.losses;
  duel.message = `상대의 공격 · 내 상처 ${duel.losses}`;
  const status = root.querySelector('.duel-status');
  if (status) status.textContent = duel.message;
  root.querySelector('.duel-screen-effect')?.setAttribute('data-critical', String(duel.losses > duel.cuts.length));
  animateDuelEffect(root, 'damage');
  scheduleOpponentAttack();
}



const effectNotes = {
  tap: [400],
  place: [530],
  correct: [660, 880],
  retry: [330, 262],
  hit: [180, 120],
  finish: [523, 659, 784],
};

let queuedEffect;
function playEffect(kind) {
  if (queuedEffect) {
    if (kind !== 'tap') queuedEffect = kind;
    return;
  }
  queuedEffect = kind;
  queueMicrotask(() => {
    const notes = effectNotes[queuedEffect];
    queuedEffect = null;
    if (!effectAudio || effectAudio.state !== 'running') return;
    notes.forEach((frequency, index) => {
      const note = effectAudio.createOscillator();
      const gain = effectAudio.createGain();
      const start = effectAudio.currentTime + index * .068;
      note.type = 'triangle';
      note.frequency.value = frequency;
      gain.gain.setValueAtTime(notes.length === 1 ? .035 : .065, start);
      gain.gain.exponentialRampToValueAtTime(.001, start + .1);
      note.connect(gain).connect(effectAudio.destination);
      note.start(start);
      note.stop(start + .1);
    });
  });
}

function stopDuelShake() {
  window.clearTimeout(duelShakeTimer);
  duelShakeTimer = 0;
  root.style.removeProperty('--duel-x');
  root.style.removeProperty('--duel-y');
}

function startDuelShake(duration, from, to, firstInterval = 50, lastInterval = 50) {
  stopDuelShake();
  if (duration <= 0) return;
  const start = performance.now();
  const step = () => {
    const elapsed = performance.now() - start;
    if (elapsed >= duration) return stopDuelShake();
    const progress = elapsed / duration;
    const strength = from + (to - from) * progress;
    const interval = firstInterval + (lastInterval - firstInterval) * progress;
    const directions = [-1, 1, 0].filter((direction) => direction !== duel.lastShakeDirection);
    const direction = directions[randomInt(directions.length)];
    duel.lastShakeDirection = direction;
    root.style.setProperty('--duel-x', `${direction * strength}vw`);
    root.style.setProperty('--duel-y', `${direction === 0 ? strength : 0}dvh`);
    duelShakeTimer = window.setTimeout(step, Math.min(interval, duration - elapsed));
  };
  step();
}

function answerDuel(id) {
  if (duel.phase !== 'ready') return;
  if (!duelTimeLeft()) return finishDuel();
  duel.selected = id;
  if (id !== duel.item.id) {
    duel.phase = 'locked';
    playEffect('retry');
    duel.message = '뜻이 달라요. 잠시 뒤 새 단어가 나와요.';
    duelTimer = window.setTimeout(nextDuelRound, 1200);
    return render();
  }
  duel.phase = 'hit';
  duel.message = '맞혔어요! 상대 사과에 상처를 냈어요.';
  duel.critical = randomInt(5) === 0;
  const scars = duel.critical ? 3 : 1;
  for (let index = 0; index < scars; index += 1) duel.cuts.push({ angle: randomInt(180), x: 38 + randomInt(25), y: 34 + randomInt(33) });
  duel.score = addDuelPoints(duel.score, duelPoints(duel.difficulty, duel.victories, scars));
  saveBest('duel', duel.score);
  if (duel.critical) duel.message = 'CRITICAL! · 상대 상처 +3';
  duelChimeTimer = window.setTimeout(() => playEffect('correct'), 140);
  duelTimer = window.setTimeout(nextDuelRound, strikeDuration);
  render();
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
  return `<div class="page"><div class="page-intro"><p class="eyebrow">PROGRESS</p><h1>학습 기록</h1></div><div class="stats-grid stats-grid--three">${card(`<strong>${value.learned}</strong><span>배운 단어</span>`)}${card(`<strong>${value.learningStreak}</strong><span>연속 학습 일</span>`)}${card(`<strong>${value.perfectStreak}</strong><span>연속 완벽 학습</span>`)}</div><section class="card game-records"><h2>게임 최고 점수</h2><div><span>단어 찾기 <strong>${bestScore(state, 'search')}점</strong></span><span>사과 베기 <strong>${bestScore(state, 'duel')}점</strong></span><span>타자 게임 <strong>${bestScore(state, 'typing')}점</strong></span></div></section></div>`;
}

function settings() {
  return `<div class="page page--narrow"><h1>설정</h1>${card(`<label>전공<select data-setting="major">${Object.entries(majorLabels).map(([value, label]) => `<option value="${value}" ${state.preferences.major === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label>난이도<select data-setting="difficulty">${Object.entries(difficultyLabels).map(([value, label]) => `<option value="${value}" ${state.preferences.difficulty === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label><div class="fixed-goal"><span>하루 목표</span><strong>5단어 · 약 5분</strong></div><label>희망 시간<input data-setting="reminderTime" type="time" value="${state.preferences.reminderTime}"></label>`, 'form-card')}${button('저장', 'settings-done')}</div>`;
}

function paint() {
  const views = { onboarding, home, learn, quick: quickCheck, smalltalk: smallTalk, smalltalkquiz: talkQuizView, conversation: conversationView, review, stats, settings, duel: duelView, result: resultView, typing: typingView };
  const isOnboarding = screen === 'onboarding';
  const isImmersive = ['learn', 'quick', 'duel', 'result', 'typing', 'smalltalkquiz', 'conversation'].includes(screen);
  const activeStage = screen === 'learn' ? learningSession?.stage || '' : screen;
  const isDuel = screen === 'duel';
  const duelEffect = isDuel ? `<div class="duel-screen-effect" data-effect="${duel.phase}" data-critical="${duel.losses > duel.cuts.length}" aria-hidden="true"></div>` : '';
  root.className = [isOnboarding ? 'app--onboarding' : '', isImmersive ? 'app--immersive' : '', isDuel ? 'app--duel' : ''].filter(Boolean).join(' ');
  root.innerHTML = `${isOnboarding ? '' : header()}${notice ? `<div class="notice" role="status">${escapeHtml(notice)}</div>` : ''}<main id="main" data-screen="${screen}" data-stage="${activeStage}" class="${isOnboarding ? 'main main--onboarding' : 'main'}">${(views[screen] || home)()}</main>${isOnboarding || isImmersive ? '' : nav()}${successBurst()}${duelEffect}`;
  animateBossHit();
  if (screen === 'home') absorbPendingXp();
  if (screen === 'learn' && learningSession?.stage === 'search') updateTimerUI();
  if (isDuel) {
    if (['ready', 'hit', 'locked'].includes(duel.phase)) {
      const remaining = duelTimeLeft();
      const critical = duel.losses > duel.cuts.length;
      const initial = critical ? .16 : .06;
      const peak = critical ? 1.05 : .75;
      const slowInterval = critical ? 110 : 150;
      const fastInterval = critical ? 25 : 30;
      const remainingFraction = remaining / 20000;
      const strength = peak - (peak - initial) * remainingFraction;
      const interval = fastInterval + (slowInterval - fastInterval) * remainingFraction;
      startDuelShake(remaining, strength, peak, interval, fastInterval);
    } else stopDuelShake();
    animateDuelEffect(root, duel.phase);
  }
}

const fittedTextRules = [
  ['.page-intro h1', 24, 2],
  ['.game-header h1', 18, 2],
  ['.preview-word-card h2', 28, 1],
  ['.match-tile strong', 14, 1],
  ['.sentence-prompt h2', 16, 3],
  ['.talk-sentence', 22, 2],
  ['.quick-word', 28, 1],
];

function fitVisibleText() {
  fittedTextRules.forEach(([selector, minimum, maxLines]) => {
    root.querySelectorAll(selector).forEach((element) => {
      element.style.fontSize = '';
      const initial = Number.parseFloat(getComputedStyle(element).fontSize);
      let size = initial;
      const isTooLarge = () => {
        const style = getComputedStyle(element);
        const lineHeight = Number.parseFloat(style.lineHeight) || size * 1.25;
        const heightTolerance = Math.max(6, size * .12);
        return element.scrollWidth > element.clientWidth + 1
          || element.scrollHeight > lineHeight * maxLines + heightTolerance;
      };
      while (size > minimum && isTooLarge()) {
        size -= 1;
        element.style.fontSize = `${size}px`;
      }
    });
  });
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

const motionSelector = [
  '[data-motion-key]', '[data-match-side][data-id]', '[data-token]', '[data-nav]', '[data-action]',
  '[data-quick-answer]', '.choice', '.card', '.stage-track > span', '.target-list > span',
  '.game-message', '.preview-word-card h2', '.preview-meaning', '.xp strong', '.stats-grid strong',
  '.game-header', '.match-column', '.sentence-zone', '.sentence-bank', '.search-toolbar > div',
  '.talk-detail > div', '.review-actions', '.quest-score', '.routine > span', '.preview-word-card', '.feedback',
].join(',');

function motionBaseKey(element) {
  if (element.dataset.motionKey) return element.dataset.motionKey;
  if (element.dataset.matchSide) return `match:${element.dataset.matchSide}:${element.dataset.id}`;
  if (element.dataset.token) return `token:${element.dataset.token}`;
  if (element.dataset.nav) return `nav:${element.dataset.nav}`;
  if (element.dataset.action) return `action:${element.dataset.action}`;
  if (element.dataset.quickAnswer !== undefined) return `quick:${element.dataset.quickAnswer}`;
  if (element.matches('.stage-track > span')) return `stage:${element.textContent.trim()}`;
  if (element.matches('.target-list > span')) return `target:${element.querySelector('b')?.textContent || element.textContent}`;
  if (element.matches('.game-message')) return 'game-message';
  if (element.matches('.preview-word-card h2')) return 'preview-word';
  if (element.matches('.preview-meaning')) return 'preview-meaning';
  if (element.matches('.xp strong')) return 'xp-value';
  if (element.matches('.stats-grid strong')) return `stat:${element.parentElement?.textContent || ''}`;
  if (element.matches('.choice')) return `choice:${element.dataset.value || element.textContent.trim()}`;
  if (element.matches('.card')) return `card:${[...element.classList].sort().join('.')}`;
  return element.tagName.toLowerCase();
}

function motionNodes() {
  const counts = new Map();
  return [...root.querySelectorAll(motionSelector)].slice(0, 90).map((element) => {
    const base = motionBaseKey(element);
    const count = counts.get(base) || 0;
    counts.set(base, count + 1);
    return { element, key: `${base}:${count}` };
  });
}

function captureMotionLayout() {
  const layout = new Map();
  motionNodes().forEach(({ element, key }) => {
    const rect = element.getBoundingClientRect();
    layout.set(key, {
      rect, text: element.textContent.trim(), className: element.className,
    });
  });
  return layout;
}

function animateFluidLayout(previous) {
  motionNodes().forEach(({ element, key }, index) => {
    const before = previous.get(key);
    const after = element.getBoundingClientRect();
    if (!after.width || !after.height) return;
    const options = { duration: 180, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'backwards' };

    if (!before) {
      element.animate([
        { opacity: 0, transform: 'translateY(4px)' },
        { opacity: 1, transform: 'none' },
      ], { ...options, delay: Math.min(index * 5, 20) });
      return;
    }

    if (element.matches('[data-match-side], [data-quick-answer]')) {
      const wasSelected = /(?:^|\s)(?:selected|choice--selected)(?:\s|$)/.test(before.className);
      if (wasSelected && !element.matches('.matched, .try-again, .choice--correct, .choice--try')) return;
    }

    const dx = before.rect.left - after.left;
    const dy = before.rect.top - after.top;
    const moved = Math.abs(dx) > .5 || Math.abs(dy) > .5;
    const changed = before.text !== element.textContent.trim() || before.className !== element.className;

    if (moved) {
      element.animate([
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: 'none' },
      ], options);
    } else if (changed) {
      element.animate([
        { opacity: .7 },
        { opacity: 1 },
      ], { ...options, duration: 160 });
    }
  });
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

function speakText(text, spans = []) {
  stopSpeech();
  const clip = speechClips[text] || speechClips[text.toLowerCase()];
  if (!clip) return;
  const [file, cues] = clip;
  const audio = new Audio(new URL(`./audio/${file}`, import.meta.url));
  speechAudio = audio;
  const highlight = () => {
    if (speechAudio !== audio || audio.paused) return;
    const index = cues.findLastIndex((time) => time <= audio.currentTime);
    spans.forEach((span, position) => span.classList.toggle('spoken-active', position === index));
    speechFrame = requestAnimationFrame(highlight);
  };
  audio.addEventListener('playing', highlight, { once: true });
  audio.addEventListener('ended', () => { if (speechAudio === audio) stopSpeech(); });
  audio.play().catch(() => {
    if (speechAudio !== audio) return;
    stopSpeech();
    notice = '발음 파일을 재생하지 못했어요. 다시 눌러 주세요.';
    render();
  });
}

function showWordMeaning(target) {
  speakText(target.dataset.dictionaryWord);
  root.querySelector('.word-gloss')?.remove();
  const gloss = document.createElement('div');
  gloss.className = 'word-gloss';
  gloss.setAttribute('role', 'status');
  gloss.textContent = `${target.dataset.dictionaryWord} · ${target.dataset.meaning}`;
  const rect = target.getBoundingClientRect();
  gloss.style.top = `${Math.max(8, rect.top - 8)}px`;
  gloss.style.left = `${Math.max(105, Math.min(innerWidth - 105, rect.left + rect.width / 2))}px`;
  root.append(gloss);
  setTimeout(() => gloss.remove(), 3200);
}

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
    if (session.matched.length === session.items.length) { hitLessonBoss('match'); triggerCelebration('5개 단어를 모두 연결했어요'); }
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

function straightPath(start, end, size) {
  const sr = Math.floor(start / size), sc = start % size, er = Math.floor(end / size), ec = end % size;
  const rowDiff = er - sr, colDiff = ec - sc;
  if (rowDiff && colDiff && Math.abs(rowDiff) !== Math.abs(colDiff)) return [start];
  const dr = Math.sign(rowDiff), dc = Math.sign(colDiff);
  const length = Math.max(Math.abs(rowDiff), Math.abs(colDiff)) + 1;
  return Array.from({ length }, (_, index) => (sr + dr * index) * size + sc + dc * index);
}

function paintDragPath(path) {
  root.querySelectorAll('.letter-grid button.selecting').forEach((cell) => cell.classList.remove('selecting'));
  path.forEach((index) => root.querySelector(`[data-grid-index="${index}"]`)?.classList.add('selecting'));
}

function resolveSearchPath(path) {
  const session = learningSession;
  const target = session.grid.placements.find((placement) => {
    if (session.foundIds.includes(placement.id)) return false;
    const spell = session.spelling.find(({ item }) => item.id === placement.id);
    return spell.index === spell.item.word.length && path.length === placement.indices.length
      && (path.every((cell, index) => cell === placement.indices[index])
      || path.every((cell, index) => cell === placement.indices.at(-1 - index)));
  });
  if (target) {
    playEffect('correct');
    session.foundIds.push(target.id);
    session.remaining += 10;
    if (session.mode === 'arcade') {
      session.score += 100;
      saveBest('search', session.score);
    } else recordLearningAnswer(target.id, 'correct');
    session.feedback = { type: 'correct', text: `${byId(target.id).word} · +10초`, targetId: target.id };
    session.wrongPath = [];
    if (session.foundIds.length === session.targets.length) {
      stopSearchTimer();
      if (session.mode === 'arcade') {
        session.remaining += 20;
        session.score += 150;
        session.setsCleared += 1;
        session.searchTransitioning = true;
        session.feedback = { type: 'correct', text: `3개 완료! +20초 · 세트 보너스 +150점` };
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
    session.feedback = { type: 'try', text: '빛나는 칸에서 시작해 마지막 글자까지 끌어 보세요.' };
  }
  session.dragPath = [];
  render();
}

root.addEventListener('click', (event) => {
  const control = event.target.closest('button:not(:disabled)');
  if (!control || control.dataset.gridIndex !== undefined) return;
  const action = control.dataset.action || '';
  if (control.dataset.dictionaryWord || action.startsWith('speak-') ||
      action === 'conversation-play' || action === 'conversation-mic') return;
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine) return;
  try {
    effectAudio ||= new AudioEngine();
    if (effectAudio.state === 'running') playEffect('tap');
    else effectAudio.resume().then(() => playEffect('tap')).catch(() => {});
  } catch {
    // Sound is optional when the audio engine is unavailable.
  }
}, { capture: true });

root.addEventListener('click', (event) => {
  const target = event.target.closest('button');
  if (!target) return;
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
  if (action === 'talk-conversation') return openConversation();
  if (action === 'conversation-mic') return recognizeConversation();
  if (action === 'conversation-play') return speakText(conversation[Number(target.dataset.line)].english);
  if (action === 'talk-refresh') return rotateTalk();
  if (action === 'talk-quiz') return openTalkQuiz();
  if (action === 'talk-done') return navigate('smalltalk');
  if (action === 'talk-check') {
    if (!talkQuiz || talkQuiz.bank.length) return;
    const wrong = talkQuiz.answer.findIndex((id, index) => id !== index);
    talkQuiz.solved = wrong < 0;
    playEffect(wrong < 0 ? 'correct' : 'retry');
    talkQuiz.wrongIndex = wrong;
    talkQuiz.feedback = wrong < 0 ? '문장 완성!' : `${wrong + 1}번째 단어부터 다시 확인하세요.`;
    if (wrong < 0) triggerCelebration('문장을 정확하게 완성했어요', 'talk');
    return render();
  }
  if (['arcade-typing', 'arcade-duel', 'arcade-search'].includes(action) && !state.sessions.some((session) => session.mode === 'new')) return;
  if (action === 'arcade-typing') return openTyping();
  if (action === 'typing-start') return startTypingRound();
  if (action === 'typing-restart') return openTyping();
  if (action === 'typing-next') { typing.round += 1; return startTypingRound(); }
  if (action.startsWith('typing-upgrade:')) {
    const key = action.split(':')[1];
    if (!['sight', 'power', 'vitality'].includes(key)) return;
    const cost = upgradeCost(typing.stats[key]);
    if (typing.coins < cost) return;
    typing.coins -= cost;
    typing.stats[key] += 1;
    if (key === 'vitality') { typing.maxHp += 12; typing.hp += 12; }
    return render();
  }
  if (action.startsWith('typing-augment:')) {
    const offer = typing.offers[Number(action.split(':')[1])];
    if (!offer) return;
    typing.augments.push(offer.id);
    typing.offers = [];
    return render();
  }
  if (action === 'result-home') return goHome('오늘의 단어 5개를 학습했어요!');
  if (action === 'arcade-duel') return openDuel();
  if (action.startsWith('duel-difficulty:') && duel?.phase === 'idle') { duel.difficulty = action.split(':')[1]; return render(); }
  if (action === 'duel-start') return openDuel(true);
  if (action.startsWith('duel-answer:')) return answerDuel(action.split(':')[1]);
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
    if (stage <= 10) return startLearning(stageWords(major, stage), 'new', { major, stage });
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
    const pool = validIds(getLearnedIds(state));
    if (pool.length < 3) return;
    const targets = shuffle(pool).slice(0, 3).map(byId);
    screen = 'learn';
    learningSession = { mode: 'arcade', items: targets, mistakes: 0 };
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
  if (action === 'speak-word') return speakText(learningSession.items[learningSession.previewIndex].word);
  if (action === 'speak-quick') return speakText(quickSession.items[quickSession.index].word);
  if (action === 'speak-smalltalk') return speakSmallTalk();
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
    if (quickSession.index === quickSession.items.length - 1) return goHome(`${quickSession.items.length}개 중 ${quickSession.score}개 정답이에요.`);
    quickSession.index += 1;
    quickSession.selection = '';
    quickSession.submitted = false;
    quickSession.options = quickOptions(quickSession.items[quickSession.index], quickSession.items);
    return render();
  }
  if (action === 'settings-done') return goHome('설정을 저장했어요.');
});

root.addEventListener('submit', (event) => {
  if (event.target.matches('.conversation-form')) {
    event.preventDefault();
    return submitConversation(event.target.querySelector('input').value);
  }
  if (!event.target.matches('.typing-form')) return;
  event.preventDefault();
  submitTyping(event.target.querySelector('input')?.value || '');
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
  const nextActions = ['boss-intro-start', 'preview-next', 'start-sentence', 'sentence-next', 'check-sentence', 'search-start', 'finish-search', 'quick-submit', 'quick-next', 'talk-check', 'talk-done', 'result-home', 'typing-start', 'typing-next', 'duel-start', 'onboarding-next', 'onboarding-finish', 'settings-done'];
  const control = nextActions.map((action) => root.querySelector(`[data-action="${action}"]:not(:disabled)`)).find(Boolean);
  if (control) { event.preventDefault(); control.click(); }
});

render();

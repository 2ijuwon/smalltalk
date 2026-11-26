const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = randomInt(index + 1);
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}
const randomInt = (max) => Math.floor(Math.random() * max);

const pixelPatterns = {
  talk: ['0111110', '1111111', '1101011', '1111111', '1111110', '0111000', '0100000'],
  home: ['0001000', '0011100', '0111110', '1111111', '0110110', '0110110', '0110110'],
  review: ['0011110', '0100001', '1100001', '1110010', '0000100', '0101000', '0010000'],
  stats: ['0000011', '0000011', '0011011', '0011011', '1111011', '1111011', '1111111'],
  settings: ['0011100', '0111110', '1100011', '1101011', '1100011', '0111110', '0011100'],
  search: ['0111000', '1000100', '1000100', '1000100', '0111100', '0000010', '0000001'],
  duel: ['0000011', '0000111', '0001110', '1011100', '0111000', '1110000', '1100000'],
  refresh: ['0011100', '0100011', '1000111', '1000000', '1000001', '0100010', '0011100'],
  keyboard: ['0000000', '1111111', '1000001', '1010101', '1000001', '1011101', '1111111'],
};

function pixelIcon(name) {
  const cells = pixelPatterns[name].flatMap((row, y) => [...row].flatMap((cell, x) =>
    cell === '1' ? [`${x * 2}px ${y * 2}px`] : []));
  const lines = {
    home: 'M3 10 12 3l9 7v10H3z M9 20v-7h6v7',
    talk: 'M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-6 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M8 10h8',
    review: 'M5 10a7 7 0 1 1 2 7 M3 6v5h5',
    stats: 'M4 20h16 M6 17v-5 M12 17V8 M18 17V4',
    settings: 'M4 7h16 M4 12h16 M4 17h16 M8 5v4 M16 10v4 M10 15v4',
    search: 'M15 15l5 5 M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0z',
    duel: 'M5 20l5-5 M7 12l5 5 M10 15l9-9 1-3-3 1-9 9',
    refresh: 'M20 8a8 8 0 0 0-13-2L4 9 M4 4v5h5 M4 16a8 8 0 0 0 13 2l3-3 M20 20v-5h-5',
    keyboard: 'M3 6h18v12H3z M7 10h.01 M10 10h.01 M14 10h.01 M17 10h.01 M8 14h8',
  };
  return `<span class="pixel-icon" aria-hidden="true" style="--pixels:${cells.join(',')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${lines[name]}"/></svg></span>`;
}

const spriteColors = {
  o: '#173d64', b: '#3379b3', s: '#6eb6e9', l: '#bde7ff', w: '#fff', y: '#ffdc83', k: '#101b2a', p: '#f48eae', v: '#7e82cc', m: '#afb3ec', t: '#e2e5ff',
  R: '#ec4852', D: '#9b283c', H: '#ffb79a', G: '#569454', T: '#754831',
  B: '#56718b', N: '#344b63', P: '#a8c5dc', E: '#a9bed3',
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
  bomb: [
    '..........y.y...', '...........y....', '..........yoy...', '.........oo.....',
    '......oooooo....', '....ooBBBBBBoo..', '...oBPPBBBBBBBo.', '...oPBBBBBBBBBo.',
    '..oBBBBBBBBBBBNo', '..oBBBBBBBBBBNNo', '..oBBBBBBBBBNNNo', '...oBBBBBBNNNNo.',
    '...oBNNNNNNNNNo.', '....ooNNNNNNoo..', '......oooooo....', '................',
  ],
  orchardApple: [
    '...........GG...', '........T.GGGG..', '........TGGG....', '.......DDD......',
    '.....DDRRRDD....', '....DRHHHRRRDD..', '...DRHHRRRRRRRD.', '..DRHRRRRRRRRRD.',
    '..DRRRRRRRRRRRD.', '..DRRRRRRRRRRRD.', '..DRRRRRRRRRRRD.', '...DRRRRRRRRRD..',
    '....DRRRRRRRD...', '.....DDRRRDD....', '.......DDD......', '................',
  ],
  watch: [
    '.......ooo......', '......oyyyo.....', '.......ooo......', '.....ooooooo....',
    '....oyyyyyyyo...', '...oywwwwwwwyo..', '..oywwwowwwwwyo.', '..oywwwowwwwwyo.',
    '..oywwwoowwwwyo.', '..oywwwwwwwwwyo.', '..oywwwwwwwwwyo.', '...oywwwwwwwyo..',
    '....oyyyyyyyo...', '.....ooooooo....', '................', '................',
  ],
  heal: [
    '................', '......oooo......', '.....oowwoo.....', '.....owwwwo.....',
    '..oooooooooooo..', '.owwwwwwwwwwwwo.', '.owwwwwppwwwwwo.', '.owwwwwppwwwwwo.',
    '.owwwppppppwwwo.', '.owwwppppppwwwo.', '.owwwwwppwwwwwo.', '.owwwwwppwwwwwo.',
    '.ollllllllllllo.', '..oooooooooooo..', '................', '................',
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

const spriteMarkup = new Map();

const themeFaces = {
  sun: ['.....y.....', '.y.......y.', '...yyyyy...', '..yyyyyyy..', '..yykykyy..',
    'yyyyyyyyyyy', '..yykykyy..', '..yyykyyy..', '...yyyyy...', '.y.......y.', '.....y.....'],
  moon: ['....lll....', '...ll......', '..ll.......', '.ll......l.', '.lll....l..',
    '.llklllll..', '.llllklll..', '..lklkll...', '...llll....', '....lll....', '...........'],
};

const themeIcons = Object.entries(themeFaces).map(([name, rows]) => {
  const pixels = rows.flatMap((row, y) => [...row].map((cell, x) => spriteColors[cell]
    ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${spriteColors[cell]}"/>` : '')).join('');
  return `<svg class="theme-slime__${name}" viewBox="0 0 11 11" shape-rendering="crispEdges" aria-hidden="true">${pixels}</svg>`;
}).join('');

function themeSlime() {
  return `<button type="button" class="theme-slime" data-action="toggle-theme" aria-label="다크 모드" aria-pressed="${document.documentElement.dataset.theme === 'dark'}">${themeIcons}<span>테마</span></button>`;
}

function pixelSprite(name) {
  if (!spriteMarkup.has(name)) spriteMarkup.set(name, renderPixelSprite(name));
  return spriteMarkup.get(name);
}

const roundedSprites = {
  book: '<path fill="#cce8ff" stroke="#226191" d="M8 4C6 2.7 3.8 2.7 1.8 3.2v9.3c2.3-.5 4.4-.4 6.2.8 1.8-1.2 3.9-1.3 6.2-.8V3.2c-2-.5-4.2-.5-6.2.8Zm0 0v9" />',
  search: '<circle cx="6.6" cy="6.6" r="4.2" fill="#bfe5ff" stroke="#226191"/><path d="m9.8 9.8 4 4" stroke="#226191" stroke-width="2.2" stroke-linecap="round"/>',
  duel: '<path fill="#cce8ff" stroke="#226191" stroke-linejoin="round" d="m5 10 7.3-7.3 2.3-1-1 2.3L6.4 11.4Z"/><path d="m4 8.8 3.2 3.2M5.2 11l-2.6 2.6" stroke="#9b5c20" stroke-width="1.6" stroke-linecap="round"/>',
  orchardApple: '<path d="M8.2 5c-.5-1.4-.5-2.7.1-4" fill="none" stroke="#74462e" stroke-width="1.15" stroke-linecap="round"/><path d="M8 3.8C9.5 1 11.6.9 13 1c-.5 2.4-2.7 3.5-5 2.8" fill="#5b9b67"/><circle cx="8" cy="9.2" r="5.7" fill="#e85061"/><path d="M4.7 8.1c.2-.9.8-1.5 1.6-1.9" fill="none" stroke="#ffc2bc" stroke-width="1.2" stroke-linecap="round"/>',
  bomb: '<circle cx="8" cy="9.2" r="5.7" fill="#3b4c62"/><path d="m8.8 4.3 1.1-1.2c.5-.6 1.2-.8 1.9-.7" fill="none" stroke="#af6e40" stroke-width="1.15" stroke-linecap="round"/><path d="m12 1 .4 1 .9.35-.9.4-.4.9-.35-.9-.9-.4.9-.35z" fill="#ffba54"/><circle cx="5.8" cy="7" r="1" fill="#a8c5dc"/>',
  heal: '<rect x="2" y="5" width="12" height="8.5" rx="2" fill="#dbeeff" stroke="#226191"/><path d="M6 5V3.5h4V5" fill="none" stroke="#226191"/><path d="M8 7.1v4.3M5.8 9.3h4.4" stroke="#d65374" stroke-width="1.5" stroke-linecap="round"/>',
  watch: '<circle cx="8" cy="9" r="5.5" fill="#fff2c0" stroke="#875a25"/><path d="M7 2h2M8 6v3l2 1" fill="none" stroke="#875a25" stroke-linecap="round"/>',
};

function roundedSlime(name) {
  return `<svg class="rounded-art" viewBox="0 0 16 16" focusable="false"><path class="rounded-slime-body" d="M1 10c0-3.2 2.8-6.3 6.1-6.6 2.6-.3 5.1 1 6.4 3 1 1.5 1.7 3.5 1.3 5C14.3 13.4 11.2 14 8 14c-3.8 0-7-.9-7-4Z"/><path class="rounded-slime-shine" d="M4 7.1c.6-.9 1.5-1.4 2.4-1.5"/><g class="slime-frame slime-frame--0"><circle cx="6.1" cy="9" r=".57"/><circle cx="10" cy="9" r=".57"/><path d="${name === 'surprised' ? 'M8 10.3h.01' : name === 'boss' ? 'm7.15 10.65.85-.38.85.38' : 'M7.2 10.3q.8 1 1.6 0'}"/></g><g class="slime-frame slime-frame--1"><path d="M5.4 9h1.4m2.5 0h1.4m-3.5 1.3q.8 1 1.6 0"/></g><g class="slime-frame slime-frame--2"><path d="m5.4 9.4.7-.6.7.6m2.5 0 .7-.6.7.6m-3.8.8q1.1 1.3 2.2 0"/></g></svg>`;
}

function renderPixelSprite(name) {
  if (['mascot', 'boss', 'surprised'].includes(name)) {
    const sprites = name === 'surprised'
      ? [spriteFrames.mascot.map((row, y) => {
        if (y === 9) return 'osllllkkkkllllso';
        if (y === 11) return '.oslllllkklllso.';
        return row;
      })]
      : slimeFrames(name);
    const frames = sprites.map((rows, frame) => `<g class="slime-frame slime-frame--${frame}">${rows.flatMap((row, y) => [...row].map((cell, x) => spriteColors[cell] ? `<rect data-pixel="${cell}" x="${x}" y="${y}" width="1" height="1" fill="${spriteColors[cell]}"/>` : '')).join('')}</g>`).join('');
    return `<span class="pixel-sprite pixel-sprite--slime${name === 'boss' ? ' pixel-sprite--boss' : ''}" aria-hidden="true"><svg class="pixel-art" viewBox="0 0 16 16" shape-rendering="crispEdges" focusable="false">${frames}</svg>${roundedSlime(name)}</span>`;
  }
  const spriteCells = (rows) => rows.flatMap((row, y) => [...row].flatMap((cell, x) =>
    spriteColors[cell] ? [`${x}px ${y}px ${spriteColors[cell]}`] : []));
  const outlined = name.endsWith('Outline');
  const rows = spriteRows[outlined ? name.slice(0, -7) : name];
  const cells = spriteCells(outlined ? rows.map((row, y) => [...row].map((cell, x) => {
    if (cell === '.') return '.';
    return [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].some(([nx, ny]) => (rows[ny]?.[nx] ?? '.') === '.') ? 'E' : '.';
  }).join('')) : rows);
  const art = outlined ? '<circle cx="8" cy="9.2" r="5.7" fill="none" stroke="currentColor" stroke-dasharray="1.3 1.7"/>' : roundedSprites[name];
  return `<span class="pixel-sprite${art ? ' has-rounded-art' : ''}" aria-hidden="true" style="--sprite:${cells.join(',')}">${art ? `<svg class="rounded-art" viewBox="0 0 16 16" focusable="false">${art}</svg>` : ''}</span>`;
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
  const smile = blink.map((row, y) => {
    if (y === 9) return `o${fill}${light.repeat(3)}k${light.repeat(4)}k${light.repeat(3)}${fill}o`;
    if (y === 10) return `.o${fill}${light.repeat(3)}kkkk${light.repeat(3)}${fill}o.`;
    return row;
  });
  return [base, blink, smile];
}

function brandMark() { return `<span class="brand-mark">${pixelSprite('mascot')}</span>`; }
function button(label, action, variant = 'primary', disabled = false) { return `<button class="button button--${variant}" data-action="${action}" ${disabled ? 'disabled' : ''}>${label}</button>`; }
function card(content, className = '') { return `<section class="card ${className}">${content}</section>`; }
function progress(value, max, label) {
  const percent = Math.min(100, Math.round(value / Math.max(1, max) * 100));
  return `<div class="progress-wrap"><div class="progress-label"><span>${label}</span><strong data-motion-key="progress-value">${value}/${max}</strong></div><div class="progress" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}"><span data-motion-key="progress-fill" style="width:${percent}%"></span></div></div>`;
}

function gameOverActions(restart, score, startingBest) {
  return `<div class="game-over"><strong class="record-banner" ${score > startingBest ? '' : 'hidden'}>신기록 달성!</strong><div class="game-over-actions"><button class="button button--secondary" data-nav="home">게임 종료</button>${button('다시 시작', restart)}</div></div>`;
}

export { escapeHtml, shuffle, randomInt, pixelIcon, pixelSprite, brandMark, button, card, progress, gameOverActions, themeSlime };

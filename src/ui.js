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
};

function pixelIcon(name) {
  const cells = pixelPatterns[name].flatMap((row, y) => [...row].flatMap((cell, x) =>
    cell === '1' ? [`${x * 2}px ${y * 2}px`] : []));
  return `<span class="pixel-icon" aria-hidden="true" style="--pixels:${cells.join(',')}"></span>`;
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

function pixelSprite(name) {
  if (!spriteMarkup.has(name)) spriteMarkup.set(name, renderPixelSprite(name));
  return spriteMarkup.get(name);
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
    return `<span class="pixel-sprite pixel-sprite--slime${name === 'boss' ? ' pixel-sprite--boss' : ''}" aria-hidden="true"><svg viewBox="0 0 16 16" shape-rendering="crispEdges" focusable="false">${frames}</svg></span>`;
  }
  const spriteCells = (rows) => rows.flatMap((row, y) => [...row].flatMap((cell, x) =>
    spriteColors[cell] ? [`${x}px ${y}px ${spriteColors[cell]}`] : []));
  const outlined = name.endsWith('Outline');
  const rows = spriteRows[outlined ? name.slice(0, -7) : name];
  const cells = spriteCells(outlined ? rows.map((row, y) => [...row].map((cell, x) => {
    if (cell === '.') return '.';
    return [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].some(([nx, ny]) => (rows[ny]?.[nx] ?? '.') === '.') ? 'E' : '.';
  }).join('')) : rows);
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

export { escapeHtml, shuffle, randomInt, pixelIcon, pixelSprite, brandMark, button, card, progress, gameOverActions };

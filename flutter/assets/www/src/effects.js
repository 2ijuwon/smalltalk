import { pixelSprite } from './ui.js';

const effectPlayers = new Map();

const specialColors = {
  watch: '#b4c5d4', heal: '#83d9ae', bomb: '#ffd186', loot: '#b7a3ff',
  boss: '#8e93ef', record: '#ffe27f', over: '#a2c5f0',
  lesson: '#90d3ff', review: '#aadebe', talk: '#bbabff', goodbye: '#a8c3e4',
};

function specialEffect(kind, sound = kind) {
  playEffect(sound);
  const flash = document.createElement('div');
  flash.className = 'special-flash';
  flash.setAttribute('aria-hidden', 'true');
  flash.style.setProperty('--flash', specialColors[kind]);
  document.body.append(flash);
  flash.addEventListener('animationend', () => flash.remove(), { once: true });
  setTimeout(() => flash.remove(), 800);
}

export function initializeTheme() {
  const preferredTheme = matchMedia('(prefers-color-scheme: dark)');
  document.documentElement.dataset.theme = preferredTheme.matches ? 'dark' : 'light';
  preferredTheme.addEventListener('change', (event) => {
    document.documentElement.dataset.theme = event.matches ? 'dark' : 'light';
  });
}

const slimeReactionTimers = new WeakMap();
const slimeFireDuration = 4400;

function stokeSlimeFire(sprite, reaction, now) {
  const remaining = (reaction.fireLevel ?? 0) * Math.max(0, 1 - (now - (reaction.fireAt ?? now)) / slimeFireDuration);
  if (!remaining && reaction.streak !== 100) return;

  if (!reaction.flame) {
    const flame = document.createElement('span');
    flame.className = 'slime-fire';
    flame.setAttribute('aria-hidden', 'true');
    flame.innerHTML = '<i></i><i></i><i></i>';
    document.body.append(flame);
    reaction.flame = flame;
    const follow = () => {
      if (!sprite.isConnected || reaction.flame !== flame) {
        flame.remove();
        return;
      }
      const bounds = sprite.getBoundingClientRect();
      flame.style.left = `${bounds.left + bounds.width * .05}px`;
      flame.style.top = `${bounds.top - bounds.height * .24}px`;
      flame.style.width = `${bounds.width * .9}px`;
      flame.style.height = `${bounds.height * .57}px`;
      reaction.flameFrame = requestAnimationFrame(follow);
    };
    follow();
  }

  const flame = reaction.flame;
  reaction.fireAt = now;
  reaction.fireLevel = remaining ? Math.min(1, remaining + .13) : .4;
  reaction.fireAnimation?.cancel();
  const level = reaction.fireLevel;
  reaction.fireAnimation = flame.animate([
    { opacity: .55 + level * .45, scale: `${.6 + level * .55} ${.45 + level * .85}` },
    { opacity: 0, scale: '.55 .12' },
  ], { duration: slimeFireDuration, fill: 'forwards' });
  reaction.fireAnimation.onfinish = () => {
    cancelAnimationFrame(reaction.flameFrame);
    flame.remove();
    reaction.flame = null;
    reaction.fireLevel = 0;
    reaction.fireAnimation = null;
  };
}

function reactToSlime(sprite) {
  const now = performance.now();
  const reaction = slimeReactionTimers.get(sprite) || { count: 0, streak: 0, lastTap: -Infinity };
  reaction.count = now - reaction.lastTap < 650 ? reaction.count + 1 : 1;
  reaction.streak = now - reaction.lastTap < 1000 ? reaction.streak + 1 : 1;
  reaction.lastTap = now;
  clearTimeout(reaction.faceTimer);
  clearTimeout(reaction.tintTimer);
  slimeReactionTimers.set(sprite, reaction);
  sprite.classList.remove('slime-tint-returning');
  sprite.classList.add('slime-delighted');
  sprite.animate([
    { translate: '0 0' },
    { translate: '0 -9px' },
    { translate: '0 0' },
  ], { duration: 300, easing: 'ease-out' });
  reaction.faceTimer = setTimeout(() => sprite.classList.remove('slime-delighted'), 320);
  if (reaction.count >= 6) {
    const page = document.documentElement;
    page.dataset.theme = page.dataset.theme === 'dark' ? 'light' : 'dark';
    reaction.count = 0;
  }
  sprite.style.setProperty('--slime-tint', `${reaction.count > 1 ? reaction.count * 12 : 0}deg`);
  reaction.tintTimer = setTimeout(() => {
    sprite.classList.add('slime-tint-returning');
    sprite.style.setProperty('--slime-tint', '0deg');
    reaction.count = 0;
  }, 650);
  stokeSlimeFire(sprite, reaction, now);
}

function showLaunch() {
  if (new URLSearchParams(location.search).has('resume') ||
      document.querySelector('.launch-overlay')) return;

  const overlay = document.createElement('div');
  overlay.className = 'launch-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  const letters = [...'smalltalk'].map((letter, index) =>
    `<span class="launch-letter" style="--letter-index:${index}"><span>${letter}</span></span>`).join('');
  overlay.innerHTML = `<i></i><i></i><div class="launch-lockup">${pixelSprite('mascot')}<strong>${letters}</strong><span class="launch-sparks"></span></div>`;
  const panel = overlay.firstElementChild;
  let paintFrame;
  let cleanupTimer;
  overlay.classList.add('launch-overlay--paused');
  const finish = () => {
    clearTimeout(cleanupTimer);
    document.removeEventListener('visibilitychange', updateVisibility);
    cancelAnimationFrame(paintFrame);
    overlay.remove();
  };
  const updateVisibility = () => {
    cancelAnimationFrame(paintFrame);
    clearTimeout(cleanupTimer);
    if (document.hidden) {
      overlay.classList.add('launch-overlay--paused');
    } else {
      paintFrame = requestAnimationFrame(() => {
        paintFrame = requestAnimationFrame(() => {
          if (!document.hidden) {
            overlay.classList.remove('launch-overlay--paused');
            cleanupTimer = setTimeout(finish, 3200);
          }
        });
      });
    }
  };
  document.addEventListener('visibilitychange', updateVisibility);
  const cues = {
    'launch-liftoff': 'launch',
    'launch-sparks': 'place',
    'launch-letter-rise': 'letter',
    'launch-reunion': 'chime',
    'launch-panel-left': 'place',
  };
  for (const kind of new Set(Object.values(cues))) effectPlayer(kind);
  overlay.addEventListener('animationstart', ({ animationName }) => {
    const cue = cues[animationName];
    if (cue && !document.hidden) playEffect(cue);
  });
  panel.addEventListener('animationend', finish, { once: true });
  document.body.append(overlay);
  updateVisibility();
}

function effectPlayer(kind) {
  let player = effectPlayers.get(kind);
  if (!player) {
    player = new Audio();
    player.preload = 'auto';
    player.src = new URL(`./audio/fx-${kind}.wav`, import.meta.url);
    effectPlayers.set(kind, player);
  }
  return player;
}

function playEffect(kind) {
  const player = effectPlayer(kind);
  player.currentTime = 0;
  player.play().catch(() => {
    // A later tap can unlock media if the browser blocks playback.
  });
}

export { reactToSlime, showLaunch, effectPlayer, playEffect, specialEffect };

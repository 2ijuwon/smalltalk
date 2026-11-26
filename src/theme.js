import { playEffect } from './effects.js';

const darkPreference = matchMedia('(prefers-color-scheme: dark)');
let deviceDark = darkPreference.matches;
let lockedMode = null;
let saveLock;

function applyTheme(dark) {
  const mode = dark ? 'dark' : 'light';
  document.documentElement.dataset.theme = mode;
  document.querySelector('meta[name="theme-color"]').content = dark ? '#151d29' : '#eaf5ff';
  document.querySelectorAll('[data-theme-choice]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.themeChoice === mode));
  });
}

function updateLockButton() {
  const button = document.querySelector('[data-action="theme-lock"]');
  if (!button) return;
  button.setAttribute('aria-pressed', String(Boolean(lockedMode)));
  button.querySelector('span').textContent = lockedMode ? '잠김' : '잠금';
}

function updateDeviceTheme(dark) {
  deviceDark = dark;
  if (!lockedMode) applyTheme(dark);
}

export function initializeTheme(mode, onLockChange) {
  saveLock = onLockChange;
  lockedMode = mode === 'light' || mode === 'dark' ? mode : null;
  applyTheme(lockedMode ? lockedMode === 'dark' : deviceDark);
  if (window.SmalltalkTheme) {
    window.receiveSmalltalkTheme = (dark, savedMode) => {
      deviceDark = dark;
      lockedMode = savedMode === 'light' || savedMode === 'dark' ? savedMode : null;
      saveLock(lockedMode);
      applyTheme(lockedMode ? lockedMode === 'dark' : deviceDark);
      updateLockButton();
    };
    window.receiveSmalltalkSystemTheme = updateDeviceTheme;
    window.SmalltalkTheme.postMessage('read');
  } else {
    darkPreference.addEventListener('change', ({ matches }) => updateDeviceTheme(matches));
  }
}

function setThemeLock(mode) {
  lockedMode = mode;
  saveLock(mode);
  window.SmalltalkTheme?.postMessage(mode || 'system');
  updateLockButton();
}

export function toggleThemeLock() {
  setThemeLock(lockedMode ? null : document.documentElement.dataset.theme);
  playEffect('tap');
}

export function selectTheme(mode) {
  if (mode !== 'light' && mode !== 'dark') return;
  applyTheme(mode === 'dark');
  if (lockedMode) setThemeLock(mode);
  playEffect(mode === 'dark' ? 'moon' : 'sun');
}

export function resetTheme() {
  lockedMode = null;
  window.SmalltalkTheme?.postMessage('system');
  applyTheme(deviceDark);
}

const art = {
  light: `<svg viewBox="0 0 32 32" aria-hidden="true" class="theme-art-modern">
    <path fill="none" stroke="#4794cb" stroke-width="2" stroke-linecap="round" d="M16 2v2m0 24v2M2 16h2m24 0h2M6.1 6.1l1.5 1.5m16.8 16.8 1.5 1.5m0-19.8-1.5 1.5M7.6 24.4l-1.5 1.5"/>
    <circle cx="16" cy="16" r="9" fill="#b7e7ff" stroke="#2876ad" stroke-width="1.5"/>
    <path fill="none" stroke="#1d4d7b" stroke-width="1.6" stroke-linecap="round" d="M13 15v.8m6-.8v.8m-4.5 2.2q1.5 2 3 0"/>
  </svg>`,
  dark: `<svg viewBox="0 0 32 32" aria-hidden="true" class="theme-art-modern">
    <path fill="#3566a0" stroke="#79b8ed" stroke-width="1.5" stroke-linejoin="round" d="M22 3.4c-5 2.4-7.3 8.7-4.7 13.1 2.5 4.3 6.4 6 11.1 4.4-2 4.8-6.3 7.9-11.9 7.9A12.8 12.8 0 0 1 3.7 16C3.7 7.8 10.9 1.8 22 3.4Z"/>
    <path fill="none" stroke="#d4efff" stroke-width="1.5" stroke-linecap="round" d="M9 16v.8m5-.8v.8m-3.8 2.7q1.4 1.8 2.7 0"/>
  </svg>`,
};

const pixelArt = {
  light: ['.......bb.......','.......bb.......','..b..........b..','...b........b...','......bbbb......','.....bllllb.....','....bllllllb....','bb..bldlldlb..bb','bb..bldlldlb..bb','....bllldllb....','.....bllllb.....','......bbbb......','...b........b...','..b..........b..','.......bb.......','.......bb.......'],
  dark: ['................','.......bbbbb....','.....bbdddb.....','....bddddb......','...bddddb.......','..bdddddb.......','..bdddddb.......','..bdlddddb......','..bdldldddb.....','..bdddlldddbbbb.','...bddddddddddb.','...bdddddddddb..','....bdddddddb...','.....bbdddbb....','.......bbb......','................'],
};

function themeArt(mode) {
  const colors = mode === 'light' ? { b: '#4794cb', l: '#b7e7ff', d: '#1d4d7b' } : { b: '#83bbec', d: '#3566a0', l: '#d4efff' };
  const cells = pixelArt[mode].flatMap((row, y) => [...row].map((cell, x) => colors[cell]
    ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${colors[cell]}"/>` : '')).join('');
  return `${art[mode]}<svg viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges" class="theme-art-pixel">${cells}</svg>`;
}

export function themeSettings() {
  const current = document.documentElement.dataset.theme;
  return `<section class="theme-settings" aria-labelledby="theme-title">
    <h2 id="theme-title">화면 모드</h2>
    <div class="theme-options" role="group" aria-label="라이트·다크 모드">
      ${[['light', '라이트 모드'], ['dark', '다크 모드']].map(([mode, label]) => `<button type="button" class="theme-option" data-action="theme:${mode}" data-theme-choice="${mode}" aria-pressed="${current === mode}">${themeArt(mode)}<span>${label}</span></button>`).join('')}
      <button type="button" class="theme-lock" data-action="theme-lock" aria-label="화면 모드 잠금" aria-pressed="${Boolean(lockedMode)}" aria-describedby="theme-lock-help">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path class="theme-shackle-open" d="M8 11V7a4 4 0 0 1 8 0"/><path class="theme-shackle-closed" d="M8 11V7a4 4 0 0 1 8 0v4"/><path d="M12 15v2"/></svg><span>${lockedMode ? '잠김' : '잠금'}</span>
      </button>
    </div>
    <p id="theme-lock-help">잠금이 꺼져 있으면 앱을 켤 때 기기의 화면 모드를 따라요.</p>
  </section>`;
}

import { writeFile } from 'node:fs/promises';

const rate = 22050;
const tau = Math.PI * 2;
const voices = {
  bell: (phase, time) => Math.sin(phase) + .28 * Math.sin(phase * 2.76) * Math.exp(-18 * time),
  soft: (phase) => Math.sin(phase) + .16 * Math.sin(phase * 2),
  metal: (phase, time) => .62 * Math.sin(phase) + .30 * Math.sin(phase * 2.31) + .21 * Math.sin(phase * 3.34) * Math.exp(-13 * time),
  noise: (phase, time, noise) => .73 * noise + .27 * Math.sin(phase),
};

// start, duration, start pitch, end pitch, gain, timbre
const cues = {
  navigate: [[0, .08, 340, 570, .19, 'soft']],
  listen: [[0, .07, 680, 820, .12, 'soft']],
  bounce: [[0, .12, 300, 595, .22, 'soft'], [.045, .09, 500, 300, .13, 'bell']],
  sun: [[0, .13, 523, 523, .22, 'bell'], [.065, .18, 784, 784, .24, 'bell']],
  moon: [[0, .17, 660, 660, .22, 'bell'], [.075, .24, 392, 392, .24, 'soft']],
  match: [[0, .08, 610, 870, .14, 'soft'], [.052, .16, 932, 932, .24, 'bell']],
  tilein: [[0, .055, 580, 330, .21, 'soft']],
  tileout: [[0, .055, 330, 560, .17, 'soft']],
  phrase: [[0, .15, 523, 523, .18, 'bell'], [.07, .16, 659, 659, .20, 'bell'], [.14, .24, 880, 880, .25, 'bell']],
  lessonhit: [[0, .085, 180, 80, .23, 'noise'], [.017, .15, 125, 52, .27, 'soft']],
  search: [[0, .09, 850, 1160, .16, 'soft'], [.03, .14, 1319, 1319, .2, 'bell']],
  searchclear: [[.10, .16, 660, 660, .2, 'bell'], [.17, .17, 880, 880, .22, 'bell'], [.24, .22, 1108, 1108, .24, 'bell']],
  xp: Array.from({ length: 5 }, (_, index) => [index * .033, .15, 550 + 130 * index, 550 + 130 * index, .13, 'bell']),
  shuffle: [[0, .09, 280, 440, .16, 'noise'], [.055, .09, 421, 690, .18, 'soft'], [.112, .14, 784, 784, .17, 'bell']],
  send: [[0, .10, 430, 820, .17, 'soft']],
  reply: [[0, .09, 600, 550, .16, 'soft'], [.06, .13, 740, 780, .17, 'soft']],
  shot: [[0, .11, 780, 200, .25, 'soft'], [0, .035, 500, 125, .13, 'noise']],
  impact: [[0, .07, 115, 65, .29, 'soft'], [0, .05, 680, 110, .17, 'noise']],
  shield: [[0, .19, 1050, 772, .23, 'metal'], [0, .06, 1200, 800, .21, 'noise']],
  kill: [[0, .09, 330, 96, .26, 'soft'], [.04, .11, 784, 784, .16, 'bell']],
  damage: [[0, .10, 160, 63, .29, 'noise'], [.012, .22, 115, 64, .26, 'soft']],
  bossdown: [[0, .25, 165, 46, .3, 'soft'], [.11, .27, 330, 330, .19, 'bell'], [.21, .26, 494, 494, .21, 'bell'], [.29, .32, 660, 660, .18, 'bell']],
  parry: [[0, .15, 630, 1120, .27, 'metal'], [.045, .22, 1318, 910, .22, 'bell']],
  unfreeze: [[0, .17, 190, 490, .23, 'soft'], [.065, .26, 349, 733, .20, 'bell']],
  upgrade: [[0, .11, 466, 466, .17, 'metal'], [.08, .14, 699, 699, .19, 'bell'], [.145, .20, 932, 932, .21, 'bell']],
  bonuscut: [[0, .09, 150, 340, .26, 'noise'], [.028, .13, 330, 550, .18, 'soft']],
  goldcut: [[0, .10, 130, 460, .24, 'noise'], [.04, .17, 784, 784, .20, 'metal'], [.12, .23, 1175, 1175, .24, 'bell'], [.19, .22, 1568, 1568, .17, 'bell']],
  blast: [[0, .19, 290, 72, .36, 'noise'], [.009, .33, 118, 48, .5, 'soft'], [.016, .27, 910, 490, .27, 'metal'], [.028, .24, 380, 113, .17, 'metal']],
};

function render(notes) {
  const sampleCount = Math.ceil(rate * Math.max(...notes.map(([start, duration]) => start + duration)));
  const wave = Buffer.alloc(44 + sampleCount * 2);
  wave.write('RIFF');
  wave.writeUInt32LE(wave.length - 8, 4);
  wave.write('WAVEfmt ', 8);
  wave.writeUInt32LE(16, 16);
  wave.writeUInt16LE(1, 20);
  wave.writeUInt16LE(1, 22);
  wave.writeUInt32LE(rate, 24);
  wave.writeUInt32LE(rate * 2, 28);
  wave.writeUInt16LE(2, 32);
  wave.writeUInt16LE(16, 34);
  wave.write('data', 36);
  wave.writeUInt32LE(sampleCount * 2, 40);

  let seed = 73;
  for (let index = 0; index < sampleCount; index += 1) {
    const position = index / rate;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = (seed / 0xffffffff) * 2 - 1;
    let value = 0;
    for (const [start, duration, from, to, gain, voice] of notes) {
      const age = position - start;
      if (age < 0 || age >= duration) continue;
      const progress = age / duration;
      const phase = tau * age * (from + (to - from) * progress / 2);
      const envelope = Math.min(1, age / .005) * (1 - progress) ** 1.7;
      value += voices[voice](phase, age, noise) * envelope * gain;
    }
    wave.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32767), 44 + index * 2);
  }
  return wave;
}

await Promise.all(Object.entries(cues).map(([name, notes]) =>
  writeFile(new URL(`../src/audio/fx-${name}.wav`, import.meta.url), render(notes))));

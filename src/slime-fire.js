import { slimeRows } from './slime-art.js';

const fireDuration = 4400;
const width = 24;
const height = 24;
const left = -4;
const top = -16;
const pixelRows = slimeRows();
const pixelCrown = Array.from({ length: 10 }, (_, index) => {
  const x = index + 3;
  return [x - left, pixelRows.findIndex((row) => row[x] !== '.') - top];
});
const smoothCrown = [[3.4, 5.3], [5, 4.05], [7.4, 3.38], [9.6, 3.56], [11.7, 4.6]]
  .map(([x, y]) => [x - left, y - top]);
const heatColors = ['#88301d60', '#b93828b0', '#ed5529', '#ff8b20', '#ffbc36', '#ffe779', '#fff4bf'];

function pixelFlame(context) {
  let heat = new Float32Array(width * height);
  let next = new Float32Array(heat.length);
  let frame = -1;
  return (seconds, intensity) => {
    const tick = Math.floor(seconds * 22);
    if (tick === frame) return;
    frame = tick;
    const phase = seconds * 6;
    for (let y = 0; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const below = (y + 1) * width + x;
        const spread = (heat[below - 1] + heat[below + 1]) * .22 + heat[below] * .56;
        next[y * width + x] = Math.max(0, spread - .34 - Math.random() * .8);
      }
    }
    for (const [x, y] of pixelCrown) {
      const pulse = .74 + .19 * Math.sin(phase + x * .74) + .07 * Math.random();
      next[y * width + x] = intensity * 13 * pulse;
    }
    [heat, next] = [next, heat];
    context.clearRect(0, 0, width, height);
    for (let y = 1; y < height; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const value = heat[y * width + x];
        if (value < 1.15) continue;
        context.fillStyle = heatColors[Math.min(heatColors.length - 1, Math.floor(value / 1.5))];
        context.fillRect(x, y, 1, 1);
      }
    }
  };
}

function flameRibbon(context, x, y, size, halfWidth, bend) {
  context.beginPath();
  context.moveTo(x - halfWidth, y);
  context.bezierCurveTo(x - halfWidth * 1.4, y - size * .32, x + bend * .65, y - size * .58, x + bend, y - size);
  context.bezierCurveTo(x + bend * .9 + halfWidth, y - size * .67, x + halfWidth * 1.35, y - size * .28, x + halfWidth, y);
  context.quadraticCurveTo(x, y + .72, x - halfWidth, y);
  context.fill();
}

function smoothFlame(context) {
  const glow = context.createRadialGradient(12, 18.7, .4, 12, 18.7, 7.5);
  glow.addColorStop(0, '#ff9e32b0');
  glow.addColorStop(1, '#ff603000');
  return (seconds, intensity) => {
    context.clearRect(0, 0, width, height);
    context.save();
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(width, 0);
    context.lineTo(width, 19);
    for (const [x, y] of smoothCrown.slice().reverse()) context.lineTo(x, y + .46);
    context.lineTo(0, 19);
    context.clip();

    context.globalAlpha = intensity * .65;
    context.fillStyle = glow;
    context.fillRect(2, 7, 20, 16);
    context.globalAlpha = Math.min(1, intensity * 2);
    smoothCrown.forEach(([x, y], index) => {
      const phase = seconds * (8.2 + index * .61) + index * 1.86;
      const pulse = Math.sin(phase) + Math.sin(phase * 1.63) * .34;
      const size = (4.9 + 1.5 * pulse + (index % 2 ? .7 : 0)) * intensity;
      const bend = Math.sin(phase * .57 + .65) * 1.55 * intensity;
      const spread = (1.45 + .27 * pulse) * (.45 + intensity * .55);
      const gradient = context.createLinearGradient(x, y + .4, x, y - size);
      gradient.addColorStop(0, '#ffb445');
      gradient.addColorStop(.34, '#ff8b27');
      gradient.addColorStop(.73, '#f64a21');
      gradient.addColorStop(1, '#e93423a0');
      context.fillStyle = gradient;
      flameRibbon(context, x, y, size, spread, bend);
      context.fillStyle = '#fff2a6c9';
      flameRibbon(context, x + .08, y + .06, size * .56, spread * .57, bend * .36);
    });
    for (let index = 0; index < 6; index += 1) {
      const age = (seconds * (.83 + index * .04) + index * .39) % 1;
      const [x, y] = smoothCrown[index % smoothCrown.length];
      context.globalAlpha = intensity * (1 - age) * .72;
      context.fillStyle = index % 2 ? '#ffb248' : '#ff7438';
      context.beginPath();
      context.ellipse(x + Math.sin(index * 2.45) * age * 2.9, y - age * 10 * intensity, .16 + .14 * (1 - age), .29 + .24 * (1 - age), .21, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  };
}

export function stokeSlimeFire(sprite, streak, fire, now) {
  const remaining = fire ? fire.level * Math.max(0, 1 - (now - fire.updated) / fireDuration) : 0;
  if (!remaining && streak !== 100) return fire;
  if (remaining) {
    fire.level = Math.min(1, remaining + .14);
    fire.updated = now;
    return fire;
  }

  const pixel = document.documentElement.dataset.skin === 'pixel';
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return null;
  const resolution = pixel ? 1 : 6;
  canvas.width = width * resolution;
  canvas.height = height * resolution;
  context.scale(resolution, resolution);
  canvas.className = `slime-fire-canvas${pixel ? ' slime-fire-canvas--pixel' : ''}`;
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const draw = pixel ? pixelFlame(context) : smoothFlame(context);
  const effect = { level: .66, updated: now };
  const art = sprite.querySelector(pixel ? '.pixel-art' : '.rounded-art');
  const anchor = () => {
    if (art) return art.getScreenCTM();
    const bounds = sprite.getBoundingClientRect();
    const scale = Math.min(bounds.width / 19, bounds.height / 16);
    return { a: scale, b: 0, c: 0, d: scale, e: bounds.left + bounds.width / 2 - 8 * scale, f: bounds.top - 3.4 * scale };
  };
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animate = (time) => {
    const intensity = effect.level * Math.max(0, 1 - (time - effect.updated) / fireDuration);
    if (!intensity || !sprite.isConnected || document.documentElement.dataset.skin === (pixel ? 'modern' : 'pixel')) {
      canvas.remove();
      return;
    }
    const matrix = anchor();
    if (!matrix?.a) { canvas.remove(); return; }
    const { a, b, c, d, e, f } = matrix;
    canvas.style.transform = `matrix(${a},${b},${c},${d},${e + left * a + top * c},${f + left * b + top * d})`;
    draw(reduceMotion ? Math.floor(time / 100) / 10 : time / 1000, intensity);
    requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
  return effect;
}

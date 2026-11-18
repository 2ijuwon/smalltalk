export const strikeDuration = 950;

export function animateDuelEffect(root, phase) {
  const screenEffect = root.querySelector('.duel-screen-effect');
  const flash = { hit: '#fff0b9', damage: '#c51f3a' }[phase];
  if (flash) {
    screenEffect?.animate([
      { backgroundColor: flash, opacity: .86 },
      { backgroundColor: flash, opacity: .4, offset: .23 },
      { backgroundColor: flash, opacity: 0 },
    ], { duration: 610, easing: 'ease-out' });
  }

  if (phase === 'hit') animateCut(root);
  if (phase === 'damage') {
    root.querySelector('.duel-player')?.animate([
      { transform: 'scale(1.38) translateY(10px)', filter: 'brightness(1.5)' },
      { transform: 'scale(.95) translateY(-2px)', offset: .42 },
      { transform: 'none' },
    ], { duration: 520, easing: 'ease-out' });
  }
}

function animateCut(root) {
  const strike = root.querySelector('.duel-strike');
  if (!strike) return;

  root.querySelector('.duel-scar--fresh')?.animate([
    { opacity: 0 }, { opacity: 1 },
  ], { delay: 75, duration: 160, fill: 'backwards' });
  strike.querySelectorAll('.duel-cut > i').forEach((trace) => {
    trace.animate([
      { transform: 'translate(-50%, -50%) scaleX(.035)', opacity: 0 },
      { transform: 'translate(-50%, -50%) scaleX(1)', opacity: 1, offset: .085 },
      { transform: 'translate(-50%, -50%) scaleX(1.035)', opacity: .7, offset: .33 },
      { transform: 'translate(-50%, -50%) scale(1.12, .35)', opacity: 0 },
    ], { duration: 880, fill: 'both' });
  });
  animateSparks(strike, 75, 1);
}

function animateSparks(anchor, delay, scale) {
  anchor?.querySelectorAll('.duel-rays > i').forEach((spark) => {
    const angle = spark.style.getPropertyValue('--ray');
    const distance = Number.parseFloat(spark.style.getPropertyValue('--reach')) * scale;
    spark.animate([
      { transform: `rotate(${angle}) translateX(3px) scaleX(2.4)`, opacity: 1 },
      { transform: `rotate(${angle}) translateX(${distance}px) scale(.15)`, opacity: 0 },
    ], { delay, duration: 610, easing: 'cubic-bezier(.15,.75,.4,1)', fill: 'both' });
  });
}

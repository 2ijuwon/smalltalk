export function createLayoutMotion(root) {
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
    const modern = document.documentElement.dataset.skin === 'modern';
    const movedParents = new Set();
    const planned = motionNodes().map(({ element, key }) =>
      ({ element, before: previous.get(key), after: element.getBoundingClientRect() }));
    planned.forEach(({ element, before, after }, index) => {
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
        if (modern) {
          for (let parent = element.parentElement; parent && parent !== root; parent = parent.parentElement) {
            if (movedParents.has(parent)) return;
          }
          movedParents.add(element);
        }
        element.animate([
          { transform: `translate(${modern ? Math.round(dx) : dx}px, ${modern ? Math.round(dy) : dy}px)` },
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

  return { fitVisibleText, motionNodes, captureMotionLayout, animateFluidLayout };
}

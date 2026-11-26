import { bossChargeSeconds, bossChargeThreshold, bossEliteHealth, upgradeCost, waveSize, fallSeconds, missDamage, enemyHealth, hitEnemy, rollAugments, typingLevels, typingPoints } from './typing-game.js';
import { bestScore } from './domain.js';
import { button, escapeHtml, gameOverActions, pixelSprite, randomInt } from './ui.js';
import { playEffect, specialEffect } from './effects.js';

export function createTypingArcade({ root, getState, getScreen, setScreen, render, learnedGamePool, saveBest }) {
  let typing = null;
  let typingFrame = 0;
  let typingLast = 0;

  function stopTyping() {
    cancelAnimationFrame(typingFrame);
    typingFrame = 0;
    root.classList.remove('typing-time-stop');
    for (const shot of typing?.shots || []) {
      if (shot.animation) shot.animation.cancel();
      else shot.cancel();
    }
  }

  function openTyping(difficulty = 'normal') {
    const words = learnedGamePool();
    if (words.length < 3) return;
    stopTyping();
    typing = { words, difficulty, startingBest: bestScore(getState(), 'typing'), shots: [], round: 1, hp: 100, maxHp: 100, coins: 0, score: 0, phase: 'ready', enemies: [], spawned: 0, spawnClock: 0, stats: { sight: 0, power: 0, vitality: 0 }, augments: [], offers: [], nextId: 0, message: '떨어지는 단어를 입력해 막으세요.' };
    setScreen('typing');
    render({ resetScroll: true });
  }

  function typingEnemyMarkup(enemy) {
    if (enemy.item) return `<div class="typing-enemy typing-item" aria-label="${enemy.item.label}: ${escapeHtml(enemy.word)}" data-enemy-id="${enemy.id}" style="--enemy-x:${enemy.x}%;top:${enemy.y}%">${pixelSprite(enemy.item.id)}<strong>${escapeHtml(enemy.word)}</strong></div>`;
    return `<div class="typing-enemy ${enemy.shield ? 'typing-enemy--shield' : ''} ${enemy.boss ? 'typing-enemy--boss' : ''} ${enemy.elite ? 'typing-enemy--elite' : ''}" data-enemy-id="${enemy.id}" style="--enemy-x:${enemy.x}%;top:${enemy.y}%"><i class="typing-eyes" aria-hidden="true"></i><strong>${enemy.word}</strong><div class="typing-enemy-hp" aria-label="체력 ${enemy.hp}/${enemy.maxHp}"><i style="width:${enemy.hp / enemy.maxHp * 100}%"></i></div><small>${typingEnemyHealthLabel(enemy)}</small>${enemy.boss ? '<span class="typing-boss-charge" hidden></span>' : ''}</div>`;
  }

  function typingEnemyHealthLabel(enemy) {
    return `${enemy.elite ? '정예 · ' : ''}${enemy.shield ? '▣ 방패 · ' : ''}${enemy.hp}/${enemy.maxHp}`;
  }

  function typingAugmentPanel(game) {
    return `<section class="typing-augment-panel" aria-labelledby="typing-augment-title">
      <div><h2 id="typing-augment-title">증강 선택</h2><p>카드를 누른 뒤 한 번 더 눌러 확정하세요.</p></div>
      <div class="typing-offers">${game.offers.map((offer, index) => `
        <button class="button rarity--${offer.rarity}" aria-pressed="${game.selectedOffer === index}" data-action="typing-augment:${index}">
          <span class="typing-offer-hint">다시 클릭해 선택!</span>
          <span class="typing-offer-rarity">${offer.rarity}</span>
          <strong>${offer.name}</strong><small>${offer.text}</small>
        </button>`).join('')}</div>
    </section>`;
  }

  function typingView() {
    const game = typing;
    const running = game.phase === 'playing';
    const upgrades = [['sight', '동체시력', '낙하 속도↓'], ['power', '공격력', '타격 +1'], ['vitality', '체력', '최대 HP +12']];
    return `<div class="page typing-page${game.offers.length ? ' typing-page--offers' : ''}" data-phase="${game.phase}">
      <div class="game-header"><div><p class="eyebrow">ROUND ${game.round} · ${game.score}점 · 최고 ${bestScore(getState(), 'typing')}점</p><h1>타자 게임</h1></div><button class="game-exit" data-nav="home">나가기</button></div>
      <div class="typing-hud"><span>HP ${game.hp}/${game.maxHp}</span><div class="typing-hp"><i style="width:${game.hp / game.maxHp * 100}%"></i></div><span>● ${game.coins}</span></div>
      ${game.offers.length ? typingAugmentPanel(game) : `<div class="typing-field" aria-label="떨어지는 영어 단어">${game.enemies.map(typingEnemyMarkup).join('')}<div class="typing-ground"></div></div>`}
      ${running ? `<form class="typing-form"><input data-typing-input autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="text" aria-label="떨어지는 영어 단어 입력" placeholder="영어 단어 입력"/><button class="button button--primary" type="submit">입력</button></form>` :
        `<div class="typing-panel">${game.phase === 'ready' ? `
          <div class="typing-rules"><strong>떨어지는 단어를 입력하세요</strong><span>가장 가까운 적에게 발사합니다.</span><span>적중하면 단어가 바뀝니다. 시간 정지 중에는 입력 즉시 바뀝니다.</span><span>10라운드마다 보스가 등장합니다.</span></div>
          <div class="typing-levels">${Object.entries(typingLevels).map(([id, level]) => `<button class="button button--${game.difficulty === id ? 'primary' : 'secondary'}" aria-pressed="${game.difficulty === id}" data-action="typing-level:${id}">${level.label} <small>×${level.multiplier}</small></button>`).join('')}</div>
          ${button('시작하기', 'typing-start')}` : `<p>${game.message}</p>${game.phase === 'over' ? gameOverActions('typing-restart', game.score, game.startingBest) :
          `<div class="typing-shop"><div class="typing-upgrades">${upgrades.map(([key, name, desc]) => `
            <button class="button button--secondary" data-action="typing-upgrade:${key}" ${game.coins < upgradeCost(game.stats[key]) ? 'disabled' : ''}>
              <strong>${name} ${game.stats[key]}</strong><small>${desc} · ●${upgradeCost(game.stats[key])}</small></button>`).join('')}</div>
            ${game.offers.length ? '' : button('다음 라운드', 'typing-next')}</div>`}`}</div>`}
      ${running ? `<p class="game-message" role="status">${game.message}</p>` : ''}
    </div>`;
  }

  function startTypingRound() {
    typing.phase = 'playing';
    typing.enemies = [];
    typing.spawned = 0;
    typing.spawnClock = 0;
    typing.roundClock = 0;
    typing.nextSummon = 8;
    typing.nextItem = 6;
    typing.stoppedUntil = 0;
    typing.immuneUntil = 0;
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
    typing.selectedOffer = -1;
    typing.offers = typing.round % 3 === 0 ? rollAugments(Math.random, typing.augments) : [];
    playEffect('finish');
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

  const typingItems = [
    { id: 'watch', label: '회중시계' },
    { id: 'heal', label: '구급 상자' },
    { id: 'bomb', label: '폭탄' },
  ];

  function spawnTypingTarget({ boss = false, item = null, eliteHp = 0 } = {}) {
    const level = typingLevels[typing.difficulty];
    const healthRound = boss || typing.round % 10 !== 0 ? typing.round : typing.round - 1;
    const hp = item ? 1 : eliteHp || Math.max(1, Math.round(enemyHealth(healthRound) * (boss ? 1 : level.health)));
    const enemy = {
      id: ++typing.nextId, word: nextTypingWord(''), x: boss ? 50 : 10 + randomInt(81),
      y: 0, hp, maxHp: hp, boss, elite: eliteHp > 0, item, pendingShots: 0, wordRevision: 0,
      chargesUsed: 0, chargeUntil: 0, nextChargeAt: 0,
      shield: !item && (typing.difficulty === 'extreme' ||
        (!boss && typing.round >= 3 && Math.random() < Math.min(.32, .08 + typing.round * .018))),
    };
    typing.enemies.push(enemy);
    root.querySelector('.typing-field')?.insertAdjacentHTML('beforeend', typingEnemyMarkup(enemy));
    return enemy;
  }

  function typingDistance(a, b) {
    const field = root.querySelector('.typing-field');
    if (!field) return Infinity;
    return Math.hypot((a.x - b.x) * field.clientWidth, (a.y - b.y) * field.clientHeight) / 100;
  }

  function resumeTypingShots() {
    for (const shot of typing.shots) {
      if (shot.launch) shot.launch();
      else shot.animation.play();
    }
  }

  function clearBossCharge(boss, node) {
    boss.chargeUntil = 0;
    boss.nextChargeAt = typing.roundClock + .65;
    typing.nextSummon = Math.max(typing.nextSummon, typing.roundClock + 2);
    node?.classList.remove('typing-enemy--charging');
    const countdown = node?.querySelector('.typing-boss-charge');
    if (countdown) countdown.hidden = true;
  }

  function updateBossCharge(boss, node) {
    const now = typing.roundClock;
    if (boss.chargeUntil && boss.chargeUntil <= now) {
      clearBossCharge(boss, node);
      spawnTypingTarget({ eliteHp: bossEliteHealth(boss.hp) });
      specialEffect('boss');
      return;
    }
    if (!boss.chargeUntil && now >= boss.nextChargeAt && bossChargeThreshold(boss.hp, boss.maxHp, boss.chargesUsed)) {
      boss.chargesUsed += 1;
      boss.chargeUntil = now + bossChargeSeconds;
      node?.classList.add('typing-enemy--charging');
      playEffect('boss');
    }
    if (!boss.chargeUntil) return;
    const countdown = node?.querySelector('.typing-boss-charge');
    if (countdown) {
      countdown.hidden = false;
      const label = `기 모으는 중 · ${Math.ceil(boss.chargeUntil - now)}초`;
      if (countdown.textContent !== label) countdown.textContent = label;
    }
  }

  function interruptBossCharge(boss, node) {
    clearBossCharge(boss, node);
    const previousY = boss.y;
    boss.y = Math.max(0, boss.y - 34);
    if (node) {
      node.style.top = `${boss.y}%`;
      const distance = (previousY - boss.y) / 100 * (node.parentElement?.clientHeight || 0);
      node.animate([{ translate: `0 ${distance}px` }, { translate: '0 0' }], { duration: 420, easing: 'cubic-bezier(.16, 1, .3, 1)' });
    }
    playEffect('parry');
  }

  function tickTyping(now) {
    if (getScreen() !== 'typing' || typing.phase !== 'playing') return stopTyping();
    if (typing.stoppedUntil > now) {
      typingLast = now;
      typingFrame = requestAnimationFrame(tickTyping);
      return;
    }
    if (typing.stoppedUntil) {
      typing.stoppedUntil = 0;
      root.classList.remove('typing-time-stop');
      resumeTypingShots();
      playEffect('unfreeze');
    }
    const dt = Math.min(.05, (now - typingLast) / 1000);
    typingLast = now;
    typing.spawnClock += dt;
    typing.roundClock += dt;
    const level = typingLevels[typing.difficulty];
    const interval = Math.max(.85, 2.1 - typing.round * .055) / level.speed;
    if (typing.spawned < waveSize(typing.round) && typing.spawnClock >= interval) {
      typing.spawnClock = 0;
      const boss = typing.round % 10 === 0;
      spawnTypingTarget({ boss });
      typing.spawned += 1;
      if (boss) specialEffect('boss');
    }
    const boss = typing.enemies.find((enemy) => enemy.boss);
    if (boss) updateBossCharge(boss, root.querySelector(`[data-enemy-id="${boss.id}"]`));
    if (boss && !boss.chargeUntil && typing.roundClock >= typing.nextSummon) {
      typing.nextSummon += 8;
      if (typing.enemies.filter((enemy) => !enemy.item).length < 7) {
        specialEffect('boss');
        for (let index = 0; index < 2; index += 1) spawnTypingTarget();
      }
    }
    if (typing.roundClock >= typing.nextItem && typing.enemies.some((enemy) => !enemy.item)) {
      typing.nextItem += 9 + randomInt(5);
      if (!typing.enemies.some((enemy) => enemy.item)) spawnTypingTarget({ item: typingItems[randomInt(typingItems.length)] });
    }
    const seconds = fallSeconds(typing.round, typing.stats.sight) / level.speed * (typing.augments.includes('slow') ? 1.25 : 1);
    for (const enemy of [...typing.enemies]) {
      if (enemy.fireLeft > 0) {
        enemy.fireLeft -= dt;
        enemy.fireTick -= dt;
        if (enemy.fireTick <= 0) {
          enemy.fireTick += 1;
          applyTypingDamage(enemy, 1, true, null, true, false);
          if (!typing.enemies.includes(enemy)) continue;
        }
      }
      enemy.freezeLeft = Math.max(0, (enemy.freezeLeft || 0) - dt);
      if (enemy.freezeLeft <= 0 && !enemy.chargeUntil) enemy.y = Math.min(93, enemy.y + dt * 100 / (seconds * (enemy.boss ? 5 : enemy.elite ? 1.2 : 1)));
      const node = root.querySelector(`[data-enemy-id="${enemy.id}"]`);
      if (node) {
        node.style.top = `${enemy.y}%`;
        node.classList.toggle('typing-enemy--frozen', enemy.freezeLeft > 0);
        node.classList.toggle('typing-enemy--burning', enemy.fireLeft > 0);
      }
      if (enemy.y >= 93 && !enemy.pendingShots && !enemy.chargeUntil) {
        typing.enemies = typing.enemies.filter((entry) => entry !== enemy);
        node?.remove();
        if (enemy.item || now < typing.immuneUntil) continue;
        typing.immuneUntil = now + 1000;
        playEffect('damage');
        const damage = Math.min(typing.hp, missDamage(enemy.hp, typing.stats.vitality, enemy.shield));
        typing.hp -= damage;
        typing.message = `${enemy.word} 놓침 · 체력 −${damage}${enemy.shield ? ' · 방패 추가 피해' : ''}`;
        const field = root.querySelector('.typing-field');
        field?.animate([{ boxShadow: 'inset 0 0 0 8px #d59091' }, { boxShadow: 'inset 0 0 0 0 transparent' }], { duration: 290, easing: 'steps(4, end)' });
        if (!typing.hp) { typing.phase = 'over'; typing.message = `${typing.round}라운드 · ${typing.score}점`; saveBest('typing', typing.score); stopTyping(); render(); specialEffect(typing.score > typing.startingBest ? 'record' : 'over'); return; }
        root.querySelector('.typing-hud > span')?.replaceChildren(`HP ${typing.hp}/${typing.maxHp}`);
        const bar = root.querySelector('.typing-hp i');
        if (bar) bar.style.width = `${typing.hp / typing.maxHp * 100}%`;
        const status = root.querySelector('.typing-page > .game-message');
        if (status) status.textContent = typing.message;
      }
    }
    if (typing.spawned >= waveSize(typing.round) && !typing.enemies.some((enemy) => !enemy.item)) return finishTypingRound();
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
    node.querySelector('small').textContent = typingEnemyHealthLabel(enemy);
    const bar = node.querySelector('.typing-enemy-hp');
    bar.setAttribute('aria-label', `체력 ${enemy.hp}/${enemy.maxHp}`);
    bar.firstElementChild.style.width = `${enemy.hp / enemy.maxHp * 100}%`;
  }

  function rotateTypingWord(enemy, node) {
    enemy.word = nextTypingWord(enemy.word);
    enemy.wordRevision += 1;
    node?.querySelector('strong')?.replaceChildren(enemy.word);
  }

  function typingProjectile(from, to, small = false) {
    if (!from || !to) return Promise.resolve();
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const dot = document.createElement('i');
    dot.className = `typing-projectile ${small ? 'typing-projectile--small' : ''}`;
    dot.style.left = `${a.left + a.width / 2}px`;
    dot.style.top = `${a.top + a.height / 2}px`;
    document.body.append(dot);
    const game = typing;
    return new Promise((resolve) => {
      const shot = {};
      const clean = () => {
        dot.remove();
        game.shots = game.shots.filter((entry) => entry !== shot);
        resolve();
      };
      shot.cancel = clean;
      shot.launch = () => {
        dot.classList.remove('typing-projectile--queued');
        shot.launch = null;
        shot.animation = dot.animate([{ transform: 'translate(0, 0)' }, {
          transform: `translate(${b.left + b.width / 2 - a.left - a.width / 2}px, ${b.top + b.height / 2 - a.top - a.height / 2}px)`,
        }], { duration: small ? 160 : 210, easing: 'linear' });
        shot.animation.finished.then(clean, clean);
      };
      game.shots.push(shot);
      if (game.stoppedUntil) dot.classList.add('typing-projectile--queued');
      else shot.launch();
    });
  }

  function applyTypingDamage(enemy, damage, bypassShield, source, chain = false, elemental = true) {
    if (typing.phase !== 'playing' || !typing.enemies.includes(enemy) || enemy.item) return;
    const node = root.querySelector(`[data-enemy-id="${enemy.id}"]`);
    const interrupt = enemy.boss && enemy.chargeUntil > typing.roundClock && elemental;
    const result = hitEnemy(enemy, damage, bypassShield);
    if (elemental && !result.shieldBroken && !result.defeated) {
      if (typing.augments.includes('fire')) {
        if (!(enemy.fireLeft > 0)) enemy.fireTick = 1;
        enemy.fireLeft = 3.01;
      }
      if (typing.augments.includes('ice')) enemy.freezeLeft = enemy.boss ? .5 : 2;
    }
    if (result.defeated && enemy.boss) playEffect('bossdown');
    else if (!chain && !interrupt) playEffect(result.defeated ? 'kill' : result.shieldBroken ? 'shield' : 'impact');
    if (result.defeated) {
      typing.enemies = typing.enemies.filter((entry) => entry !== enemy);
      typing.score += typingPoints(typing.difficulty, enemy.boss);
      saveBest('typing', typing.score);
      const scoreLabel = root.querySelector('.typing-page .game-header .eyebrow');
      if (scoreLabel) scoreLabel.textContent = `ROUND ${typing.round} · ${typing.score}점 · 최고 ${bestScore(getState(), 'typing')}점`;
      typing.coins += (enemy.boss ? 15 : 2) + Number(typing.augments.includes('bounty')) + 3 * Number(typing.augments.includes('fortune'));
      typing.hp = Math.min(typing.maxHp, typing.hp + 2 * Number(typing.augments.includes('renew')));
      typingImpact(node, true);
    } else {
      if (interrupt) interruptBossCharge(enemy, node);
      else if (enemy.boss) updateBossCharge(enemy, node);
      updateTypingEnemy(enemy);
      typingImpact(node);
    }
    if (elemental) enemy.pendingShots -= 1;
    if (!chain && typing.augments.includes('splash')) {
      const count = typing.augments.filter((id) => id === 'splash').length;
      const field = root.querySelector('.typing-field');
      const radius = (field?.clientWidth || 0) * (typing.augments.includes('wide') ? .44 : .27);
      const nearby = typing.enemies.filter((other) => other !== enemy && !other.item && !other.pendingShots && typingDistance(other, enemy) <= radius)
        .sort((a, b) => typingDistance(a, enemy) - typingDistance(b, enemy)).slice(0, count);
      nearby.forEach((other) => {
        other.pendingShots += 1;
        typingProjectile(source || node, root.querySelector(`[data-enemy-id="${other.id}"]`), true).then(() => applyTypingDamage(other, Math.max(1, Math.floor(damage / 2)), false, null, true));
      });
    }
    root.querySelector('.typing-hud > span:last-child').textContent = `● ${typing.coins}`;
    root.querySelector('.typing-hud > span:first-child').textContent = `HP ${typing.hp}/${typing.maxHp}`;
  }

  function collectTypingItem(target) {
    const game = typing;
    game.enemies = game.enemies.filter((enemy) => enemy !== target);
    root.querySelector(`[data-enemy-id="${target.id}"]`)?.remove();
    specialEffect(target.item.id);
    if (target.item.id === 'watch') {
      const now = performance.now();
      game.stoppedUntil = now + 8000;
      if (game.immuneUntil > now) game.immuneUntil += 8000;
      root.classList.add('typing-time-stop');
      for (const shot of game.shots) shot.animation?.pause();
    } else if (target.item.id === 'heal') {
      game.hp = Math.min(game.maxHp, game.hp + Math.floor(game.maxHp / 2));
      root.querySelector('.typing-hud > span').textContent = `HP ${game.hp}/${game.maxHp}`;
      root.querySelector('.typing-hp i').style.width = `${game.hp / game.maxHp * 100}%`;
    } else {
      const radius = root.querySelector('.typing-field').clientWidth * .48;
      game.enemies.filter((enemy) => !enemy.item && typingDistance(target, enemy) <= radius)
        .forEach((enemy) => applyTypingDamage(enemy, game.round * 2, true, null, true, false));
    }
  }

  function submitTyping(value) {
    if (typing?.phase !== 'playing') return;
    const word = value.trim().toLowerCase();
    const frozen = Boolean(typing.stoppedUntil);
    let enemy;
    for (const entry of typing.enemies) {
      if (entry.word === word && (frozen || !entry.pendingShots) && (!enemy || entry.y > enemy.y)) enemy = entry;
    }
    const input = root.querySelector('[data-typing-input]');
    if (input) input.value = '';
    if (!enemy) { playEffect('retry'); typing.message = '화면에 있는 단어를 입력하세요.'; root.querySelector('.typing-page > .game-message').textContent = typing.message; return; }
    if (enemy.item) { collectTypingItem(enemy); return; }
    const node = root.querySelector(`[data-enemy-id="${enemy.id}"]`);
    const wordRevision = enemy.wordRevision;
    if (frozen) rotateTypingWord(enemy, node);
    enemy.pendingShots += 1;
    playEffect('shot');
    const game = typing;
    typingProjectile(input, node).then(() => {
      if (typing !== game || getScreen() !== 'typing' || game.phase !== 'playing') return;
      applyTypingDamage(enemy, 1 + typing.stats.power + 3 * typing.augments.filter((id) => id === 'double').length, typing.augments.includes('pierce'), node);
      if (!frozen && enemy.wordRevision === wordRevision && game.enemies.includes(enemy)) {
        rotateTypingWord(enemy, node);
      }
    });
    typing.message = '';
    root.querySelector('.typing-page > .game-message').textContent = '';
    input?.focus({ preventScroll: true });
  }

  function handleAction(action) {
    if (action === 'arcade-typing') return openTyping();
    if (action.startsWith('typing-level:') && typing.phase === 'ready') {
      typing.difficulty = action.split(':')[1];
      return render();
    }
    if (action === 'typing-start') return startTypingRound();
    if (action === 'typing-restart') { openTyping(typing.difficulty); return startTypingRound(); }
    if (action === 'typing-next') { typing.round += 1; return startTypingRound(); }
    if (action.startsWith('typing-upgrade:')) {
      const key = action.split(':')[1];
      if (!['sight', 'power', 'vitality'].includes(key)) return;
      const cost = upgradeCost(typing.stats[key]);
      if (typing.coins < cost) return;
      typing.coins -= cost;
      typing.stats[key] += 1;
      playEffect('upgrade');
      if (key === 'vitality') { typing.maxHp += 12; typing.hp += 12; }
      return render();
    }
    if (action.startsWith('typing-augment:')) {
      const index = Number(action.split(':')[1]);
      const offer = typing.offers[index];
      if (!offer) return;
      if (typing.selectedOffer !== index) {
        typing.selectedOffer = index;
        root.querySelectorAll('[data-action^="typing-augment:"]').forEach((card, position) =>
          card.setAttribute('aria-pressed', String(position === index)));
        return;
      }
      typing.augments.push(offer.id);
      specialEffect('loot');
      typing.offers = [];
      return render();
    }
  }

  function leave() {
    stopTyping();
    typing.phase = 'stopped';
  }

  return { view: typingView, leave, handleAction, submit: submitTyping };
}

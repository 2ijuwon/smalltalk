import { sliceAnswerCount, sliceBladeColor, sliceBodyHit, sliceBonusTime, sliceDuration, sliceFlight, sliceFlightEnd, sliceOutcome, slicePosition, sliceReward, swipeHit } from './apple-slice.js';
import { getLearnedIds, bestScore } from './domain.js';
import { button, escapeHtml, gameOverActions, pixelSprite, randomInt, shuffle } from './ui.js';
import { effectPlayer, playEffect, specialEffect } from './effects.js';

export function createOrchard({ root, getState, getScreen, setScreen, render, validIds, byId, speakText, saveBest, recordMistake, startQuickCheck }) {
  let apples = null;
  let appleFrame = 0;
  let appleWait = 0;
  let appleGesture = null;
  let suppressAppleClickUntil = 0;

  const orchardAppleArt = pixelSprite('orchardApple');
  const appleShape = `<span class="apple-shape" aria-hidden="true"><span class="apple-body"></span>${orchardAppleArt}<span class="apple-fruit__left">${orchardAppleArt}</span><span class="apple-fruit__right">${orchardAppleArt}</span></span>`;

  function appleTargetMarkup(fruit, index) {
    const shape = fruit.heal ? pixelSprite('heal') : fruit.bomb ? pixelSprite('bomb') : appleShape;
    if (fruit.heal) return `<button class="apple-fruit apple-fruit--heal" data-apple-index="${index}" type="button" aria-label="체력 회복 상자" hidden>${shape}<span class="apple-fruit__word">+1 ♥</span></button>`;
    return `<button class="apple-fruit${fruit.bomb ? ' apple-fruit--bomb' : ''}" data-apple-index="${index}" type="button" aria-label="${fruit.bomb ? '폭탄' : '사과'} · ${escapeHtml(fruit.word)}" hidden>${shape}<span class="apple-fruit__word">${escapeHtml(fruit.word)}</span></button>`;
  }

  function appleComboMarkup(combo) {
    const progress = combo > 0 ? (combo - 1) % 3 + 1 : 0;
    return `<span aria-hidden="true">${'◆'.repeat(progress)}${'◇'.repeat(3 - progress)}</span><small>${progress === 2 ? '다음 정답 골든' : `${combo}연속`}</small>`;
  }

  function applePrompt(game) {
    return `<div><small>${game.listen ? '듣고 찾기' : '뜻을 보고 찾기'} · <span data-apple-answers>정답 ${game.answersTotal - game.answersCut}개</span></small><h2 data-apple-meaning>${game.listen ? '어떤 단어일까요?' : escapeHtml(game.target.meaning)}</h2></div>
      <div class="apple-hint-actions">${button('발음 힌트', 'apple-speak', 'quiet')}${game.listen ? button('뜻 보기', 'apple-reveal', 'quiet') : ''}</div>`;
  }

  function appleView() {
    const game = apples;
    const active = game.phase === 'playing';
    const round = game.round;
    return `<div class="page apple-page" data-phase="${game.phase}">
      <div class="game-header"><div><p class="eyebrow">최고 ${bestScore(getState(), 'slice')}점</p><h1>사과 베기</h1></div><button class="game-exit" data-nav="home">나가기</button></div>
      ${active ? `<div class="apple-hud"><strong data-apple-clock>${Math.ceil(game.remaining / 1000)}초</strong><span data-apple-score>${game.score}점</span><span data-apple-hearts aria-label="남은 기회 ${game.hearts}회">${'♥'.repeat(game.hearts)}${'♡'.repeat(3 - game.hearts)}</span></div>` : ''}
      <div class="apple-prompt">
        ${active ? applePrompt(game)
        : `<div><h2>${game.phase === 'ended' ? `최종 ${game.score}점` : '단어 과수원'}</h2><p>${game.phase === 'ended' ? `연속 정답 최고 ${game.longest}회` : '정답 단어가 적힌 사과만 베세요. 같은 단어라도 폭탄을 베면 터져요.'}</p></div>`}
      </div>
      <div class="apple-field" aria-label="날아오르는 사과와 폭탄">
        ${active ? `<svg class="apple-trail" aria-hidden="true"><polyline fill="none" /></svg><i class="apple-blade-tip" aria-hidden="true" hidden></i>${game.fruit.map(appleTargetMarkup).join('')}`
        : game.phase === 'ended' ? `<div class="apple-result-summary"><strong>정답 ${game.correct}개 · 골든 ${game.golden}회</strong>${game.reviewIds.size ? `<span>다시 볼 단어 · ${[...game.reviewIds].slice(0, 3).map((id) => escapeHtml(byId(id).word)).join(' · ')}</span>` : ''}</div>` : `<div class="apple-demo"><figure>${appleShape}<figcaption>사과는 베기</figcaption></figure><figure>${pixelSprite('bomb')}<figcaption>폭탄은 피하기</figcaption></figure></div>`}
      </div>
      ${active ? `<div class="apple-round-footer"><p class="apple-feedback" role="status" data-apple-feedback>${game.feedback || (round === 1 ? '사과를 긋거나 눌러 베기' : '')}</p><div class="apple-combo" data-apple-combo>${appleComboMarkup(game.combo)}</div></div>`
      : game.phase === 'ended' ? `${game.reviewIds.size ? button('헷갈린 단어 다시 보기', 'apple-review', 'quiet') : ''}${gameOverActions('duel-restart', game.score, game.startingBest)}`
      : `<p class="apple-rules">60초 · 기회 3번 · 정답 시간 보너스 +5 → +3 → +2 → +1초</p>
        <div class="apple-modes" role="group" aria-label="문제 유형">${[[false, '뜻만'], [true, '듣기 포함']].map(([listen, label]) => `<button type="button" class="button button--${game.includeListening === listen ? 'primary' : 'secondary'}" aria-pressed="${game.includeListening === listen}" data-action="apple-mode:${listen}">${label}</button>`).join('')}</div>
        ${button('시작하기', 'duel-start')}`}
    </div>`;
  }

  function openAppleGame(includeListening = false) {
    stopAppleGame();
    const pool = [...new Map(shuffle(validIds(getLearnedIds(getState())).map(byId)).map((item) => [item.word.toLowerCase(), item])).values()].slice(0, 5);
    if (pool.length < 3) return;
    apples = { pool, bag: [], flights: [], flightTime: 0, dullUntil: 0, phase: 'idle', includeListening, round: 0, score: 0, correct: 0, golden: 0, reviewIds: new Set(), remaining: sliceDuration, combo: 0, longest: 0, hearts: 3, startingBest: bestScore(getState(), 'slice') };
    setScreen('duel');
    render({ resetScroll: true });
  }

  function stopAppleGame() {
    setAppleFuse(false);
    cancelAnimationFrame(appleFrame);
    clearTimeout(appleWait);
    appleFrame = appleWait = 0;
    appleGesture = null;
    suppressAppleClickUntil = 0;
  }

  function setAppleFuse(audible) {
    if (!apples || Boolean(apples.fuseAudible) === audible) return;
    apples.fuseAudible = audible;
    const player = effectPlayer('fuse');
    if (audible) {
      player.loop = true;
      playEffect('fuse');
    } else {
      player.pause();
    }
  }

  function appleHitbox(node) {
    const body = node.querySelector('.apple-body');
    if (body) return body.getBoundingClientRect();
    const { left, top, width, height } = node.querySelector('.pixel-sprite').getBoundingClientRect();
    return { left: left + width * 2 / 16, right: left + width, top: top + height * 4 / 16, bottom: top + height * 15 / 16 };
  }

  function appleTargetHit(from, to, node, field) {
    if (!node.classList.contains('apple-fruit--heal')) return sliceBodyHit(from, to, appleHitbox(node), field);
    const rect = node.querySelector('.pixel-sprite').getBoundingClientRect();
    const body = {
      left: Math.max(field.left, rect.left + rect.width / 16),
      right: Math.min(field.right, rect.right - rect.width / 16),
      top: Math.max(field.top, rect.top + rect.height * 4 / 16),
      bottom: Math.min(field.bottom, rect.bottom - rect.height * 2 / 16),
    };
    return body.left < body.right && body.top < body.bottom ? swipeHit(from, to, body) : null;
  }

  function updateAppleBlade(game) {
    const field = root.querySelector('.apple-field');
    field.classList.toggle('apple-blade--dull', Boolean(game.dullUntil));
    field.classList.toggle('apple-blade--fire', game.combo > 10);
    field.style.setProperty('--apple-ready-color', sliceBladeColor(game.combo));
  }

  function launchAppleRound() {
    if (getScreen() !== 'duel') return;
    const game = apples;
    if (!game.hearts || game.remaining <= 0) return finishAppleGame();
    if (!game.bag.length) {
      game.bag = shuffle(game.pool);
      if (game.bag[0].id === game.target?.id) game.bag.push(game.bag.shift());
    }
    const firstRound = game.phase === 'idle';
    game.target = game.bag.shift();
    game.round += 1;
    game.listen = game.includeListening && game.round % 4 === 0;
    game.phase = 'playing';
    game.feedback = '';
    game.resolved = false;
    game.penalized = false;
    const distractors = shuffle(game.pool.filter((item) => item !== game.target && (game.listen || item.meaning !== game.target.meaning)));
    const addBomb = game.round % 3 === 0 || (game.round >= 6 && game.round % 2 === 0) || distractors.length < 2;
    const targets = addBomb ? [{ ...game.pool[randomInt(game.pool.length)], bomb: true }] : [];
    if (game.hearts < 3 && game.round % 4 === 0) targets.push({ heal: true });
    const count = 5;
    game.answersTotal = firstRound ? 1 : sliceAnswerCount(game.flightTime, Math.random());
    game.answersCut = 0;
    for (let index = 0; distractors.length && targets.length < count - game.answersTotal; index += 1) {
      targets.push(distractors[index % distractors.length]);
    }
    const others = shuffle(targets);
    const slotCount = others.length + game.answersTotal;
    const answerSlots = firstRound ? [Math.min(3, others.length)] :
      shuffle(Array.from({ length: slotCount - 1 }, (_, index) => index + 1)).slice(0, game.answersTotal);
    const ordered = Array.from({ length: slotCount }, (_, index) => answerSlots.includes(index) ? game.target : others.shift());
    game.fruit = ordered.map((item) => ({ ...item, spent: false }));
    const start = game.flightTime + (game.listen ? 420 : 0);
    const duration = sliceFlight(game.round);
    game.answerDeadline = start + duration * sliceFlightEnd(Math.max(...answerSlots));
    if (firstRound) render();
    else {
      root.querySelector('.apple-prompt').innerHTML = applePrompt(game);
      root.querySelector('.apple-field').insertAdjacentHTML('beforeend', game.fruit.map(appleTargetMarkup).join(''));
    }
    const nodes = [...root.querySelectorAll('.apple-fruit[data-apple-index]')];
    game.fruit.forEach((fruit, index) => game.flights.push({ fruit, node: nodes[index], round: game.round, index, start, duration }));
    if (game.listen) speakText(game.target.word);
    if (!firstRound) return;
    const clock = root.querySelector('[data-apple-clock]');
    let previous = performance.now();
    const tick = (now) => {
      if (getScreen() !== 'duel' || apples !== game) return;
      const delta = Math.min(50, Math.max(0, now - previous));
      previous = now;
      if (document.hidden) { setAppleFuse(false); appleFrame = requestAnimationFrame(tick); return; }
      game.flightTime += delta;
      if (game.dullUntil && game.flightTime >= game.dullUntil) {
        game.dullUntil = 0;
        updateAppleHud('칼날 회복');
      }
      game.remaining = Math.max(0, game.remaining - delta);
      const seconds = `${Math.ceil(game.remaining / 1000)}초`;
      if (clock.textContent !== seconds) clock.textContent = seconds;
      if (game.remaining <= 0) return finishAppleGame();
      game.flights = game.flights.filter(({ fruit, node, start, duration, index, round }) => {
        const progress = (game.flightTime - start) / duration;
        if (fruit.spent ? game.flightTime >= fruit.removeAt : progress >= sliceFlightEnd(index)) {
          node.remove();
          return false;
        }
        if (fruit.spent) return true;
        const position = slicePosition(round, index, progress);
        const show = Boolean(position && position.y <= 94);
        if (node.hidden === show) node.hidden = !show;
        if (show) {
          node.style.setProperty('--apple-y', `${position.y}%`);
          node.style.setProperty('--apple-x', `${position.x}%`);
        }
        return true;
      });
      setAppleFuse(!game.resolved && game.flights.some(({ fruit, node, round }) =>
        round === game.round && fruit.bomb && !fruit.spent && !node.hidden));
      if (!game.resolved && game.flightTime >= game.answerDeadline) {
        if (game.answersCut) resolveAppleRound(130);
        else missAppleRound();
      }
      appleFrame = requestAnimationFrame(tick);
    };
    appleFrame = requestAnimationFrame(tick);
  }

  function finishAppleGame() {
    stopAppleGame();
    apples.phase = 'ended';
    saveBest('slice', apples.score);
    render();
    specialEffect(apples.score > apples.startingBest ? 'record' : 'over');
  }

  function updateAppleHud(message) {
    const game = apples;
    root.querySelector('[data-apple-feedback]').textContent = message;
    root.querySelector('[data-apple-score]').textContent = `${game.score}점`;
    root.querySelector('[data-apple-clock]').textContent = `${Math.ceil(game.remaining / 1000)}초`;
    root.querySelector('[data-apple-combo]').innerHTML = appleComboMarkup(game.combo);
    const hearts = root.querySelector('[data-apple-hearts]');
    hearts.textContent = '♥'.repeat(game.hearts) + '♡'.repeat(3 - game.hearts);
    hearts.setAttribute('aria-label', `남은 기회 ${game.hearts}회`);
    updateAppleBlade(game);
  }

  function resolveAppleRound(delay) {
    apples.resolved = true;
    setAppleFuse(false);
    for (const flight of apples.flights) {
      if (flight.round !== apples.round) continue;
      const { node } = flight;
      node.disabled = true;
      node.removeAttribute('data-apple-index');
      node.setAttribute('aria-hidden', 'true');
      if (!flight.fruit.spent) node.classList.add('apple-fruit--retiring');
    }
    appleWait = setTimeout(launchAppleRound, delay);
  }

  function missAppleRound() {
    if (!apples.penalized) apples.hearts -= 1;
    apples.combo = 0;
    playEffect('retry');
    if (apples.includeListening) speakText(apples.target.word);
    updateAppleHud(`놓쳤어요 · ${apples.target.word} = ${apples.target.meaning}`);
    resolveAppleRound(220);
  }

  function cutApple(index, angle = -25) {
    const game = apples;
    const fruit = game?.fruit?.[index];
    if (getScreen() !== 'duel' || game.phase !== 'playing' || game.resolved || game.dullUntil || !fruit || fruit.spent) return;
    const node = root.querySelector(`[data-apple-index="${index}"]`);
    if (!node || node.hidden) return;
    fruit.spent = true;
    fruit.removeAt = game.flightTime + 700;
    if (fruit.heal) {
      const restored = game.hearts < 3;
      game.hearts = Math.min(3, game.hearts + 1);
      node.disabled = true;
      node.classList.add('apple-fruit--healed');
      playEffect('heal');
      updateAppleHud(restored ? '체력 +1칸' : '체력이 가득 찼어요');
      return;
    }
    const outcome = sliceOutcome(fruit, game.target);
    if (outcome !== 'correct') {
      node.disabled = true;
      game.combo = 0;
      game.dullUntil = game.flightTime + 1000;
      game.hearts -= 1;
      game.penalized = true;
      if (outcome === 'bomb') {
        node.classList.add('apple-fruit--exploded');
        node.insertAdjacentHTML('beforeend', '<i class="apple-bomb-burst" aria-hidden="true"></i>');
        setAppleFuse(false);
        specialEffect('bomb', 'clang');
        updateAppleHud('폭탄 · 칼 무뎌짐 1초');
      } else {
        if (!game.reviewIds.has(game.target.id)) {
          recordMistake(game.target.id);
        }
        game.reviewIds.add(game.target.id);
        node.classList.add('apple-fruit--wrong');
        playEffect('retry');
        updateAppleHud('오답 · 칼 무뎌짐 1초');
      }
      if (!game.hearts) resolveAppleRound(680);
      return;
    }
    const reward = sliceReward(++game.combo);
    game.score += reward.points;
    const gainedMs = sliceBonusTime(game.flightTime);
    game.remaining += gainedMs;
    game.answersCut += 1;
    root.querySelector('[data-apple-answers]').textContent = `정답 ${game.answersTotal - game.answersCut}개`;
    game.correct += 1;
    if (reward.critical) game.golden += 1;
    game.longest = Math.max(game.longest, game.combo);
    node.style.setProperty('--blade-angle', `${angle}deg`);
    node.classList.add('apple-fruit--split');
    node.disabled = true;
    node.style.setProperty('--apple-cut-color', sliceBladeColor(game.combo));
    if (game.combo > 10) node.insertAdjacentHTML('beforeend', '<i class="apple-fire-sparks" aria-hidden="true"></i>');
    playEffect('slice');
    if (reward.critical) {
      node.classList.add('apple-fruit--gold');
      node.insertAdjacentHTML('beforeend', '<i class="apple-gold-rays" aria-hidden="true"></i>');
      specialEffect('record');
    }
    if (game.includeListening) speakText(fruit.word);
    updateAppleHud(`${reward.critical ? '골든! · ' : ''}+${reward.points}점 · +${gainedMs / 1000}초 · ${fruit.word}`);
    if (game.answersCut === game.answersTotal) resolveAppleRound(130);
  }

  root.addEventListener('pointerdown', (event) => {
    const field = event.target.closest('.apple-field');
    if (!field || getScreen() !== 'duel' || apples.phase !== 'playing' || apples.resolved || !event.isPrimary || event.button !== 0) return;
    suppressAppleClickUntil = 0;
    const point = { x: event.clientX, y: event.clientY };
    appleGesture = { id: event.pointerId, field, previous: point, origin: point, trail: [point] };
  });
  window.addEventListener('pointermove', (event) => {
    const gesture = appleGesture;
    if (!gesture || gesture.id !== event.pointerId || !gesture.field.isConnected) return;
    const point = { x: event.clientX, y: event.clientY };
    if (!gesture.started && Math.hypot(point.x - gesture.origin.x, point.y - gesture.origin.y) < 10) return;
    gesture.started = true;
    suppressAppleClickUntil = performance.now() + 380;
    gesture.trail.push(point);
    if (gesture.trail.length > 6) gesture.trail.shift();
    const bounds = gesture.field.getBoundingClientRect();
    const line = gesture.field.querySelector('.apple-trail polyline');
    line.setAttribute('points', gesture.trail.map(({ x, y }) => `${x - bounds.left},${y - bounds.top}`).join(' '));
    const tip = gesture.field.querySelector('.apple-blade-tip');
    tip.hidden = false;
    tip.style.left = `${point.x - bounds.left}px`;
    tip.style.top = `${point.y - bounds.top}px`;
    if (!apples.resolved && !apples.dullUntil) {
      const hits = [...gesture.field.querySelectorAll('[data-apple-index]:not(:disabled, [hidden])')]
        .map((node) => ({ index: Number(node.dataset.appleIndex), at: appleTargetHit(gesture.previous, point, node, bounds) }))
        .filter(({ at }) => at !== null).sort((a, b) => a.at - b.at);
      if (hits.length) {
        const angle = Math.atan2(point.y - gesture.previous.y, point.x - gesture.previous.x) * 180 / Math.PI;
        for (const hit of hits) {
          if (apples.resolved || apples.dullUntil) break;
          cutApple(hit.index, angle);
        }
      }
    }
    gesture.previous = point;
  });
  function endAppleGesture(event) {
    if (appleGesture?.id !== event.pointerId) return;
    appleGesture.field.querySelector('.apple-trail polyline')?.removeAttribute('points');
    appleGesture.field.querySelector('.apple-blade-tip').hidden = true;
    appleGesture = null;
  }
  window.addEventListener('pointerup', endAppleGesture);
  window.addEventListener('pointercancel', endAppleGesture);

  function handleAction(action) {
    if (action === 'arcade-duel') return openAppleGame();
    if (action.startsWith('apple-mode:') && apples?.phase === 'idle') {
      apples.includeListening = action === 'apple-mode:true';
      return render();
    }
    if (action === 'duel-start' && apples?.phase === 'idle') return launchAppleRound();
    if (action === 'duel-restart') return openAppleGame(apples.includeListening);
    if (action === 'apple-review' && apples?.phase === 'ended') return startQuickCheck([...apples.reviewIds].slice(0, 3), true);
    if (action === 'apple-speak') return speakText(apples.target.word, [], { manual: true });
    if (action === 'apple-reveal') {
      root.querySelector('[data-apple-meaning]').textContent = apples.target.meaning;
      return;
    }
  }

  function click(event, target) {
    if (target.dataset.appleIndex !== undefined) {
      const point = { x: event.clientX, y: event.clientY };
      const field = target.closest('.apple-field');
      if (event.detail === 0 || (performance.now() >= suppressAppleClickUntil
        && appleTargetHit(point, point, target, field.getBoundingClientRect()) !== null)) {
        cutApple(Number(target.dataset.appleIndex));
      }
      return;
    }
  }

  function showSpeechError() {
    const feedback = root.querySelector('[data-apple-feedback]');
    if (feedback && !apples.resolved) feedback.textContent = '발음이 들리지 않으면 뜻 보기로 확인하세요.';
  }

  return { view: appleView, stop: stopAppleGame, handleAction, click, showSpeechError };
}

import { getLearnedIds } from './domain.js';
import { button, escapeHtml, pixelSprite, randomInt } from './ui.js';
import { playEffect, specialEffect } from './effects.js';

export function createConversation({ root, getState, getScreen, render, navigate, persist, speakText, clickableSentence }) {
  const conversationTopics = [
    ['카페에서 음료 고르기', 'Choosing a drink at a cafe'],
    ['주말에 하고 싶은 일', 'Weekend plans'],
    ['좋아하는 간식', 'Favorite snacks'],
    ['길을 잃었을 때', 'Getting lost and asking for directions'],
    ['친구에게 취미 소개하기', 'Sharing hobbies with a friend'],
    ['비 오는 날', 'Things to do on a rainy day'],
    ['가고 싶은 여행지', 'Places we want to visit'],
    ['도서관에서 책 찾기', 'Finding a book at the library'],
  ];
  const conversationGoal = 5;
  let conversationEpoch = 0;
  let conversationRequest;
  let conversationError = '';

  function conversationView() {
    const game = getState().conversationGame;
    const topic = conversationTopics[game?.topic];
    const header = `<div class="game-header"><h1>슬라임과 대화</h1><button class="game-exit" data-nav="smalltalk">나가기</button></div>`;
    if (!topic || game.phase === 'picked') return `<div class="page conversation-page">${header}
      <section class="card conversation-topic-card">${pixelSprite('mascot')}<h2>${topic ? topic[0] : '어떤 이야기를 할까요?'}</h2>
      <p>${topic ? '먼저 영어로 말을 걸어 보세요.' : '주제를 뽑고 영어로 다섯 번 대화하세요.'}</p>
      ${topic ? button('대화 시작', 'conversation-start') : button('랜덤 주제 뽑기', 'conversation-draw')}</section></div>`;
    const writing = ['active', 'free'].includes(game.phase);
    const status = game.phase === 'cleared' ? '대화 클리어!' : game.phase === 'failed' ? game.reason : '';
    return `<div class="page conversation-page">${header}
      <div class="conversation-topic-line"><strong>${topic[0]}</strong><span>${game.phase === 'free' ? '자유 대화' : `${game.completed}/${conversationGoal}`}</span></div>
      <div class="conversation-log" role="log">${game.turns.map(({ english, korean, user }, index) => `<article class="conversation-line${user ? ' conversation-line--user' : ''}">${user ? '' : pixelSprite('mascot')}<div><p lang="en">${clickableSentence(english)}</p>${korean ? `<small>${escapeHtml(korean)}</small>` : ''}</div>${user ? '' : `<button type="button" class="listen-button" data-action="conversation-play" data-line="${index}" aria-label="문장 발음 듣기">▶</button>`}</article>`).join('')}</div>
      <div class="conversation-controls">
        ${writing ? `<form class="conversation-form"><input aria-label="영어로 대화하기" placeholder="영어로 입력" maxlength="200" value="${escapeHtml(game.draft)}" ${conversationRequest ? 'disabled' : ''} required><button type="submit" class="button button--primary" ${conversationRequest ? 'disabled' : ''}>보내기</button><button type="button" class="button button--secondary" data-action="conversation-mic" ${conversationRequest ? 'disabled' : ''}>말하기</button></form>` : ''}
        <p class="game-message conversation-status" role="status">${game.phase === 'failed' ? '대화 실패 · ' : ''}${escapeHtml(conversationRequest ? '슬라임이 생각 중이에요…' : conversationError || status)}</p>
        <div class="conversation-actions">${conversationError && writing ? button('다시 보내기', 'conversation-retry', 'secondary') : ''}
        ${game.phase === 'cleared' ? button('이어서 대화', 'conversation-continue') : ''}
        ${!writing ? button('새로운 대화', 'conversation-draw', 'secondary') : ''}${button('대화 종료', 'conversation-end', 'quiet')}</div>
      </div>
    </div>`;
  }

  function openConversation() {
    conversationError = '';
    navigate('conversation');
    const log = root.querySelector('.conversation-log');
    if (log) log.scrollTop = log.scrollHeight;
    specialEffect('talk');
  }

  function drawConversationTopic() {
    const choices = conversationTopics.map((_, index) => index).filter((index) => index !== getState().lastConversationTopic);
    const topic = choices[randomInt(choices.length)];
    getState().lastConversationTopic = topic;
    getState().conversationGame = { topic, phase: 'picked', completed: 0, turns: [], draft: '', reason: '' };
    conversationError = '';
    playEffect('loot');
    persist();
    render();
  }

  async function requestConversation(text = '') {
    const game = getState().conversationGame;
    if (getScreen() !== 'conversation' || conversationRequest || !text || !['active', 'free'].includes(game?.phase)) return;
    const epoch = conversationEpoch;
    const request = new AbortController();
    conversationRequest = request;
    conversationError = '';
    game.draft = text;
    persist();
    render();

    const turns = game.turns.slice(-8).map(({ english, user }) => ({
      role: user ? 'user' : 'assistant', text: english,
    }));
    if (text) turns.push({ role: 'user', text });
    const timeout = setTimeout(() => request.abort(), 18000);
    try {
      const endpoint = location.hostname === 'ljw.yeonw.com' ? 'https://smalltalk-2ijuwon.vercel.app/api/slime-chat' : '/api/slime-chat';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: request.signal,
        body: JSON.stringify({
          turns,
          topic: conversationTopics[game.topic][1],
          learnedIds: getLearnedIds(getState()).slice(-80),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload) throw new Error(payload?.error || 'unavailable');
      if (epoch !== conversationEpoch) return;
      if (payload.valid === true && typeof payload.english === 'string' && typeof payload.korean === 'string') {
        game.turns.push({ english: text, user: true }, { english: payload.english, korean: payload.korean });
        if (game.phase === 'active' && ++game.completed === conversationGoal) {
          game.phase = 'cleared';
          specialEffect('lesson');
        }
      } else if (payload.valid === false && typeof payload.reason === 'string') {
        game.turns.push({ english: text, user: true });
        game.phase = 'failed';
        game.reason = payload.reason;
        playEffect('retry');
      } else throw new Error('reply');
      game.draft = '';
      persist();
    } catch (error) {
      if (epoch === conversationEpoch) {
        if (error.message === 'provider_setup') {
          conversationError = 'AI 서비스 계정 인증이 필요해요. 인증이 끝나면 대화할 수 있어요.';
        } else if (error.message === 'rate') {
          conversationError = '요청이 많아요. 잠시 후 다시 시도해 주세요.';
        } else if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') {
          conversationError = 'AI 대화는 온라인 화면에서 할 수 있어요.';
        } else {
          conversationError = 'AI 서비스가 응답하지 않았어요. 잠시 후 다시 시도해 주세요.';
        }
      }
    } finally {
      clearTimeout(timeout);
      if (epoch === conversationEpoch) {
        conversationRequest = null;
        render();
        const log = root.querySelector('.conversation-log');
        if (log) log.scrollTop = log.scrollHeight;
      }
    }
  }

  function submitConversation(text) {
    const message = text.trim().slice(0, 200);
    if (message) requestConversation(message);
  }

  function recognizeConversation() {
    const epoch = conversationEpoch;
    const status = root.querySelector('.conversation-status');
    const receive = (text) => {
      if (epoch !== conversationEpoch || getScreen() !== 'conversation') return;
      if (text) {
        const input = root.querySelector('.conversation-form input');
        input.value = text.slice(0, 200);
        input.focus();
        status.textContent = '인식한 문장을 확인하고 보내세요.';
      } else {
        status.textContent = '음성을 인식하지 못했어요. 영어를 직접 입력할 수 있어요.';
      }
    };
    if (window.SmalltalkMic) {
      window.receiveSmalltalkSpeech = receive;
      window.SmalltalkMic.postMessage('start');
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return receive('');
    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.onresult = (event) => receive(event.results[0][0].transcript);
    recognition.onerror = () => receive('');
    status.textContent = '영어로 말하세요.';
    try { recognition.start(); } catch { receive(''); }
  }

  function handleAction(action, target) {
    if (action === 'talk-conversation') return openConversation();
    if (action === 'conversation-draw') return drawConversationTopic();
    if (action === 'conversation-start' || action === 'conversation-continue') {
      const game = getState().conversationGame;
      if (action === 'conversation-start' && game?.phase === 'picked') game.phase = 'active';
      if (action === 'conversation-continue' && game?.phase === 'cleared') game.phase = 'free';
      persist();
      render();
      const log = root.querySelector('.conversation-log');
      if (log) log.scrollTop = log.scrollHeight;
      return;
    }
    if (action === 'conversation-end') {
      delete getState().conversationGame;
      conversationError = '';
      persist();
      navigate('smalltalk');
      return specialEffect('goodbye');
    }
    if (action === 'conversation-retry') {
      const input = root.querySelector('.conversation-form input');
      const draft = input?.value.trim() || '';
      if (draft) return requestConversation(draft);
      input?.focus();
      return;
    }
    if (action === 'conversation-mic') return recognizeConversation();
    if (action === 'conversation-play') {
      const line = getState().conversationGame?.turns[Number(target.dataset.line)];
      if (line) return speakText(line.english, [], { manual: true });
      return;
    }
  }

  function leave() {
    const input = root.querySelector('.conversation-form input');
    if (input && !conversationRequest && getState().conversationGame) {
      getState().conversationGame.draft = input.value;
      persist();
    }
    conversationEpoch += 1;
    conversationRequest?.abort();
    conversationRequest = null;
  }

  return { view: conversationView, leave, handleAction, submit: submitConversation };
}

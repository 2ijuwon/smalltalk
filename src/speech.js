import { speechClips } from './speech-clips.js';
import { pixelSprite } from './ui.js';

export function createSpeech({ root, getScreen, showAppleSpeechError, showPlaybackError }) {
  let speechAudio;
  let speechFrame;

  function stopSpeech() {
    window.speechSynthesis?.cancel();
    speechAudio?.pause();
    speechAudio = null;
    cancelAnimationFrame(speechFrame);
    root.querySelectorAll('.spoken-active').forEach((part) => part.classList.remove('spoken-active'));
  }

  let volumeCheckSequence = 0;
  let volumeCheckScreen = '';
  let volumeNoticeTimer = 0;

  window.receiveSmalltalkVolume = (sequence, silent) => {
    if (sequence !== volumeCheckSequence || getScreen() !== volumeCheckScreen || !silent) return;
    clearTimeout(volumeNoticeTimer);
    document.querySelector('.volume-hint')?.remove();
    const hint = document.createElement('div');
    hint.className = 'volume-hint';
    hint.setAttribute('role', 'status');
    hint.innerHTML = `${pixelSprite('surprised')}<strong>소리를 키워주세요!</strong>`;
    document.body.append(hint);
    volumeNoticeTimer = setTimeout(() => hint.remove(), 2300);
  };

  function speakText(text, spans = [], { manual = false } = {}) {
    if (manual && window.SmalltalkVolume) {
      volumeCheckScreen = getScreen();
      window.SmalltalkVolume.postMessage(String(++volumeCheckSequence));
    }
    stopSpeech();
    const clip = speechClips[text] || speechClips[text.toLowerCase()];
    if (!clip) {
      const synthesis = window.speechSynthesis;
      const voice = synthesis?.getVoices().find((option) => /^en(?:-|_)/i.test(option.lang));
      if (!synthesis) {
        const status = root.querySelector('.conversation-status');
        if (status) status.textContent = '이 기기에서 영어 음성을 재생할 수 없어요.';
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang || 'en-US';
      utterance.rate = .85;
      synthesis.speak(utterance);
      return;
    }
    const [file, cues] = clip;
    const audio = new Audio(new URL(`./audio/${file}?v=3`, import.meta.url));
    speechAudio = audio;
    const highlight = () => {
      if (speechAudio !== audio || audio.paused) return;
      const index = cues.findLastIndex((time) => time <= audio.currentTime);
      spans.forEach((span, position) => span.classList.toggle('spoken-active', position === index));
      speechFrame = requestAnimationFrame(highlight);
    };
    audio.addEventListener('playing', highlight, { once: true });
    audio.addEventListener('ended', () => { if (speechAudio === audio) stopSpeech(); });
    audio.play().catch(() => {
      if (speechAudio !== audio) return;
      stopSpeech();
      if (getScreen() === 'duel') {
        showAppleSpeechError();
        return;
      }
      showPlaybackError();
    });
  }

  function showWordMeaning(target) {
    speakText(target.dataset.dictionaryWord, [], { manual: true });
    root.querySelector('.word-gloss')?.remove();
    const gloss = document.createElement('div');
    gloss.className = 'word-gloss';
    gloss.setAttribute('role', 'status');
    gloss.textContent = `${target.dataset.dictionaryWord}${target.dataset.meaning ? ` · ${target.dataset.meaning}` : ''}`;
    const rect = target.getBoundingClientRect();
    gloss.style.top = `${Math.max(8, rect.top - 8)}px`;
    gloss.style.left = `${Math.max(105, Math.min(innerWidth - 105, rect.left + rect.width / 2))}px`;
    root.append(gloss);
    setTimeout(() => gloss.remove(), 3200);
  }

  return { speakText, stopSpeech, showWordMeaning };
}

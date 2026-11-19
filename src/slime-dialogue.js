export const slimeReplies = {
  greeting: ['Hi! How are you today?', '안녕! 오늘 기분은 어때요?'],
  help: ['Of course! What do you need?', '물론이죠! 무엇을 도와드릴까요?'],
  agree: ['Great! What should we do first?', '좋아요! 무엇부터 할까요?'],
  goodbye: ['See you tomorrow!', '내일 봐요!'],
  think: ['Take your time. What do you think?', '천천히 생각해요. 어떻게 생각하세요?'],
  explain: ['Sure! Which part was unclear?', '물론이죠! 어느 부분이 헷갈렸나요?'],
  perspective: ['Thank you! What is your opinion?', '고마워요! 어떤 의견이 있나요?'],
  later: ['No problem. When should we talk?', '괜찮아요. 언제 이야기할까요?'],
  positive: ['Glad to hear it! What made you happy?', '잘됐네요! 어떤 일이 기분 좋았나요?'],
  negative: ['I am sorry to hear that. What happened?', '그랬군요. 무슨 일이 있었어요?'],
  thanks: ['You are welcome! Anything else?', '천만에요! 또 필요한 게 있나요?'],
  fallback: ['Can you tell me more?', '조금 더 이야기해 줄래요?'],
};

const intents = {
  goodbye: /\b(bye|goodbye|see you|tomorrow)\b/i,
  thanks: /\b(thanks|thank you)\b/i,
  explain: /\b(explain|repeat|again|unclear)\b/i,
  perspective: /\b(perspective|opinion|appreciate)\b/i,
  later: /\b(later|revisit|another time)\b/i,
  help: /\b(help|need|assist)\b/i,
  think: /\b(think about|not sure|decide)\b/i,
  negative: /\b(sad|bad|tired|upset|worried)\b/i,
  agree: /\b(sounds good|agree|okay|sure|yes)\b/i,
  positive: /\b(happy|great|good|fine|well)\b/i,
  greeting: /\b(hello|hi|hey)\b/i,
};

export function slimeReply(text) {
  const match = Object.entries(intents).find(([, pattern]) => pattern.test(text));
  return slimeReplies[match?.[0] ?? 'fallback'];
}

export const commonMeanings = Object.fromEntries(
  'a:하나의|about:~에 대해|again:다시|am:~이다|anything:무엇이든|appreciate:고맙게 여기다|are:~이다|can:~할 수 있다|could:~할 수 있을까요|day:하루|do:하다|else:그 밖에|explain:설명하다|first:먼저|glad:기쁜|good:좋은|great:좋아요|happened:일어났다|happy:기쁜|hear:듣다|help:돕다|hi:안녕하세요|how:어떻게|i:나|is:~이다|it:그것|later:나중에|let:~하게 하다|made:만들었다|me:나를|more:더 많이|need:필요하다|no:아니다|of:~의|course:물론|opinion:의견|part:부분|perspective:관점|problem:문제|revisit:다시 논의하다|see:보다|should:~하는 게 좋다|sorry:안타까운|sounds:~하게 들린다|sure:물론이죠|take:쓰다|talk:이야기하다|tell:말하다|thank:감사하다|that:그것|think:생각하다|time:시간|to:~하기 위해|today:오늘|tomorrow:내일|unclear:이해하기 어려운|us:우리에게|was:~이었다|we:우리|welcome:환영하다|what:무엇|when:언제|which:어느|you:당신|your:당신의|this:이것'.split('|').map((entry) => entry.split(':'))
);

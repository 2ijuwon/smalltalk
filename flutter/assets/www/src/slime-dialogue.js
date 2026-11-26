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

for (const level of [
  "after:~한 뒤에|an:하나의|and:그리고|annual:매년의|at:~에|be:~이다|before:~하기 전에|books:책들|building:건물|cable:케이블|change:바꾸다|changes:바꾸다·변화|check:확인하다|checked:확인했다|checks:확인한다|clear:분명한|clients:고객들·클라이언트|code:코드|company:회사|computer:컴퓨터|confirmed:확인했다|connects:연결한다|continued:계속했다|controls:제어한다|correct:올바른|customers:고객들|data:데이터|detects:감지한다|displays:보여 준다|doctor:의사|documents:문서들|door:문|drink:마시다|drives:작동시킨다·운전한다|english:영어|enough:충분한|error:오류|every:모든|expected:예상했다|explains:설명한다|factory:공장|faster:더 빠른|feels:느낀다|fever:열|final:마지막의|finds:찾는다|flows:흐른다|focuses:집중한다|for:~을 위해|gauge:계기|guides:안내한다|her:그녀의·그녀를|high:높은|his:그의|home:집|hour:한 시간|hours:몇 시간|illness:질병|in:~안에|increased:늘었다|information:정보|input:입력|its:그것의|keeps:보관한다|language:언어|lasted:지속됐다|local:지역의|loyal:충성스러운|marketing:마케팅|measure:측정하다|movement:움직임|music:음악|my:나의|needs:필요하다|new:새로운|nine:아홉|nurse:간호사|office:사무실|old:오래된|on:~위에|opens:연다|our:우리의|pain:통증|pen:펜|personal:개인의|please:부탁해요|powers:동력을 공급한다|prepared:준비했다|preserves:보존한다|prevents:막는다|private:사적인|produces:생산한다|product:제품|protects:보호한다|provided:제공했다|quick:빠른|quickly:빠르게|ready:준비된|received:받았다|reduced:줄였다|reflects:반영한다|reply:답장·대답하다|research:연구|responsible:책임 있는|rest:쉬다·나머지|rice:쌀·밥|rights:권리|rising:오르는|score:점수|send:보내다|sends:보낸다|sentence:문장|serious:심각한|shapes:형성한다|shows:보여 준다|simple:간단한|small:작은|social:사회의|solves:해결한다|store:가게·저장하다|stores:저장한다|student:학생|sudden:갑작스러운|tea:차|team:팀|technology:기술|tested:시험했다|testing:시험하는|than:~보다|the:그·이미 말한 대상을 가리킴|through:~을 통해|travels:이동한다|two:둘|use:쓰다|user:사용자|valuable:가치 있는|very:아주|website:웹사이트|wheel:바퀴|wire:전선|writer:작가",
  "hello:안녕하세요|yes:네|not:~하지 않다|don't:~하지 않아요|can't:~할 수 없어요|i'm:나는 ~예요|that's:그건 ~이에요|it's:그것은 ~이에요|where:어디|who:누구|why:왜|here:여기|there:거기|with:~와 함께|from:~에서부터|but:하지만|or:또는|have:가지고 있다|want:원하다|went:갔다|got:받았다·얻었다|nice:좋은|really:정말|too:또한·너무|well:잘|some:조금·몇몇|many:많은|much:많이|little:조금|big:큰|drink:마시다·음료|coffee:커피|milk:우유|cake:케이크|bread:빵|food:음식|favorite:가장 좋아하는|weekend:주말|rain:비|rainy:비가 오는|sunny:맑은|street:길|right:오른쪽·맞는|left:왼쪽|straight:곧장|walk:걷다|library:도서관|find:찾다|sit:앉다|come:오다|play:놀다|watch:보다|movies:영화들|games:게임들|meet:만나다|night:밤|morning:아침|afternoon:오후|thanks:고마워요|goodbye:안녕히 가세요|okay:좋아요",
]) {
  for (const entry of level.split('|')) {
    const [word, meaning] = entry.split(':');
    commonMeanings[word] = meaning;
  }
}

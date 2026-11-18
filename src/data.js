export const majorLabels = {
  computer: '컴퓨터공학', business: '경영·경제', health: '간호·보건',
  engineering: '기계·전자', humanities: '인문·사회',
};

export const difficultyLabels = {
  basic: '기초 · 가볍게 시작', intermediate: '중급 · 한 단계 더', advanced: '고급 · 실전처럼',
};

const entry = (word, pronunciation, meaning, example, translation, major, difficulty = 'basic') => ({
  id: `${major}-${word}`, word, pronunciation, meaning, example, translation, major, difficulty,
});

export const vocabulary = [
  entry('algorithm', '앨거리듬', '알고리즘', 'The algorithm solves the problem quickly.', '그 알고리즘은 문제를 빠르게 해결합니다.', 'computer'),
  entry('database', '데이터베이스', '데이터베이스', 'The database stores customer information.', '그 데이터베이스는 고객 정보를 저장합니다.', 'computer'),
  entry('network', '네트워크', '네트워크', 'Our network connects every office computer.', '우리 네트워크는 모든 사무실 컴퓨터를 연결합니다.', 'computer'),
  entry('variable', '베어리어블', '변수', 'This variable keeps the final score.', '이 변수는 최종 점수를 보관합니다.', 'computer'),
  entry('function', '펑션', '함수', 'The function checks the user input.', '그 함수는 사용자 입력을 확인합니다.', 'computer'),
  entry('server', '서버', '서버', 'The server sends data to clients.', '서버는 클라이언트에 데이터를 보냅니다.', 'computer', 'intermediate'),
  entry('browser', '브라우저', '브라우저', 'The browser displays the new website.', '브라우저가 새 웹사이트를 표시합니다.', 'computer', 'intermediate'),
  entry('encryption', '인크립션', '암호화', 'Encryption protects private user data.', '암호화는 개인 사용자 데이터를 보호합니다.', 'computer', 'intermediate'),
  entry('interface', '인터페이스', '인터페이스', 'The interface feels simple and clear.', '그 인터페이스는 단순하고 명확하게 느껴집니다.', 'computer', 'intermediate'),
  entry('compiler', '컴파일러', '컴파일러', 'The compiler finds an error in the code.', '컴파일러가 코드에서 오류를 찾습니다.', 'computer', 'advanced'),

  entry('revenue', '레버뉴', '매출', 'The company increased its annual revenue.', '회사는 연간 매출을 늘렸습니다.', 'business'),
  entry('profit', '프로핏', '이익', 'The store made a small profit.', '그 가게는 작은 이익을 냈습니다.', 'business'),
  entry('budget', '버짓', '예산', 'We prepared a budget for marketing.', '우리는 마케팅 예산을 준비했습니다.', 'business'),
  entry('demand', '디맨드', '수요', 'Demand for the product is rising.', '그 제품에 대한 수요가 증가하고 있습니다.', 'business'),
  entry('supply', '서플라이', '공급', 'The factory increased the product supply.', '공장은 제품 공급량을 늘렸습니다.', 'business'),
  entry('market', '마켓', '시장', 'The market changes very quickly.', '시장은 매우 빠르게 변합니다.', 'business', 'intermediate'),
  entry('asset', '애셋', '자산', 'The building is a valuable asset.', '그 건물은 가치 있는 자산입니다.', 'business', 'intermediate'),
  entry('invoice', '인보이스', '청구서', 'Please send the invoice today.', '오늘 청구서를 보내 주세요.', 'business', 'intermediate'),
  entry('strategy', '스트래터지', '전략', 'Our strategy focuses on loyal customers.', '우리 전략은 충성 고객에 집중합니다.', 'business', 'intermediate'),
  entry('customer', '커스터머', '고객', 'Every customer received a quick reply.', '모든 고객이 빠른 답변을 받았습니다.', 'business'),

  entry('diagnosis', '다이어그노시스', '진단', 'The doctor confirmed the diagnosis.', '의사는 진단을 확인했습니다.', 'health'),
  entry('patient', '페이션트', '환자', 'The patient needs enough rest.', '그 환자는 충분한 휴식이 필요합니다.', 'health'),
  entry('symptom', '심텀', '증상', 'A fever can be a symptom.', '열은 하나의 증상일 수 있습니다.', 'health'),
  entry('treatment', '트리트먼트', '치료', 'The treatment reduced her pain.', '그 치료는 그녀의 통증을 줄였습니다.', 'health'),
  entry('dosage', '도시지', '복용량', 'Check the correct dosage before use.', '사용 전에 정확한 복용량을 확인하세요.', 'health'),
  entry('surgery', '서저리', '수술', 'The surgery lasted two hours.', '그 수술은 두 시간 동안 진행됐습니다.', 'health', 'intermediate'),
  entry('recovery', '리커버리', '회복', 'Her recovery was faster than expected.', '그녀의 회복은 예상보다 빨랐습니다.', 'health', 'intermediate'),
  entry('clinic', '클리닉', '진료소', 'The clinic opens at nine.', '그 진료소는 아홉 시에 문을 엽니다.', 'health'),
  entry('vaccine', '백신', '백신', 'The vaccine prevents serious illness.', '그 백신은 심각한 질병을 예방합니다.', 'health', 'intermediate'),
  entry('pulse', '펄스', '맥박', 'The nurse checked his pulse.', '간호사는 그의 맥박을 확인했습니다.', 'health'),

  entry('voltage', '볼티지', '전압', 'Measure the voltage before testing.', '시험 전에 전압을 측정하세요.', 'engineering'),
  entry('current', '커런트', '전류', 'The current flows through the wire.', '전류가 전선을 통해 흐릅니다.', 'engineering'),
  entry('circuit', '서킷', '회로', 'This circuit controls the motor.', '이 회로는 모터를 제어합니다.', 'engineering'),
  entry('sensor', '센서', '센서', 'The sensor detects sudden movement.', '그 센서는 갑작스러운 움직임을 감지합니다.', 'engineering'),
  entry('torque', '토크', '회전력', 'The motor produces enough torque.', '그 모터는 충분한 회전력을 만듭니다.', 'engineering'),
  entry('motor', '모터', '모터', 'The motor drives the small wheel.', '그 모터는 작은 바퀴를 움직입니다.', 'engineering'),
  entry('signal', '시그널', '신호', 'The signal travels through the cable.', '신호가 케이블을 통해 전달됩니다.', 'engineering', 'intermediate'),
  entry('battery', '배터리', '배터리', 'The battery powers the sensor.', '배터리가 센서에 전력을 공급합니다.', 'engineering'),
  entry('pressure', '프레셔', '압력', 'The gauge shows high pressure.', '계기판이 높은 압력을 표시합니다.', 'engineering', 'intermediate'),
  entry('prototype', '프로토타입', '시제품', 'The team tested a new prototype.', '그 팀은 새 시제품을 시험했습니다.', 'engineering', 'intermediate'),

  entry('context', '콘텍스트', '맥락', 'Read the sentence in context.', '그 문장을 맥락 속에서 읽으세요.', 'humanities'),
  entry('society', '소사이어티', '사회', 'Technology changes our society.', '기술은 우리 사회를 변화시킵니다.', 'humanities'),
  entry('culture', '컬처', '문화', 'Language reflects local culture.', '언어는 지역 문화를 반영합니다.', 'humanities'),
  entry('evidence', '에비던스', '증거', 'The writer provided clear evidence.', '그 작가는 명확한 증거를 제시했습니다.', 'humanities'),
  entry('theory', '시어리', '이론', 'The theory explains social change.', '그 이론은 사회 변화를 설명합니다.', 'humanities'),
  entry('debate', '디베이트', '토론', 'The debate continued for an hour.', '그 토론은 한 시간 동안 계속됐습니다.', 'humanities'),
  entry('ethics', '에틱스', '윤리', 'Ethics guides responsible research.', '윤리는 책임 있는 연구를 이끕니다.', 'humanities', 'intermediate'),
  entry('archive', '아카이브', '기록보관소', 'The archive preserves old documents.', '그 자료 보관소는 오래된 문서를 보존합니다.', 'humanities', 'intermediate'),
  entry('policy', '폴리시', '정책', 'The policy protects student rights.', '그 정책은 학생의 권리를 보호합니다.', 'humanities', 'intermediate'),
  entry('identity', '아이덴티티', '정체성', 'Language shapes personal identity.', '언어는 개인의 정체성을 형성합니다.', 'humanities', 'intermediate'),
];

export function itemsForMajor(major) {
  const items = vocabulary.filter((item) => item.major === major);
  return items.length ? items : vocabulary.filter((item) => item.major === 'computer');
}

export function stageWords(major, stage) {
  const order = { basic: 0, intermediate: 1, advanced: 2 };
  const sort = (a, b) => order[a.difficulty] - order[b.difficulty] || a.word.length - b.word.length;
  const own = itemsForMajor(major).sort(sort);
  const rest = vocabulary.filter((item) => !own.includes(item)).sort(sort);
  return [...own, ...rest].slice((stage - 1) * 5, stage * 5).map((item) => item.id);
}

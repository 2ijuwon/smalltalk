# UI 벤치마크 메모

2026-11-08 기준 공식 서비스 페이지를 확인했다. 화면을 복제하지 않고, small talk의 기존 구조와 Figma 색상 규칙 안에서 정보 위계와 상호작용 원칙만 참고했다.

| 참고 서비스 | 관찰한 패턴 | 적용한 부분 |
| --- | --- | --- |
| [Duolingo](https://www.duolingo.com/learn) | 짧은 학습, XP, 습관 형성, 개인화된 연습을 한 흐름으로 제시 | 오늘의 루틴, XP 표시, 한 번에 하나의 주요 행동 |
| [Duolingo Practice](https://blog.duolingo.com/guide-to-duolingo-practice-hub/) | 실수·단어·말하기·듣기를 목적별로 다시 선택 | 다시 볼 표현을 별도 목적지로 유지하고 홈에서 바로 접근 |
| [Quizlet Learn](https://quizlet.com/features/learn) | 플래시카드를 다양한 문제 형식으로 확장하고 짧은 세션을 강조 | 단어 카드와 문제 화면을 연결하고 문제 유형 확장 위치 유지 |
| [Quizlet Flashcards](https://quizlet.com/features/flashcards) | 즐겨찾기, 알고 있음/학습 중 구분, 단순한 카드 집중 | 즐겨찾기, 기억했어요/한 번 더 볼게요, 좁은 학습 폭 |
| [Khan Academy 학생 대시보드](https://support.khanacademy.org/hc/en-us/articles/46935588089997-How-do-I-use-the-student-dashboard-in-Khan-Academy) | 진행률·목표·최근 활동을 카드 단위로 빠르게 확인 | 홈에서 오늘 목표와 통계를 분리하고 숫자 의미를 명확히 표시 |

## 적용 원칙

- 첫 화면에서 “오늘 무엇을 할지”가 한 번에 보이게 한다.
- 카드마다 주요 행동은 하나만 둔다.
- 진행률·XP·다시 볼 개수는 장식보다 의미를 먼저 읽을 수 있게 한다.
- AI 느낌은 보라색 과잉 그라데이션이나 챗봇 장식 대신, 반응하는 빛·레이어·부드러운 상태 전환으로 표현한다.
- 모든 애니메이션은 선형 시간 함수를 사용하고, 운영체제의 모션 감소 설정에서는 제거한다.

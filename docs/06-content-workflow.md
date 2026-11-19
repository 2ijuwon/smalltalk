# 콘텐츠 교체 방법

웹, Flutter 오프라인 화면, AI 대화 서버는 같은 단어 목록을 사용합니다.

| 수정할 파일 | 들어가는 정보 |
| --- | --- |
| [vocabulary.json](../content/vocabulary.json) | 단어 ID, 영어 단어, 한국어 뜻, 예문과 번역, 전공, 난이도 |
| [small-talk.json](../content/small-talk.json) | 영어 문장, 한국어 해석, 사용 상황, 난이도 |

## 새 데이터를 받으면

1. 원본 두 파일 중 필요한 것을 UTF-8 JSON으로 교체합니다. 기존과 같은 학습 항목은 `id`를 유지합니다. 영어 단어는 단어 찾기와 타자 게임에서 공통으로 사용되므로 현재 형식은 영문 알파벳 단어 하나입니다. 여러 단어로 된 표현은 스몰토크 데이터에 넣습니다.
2. `npm run content`로 검증합니다. 전공은 `computer`, `business`, `health`, `engineering`, `humanities`, 난이도는 `basic`, `intermediate`, `advanced`를 사용합니다. 스몰토크는 난이도별로 한 문장 이상 넣습니다.
3. 영어 단어나 문장을 추가·변경했다면 `python scripts/generate-speech.py`를 실행합니다. 기기에서 사용할 음원과 강조 시점을 생성하며, 그대로인 문장의 음원은 재사용합니다. 최초 모델 준비 명령은 [README](../README.md#pronunciation-audio)에 있습니다.
4. `npm run build`와 `.\flutter\scripts\sync-web.ps1`을 실행합니다. 누락된 음원이 있으면 그 문구를 알려 줍니다. 원본과 생성 파일을 GitHub `main`에 함께 올리면 Vercel에서 재배포합니다. 설치 앱에 내장된 오프라인 파일은 앱을 다시 빌드해야 갱신됩니다.

`src/content.generated.js`, `src/speech-clips.js`, `flutter/assets/www`는 위 도구가 만드는 파일입니다. 직접 편집할 곳은 `content/`입니다.

## 기록과 레슨

레슨은 선택 전공의 단어를 먼저 보여주고 다른 전공 단어로 이어집니다. 한 레슨에 최대 5개를 배정하며, 레슨 수는 전체 단어 수에 따라 늘거나 줄어듭니다. 기존 단어 ID를 유지하면 단어별 학습·복습 기록을 계속 참조합니다. 제거한 단어의 기록은 저장소에 남아도 현재 복습과 게임 목록에는 나오지 않습니다. 이번 변경 이후 완료한 레슨은 단어 ID 묶음으로 확인합니다. 이전 기록에는 묶음이 없으므로 기존 레슨 번호를 사용합니다. 자료를 크게 재편할 때는 레슨 배정과 기존 기록의 연결을 먼저 확인하세요.

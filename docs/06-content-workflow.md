# 콘텐츠 교체 방법

웹, Flutter 오프라인 화면, AI 대화 서버는 같은 단어 목록을 사용합니다.

| 수정할 파일 | 들어가는 정보 |
| --- | --- |
| [vocabulary.json](../content/vocabulary.json) | 단어 ID, 영어 단어, 한국어 뜻, 예문과 번역, 전공, 난이도 |
| [small-talk.json](../content/small-talk.json) | 영어 문장, 한국어 해석, 사용 상황, 난이도 |

## 새 데이터를 받으면

1. 원본 두 파일 중 필요한 것을 UTF-8 JSON으로 교체합니다. 기존과 같은 학습 항목은 `id`를 유지합니다. 영어 단어는 단어 찾기와 타자 게임에서 공통으로 사용되므로 현재 형식은 영문 알파벳 단어 하나입니다. 여러 단어로 된 표현은 스몰토크 데이터에 넣습니다.
2. `npm run content`로 검증합니다. 입문 단어는 `common`, 전공 단어는 `computer`, `business`, `health`, `engineering`, `humanities`에 넣습니다. 난이도는 `basic`, `intermediate`, `advanced`를 사용합니다. 스몰토크는 난이도별로 한 문장 이상 넣습니다.
3. 영어 단어나 문장을 추가·변경했다면 `python scripts/generate-speech.py`를 실행합니다. 기기에서 사용할 음원과 강조 시점을 생성하며, 그대로인 문장의 음원은 재사용합니다. 최초 모델 준비 명령은 [README](../README.md#pronunciation-audio)에 있습니다.
4. `npm run build`와 `.\flutter\scripts\sync-web.ps1`을 실행합니다. 누락된 음원이 있으면 그 문구를 알려 줍니다. 원본과 생성 파일을 GitHub `main`에 함께 올리면 Vercel에서 재배포합니다. 설치 앱에 내장된 오프라인 파일은 앱을 다시 빌드해야 갱신됩니다.

`src/content.generated.js`, `src/speech-clips.js`, `flutter/assets/www`는 위 도구가 만드는 파일입니다. 직접 편집할 곳은 `content/`입니다.

## Supabase에서 단어 받기

[DB 스키마](../content/supabase-schema.sql)를 적용한 뒤, 한 번에 배포할 자료에 같은 `release` 값을 넣습니다. `position`은 그 릴리스의 표시 순서이며 중복 없이 지정합니다. 같은 단어의 기존 학습 기록을 이어 가려면 릴리스가 바뀌어도 `id`를 유지합니다.

| 테이블 | 내용 |
| --- | --- |
| `smalltalk_vocabulary` | 릴리스, 순서, 고정 ID, 영어 단어, 한국어 뜻, 예문, 번역, 전공, 난이도 |
| `smalltalk_phrases` | 릴리스, 순서, 난이도, 영어 문장, 한국어 해석, 사용 상황 |

관리자 터미널에 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `CONTENT_RELEASE`를 설정합니다. 비밀 키는 관리자 환경에만 보관합니다.

```powershell
npm run content:import -- --check
npm run content:import
npm run content
```

가져오기 도구는 지정한 릴리스의 두 목록을 끝까지 읽고, 단어 ID 중복·전공·난이도·스몰토크 누락을 검사한 뒤 JSON으로 내보냅니다. 첫 명령은 원본 파일을 쓰지 않고 확인합니다. 이후 위의 발음 생성 및 배포 절차를 실행하세요. 웹, AI 대화 API, Android 오프라인 화면은 같은 검증된 목록을 사용하고 학습 기록과 최고 점수는 기기에 저장됩니다. [Supabase Data REST API](https://supabase.com/docs/guides/api)

## 기록과 레슨

레슨은 공통 입문 단어에서 시작해 선택 전공, 다른 전공 순으로 이어집니다. 입문 단어는 저장한 순서로 사용하므로 쉬운 단어와 짧은 문장을 앞에 둡니다. 한 레슨은 최대 5단어입니다. 기존 단어 ID를 유지하면 학습·복습 기록을 계속 참조합니다. 제거한 단어의 기록은 기기에 남고 복습과 게임 목록에서는 제외됩니다. 완료한 레슨은 단어 ID 묶음으로 확인하고, 묶음이 없는 이전 기록은 전공 레슨 번호를 사용합니다.

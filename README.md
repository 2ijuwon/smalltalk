# smalltalk

전공 영어 단어를 픽셀 게임으로 배우는 앱입니다. 웹 화면은 HTML, CSS, JavaScript ES 모듈로 만들었으며 프레임워크나 빌드 도구를 사용하지 않습니다. `flutter/`는 같은 웹 화면을 Android WebView에 포함하는 앱입니다. 현재 백엔드는 없고 학습 기록과 게임 최고 점수는 기기에 저장됩니다.

## 웹 실행

```powershell
npm start
```

`http://127.0.0.1:4173`에서 엽니다. npm 패키지 설치는 필요하지 않습니다.

## Android 실행

```powershell
cd flutter
flutter pub get
flutter run
```

WebView는 앱에 포함된 웹 파일을 사용하므로 PC 서버가 필요하지 않습니다. 웹 코드를 수정한 뒤 Flutter 파일에 반영하려면 저장소 루트에서 다음 명령을 실행합니다.

```powershell
.\flutter\scripts\sync-web.ps1
```

## 확인

```powershell
npm test
npm run test:server
cd flutter
flutter analyze
flutter test
```

첫 학습을 완료하면 단어 찾기, 사과 베기, 타자 게임을 계속 이용할 수 있습니다. 각 게임의 최고 점수는 홈과 통계에 표시됩니다. Supabase 연동은 이후 작업입니다.

## 웹 배포

GitHub `2ijuwon/smalltalk`의 `main` 브랜치를 Vercel `smalltalk` 프로젝트에 연결했습니다. Vercel은 `npm run build`를 실행하고 `dist/`를 배포합니다. 이 빌드는 웹 파일과 로컬 폰트만 복사합니다. Flutter 소스는 배포하지 않습니다.

Supabase `smalltalk` 프로젝트는 생성했습니다. 현재 앱의 학습 기록은 기기에 저장되며, Supabase 데이터베이스 동기화는 아직 연결하지 않았습니다.

## Pronunciation audio

English clips are generated at build preparation time with Piper's
[en_US-ljspeech-medium voice](https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/ljspeech/medium/MODEL_CARD).
The app plays the generated WAV files directly. Small talk sentences are synthesized as complete phrases. Word cues are
read from the Piper model’s phoneme durations and follow the audio playback clock. To regenerate the files on Windows:

```powershell
python -m pip install piper-tts onnx
python -m piper.download_voices --download-dir "$env:TEMP/smalltalk-voice" en_US-ljspeech-medium
python scripts/generate-speech.py
.\flutter\scripts\sync-web.ps1
```

## 학습 자료와 프로젝트 요약

- [단어·스몰토크 데이터 교체 방법](docs/06-content-workflow.md)
- [현재 기능, 비판점과 개선 우선순위](docs/07-product-review.md)

## 카드 없이 AI 대화 연결

1. [Google AI Studio API 키](https://aistudio.google.com/apikey)에서 무료 사용이 가능한 프로젝트의 키를 만듭니다.
2. Vercel의 `smalltalk` 프로젝트에서 **Settings → Environment Variables**를 열고 `GEMINI_API_KEY`를 **Production**에 추가합니다.
3. **Deployments → 최신 운영 배포 → Redeploy** 후 **스몰토크 → 대화하기**를 엽니다.

키는 Vercel 서버에서만 사용합니다. `GEMINI_API_KEY`가 설정되면 Gemini 3.1 Flash-Lite로 요청을 보냅니다. [무료 요금제](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.1-flash-lite)에는 사용량 한도가 있고, Google은 요청 내용을 서비스 개선에 사용할 수 있습니다.

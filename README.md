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
# iOS 출시 가이드 (Capacitor)

앱 ID `com.misolkim.doesaegim` · 이름 `되새김` · iPhone 전용 · 세로 고정 · iOS 15+

## 빌드 / 실행

```bash
npm run ios:open   # vite build → cap sync ios → Xcode 열기
```

웹 코드를 바꾸면 항상 `npm run ios:sync` 후 Xcode에서 빌드. `ios/App/App/public`은 gitignore(생성물).

## 코드로 끝난 것

- [x] capacitor.config.json, ios/ 프로젝트 생성 (SPM, Preferences 플러그인 연결)
- [x] Info.plist: arm64, 세로 고정, ITSAppUsesNonExemptEncryption=false
- [x] 1024px 아이콘(알파 없음), 단색 스플래시(#070912)

## Xcode에서 직접 (계정 필요)

1. App 타깃 → Signing & Capabilities → Team 선택 (Automatic signing)
2. 기기를 Any iOS Device(arm64)로 → Product → Archive → Distribute App → App Store Connect
3. (현재 Mac에는 Apple Development 인증서만 있음. Distribution 인증서는 Automatic signing이 만들어 줌)

## App Store Connect

- [ ] 앱 생성 (Bundle ID 일치), 이름 "되새김", 카테고리 교육
- [ ] 개인정보처리방침 URL (Supabase 로그인·동기화 사용 → 이메일/단어 데이터 수집 명시)
- [ ] App Privacy: 이메일(계정), 사용자 콘텐츠(단어) — 앱 기능용, 추적 없음
- [ ] 스크린샷 6.9" (1320x2868) 3~10장 — iPhone 전용이라 iPad 불필요
- [ ] 계정 로그인이 있으므로 심사용 데모 계정 + 설명 / 계정 삭제 기능(가이드라인 5.1.1(v)) 확인
- [ ] 연령 등급, 지원 URL, 설명/키워드

## 알려진 위험

- [x] 파일 내보내기: `src/lib/download.js`(saveFile) — 네이티브는 Filesystem 캐시 쓰기 + Share 시트
- 발음: speechSynthesis는 WKWebView에서 동작하나 Google TTS 폴백은 네트워크 필요
- 심사 4.2(최소 기능): 웹 래퍼로 보이지 않게 네이티브 기능(오프라인 저장, 공유 시트 등) 강조

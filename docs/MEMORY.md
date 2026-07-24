# 개발 기록 (MEMORY)

프로젝트의 영속 메모리. 결정·변경·후속 작업을 위에서부터 쌓습니다.
형식은 [`WORKFLOW.md`](WORKFLOW.md) 참고.

---

## 2026-07-24 · Makefile 추가
- 한 일: Treximo 스타일을 참고해 `Makefile` 추가(install/dev/build/test/ci/supabase-*/deploy/clean).
- 결정/이유: GitHub Pages 배포는 이미 `deploy.yml`이 main push 시 자동 처리 → `make deploy`는 SSH 없이 `ci`(test+build) 확인 후 `git push origin main`만 수행. `supabase-deploy`(translate 함수)는 별도 수동 배포 단계라 CI에 없음. lint 스크립트가 package.json에 없어 lint 타깃은 생략.
- 변경 파일: Makefile, docs/MEMORY.md

---

## 2026-07-24 · 클라우드 동기화 + 프록시 + 백업 (PLAN-0004)
- 한 일: Supabase 원격 스토어 추가(`remoteStore.js` — load/save 인터페이스 유지, diff로 변경/삭제 행만 upsert/delete). `rows.js`(행↔단어 매핑), `sync.js`(diff), `backup.js`(JSON/CSV export·import + merge), `supabase.js`(클라이언트+매직링크 인증). App은 로그인 시 원격/미로그인·미설정 시 로컬로 graceful 전환. 헤더에 로그인 UI, 단어 화면에 백업 UI. `supabase/schema.sql`(RLS+인덱스), `supabase/functions/translate`(프록시, `--no-verify-jwt`+Origin 허용목록).
- 결정/이유: due/created_at을 epoch ms `bigint`로 저장 → SRS(ms) 그대로, 타임존 버그 없음. 스토어 인터페이스 유지로 App 변경 최소화. anon 키·프록시는 공개라 데이터 보호는 RLS, 프록시 남용은 Origin+입력검증+Haiku/256으로 완화.
- 변경 파일: src/lib/{rows,sync,backup,supabase,remoteStore}.js (+__tests__), src/App.jsx, src/styles.css, supabase/*, docs/{PLANS,SUPABASE}.md, .env.example, package.json. 테스트 55개 그린, 빌드 OK.
- 후속: 오프라인 큐/충돌 해결, 프록시 레이트리밋, 로컬→클라우드 자동 마이그레이션.

---

## 2026-06-27 · AI 자동완성 안전 처리 (PLAN-0003)
- 한 일: `translate.js`에서 Anthropic 직접 호출·API 키 코드 완전 제거. `getEndpoint(env)` / `isAutocompleteAvailable(env)` 추가. `fetchMeanings`는 `endpoint` 파라미터가 없으면 즉시 throw. `App.jsx`는 `isAutocompleteAvailable()` false면 번역·사전 토글과 "뜻 가져오기" 버튼을 숨김.
- 결정/이유: 클라이언트에 API 키 포함 불가(보안). 자동완성은 `VITE_TRANSLATE_ENDPOINT` 환경변수로 프록시가 설정됐을 때만 동작. 프록시 미설정 시 AddWord는 직접입력 전용으로 graceful 동작.
- 변경 파일: src/lib/translate.js, src/lib/__tests__/translate.test.js, src/App.jsx

---

## 2026-06-19 · 저장 영구화 (PLAN-0002)
- 한 일: `storage.js`를 다중 백엔드(localStorage / Capacitor Preferences / memory)로 확장. 웹은 localStorage로 즉시 영속되고, 네이티브는 `resolveBackend()`가 `@capacitor/preferences`로 자동 업그레이드. `App.jsx`가 백엔드를 비동기로 해석한 뒤 로드하도록 변경.
- 결정/이유:
  - `window.storage`는 아티팩트 전용 → 실제 환경 기본은 localStorage. 우선순위 host > localStorage > memory.
  - Preferences는 동적 import(`/* @vite-ignore */`) + 런타임 감지 → 플러그인 미설치 상태에서도 빌드·실행 안전.
  - 백엔드 주입형 유지 → mock으로 테스트(저장 11 케이스, 총 32 통과).
- 변경 파일: src/lib/storage.js, src/App.jsx, src/lib/__tests__/storage.test.js
- 후속: iOS 네이티브 영속은 `npm i @capacitor/preferences && npx cap sync ios`로 활성화. 다음 작업은 AI 자동완성(클라이언트 키 노출 방지).

---

## 2026-06-19 · 프로젝트 부트스트랩 (PLAN-0001)
- 한 일: 단일 React 아티팩트를 Vite + Vitest 프로젝트로 재구성. 로직을 `src/lib`의 순수 함수로 분리하고 25개 단위 테스트 추가. CI·Pages 배포·문서 작성.
- 결정/이유:
  - **로직/뷰 분리**: `App.jsx`는 그리기만, 로직은 `lib`로 → 테스트 용이 + 토큰 절약.
  - **자동완성에 Haiku + 캐시 + 짧은 JSON 키**: 비용 최소화. (Sonnet 대비 충분하고 저렴)
  - **Google/Naver 직접 호출 포기**: 브라우저 CORS·키 제약. 교체 지점은 `translate.js`의 `fetchMeanings` 하나로 고립.
  - **저장 백엔드 주입형**: `window.storage` 없으면 인메모리 폴백, 테스트는 fake 주입.
  - **간격**: Leitner `[0,1,3,7,14,30]`일.
- 변경 파일: 전체 스캐폴드.
- 후속 작업: 카드 편집, 예문/이미지 필드, CSV 입출력, 학습 통계/스트릭.

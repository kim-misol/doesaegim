# 개발 기록 (MEMORY)

프로젝트의 영속 메모리. 결정·변경·후속 작업을 위에서부터 쌓습니다.
형식은 [`WORKFLOW.md`](WORKFLOW.md) 참고.

---

## 2026-07-24 · 오늘 진행률 히어로(남은 수 + 링)

- 한 일: Today 히어로를 글래스 카드로 바꾸고 남은 복습 수(큰 숫자) + 진행률 링(conic) 추가. 진행률 = passedToday/(passedToday+dueTotal). `dailyStats.js`(device-local 일일 카운터, 날짜 변경 시 자동 리셋) 신설 + 테스트 4개. Review에서 "기억했어요"(remembered) 채점 시 `onPass`로 카운트 bump.
- 결정/이유: 리뷰 타임스탬프 필드 없이 구현하려 "오늘 통과 카드" 카운터만 로컬 저장(로그인 무관 device-local). 잊음(forgot)은 진행률에 안 셈(카드가 계속 due). 미리보기 design/today-progress.html.
- 변경 파일: src/App.jsx, src/styles.css, src/lib/dailyStats.js(+test), design/today-progress.html. 테스트 63개 그린, 빌드 OK.

---

## 2026-07-24 · Aurora Glass 리퀴드 리디자인 전면 적용

- 한 일: 시안 4종 제작(design/) 후 "Aurora Glass(리퀴드)" 방향으로 실제 앱 전면 리스킨. `styles.css` 팔레트·표면을 리퀴드 글래스(구운 rim 하이라이트+깊이 그림자, 광택 스윕은 요청대로 제외)로 교체, 미세 웨이브(vc-wobble/breathe)와 숫자 셰이머 추가. `App.jsx`에 SVG goo 오로라 배경 컴포넌트(`AuroraBg`) 추가(기존 vc-bgglow 대체). 모든 화면(오늘/복습/추가/단어목록/로그인/백업/탭바/빈상태) 반영. 계정 버튼이 `.vc-mini` 고정폭에 글자 잘리던 것도 자동폭으로 수정.
- 결정/이유: 3D 플립 메커니즘은 그대로 보존. prefers-reduced-motion에서 모든 신규 애니메이션 정지. 오로라는 mix-blend screen+opacity .5로 가독성 확보.
- 변경 파일: src/App.jsx, src/styles.css, design/*. 테스트 59개 그린, 빌드 OK.

---

## 2026-07-24 · 언어 교체(fr→es/it/de) + 자동완성 버그 수정 + QC

- 한 일: 지원 언어에서 프랑스어 제거, 스페인어·이탈리아어·독일어 추가(`languages.js`, `schema.sql`, 라이브 DB의 CHECK 제약 ALTER, Edge Function `LANGS` 재배포). 자동완성 실패 원인 수정 — `translate.js`가 Supabase 게이트웨이용 `apikey`+`Authorization`(anon 키) 헤더를 보내지 않아 401로 막히던 것을 `buildHeaders()`로 첨부. QC: LangPicker가 언어 5개를 한 줄에 못 담던 것을 `flex-wrap` + `min-width`로 해결.
- 결정/이유: verify_jwt를 꺼도 게이트웨이는 프로젝트 라우팅용 `apikey`를 요구함(대시보드 cURL 예시가 근거). due/created_at ms 유지. 테스트 fr→de/es로 갱신.
- 변경 파일: src/lib/languages.js, translate.js (+translate.test), src/lib/**tests**/{backup,rows}.test.js, src/styles.css, supabase/{schema.sql,functions/translate/index.ts}. 테스트 59개 그린, 빌드 OK.
- 알려진 한계(인웹): 카카오/인스타 등 인앱 브라우저에선 매직링크가 외부 브라우저로 열려 세션이 분리됨 → 로그인 안 될 수 있음. 필요 시 OTP 6자리 코드 방식으로 전환 검토.

---

## 2026-07-24 · Makefile 추가 + ESLint/Prettier 도입

- 한 일: Treximo 스타일을 참고해 `Makefile` 추가(install/dev/build/test/lint/format/ci/supabase-*/deploy/clean). ESLint 9(flat config, `eslint.config.js`) + Prettier(`.prettierrc.json`) 신규 설치, `npm run lint`/`format`/`format:check` 스크립트 추가. `ci.yml`에 `npm run lint` + `npm run format:check` 단계 추가. `make ci` = lint + format-check + test + build.
- 결정/이유: GitHub Pages 배포는 이미 `deploy.yml`이 main push 시 자동 처리 → `make deploy`는 SSH 없이 `ci` 확인 후 `git push origin main`만 수행. `supabase-deploy`(translate 함수)는 별도 수동 배포 단계라 CI에 없음. `eslint-plugin-react`가 아직 ESLint 10을 지원하지 않아 ESLint는 `^9`로 고정. `react/prop-types`는 이 프로젝트가 순수 JS·prop-types 미사용이라 off. 첫 도입이라 App.jsx에서 실제로 걸린 이슈 3건(미사용 `React`/`lang` import, useEffect 안 동기 `setState`)은 최소 수정으로 정리 — `setReady(false)`를 effect 본문 최상단에서 내부 async IIFE 안으로 이동. 나머지 23개 파일은 전량 `prettier --write`로 포맷 통일(로직 변경 없음).
- 변경 파일: Makefile, package.json, eslint.config.js, .prettierrc.json, .prettierignore, .github/workflows/ci.yml, src/App.jsx, 전체 포맷 대상 23개 파일, docs/MEMORY.md
- 버그: `package-lock.json`이 이전 커밋(0af64d5, Supabase 연동 추가)부터 `package.json`과 어긋나 있어 `npm ci`/`make install`이 clean clone에서 항상 실패했음(루트 dependencies에 `@supabase/supabase-js` 누락). 이번 `npm install`로 lock 재동기화됨 — 커밋 시 함께 포함 필요.

---

## 2026-07-24 · 클라우드 동기화 + 프록시 + 백업 (PLAN-0004)

- 한 일: Supabase 원격 스토어 추가(`remoteStore.js` — load/save 인터페이스 유지, diff로 변경/삭제 행만 upsert/delete). `rows.js`(행↔단어 매핑), `sync.js`(diff), `backup.js`(JSON/CSV export·import + merge), `supabase.js`(클라이언트+매직링크 인증). App은 로그인 시 원격/미로그인·미설정 시 로컬로 graceful 전환. 헤더에 로그인 UI, 단어 화면에 백업 UI. `supabase/schema.sql`(RLS+인덱스), `supabase/functions/translate`(프록시, `--no-verify-jwt`+Origin 허용목록).
- 결정/이유: due/created_at을 epoch ms `bigint`로 저장 → SRS(ms) 그대로, 타임존 버그 없음. 스토어 인터페이스 유지로 App 변경 최소화. anon 키·프록시는 공개라 데이터 보호는 RLS, 프록시 남용은 Origin+입력검증+Haiku/256으로 완화.
- 변경 파일: src/lib/{rows,sync,backup,supabase,remoteStore}.js (+**tests**), src/App.jsx, src/styles.css, supabase/*, docs/{PLANS,SUPABASE}.md, .env.example, package.json. 테스트 55개 그린, 빌드 OK.
- 후속: 오프라인 큐/충돌 해결, 프록시 레이트리밋, 로컬→클라우드 자동 마이그레이션.

---

## 2026-06-27 · AI 자동완성 안전 처리 (PLAN-0003)

- 한 일: `translate.js`에서 Anthropic 직접 호출·API 키 코드 완전 제거. `getEndpoint(env)` / `isAutocompleteAvailable(env)` 추가. `fetchMeanings`는 `endpoint` 파라미터가 없으면 즉시 throw. `App.jsx`는 `isAutocompleteAvailable()` false면 번역·사전 토글과 "뜻 가져오기" 버튼을 숨김.
- 결정/이유: 클라이언트에 API 키 포함 불가(보안). 자동완성은 `VITE_TRANSLATE_ENDPOINT` 환경변수로 프록시가 설정됐을 때만 동작. 프록시 미설정 시 AddWord는 직접입력 전용으로 graceful 동작.
- 변경 파일: src/lib/translate.js, src/lib/**tests**/translate.test.js, src/App.jsx

---

## 2026-06-19 · 저장 영구화 (PLAN-0002)

- 한 일: `storage.js`를 다중 백엔드(localStorage / Capacitor Preferences / memory)로 확장. 웹은 localStorage로 즉시 영속되고, 네이티브는 `resolveBackend()`가 `@capacitor/preferences`로 자동 업그레이드. `App.jsx`가 백엔드를 비동기로 해석한 뒤 로드하도록 변경.
- 결정/이유:
  - `window.storage`는 아티팩트 전용 → 실제 환경 기본은 localStorage. 우선순위 host > localStorage > memory.
  - Preferences는 동적 import(`/* @vite-ignore */`) + 런타임 감지 → 플러그인 미설치 상태에서도 빌드·실행 안전.
  - 백엔드 주입형 유지 → mock으로 테스트(저장 11 케이스, 총 32 통과).
- 변경 파일: src/lib/storage.js, src/App.jsx, src/lib/**tests**/storage.test.js
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

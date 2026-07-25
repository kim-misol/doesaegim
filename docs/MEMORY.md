# 개발 기록 (MEMORY)

프로젝트의 영속 메모리. 결정·변경·후속 작업을 위에서부터 쌓습니다.
형식은 [`WORKFLOW.md`](WORKFLOW.md) 참고.

---

## 2026-07-25 · 렌더링 성능 최적화 (아우로라·리스트 애니메이션·리렌더)

- 증상: "속도가 너무 느려" — 코드 리딩으로 원인 특정(프로파일러 없이 정적 분석).
- 원인 1(가장 큼): `AuroraBg`가 SVG `feGaussianBlur`+`feColorMatrix`+`feBlend` 필터를 4개 도형에 SMIL `<animate>`로 무한 반복 적용 — 모든 화면에서 매 프레임 블러를 재계산(합성 불가, CPU/GPU 부담 큼, 특히 모바일 Safari).
- 원인 2: `.vc-listitem`(단어 목록의 각 행)에 `vc-wobble`(border-radius 애니메이션, 합성 불가·페인트 유발) 무한 반복 — 단어 개수만큼 O(n)으로 상시 리페인트, 목록이 길수록 악화.
- 원인 3: `Today`의 언어 순서(`ord`)를 `useEffect`로 prop과 동기화하던 패턴이 매 순서 변경마다 이중 렌더(커밋 후 effect→재커밋) 유발 — eslint `react-hooks/set-state-in-effect`가 실제로 잡아냄.
- 한 일: (1) `AuroraBg`를 SVG 필터→도형별 독립 `filter: blur()` + `transform`만 애니메이션하는 CSS 블롭 4개로 교체(블러는 컴포지터 레이어에 1회만 래스터라이즈, drift는 GPU 트랜스폼). (2) `.vc-listitem`의 `vc-wobble` 애니메이션 제거(정적 `border-radius`는 `.vc-glass`가 계속 제공). (3) `Today`의 order 동기화를 렌더 중 조건부 setState로 변경(react.dev "adjusting state when a prop changes" 패턴), ref 동기화만 별도 effect로 분리.
- 결정/이유: 시각 디자인(Aurora Glass 룩)은 그대로 유지 — backdrop-filter 반경/투명도 등은 건드리지 않음. 순수하게 "매 프레임 반복되는 비용"만 제거.
- 변경 파일: src/App.jsx(AuroraBg, Today order sync), src/styles.css(.vc-aurora*, .vc-listitem, reduced-motion 셀렉터). 테스트 92개 그린, lint/format 클린, 빌드 OK(JS 172.97→171.31kB, 실질 동일).
- 후속(미착수, 범위 밖이라 보류): 로그인 시 `getSupabase()`를 두 effect가 동시 호출하면 경합으로 한쪽이 null을 받아 KV 백엔드가 로컬로 폴백하는 레이스 발견 — in-flight 프라미스 공유로 고치면 됨. 클라우드 데이터 로딩(단어/통계/순서)도 여전히 로그인 후 여러 번의 순차 네트워크 왕복이라 초기 "불러오는 중" 체감 지연의 원인일 수 있음.

---

## 2026-07-24 · README 최신화 + 배포 빌드 시크릿 누락 발견

- 한 일: README 전면 갱신 — 언어 5개(es/it/de로 교체), Aurora Glass, 오늘 진행률 링, 클라우드 동기화/백업, 63개 테스트, Makefile/lint/format 반영. 완료된 로드맵 항목·중복 설명(토큰 최적화 상세 등)은 정리하고 `docs/SUPABASE.md`/`PROXY.md` 링크로 대체. `package.json` description도 갱신. GitHub Actions API로 최신 커밋(6e54e4e)의 CI·Deploy 워크플로우가 성공했음을 확인, 라이브 사이트(https://kim-misol.github.io/doesaegim/) HTTP 200 확인.
- 발견한 문제: 배포된 번들에 `supabase` 문자열이 0건(로컬 빌드는 2건) — `deploy.yml`이 `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`/`VITE_TRANSLATE_ENDPOINT`를 빌드 시 주입하지 않아 **라이브 사이트에서 클라우드 동기화·AI 자동완성이 조용히 꺼져 있었음**. `deploy.yml`의 build 스텝에 해당 env(`secrets.*`)를 추가했지만, 실제로 켜지려면 저장소 Settings → Secrets and variables → Actions에 세 값을 등록해야 함(사용자 액션 필요).
- 변경 파일: README.md, package.json, .github/workflows/deploy.yml, docs/MEMORY.md

---

## 2026-07-24 · 중복 감지 앱 반영 + iOS Firefox 발음 폴백

- 중복 감지(#1): `dedupe.js`의 `findDuplicates(words, word, srcLang)`(단어+단어언어, 대소문자/공백 무시) 순수 함수+테스트. AddWord에 실시간 경고 카드(저장된 뜻·언어·복습예정) + "그래도 새로 저장"/"저장된 카드 보기"(→list 탭). 중복 시 기본 CTA 비활성.
- iOS Firefox 소리(#2): 원인 = iOS 서드파티 브라우저는 speechSynthesis 미지원(Safari만 됨). `speech.js`에 `speakViaAudio()`(Google translate_tts URL을 Audio로 재생) 폴백 추가; `speak`은 synth 없거나 예외 시 폴백. 첫 탭 언락은 기존 primeSpeech 유지.
- 변경 파일: src/App.jsx, src/styles.css, src/lib/{speech,dedupe}.js(+tests). 총 92 그린, 빌드 OK.
- 참고: translate_tts는 비공식 엔드포인트라 best-effort(구글이 막으면 실패 가능). 확실한 보장은 자체 TTS 프록시(비용/설정) 또는 Safari.

---

## 2026-07-24 · 단어 수정 기능 + 모바일 발화 수정 + 중복 경고 시안

- 단어 수정(#2): WordList에 인라인 편집 추가(연필 아이콘 → word/meaning 입력 + 저장/취소). commit으로 갱신 → 클라우드 동기화. SRS(box/due) 유지.
- 모바일 소리(#3): speech.js `speak`을 견고화 — `synth.resume()`, "재생 중일 때만" cancel(iOS는 무조건 cancel 시 무음), volume=1. `primeSpeech()` 추가 + App에서 첫 탭(pointerdown/touchend)에 언락. fake synth 테스트 3개.
- 중복 경고(#1): 요청대로 HTML 시안만 — design/duplicate-word.html(데스크톱 웹 + 모바일 웹). 입력 중 중복 감지 시 "이미 저장한 단어예요" + 저장된 뜻 카드 + [카드 보기]/[그래도 저장]. (앱 구현은 미착수)
- 변경 파일: src/App.jsx, src/styles.css, src/lib/speech.js(+test), design/duplicate-word.html. 총 87 그린, 빌드 OK.
- 참고: 모바일 무음이 하드웨어 음소거 스위치 때문이면 코드로 못 고침(안내 필요).

---

## 2026-07-24 · 기기 간 설정 동기화 (진행률·언어순서) + 포커스 새로고침

- 증상: 같은 계정 여러 기기에서 단어는 동기화되는데 복습 진행률·언어별 순서가 제각각. 원인: `daily_stats_v1`(진행률 카운터)·`lang_order_v1`(순서)를 device-local localStorage에 저장.
- 한 일: Supabase `kv(user_id,k,value)` 테이블+RLS 추가(라이브 마이그레이션 적용). `kvBackend.js`의 `supabaseKvBackend(client,userId)`가 기존 backend 인터페이스(get/set) 호환 → dailyStats·langOrder 스토어를 코드 변경 없이 클라우드로 사용. App은 로그인 시 KV 백엔드, 미로그인/미설정 시 local로 `[user]`에 따라 재해석·재로드. 추가로 visibilitychange/focus 시 words+prefs 재로드(실시간 구독 없는 대신 기기 간 최신화). 테스트: kvBackend 3개(총 84 그린).
- 결정/이유: 설정은 사용자 단위 → 클라우드. 남은 갯수(dueTotal)는 단어(동기화)에서 파생이라 원래 같아야 하나 stale 문제 → 포커스 새로고침으로 완화. 완전 실시간은 후속(Supabase realtime) 과제.
- 변경 파일: src/App.jsx, src/lib/kvBackend.js(+test), supabase/schema.sql(+라이브 kv). 빌드 OK.

---

## 2026-07-24 · 오늘 진행률 계산 정리 (progress.js)

- 한 일: Today 진행률 계산을 `progress.js`의 `reviewProgress(words, passedToday, now)` 순수 함수로 추출. 공식: `passedToday / (passedToday + dueTotal)`, dueTotal은 현재 due 전부(오늘 추가분 포함), pct 0~100 클램프. 테스트 4개.
- 결정/이유: 사용자 요청 — 오늘 추가 카드도 분모에 포함(링이 뒤로 밀리는 건 허용). 완료 수(passedToday)는 mount 로드·채점 bump에서만 갱신되어 단어 추가로 리셋되지 않음(확인함).
- 변경 파일: src/App.jsx(import·사용), src/lib/progress.js(+test). 총 81 그린, 빌드 OK.

---

## 2026-07-24 · 언어별 복습 순서 드래그 변경

- 한 일: Today 언어 카드에 그립 핸들(⠿) 추가, 포인터 기반 DnD(터치+마우스, 라이브 재정렬)로 순서 변경. 순서는 device-local 저장(`langOrder.js` — normalizeOrder/moveItem/createLangOrderStore). langcard를 button→div(role=button)로 바꾸고 그리드 열 추가(그립). 테스트 7개(정규화·이동) → 총 77 그린.
- 결정/이유: 모바일 우선이라 HTML5 DnD 대신 pointer 이벤트+elementFromPoint. 손잡이 드래그만 재정렬, 본문 탭은 복습 시작(충돌 방지). 순서 저장은 로그인 무관 로컬. 언어 추가/삭제 시 normalizeOrder로 안전.
- 변경 파일: src/App.jsx, src/styles.css, src/lib/langOrder.js(+test). 빌드 OK.

---

## 2026-07-24 · Papago/Naver 바로가기 + 발음 언어 수정

- 한 일: AddWord의 Claude 자동완성(번역/사전 AI)을 제거하고 **Papago 번역 · Naver 사전 바로가기 버튼**으로 교체(`lookup.js` — papagoUrl/naverDictUrl, 새 탭 오픈, API·비용 0). 발음(speech.js) 개선: pickVoice가 지역 정규화(underscore)→정확 매칭→기본언어 폴백→기기 내장(localService) 우선으로 선택하고, `speak`이 선택된 voice의 lang으로 utterance.lang을 맞춤. `hasVoiceFor` 추가. 테스트 lookup 5 + speech 5 (총 70 그린).
- 결정/이유: Papago API는 유료 키+프록시, Naver 사전은 공식 API 없음 → 무료·안정적인 외부 링크 방식 선택(사용자 승인). 발음이 영어로 나던 건 voice 미선택/기기 음성 부재가 원인 → 로직 강화(단, OS에 해당 언어 음성이 없으면 설치 필요).
- 변경 파일: src/App.jsx, src/styles.css, src/lib/lookup.js(+test), src/lib/speech.js(+test). translate.js는 미사용(잔존). 빌드 OK.
- 후속: Naver es/it/de 사전 URL은 샌드박스에서 검증 불가 → 실기기에서 클릭 확인 필요. 자동완성 제거로 Anthropic 비용 0(원하면 ANTHROPIC secret 삭제 가능).

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

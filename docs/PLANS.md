# 기능 계획 로그 (PLANS)

새 항목은 맨 위에 추가합니다. 형식은 [`WORKFLOW.md`](WORKFLOW.md) 참고.

---

## PLAN-0009 · 복습 카드 플립 겹침 버그 수정

- 날짜: 2026-08-13
- 상태: 구현 완료, lint 클린 / 육안 확인 필요
- 목표: 카드를 뒤집으면 단어·뜻이 겹쳐 보이는 버그 수정.
- 원인: Safari/WebKit이 `backdrop-filter`가 있는 요소의 `backface-visibility: hidden`을 무시하는 버그.
- 조치: `.vc-face`에 opacity 기반 강제 숨김(회전 애니메이션 절반 지점에 전환) 추가.
- 건드린 파일: src/styles.css
- 비고: 상세는 docs/MEMORY.md 참고.

---

## PLAN-0008 · 백업·복원 섹션 리디자인

- 날짜: 2026-08-10
- 상태: 구현 완료, lint 클린 / test·build 로컬 확인 필요
- 목표: BackupBar를 BulkAddBar와 일관된 패턴(포맷 세그 토글 + 상태 피드백)으로 정리.
- 인수 조건:
  - [x] Excel/JSON 세그 토글, CSV는 하단 링크
  - [x] 백업/불러오기 버튼에 상태 피드백(받았어요 ✓ / 불러오는 중… / N개 추가 완료 ✓)
- 건드린 파일: src/App.jsx, src/styles.css
- 비고: 시안은 design/backup-redesign-v2.html, A안 채택.

---

## PLAN-0007 · 간격 수정 + 포맷 파일 다운로드 (PLAN-0006 후속)

- 날짜: 2026-08-10
- 상태: 구현 완료, lint 클린 / test·build 로컬 확인 필요
- 목표: 카드 저장 버튼과 BulkAddBar 간격 정리 + 포맷 파일(json/엑셀)을 받아 단어만 채워 올리는 흐름.
- 인수 조건:
  - [x] `.vc-bk` 간격 수정
  - [x] 시안 3개(design/bulk-add-ui.html) 중 A안으로 포맷 다운로드 + 업로드 UI 구현
- 건드린 파일: src/App.jsx, src/styles.css, design/bulk-add-ui.html
- 비고: 상세는 docs/plan_단어일괄추가.md의 "추가 반영" 참고.

---

## PLAN-0006 · 단어 추가 화면 파일 일괄 추가

- 날짜: 2026-08-10
- 상태: 구현 완료, lint 클린 / test·build 로컬 확인 필요
- 목표: srcLang/tgtLang/word/meaning 컬럼의 JSON·xlsx 파일을 올리면 단어 추가 화면에서 바로 기존 단어장에 추가.
- 인수 조건:
  - [x] AddWord 화면에 `BulkAddBar`(파일 선택 → 추가)
  - [x] JSON/xlsx 자동 판별, 기존 backup.js 함수 재사용(새 lib 로직 없음)
  - [ ] 로컬 `npm test`/`npm run build` 확인
- 건드린 파일: src/App.jsx
- 비고: 상세는 docs/plan_단어일괄추가.md.

---

## PLAN-0005 · 백업/복원 엑셀(.xlsx) 지원

- 날짜: 2026-08-10
- 상태: 구현 완료 / 로컬 테스트·빌드 확인 필요 (샌드박스 환경 제약, 상세는 docs/plan_엑셀백업.md)
- 목표: JSON뿐 아니라 실제 .xlsx 파일로도 백업 내보내기·불러오기가 가능하게 한다.
- 인수 조건:
  - [x] `wordsToXLSX`/`wordsFromXLSX` (SheetJS `xlsx`) + 라운드트립 테스트
  - [x] BackupBar에 엑셀 백업 버튼, 불러오기가 `.xlsx`/`.json` 확장자 분기
  - [ ] 로컬 `npm install` + `npm test`/`npm run build` 통과 (사용자 확인)
- 건드린 파일: package.json, src/lib/backup.js, src/lib/**tests**/backup.test.js, src/App.jsx
- 비고: 상세 설계·TODO는 `docs/plan_엑셀백업.md` 참고.

---

## PLAN-0004 · 클라우드 동기화 + 번역 프록시 + 백업 (실사용화)

- 날짜: 2026-07-24
- 상태: done (코드·테스트·빌드 완료 / Supabase 프로젝트 셋업은 docs/SUPABASE.md 참고)
- 목표: localStorage 단일 blob의 소실·비동기화 리스크를 없애고, 여러 기기에서 같은 데이터·서버 백업으로 실사용 가능하게 만든다. 번역 프록시를 실제로 붙이고 남용을 막는다.
- 방향:
  - 저장: Supabase(Postgres + Auth + RLS). 로그인 시 원격 스토어, 미로그인·미설정 시 기존 로컬 스토어로 graceful fallback. 스토어 인터페이스 `load()/save(words)` 유지 → App 변경 최소화.
  - due/created_at은 epoch ms를 `bigint`로 저장 → SRS 로직(ms) 그대로, 타임존 버그 없음.
  - 프록시: Supabase Edge Function `translate` — JWT 검증(로그인 사용자만) + 입력 검증 → 크레딧 남용 차단. translate.js 계약(body/`{t:[{m,n}]}`)과 호환.
  - 백업: 순수 함수로 JSON/CSV export·import.
- 인수 조건:
  - [x] 로그인 후 카드가 Supabase에 행 단위로 동기화(upsert/삭제 diff) — remoteStore + 테스트
  - [x] RLS로 본인 데이터만 접근 — schema.sql 정책
  - [x] 미설정/미로그인 시 기존 로컬 저장 그대로 동작 — App 스토어 분기
  - [x] JSON/CSV 내보내기·가져오기 — backup.js + BackupBar
  - [x] 프록시 남용 완화 — Origin 허용목록 + 입력검증(계약상 클라 무변경 위해 --no-verify-jwt)
- 건드릴 파일: src/lib/rows.js, sync.js, backup.js, supabase.js, remoteStore.js, auth.js (+ **tests**), src/App.jsx, supabase/schema.sql, supabase/functions/translate/index.ts, docs/*, .env.example, package.json
- 테스트(먼저): 행↔단어 매핑 · diff(신규/변경/삭제) · JSON/CSV 왕복 · fake client로 원격 save의 upsert/delete 호출

---

## PLAN-0003 · AI 자동완성 안전 처리

- 날짜: 2026-06-27
- 상태: done

방향: 기본은 직접입력 전용. 자동완성은 "프록시 엔드포인트가 설정됐을 때만" 동작.
클라이언트에서 api.anthropic.com 직접 호출과 API 키 사용은 완전히 제거한다(키 노출 방지).

설계:

- src/lib/translate.js
  - getEndpoint(env): VITE_TRANSLATE_ENDPOINT 값 반환(없으면 null). 테스트 위해 env 주입 가능하게.
  - isAutocompleteAvailable(env): 엔드포인트 있으면 true.
  - fetchMeanings(word, src, tgt, mode, { fetchImpl, cache, endpoint }): endpoint로 POST.
    응답은 {t:[{m,n}]} 와 {translations:[{meaning,note}]} 둘 다 파싱(기존 parseResponse 재사용).
    endpoint 없으면 에러 throw. 캐시는 유지.
  - 기존 anthropic 모델/직접호출/키 관련 코드는 삭제.
- src/App.jsx (AddWord): isAutocompleteAvailable()가 false면 번역/사전 토글과 "뜻 가져오기" 버튼을 숨기고 직접입력만 노출. true면 기존 UI 유지.

테스트(mock 먼저 → 통과):

- isAutocompleteAvailable: env 있음→true, 없음→false
- fetchMeanings: endpoint+mock fetch로 파싱·캐시 동작 / endpoint 없으면 throw
- parseResponse: 두 응답 형태 모두 파싱

마무리: 반복 중엔 `npx vitest run src/lib/__tests__/translate.test.js`, 마지막에 `npm test`+`npm run build`.
docs/MEMORY.md 1~~3줄 기록, 커밋 메시지만 제안(Refs: PLAN-0003).
먼저 plan 3~~5줄 보여주고 진행해.

## PLAN-0002 · 저장 영구화 (localStorage + Capacitor)

- 날짜: 2026-06-19
- 상태: done
- 목표: 앱을 껐다 켜도 단어가 유지되도록 실제 영속 저장을 붙인다.
- 인수 조건:
  - [x] 웹(dev/Pages)에서 새로고침 후에도 단어 유지 (localStorage)
  - [x] 백엔드 선택 우선순위: window.storage(아티팩트) > localStorage > memory
  - [x] Capacitor 네이티브에서 @capacitor/preferences로 자동 업그레이드 (resolveBackend)
  - [x] 손상된 JSON / 비배열 값에도 안전
- 건드린 파일: src/lib/storage.js, src/App.jsx, src/lib/**tests**/storage.test.js
- 테스트(먼저 작성): localStorage 영속 · Preferences 라운드트립(mock) · 백엔드 우선순위 · 손상 복구
- 비고: Preferences는 동적 import(/* @vite-ignore */)라 미설치 상태에서도 빌드·실행이 안전.

---

## PLAN-0001 · 프로젝트 부트스트랩

- 날짜: 2026-06-19
- 상태: done
- 목표: 플래시카드 앱을 테스트 가능한 GitHub 프로젝트로 구성한다.
- 인수 조건:
  - [x] 단어/뜻 저장(단어 언어·뜻 언어 선택)
  - [x] 언어별 + 양방향 복습, 3D 플립, 기억 여부로 간격 반복
  - [x] ko/en/fr 발음
  - [x] AI 뜻 자동완성(번역/사전) — Claude Haiku, 캐시
  - [x] 영속 저장, 다크 Liquid Glass UI
  - [x] Vitest 단위 테스트 + CI + Pages 배포
- 건드린 파일: 전체 스캐폴드(src/lib/_, src/App.jsx, docs/_, .github/*)
- 테스트: srs / storage / translate / speech (25 cases)
- 비고: 브라우저 제약으로 Google/Naver 직접 호출 불가 → Claude로 구현, 교체 지점은 translate.js.

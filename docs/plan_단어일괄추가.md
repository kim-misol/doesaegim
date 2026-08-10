# plan_단어일괄추가 (PLAN-0006)

- 날짜: 2026-08-10
- 상태: 구현 완료, lint 클린 / test·build는 로컬 확인 필요

## 요구사항

- 단어 추가(AddWord) 화면에 "파일로 여러 개 추가" 기능.
- 파일 컬럼: `srcLang, tgtLang, word, meaning`.
- 파일 포맷: JSON 또는 엑셀(.xlsx) 둘 다 지원(확장자로 자동 판별, 기존 백업·복원 불러오기와 동일 방식).
- 업로드하면 기존 단어장에 **추가**(덮어쓰기 아님).

## 기존 코드 기준점

- `src/lib/backup.js`: `wordsFromJSON`, `wordsFromXLSX`, `mergeWords` — 이미 srcLang/tgtLang/word/meaning만 있는 데이터도 `normalizeWord`가 id/box/due/createdAt을 자동으로 채움. `mergeWords`는 id 기준 병합이라, id 없는 새 항목은 항상 "추가"로 동작(덮어쓰기 없음). **새 로직 불필요, 그대로 재사용.**
- `src/App.jsx`
  - `BackupBar`(라인 ~1101)의 `onImport`가 이미 이 패턴(확장자 분기 파싱 + `commit(mergeWords)`)을 구현해둠 — 동일 패턴을 AddWord용으로 재사용.
  - `AddWord`(라인 719~868): `onSave`, `words`, `onViewList` prop만 받음. `commit`은 App 루트(라인 390 호출부)에서 갖고 있음 → prop으로 내려줘야 함.
  - `.vc-bk*` CSS(백업 섹션과 동일 스타일)를 재사용해 새 CSS 불필요.

## 설계

- `src/App.jsx`
  - `AddWord` 호출부(라인 389-393)에 `commit={commit}` prop 추가.
  - `AddWord` 시그니처에 `commit` prop 추가.
  - 새 하위 컴포넌트 `BulkAddBar({ commit })`: `BackupBar`와 같은 `.vc-bk` 접이식 UI, 내용은 설명 문구 + 파일 input(`accept=".json,.xlsx,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"`) 하나만.
    - `onChange`: 확장자로 `wordsFromXLSX`(ArrayBuffer) 또는 `wordsFromJSON`(text) 분기 → `commit((prev) => mergeWords(prev, imported))` → 성공 시 "N개 단어 추가됨" 트랜지언트 메시지, 실패 시 `alert(err.message)`(BackupBar와 동일 패턴).
  - `AddWord` return 안, 카드 저장 폼 위나 아래에 `<BulkAddBar commit={commit} />` 배치.

## TODO

- [x] `App.jsx`: `commit` prop 전달 (호출부 + AddWord 시그니처)
- [x] `BulkAddBar` 컴포넌트 구현 (JSON/XLSX 자동 분기, mergeWords로 추가)
- [x] AddWord 화면에 배치
- [x] `npm run lint` — 클린. `npm test`/`npm run build`는 이 샌드박스 환경 제약(PLAN-0005와 동일 원인)으로 미실행 — 로컬 확인 필요
- [x] `docs/MEMORY.md` 기록
- [x] 커밋 메시지 제안 (Refs: PLAN-0006)

---

## 추가 반영 (PLAN-0007) · 간격 수정 + 포맷 파일 다운로드

- 요구사항: (1) "카드 저장" 버튼과 BulkAddBar UI 간격, (2) 포맷 파일(json/엑셀)을 다운받아 단어만 채워서 올리는 흐름.
- 시안: `design/bulk-add-ui.html`에 A/B/C 3안 제작 → 사용자가 **A(나란히 2버튼)** 선택.
- 구현:
  - `.vc-bk`에 `margin-top: 18px` (간격 수정)
  - `BulkAddBar`: JSON/Excel `.vc-seg` 토글 + "📄 포맷 파일 받기"/"⬆ 파일 올리기" 2버튼
  - 포맷 파일 = 현재 AddWord의 srcLang/tgtLang을 채운 예시 1행(`word: "example"`)을 `wordsToJSON`/`wordsToXLSX`로 생성(새 lib 로직 없음)
  - `download` 헬퍼를 `BackupBar`에서 모듈 스코프로 추출해 공유
- TODO:
  - [x] `.vc-bk` margin-top
  - [x] `vc-seg` CSS 추가
  - [x] `BulkAddBar` A안 적용, `download` 공유화
  - [x] `npm run lint` 클린
  - [ ] 로컬 `npm test`/`npm run build` 확인
  - [x] `docs/MEMORY.md` 기록

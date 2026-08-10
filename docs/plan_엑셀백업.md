# plan_엑셀백업 (PLAN-0005)

- 날짜: 2026-08-10
- 상태: 구현 완료, 테스트 검증은 사용자 로컬 확인 필요 (아래 "검증 한계" 참고)

## 요구사항

- 백업/복원(BackupBar)에서 JSON 외에 **엑셀(.xlsx)** 로도 내보내기·불러오기 가능해야 한다.
- 기존 JSON 백업, CSV 내보내기는 그대로 유지.
- 사용자 확인: 내보내기+불러오기 모두 지원 / SheetJS `xlsx` npm 패키지 신규 의존성 설치 승인됨.

## 기존 코드 기준점

- `src/lib/backup.js`
  - `wordsToJSON` / `wordsFromJSON` — JSON 직렬화·역직렬화, `normalizeWord`로 검증.
  - `wordsToCSV` / `wordsFromCSV` / `parseCSV` — CSV_COLS 기준 문자열 CSV. `wordsFromCSV`는 `parseCSV`로 얻은 rows를 header 인덱스 매핑 후 `normalizeWord` 적용.
  - `mergeWords` — id 기준 병합, newest-first 정렬.
  - `normalizeWord`는 파일 내부에만 있고 export 안 됨.
- `src/App.jsx` `BackupBar` (라인 ~1097-1179)
  - `download(name, text, type)` — Blob→a.click, 텍스트 전용(바이너리 미고려).
  - `onImport` — FileReader.readAsText → `wordsFromJSON`만 사용. `<input accept=".json,application/json">`.
  - 버튼: "⬇ 내 단어 백업"(JSON), "⬆ 불러오기"(JSON만), "엑셀용 CSV로 내보내기"(CSV, 편도).
- 테스트: `src/lib/__tests__/backup.test.js` — JSON/CSV 라운드트립, mergeWords.

## 설계

- 의존성: `xlsx`(SheetJS) 추가. 브라우저 번들에 포함(클라이언트 전용, 프록시 불필요).
- `src/lib/backup.js`
  - `parseCSV` 이후 공통으로 쓰던 "rows(array of array) → words" 매핑 로직을 `rowsToWords(rows)`로 추출, `wordsFromCSV`와 `wordsFromXLSX`가 공유.
  - `wordsToXLSX(words)`: `XLSX.utils.aoa_to_sheet([CSV_COLS, ...rows])` → workbook 생성 → `XLSX.write(wb, {type:"array", bookType:"xlsx"})`로 `ArrayBuffer` 반환(바이너리, 텍스트 아님).
  - `wordsFromXLSX(arrayBuffer)`: `XLSX.read(data, {type:"array"})` → 첫 시트 → `XLSX.utils.sheet_to_json(sheet, {header:1, raw:false})`로 rows 추출 → `rowsToWords(rows)`.
- `src/App.jsx` `BackupBar`
  - `download` 함수를 텍스트/바이너리(Blob source) 겸용으로 소폭 확장(이미 `new Blob([text|arrayBuffer], {type})` 형태라 인자만 바뀌면 그대로 동작).
  - 새 버튼 "⬇ 엑셀(.xlsx) 백업" → `wordsToXLSX(words)` 결과를 `doesaegim.xlsx`로 다운로드.
  - `onImport`: 파일 확장자로 분기 — `.xlsx`는 `readAsArrayBuffer`+`wordsFromXLSX`, 그 외(`.json` 등 기존)는 `readAsText`+`wordsFromJSON`. `<input accept>`에 `.xlsx` 추가.

## TODO

- [x] `npm install xlsx` — **불가**: 이 작업환경(샌드박스)이 npm 레지스트리/CDN을 전부 allowlist로 차단(403 blocked-by-allowlist). `package.json`에 `"xlsx": "^0.18.5"`만 추가, 실제 설치는 사용자가 로컬에서 진행.
- [x] `backup.js`: `rowsToWords` 추출(리팩터, 기존 CSV 동작 불변)
- [x] `backup.test.js`에 xlsx 라운드트립 테스트 작성
- [x] `wordsToXLSX` / `wordsFromXLSX` 구현
- [x] `App.jsx` BackupBar: 엑셀 백업 버튼 + 확장자 분기 불러오기
- [x] `npm run lint` — 클린
- [ ] `npm test` — **미실행**: 이 샌드박스의 `node_modules`가 macOS(darwin-arm64)용이라 Linux 샌드박스에서 vitest/rollup 네이티브 바이너리를 못 찾아 아예 기동 불가(이 기능과 무관한 기존 환경 문제). 사용자가 로컬에서 `npm install` 후 확인 필요.
- [ ] `npm run build` — 같은 이유로 미실행, 로컬 확인 필요.
- [x] `docs/MEMORY.md` 기록
- [x] 커밋 메시지 제안 (Refs: PLAN-0005)

## 검증 한계 (사용자 확인 필요)

1. 로컬에서 `npm install` 실행 (package.json에 xlsx 추가됨).
2. `npm test` — 특히 "XLSX backup" describe 블록 2케이스(라운드트립, srs 필드 보존) 통과 확인.
3. `npm run build` 통과 확인.
4. 브라우저에서 실제로 "엑셀(.xlsx)로 백업" 다운로드 → 엑셀에서 열어 한글 깨짐 없는지, "불러오기"로 그 .xlsx 파일을 다시 업로드했을 때 카드가 정상 복원되는지 수동 확인.

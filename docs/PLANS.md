# 기능 계획 로그 (PLANS)

새 항목은 맨 위에 추가합니다. 형식은 [`WORKFLOW.md`](WORKFLOW.md) 참고.

---

## PLAN-0002 · 저장 영구화 (localStorage + Capacitor)
- 날짜: 2026-06-19
- 상태: done
- 목표: 앱을 껐다 켜도 단어가 유지되도록 실제 영속 저장을 붙인다.
- 인수 조건:
  - [x] 웹(dev/Pages)에서 새로고침 후에도 단어 유지 (localStorage)
  - [x] 백엔드 선택 우선순위: window.storage(아티팩트) > localStorage > memory
  - [x] Capacitor 네이티브에서 @capacitor/preferences로 자동 업그레이드 (resolveBackend)
  - [x] 손상된 JSON / 비배열 값에도 안전
- 건드린 파일: src/lib/storage.js, src/App.jsx, src/lib/__tests__/storage.test.js
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
- 건드린 파일: 전체 스캐폴드(src/lib/*, src/App.jsx, docs/*, .github/*)
- 테스트: srs / storage / translate / speech (25 cases)
- 비고: 브라우저 제약으로 Google/Naver 직접 호출 불가 → Claude로 구현, 교체 지점은 translate.js.

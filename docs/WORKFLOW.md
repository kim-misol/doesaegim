# 개발 워크플로우

새 기능은 항상 같은 **6단계 루프**로 추가합니다. 사용자가 원하는 기능을 한 줄로 입력하면,
Claude(또는 작업자)는 아래 순서대로 진행합니다. 마지막 커밋은 사용자가 직접 작성합니다.

```
① 기능 입력  →  ② 계획(PLANS.md 저장)  →  ③ 실패하는 테스트(mock)
            →  ④ 구현(테스트 통과)  →  ⑤ 기록(MEMORY.md)  →  ⑥ 커밋 메시지 제안
```

---

## ① 기능 입력

사용자가 원하는 것을 한 줄로 적습니다. 예) "카드에 예문 필드를 추가하고 싶어".

## ② 계획 → `docs/PLANS.md`에 저장

먼저 **계획을 보여주고**, 승인되면 아래 형식으로 `docs/PLANS.md` 맨 위에 항목을 추가합니다.

```md
## PLAN-XXXX · <기능 이름>
- 날짜: YYYY-MM-DD
- 상태: planned | in-progress | done
- 목표: 사용자가 얻는 가치 한 문장
- 인수 조건(Acceptance):
  - [ ] 관찰 가능한 결과 1
  - [ ] 관찰 가능한 결과 2
- 건드릴 파일: src/lib/..., src/App.jsx, ...
- 테스트 케이스(먼저 작성):
  - 케이스 1
  - 케이스 2
- 비고/리스크:
```

번호 `PLAN-XXXX`는 4자리 일련번호(0001부터).

## ③ 실패하는 테스트 먼저 (RED)

- 로직은 `src/lib/<name>.js`의 **순수 함수**로 설계하고, `src/lib/__tests__/<name>.test.js`에 테스트 추가.
- 외부 의존성(`fetch`, `window.storage`, `speechSynthesis`)은 **주입(injection)** 으로 받아 **mock 데이터**로 검증.
- `npm run test:watch`로 빨간불을 먼저 확인.

## ④ 구현 (GREEN → REFACTOR)

- 테스트를 통과시키는 **최소 구현** → 통과 후 정리.
- UI 연결은 `src/App.jsx`에서 lib 함수를 호출하는 식으로만(로직을 컴포넌트에 넣지 않기).
- `npm test`로 전체 그린 확인.

## ⑤ 기록 → `docs/MEMORY.md`

작업이 끝나면 `docs/MEMORY.md` 맨 위에 한 항목을 추가합니다(프로젝트의 "기억").

```md
## YYYY-MM-DD · <기능 이름> (PLAN-XXXX)
- 한 일: ...
- 결정/이유: ...
- 추가/변경 파일: ...
- 후속 작업: ...
```

> Claude.ai의 메모리 기능이 켜져 있지 않아도, 이 파일이 저장소의 영속 메모리 역할을 합니다.

## ⑥ 커밋 메시지 제안 (사용자가 직접 커밋)

Claude는 **커밋하지 않고 메시지만 제안**합니다. 사용자가 복사해 직접 `git commit`.

---

## 커밋 메시지 컨벤션 (Conventional Commits)

```
<type>(<scope>): <한 줄 요약, 명령형, 72자 이내>

<본문: 왜/무엇을 바꿨는지. 필요 시>

Refs: PLAN-XXXX
```

**type**: `feat` 기능 · `fix` 버그 · `test` 테스트 · `refactor` 리팩터 · `docs` 문서 · `chore` 잡일 · `style` 포맷 · `perf` 성능
**scope**(선택): `srs`, `storage`, `translate`, `speech`, `ui`, `review`, `add` 등

예시:

```
feat(add): add example sentence field to cards

저장 시 예문을 함께 보관하고 복습 카드 뒷면에 표시한다.
createWord 시그니처에 example을 추가하고 기존 데이터는 빈 값으로 마이그레이션.

Refs: PLAN-0002
```

작은 단위로 자주 커밋하고, 한 커밋은 한 가지 일만 담습니다.

# 되새김 (doesaegim)

한국어 · English · Español · Italiano · Deutsch 단어를 **플래시카드 + 간격 반복(spaced repetition)** 으로 외우는 미니멀 앱.
Aurora Glass(리퀴드 글래스) 무드의 다크 UI.

> 단어를 저장할 때 "어떤 언어의 단어를 / 어떤 언어의 뜻으로" 저장할지 고르고,
> 복습할 때 그 언어 카드를 보여준 뒤 뒤집어 기억 여부를 체크하면 다음 복습일이 자동으로 정해집니다.

---

## 데모

- **라이브**: https://kim-misol.github.io/doesaegim/
- 로컬에서 보기: `npm install && npm run dev` → `http://localhost:5173`

화면 흐름: `오늘`(남은 복습 수 + 진행률 링 + 언어별 시작) · `추가`(단어/뜻 저장 + AI 자동완성 + 발음) · `단어`(목록/필터/삭제/백업).

---

## 기능

- **5개 언어**: 한국어 · English · Español · Italiano · Deutsch. 단어 언어와 뜻 언어를 각각 선택(같은 언어 선택 시 자동 보정).
- **양방향 복습**: `단어 → 뜻` / `뜻 → 단어` 토글, 3D 플립 카드.
- **간격 반복(Leitner)**: `기억했어요`면 다음 칸으로, `못 외웠어요`면 오늘 다시.
- **오늘의 진행률**: 남은 복습 수 + 진행률 링으로 하루 진도를 한눈에.
- **발음 듣기**: Web Speech API로 5개 언어 발음.
- **AI 뜻 자동완성**: `번역` / `사전` 모드 (Claude Haiku, 서버리스 프록시 경유 — 클라이언트에 API 키 없음).
- **클라우드 동기화(선택)**: 로그인하면 Supabase에 기기 간 동기화, 미로그인 시 로컬(localStorage) 전용.
- **백업**: JSON/CSV 내보내기·가져오기(병합).
- **iOS**: Capacitor로 네이티브 셸 빌드 가능.

### 간격 반복 규칙

| box               | 0   | 1   | 2   | 3   | 4   | 5   |
| ----------------- | --- | --- | --- | --- | --- | --- |
| 다음 복습까지(일) | 0   | 1   | 3   | 7   | 14  | 30  |

`기억했어요` → `box = min(box+1, 5)`, `due = now + INTERVALS[box]`.
`못 외웠어요` → `box = 0`, 오늘 큐 맨 뒤로 재투입. (`src/lib/srs.js`)

---

## 기술 스택

- **React 18** + **Vite 5**, **Vitest**(단위 테스트, jsdom)
- **Supabase**(Postgres + Auth + Edge Functions) — 클라우드 동기화 & 번역 프록시
- **Capacitor**(iOS 네이티브 셸)
- 외부 UI 라이브러리 없음 — 순수 CSS(`src/styles.css`)
- 번역 자동완성: **Claude Haiku**(Anthropic Messages API, Supabase Edge Function 뒤에 숨김)

---

## 시작하기

```bash
npm install
npm run dev          # 개발 서버
npm test             # 테스트 1회 실행
npm run lint          # ESLint
npm run format        # Prettier 적용
npm run build         # dist/ 정적 빌드
```

또는 `make help`로 동일한 명령을 확인할 수 있습니다(`Makefile` 참고).

클라우드 동기화/AI 자동완성을 쓰려면 `.env.example`을 참고해 `.env`를 채우세요(선택 사항 — 없어도 로컬 전용으로 정상 동작).

---

## 프로젝트 구조

```
doesaegim/
├─ src/
│  ├─ App.jsx             # UI (lib만 import, 로직 없음)
│  ├─ styles.css
│  └─ lib/                # 순수 로직 (테스트 대상)
│     ├─ languages.js     # 언어 메타
│     ├─ srs.js           # 간격 반복
│     ├─ dailyStats.js    # 오늘 진행률 카운터
│     ├─ storage.js       # 로컬 영속 저장(백엔드 주입형)
│     ├─ remoteStore.js   # Supabase 원격 저장
│     ├─ rows.js / sync.js # 로컬↔원격 행 매핑/diff
│     ├─ backup.js        # JSON/CSV 백업
│     ├─ supabase.js      # 클라이언트 + 인증
│     ├─ speech.js        # 발음(보이스 선택)
│     ├─ translate.js     # AI 자동완성(+캐시)
│     └─ __tests__/       # *.test.js
├─ supabase/              # schema.sql, functions/translate (Edge Function)
├─ docs/                  # WORKFLOW / PLANS / MEMORY / SUPABASE / PROXY
└─ .github/workflows/     # ci.yml(lint+format+test+build) · deploy.yml(Pages)
```

핵심 원칙: **로직은 `src/lib`의 순수 함수에**, **`App.jsx`는 그리기만**.

---

## 클라우드 동기화 & 번역 프록시

둘 다 선택 사항이며, 필요한 환경변수가 없으면 앱은 로컬 전용으로 그대로 동작합니다.

- 셋업: [`docs/SUPABASE.md`](docs/SUPABASE.md), [`docs/PROXY.md`](docs/PROXY.md)
- GitHub Pages(배포본)에서 켜려면 저장소 **Settings → Secrets and variables → Actions**에
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` / `VITE_TRANSLATE_ENDPOINT`를 등록하세요
  (`deploy.yml`이 빌드 시 주입합니다).

---

## 개발 워크플로우

기능 단위 루프: **계획**(`docs/PLANS.md`) → **실패 테스트** → **구현** → **기록**(`docs/MEMORY.md`) → **커밋 메시지 제안**.
자세한 규칙은 [`docs/WORKFLOW.md`](docs/WORKFLOW.md) 참고.

---

## 테스트

```bash
npm test
```

`src/lib/__tests__/`에 63개 단위 테스트가 있습니다. 새 기능은 테스트를 먼저 추가하세요.

---

## 배포 (GitHub Pages)

1. 저장소 **Settings → Pages → Build and deployment → Source: GitHub Actions**
2. `main`에 push → `deploy.yml`이 빌드 후 Pages에 게시
3. `vite.config.js`의 `base: "./"` 덕분에 어떤 하위 경로에서도 정적 자산이 정상 로드됩니다.

---

## 라이선스

MIT — [`LICENSE`](LICENSE) 참고.

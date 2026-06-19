# 되새김 (doesaegim)

한국어 · 영어 · 프랑스어 단어를 **플래시카드 + 간격 반복(spaced repetition)** 으로 외우는 미니멀 다크 웹앱.
2026 Apple Design Award 수상작(Moonlitt, Tide Guide 등)의 절제된 다크 / Liquid Glass 무드를 참고했습니다.

> 단어를 저장할 때 "어떤 언어의 단어를 / 어떤 언어의 뜻으로" 저장할지 고르고,
> 복습할 때 그 언어 카드를 보여준 뒤 뒤집어 기억 여부를 체크하면 다음 복습일이 자동으로 정해집니다.

---

## 데모

빌드된 정적 사이트라 GitHub Pages로 바로 배포됩니다.

- 로컬에서 보기: `npm install && npm run dev` → `http://localhost:5173`
- 라이브 데모: `https://<your-username>.github.io/doesaegim/`
  (저장소 **Settings → Pages → Source: GitHub Actions** 한 번 켜고 `main`에 push하면 `.github/workflows/deploy.yml`이 자동 배포)

화면 흐름: `오늘`(복습 대기 수 + 언어별 시작) · `추가`(단어/뜻 저장 + AI 자동완성 + 발음) · `단어`(목록/필터/삭제).

---

## 기능

- **3개 언어**: 한국어 · English · Français. 단어 언어와 뜻 언어를 각각 선택(같은 언어 선택 시 자동 보정).
- **양방향 복습**: 복습 중 `단어 → 뜻` / `뜻 → 단어` 토글. 카드를 탭하면 3D 플립.
- **간격 반복(Leitner)**: `기억했어요`면 다음 칸으로 올라가 더 멀리, `못 외웠어요`면 오늘 다시.
- **발음 듣기**: 저장·복습·목록 어디서든 Web Speech API로 ko/en/fr 발음.
- **AI 뜻 자동완성**: `번역`(자연스러운 번역) / `사전`(여러 뜻풀이) 모드. 받아온 뜻을 그대로 쓰거나 직접 수정.
- **로컬 영속 저장**: 호스트의 `window.storage`(있을 때) 또는 인메모리 폴백.

### 간격 반복 규칙

| box | 0 | 1 | 2 | 3 | 4 | 5 |
|-----|---|---|---|---|---|---|
| 다음 복습까지(일) | 0 | 1 | 3 | 7 | 14 | 30 |

`기억했어요` → `box = min(box+1, 5)` 로 올라가고 `due = now + INTERVALS[box]`.
`못 외웠어요` → `box = 0`, 오늘 큐 맨 뒤로 재투입. (`src/lib/srs.js`)

---

## 기술 스택

- **React 18** + **Vite 5** (빌드/dev 서버)
- **Vitest** (단위 테스트, jsdom 환경)
- 외부 UI 라이브러리 없음 — 순수 CSS(`src/styles.css`)
- 번역 자동완성: **Claude Haiku** (Anthropic Messages API)

---

## 시작하기

```bash
npm install
npm run dev        # 개발 서버
npm test           # 테스트 1회 실행
npm run test:watch # 변경 감지 모드 (TDD)
npm run build      # dist/ 정적 빌드
npm run preview    # 빌드 결과 미리보기
```

---

## 프로젝트 구조

```
doesaegim/
├─ index.html
├─ src/
│  ├─ main.jsx            # 진입점
│  ├─ App.jsx             # UI (lib만 import, 로직 없음)
│  ├─ styles.css
│  └─ lib/                # 순수 로직 (테스트 대상)
│     ├─ languages.js     # 언어 메타
│     ├─ srs.js           # 간격 반복
│     ├─ storage.js       # 영속 저장(백엔드 주입형)
│     ├─ speech.js        # 발음(보이스 선택)
│     ├─ translate.js     # Claude 자동완성(+캐시)
│     └─ __tests__/       # *.test.js
├─ docs/
│  ├─ WORKFLOW.md         # 기능 추가 루틴(plan→test→impl→memory→commit)
│  ├─ PLANS.md            # 기능별 계획 로그
│  └─ MEMORY.md           # 개발 기록(결정/변경 이력)
└─ .github/workflows/     # ci.yml(테스트) · deploy.yml(Pages)
```

핵심 원칙: **로직은 `src/lib`의 순수 함수에**, **`App.jsx`는 그리기만**. 그래서 테스트가 쉽고 토큰이 적게 듭니다.

---

## Claude 연동 & 토큰 최적화

자동완성은 `src/lib/translate.js`의 `fetchMeanings()` 하나로 모입니다. 토큰을 아끼는 장치:

1. **Haiku 모델** — 번역은 가벼운 작업이라 가장 저렴한 모델을 사용.
2. **`max_tokens` 256** 으로 출력 상한을 낮게.
3. **짧은 프롬프트 + 짧은 JSON 키**(`{"t":[{"m","n"}]}`)로 입·출력 토큰 절감.
4. **캐시** — `mode|src|tgt|word` 키로 메모이즈. 같은 단어 재조회는 **0 토큰**.
5. **명시적 호출만** — 타이핑마다가 아니라 `뜻 가져오기` 버튼을 눌렀을 때만 요청.

> **참고**: 브라우저(아티팩트/정적 사이트)에서는 CORS·API 키 문제로 Google 번역기·Naver 사전을
> 직접 호출할 수 없어 Claude로 구현했습니다. 실제 Google/Naver로 바꾸려면 `fetchMeanings()`의 본문만
> `[{ meaning, note }]` 를 돌려주는 백엔드 호출로 교체하면 됩니다(나머지 UI는 그대로).

---

## 개발 워크플로우 (TDD)

이 저장소는 **기능 단위 루프**로 키워갑니다. 한 줄 요약:

> 기능 입력 → **계획**(`docs/PLANS.md` 저장) → **실패 테스트**(mock) → **구현** → **기록**(`docs/MEMORY.md`) → **커밋 메시지 제안**

자세한 규칙과 커밋 컨벤션은 [`docs/WORKFLOW.md`](docs/WORKFLOW.md) 참고.

---

## 테스트

```bash
npm test
```

`src/lib/__tests__/`에 25개 단위 테스트(간격 반복·저장·번역 파싱/캐시·보이스 선택)가 있습니다.
새 기능은 **테스트를 먼저** 추가하세요(레드 → 그린 → 리팩터).

---

## 배포 (GitHub Pages)

1. 저장소 **Settings → Pages → Build and deployment → Source: GitHub Actions**
2. `main`에 push → `deploy.yml`이 빌드 후 Pages에 게시
3. `vite.config.js`의 `base: "./"` 덕분에 어떤 하위 경로에서도 정적 자산이 정상 로드됩니다.

---

## 로드맵 (예시)

- [ ] 예문 / 이미지 필드
- [ ] CSV 가져오기·내보내기
- [ ] 연속 학습일(streak) & 통계
- [ ] 카드 편집
- [ ] 실제 사전 API(백엔드) 연동

---

## 라이선스

MIT — [`LICENSE`](LICENSE) 참고.

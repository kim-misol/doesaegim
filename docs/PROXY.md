# 번역 프록시 (api/translate.js)

클라이언트가 Anthropic을 직접 부르지 않도록, 키를 서버에 숨긴 채 대신 호출해주는 작은 서버리스 함수.

## 계약 (client ↔ proxy)
- 요청: `POST {endpoint}` body `{ "word": "...", "src": "en", "tgt": "ko", "mode": "translate" }`
  - `src`/`tgt` ∈ `ko|en|fr`, `mode` ∈ `translate|dict`
- 응답: `200 { "t": [ { "m": "뜻", "n": "비고(가능하면)" } ] }`

> `src/lib/translate.js`의 `fetchMeanings`가 위 body로 POST하고 `{t:[{m,n}]}`를 파싱하면 끝. (PLAN-0003 구현과 body 모양이 다르면 한쪽만 맞춰주면 됨.)

## 배포 A — 앱 전체를 Vercel에 (권장, CORS 불필요)
1. https://vercel.com 에서 GitHub로 로그인 → **New Project** → 이 레포 선택.
2. Framework: **Vite** 자동 감지. 그대로 **Deploy**.
3. Project → **Settings → Environment Variables** 에 추가:
   - `ANTHROPIC_API_KEY` = 본인 키 (서버 전용, 절대 코드/`.env` 커밋 금지)
   - `VITE_TRANSLATE_ENDPOINT` = `/api/translate` (같은 도메인이라 상대경로)
4. **Redeploy**. 이제 앱이 `https://<프로젝트>.vercel.app`, 프록시는 `…/api/translate`.

iOS(Capacitor)에서 쓸 땐 상대경로가 안 통하므로, 그때는 `.env`에 절대 URL로:
```
VITE_TRANSLATE_ENDPOINT=https://<프로젝트>.vercel.app/api/translate
```
그리고 아래 `ALLOWED_ORIGINS`에 Capacitor origin(`capacitor://localhost`, `http://localhost`)을 추가.

## 배포 B — GitHub Pages 유지 + 프록시만 Vercel
- 정적 사이트는 Pages 그대로. 프록시만 Vercel에 올리고, 클라이언트 `.env`:
  ```
  VITE_TRANSLATE_ENDPOINT=https://<프로젝트>.vercel.app/api/translate
  ```
- Vercel 환경변수에 `ALLOWED_ORIGINS=https://<user>.github.io` 를 넣어 CORS 허용.

## 보안 / 비용 (꼭 읽기)
- 키가 클라이언트/번들에 없으니 **키 노출은 막힘**. ✅
- 다만 프록시 URL은 공개 엔드포인트라 누군가 알아내면 **내 크레딧으로 호출**할 수 있음. 완화책:
  - 입력 검증(단어 길이 ≤ 100, 허용 언어/모드만) — 이미 적용됨.
  - `max_tokens 256` + Haiku — 1회 비용이 작음.
  - `ALLOWED_ORIGINS`로 브라우저 출처 제한(단, curl 같은 비브라우저 호출은 못 막음).
  - 더 강하게: Vercel의 요청 제한(rate limit)·인증을 붙이거나, URL을 공개하지 않기.
- 개인용 앱 수준에선 위 조합이면 충분. 트래픽이 커지면 인증/레이트리밋을 추가하세요.

## 대안
Cloudflare Workers도 동일하게 가능(같은 핸들러 로직, `env.ANTHROPIC_API_KEY` 사용). 무료 등급이 넉넉.

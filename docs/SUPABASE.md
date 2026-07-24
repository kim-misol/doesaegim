# 클라우드 동기화 + 번역 프록시 셋업 (PLAN-0004)

로그인하면 카드가 Supabase(Postgres)에 행 단위로 동기화되고, 여러 기기에서 같은
데이터를 본다. 설정을 안 하면 앱은 기존처럼 로컬(localStorage) 전용으로 동작한다.

## 1. 프로젝트 만들기
1. https://supabase.com → New project. 이름·비밀번호·리전(가까운 곳: `ap-northeast-2` 서울).
2. Project Settings → API 에서 두 값 복사: **Project URL**, **anon public key**.

## 2. 스키마 적용
Supabase Studio → SQL Editor 에 [`supabase/schema.sql`](../supabase/schema.sql) 붙여넣고 실행.
`words` 테이블 + 인덱스 + RLS(본인 데이터만 접근)가 생성된다.

## 3. 인증(이메일 매직링크)
Authentication → Providers → **Email** 켜기 (기본 on). 앱은 비밀번호 없이
이메일로 링크를 보내 로그인한다(`signInWithOtp`). Redirect URL에 배포 주소와
`http://localhost:5173` 를 추가(Authentication → URL Configuration).

## 4. 번역 프록시(Edge Function)
```bash
supabase functions deploy translate --no-verify-jwt
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set ALLOWED_ORIGINS=https://<user>.github.io,http://localhost:5173
```
`--no-verify-jwt` 인 이유: 클라이언트가 인증 헤더 없이 POST하기 때문. 남용은
Origin 허용목록 + 입력 검증 + Haiku/`max_tokens:256`로 막는다(개인용엔 충분).
더 강하게 막으려면 사용자 JWT 요구나 레이트리밋을 얹으면 된다.

## 5. 클라이언트 환경변수
`.env` (`.env.example` 참고):
```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>
VITE_TRANSLATE_ENDPOINT=https://<project-ref>.supabase.co/functions/v1/translate
```
GitHub Pages 배포면 이 값들을 Actions Secrets/Variables로 넣어 빌드 시 주입한다.
anon 키는 공개 키라 번들에 포함돼도 안전(데이터 보호는 RLS가 담당).

## 데이터 이전(기존 로컬 → 클라우드)
로그인 전 화면에서 **단어 → JSON 내보내기**로 백업 → 로그인 → **가져오기**로
병합(id 충돌 시 가져온 카드가 우선). CSV도 내보내기 지원.

## 동작 요약
- 미설정: 로컬 전용(지금과 동일).
- 설정 + 미로그인: 로컬. 로그인하면 원격 스토어로 전환·재로드.
- 저장은 전체 배열 write를 diff해서 변경/삭제 행만 upsert/delete (효율적).
- 쓰기 실패 시 로컬 React 상태는 유지되고 다음 편집에서 재시도.

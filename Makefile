# =============================================================================
# 되새김(doesaegim) — Makefile
# 사용법: make <target>
# =============================================================================

.PHONY: help install dev build preview \
        test test-watch test-ui ci \
        supabase-login supabase-link supabase-deploy supabase-secrets \
        deploy clean

# 기본 타깃: 도움말 출력
help:
	@echo ""
	@echo "  되새김 개발 명령어"
	@echo ""
	@echo "  ── 개발 ────────────────────────────────────────────"
	@echo "  make install         의존성 설치 (npm ci)"
	@echo "  make dev             개발 서버 실행 (http://localhost:5173)"
	@echo "  make build           정적 빌드 → dist/"
	@echo "  make preview         빌드 결과 미리보기"
	@echo ""
	@echo "  ── 테스트 ──────────────────────────────────────────"
	@echo "  make test            유닛 테스트 1회 실행"
	@echo "  make test-watch      유닛 테스트 watch 모드 (TDD)"
	@echo "  make test-ui         Vitest UI"
	@echo "  make ci              CI와 동일하게 test + build 실행 (push 전 확인용)"
	@echo ""
	@echo "  ── Supabase (translate 프록시 / 클라우드 동기화) ────"
	@echo "  make supabase-login  Supabase CLI 로그인"
	@echo "  make supabase-link   현재 폴더를 Supabase 프로젝트에 연결 (REF=<project-ref>)"
	@echo "  make supabase-deploy translate Edge Function 배포"
	@echo "  make supabase-secrets 서버 전용 secrets 설정 안내 출력"
	@echo ""
	@echo "  ── 배포 ────────────────────────────────────────────"
	@echo "  make deploy          main에 push → GitHub Actions가 자동으로 build + Pages 배포"
	@echo ""
	@echo "  ── 기타 ────────────────────────────────────────────"
	@echo "  make clean           dist/ 및 Vite 캐시 정리"
	@echo ""

# =============================================================================
# 개발
# =============================================================================

install:
	npm ci

dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

# =============================================================================
# 테스트
# =============================================================================

test:
	npm test

test-watch:
	npm run test:watch

test-ui:
	npm run test:ui

# GitHub Actions(ci.yml)와 동일한 순서로 로컬에서 미리 확인
ci: test build

# =============================================================================
# Supabase
# =============================================================================

supabase-login:
	supabase login

supabase-link:
	@[ -n "$(REF)" ] || (echo "REF=<project-ref> 를 지정하세요. 예: make supabase-link REF=xxxxxxxx" && exit 1)
	supabase link --project-ref $(REF)

supabase-deploy:
	supabase functions deploy translate

supabase-secrets:
	@echo ""
	@echo "  서버 전용 secrets는 절대 커밋하지 말고 아래처럼 설정:"
	@echo ""
	@echo "    supabase secrets set ANTHROPIC_API_KEY=sk-ant-..."
	@echo "    supabase secrets set ALLOWED_ORIGINS=https://<user>.github.io,http://localhost:5173"
	@echo ""

# =============================================================================
# 배포
# =============================================================================

# GitHub Pages 배포는 main push 시 deploy.yml이 자동 처리한다 (수동 SSH 배포 없음).
# 여기서는 push 전 로컬 확인(test+build) 후 push까지만 수행.
deploy: ci
	git push origin main

# =============================================================================
# 기타
# =============================================================================

clean:
	rm -rf dist node_modules/.vite
	@echo "✅ 빌드 캐시 정리 완료"

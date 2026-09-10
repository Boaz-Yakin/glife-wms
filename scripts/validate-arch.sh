#!/usr/bin/env bash
# scripts/validate-arch.sh
# 아키텍처 규칙 준수 여부 검증 스크립트
# 사용법: bash scripts/validate-arch.sh
# CI에서도 실행 가능. 위반 발견 시 exit code 1 반환

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

echo "🔍 아키텍처 규칙 검증 시작..."
echo "======================================"

# ──────────────────────────────────────────────────────────────────
# RULE 1: Client Component에서 외부 API 직접 호출 금지
# CRITICAL: CLAUDE.md 규칙 #1
# ──────────────────────────────────────────────────────────────────
echo ""
echo "📋 RULE 1: Client Component에서 외부 API 직접 호출 검사..."

# 'use client' 가 있는 파일에서 fetch()를 http/https URL로 호출하는 경우 검사
# (단순 패턴 매칭이므로 false positive 가능 — 수동 확인 필요)
CLIENT_API_VIOLATIONS=$(grep -rl "'use client'" src/ 2>/dev/null | \
  xargs grep -l "fetch('http" 2>/dev/null | \
  xargs grep -l "fetch(\"http" 2>/dev/null || true)

if [ -n "$CLIENT_API_VIOLATIONS" ]; then
  echo -e "${RED}❌ 위반 발견: Client Component에서 외부 URL fetch 호출${NC}"
  echo "$CLIENT_API_VIOLATIONS"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ 통과${NC}"
fi

# ──────────────────────────────────────────────────────────────────
# RULE 2: 환경 변수 시크릿 클라이언트 번들 노출 금지
# CRITICAL: CLAUDE.md 규칙 #2
# ──────────────────────────────────────────────────────────────────
echo ""
echo "📋 RULE 2: 시크릿 환경 변수 클라이언트 노출 검사..."

# NEXT_PUBLIC_ 접두어가 없는 환경 변수를 클라이언트 컴포넌트에서 참조하는 경우
SECRET_VIOLATIONS=$(grep -rn "process\.env\.[A-Z_]*[^N]" src/ 2>/dev/null | \
  grep -v "NEXT_PUBLIC_" | \
  grep -l "'use client'" 2>/dev/null || true)

if [ -n "$SECRET_VIOLATIONS" ]; then
  echo -e "${YELLOW}⚠️  경고: Client Component에서 non-public 환경 변수 참조 의심${NC}"
  echo "$SECRET_VIOLATIONS"
  echo "  → 수동 확인 필요: 실제로 시크릿인지 확인하세요"
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${GREEN}✅ 통과${NC}"
fi

# ──────────────────────────────────────────────────────────────────
# RULE 3: any 타입 사용 금지
# CRITICAL: CLAUDE.md 규칙 #4
# ──────────────────────────────────────────────────────────────────
echo ""
echo "📋 RULE 3: TypeScript any 타입 사용 검사..."

ANY_VIOLATIONS=$(grep -rn ": any" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | \
  grep -v "// eslint-disable" | \
  grep -v "// @ts-ignore" || true)

if [ -n "$ANY_VIOLATIONS" ]; then
  echo -e "${YELLOW}⚠️  경고: any 타입 사용 발견 (unknown 또는 구체적 타입 사용 권장)${NC}"
  echo "$ANY_VIOLATIONS" | head -20
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${GREEN}✅ 통과${NC}"
fi

# ──────────────────────────────────────────────────────────────────
# RULE 4: DB 접근은 services/ 레이어 경유 확인
# CRITICAL: CLAUDE.md 규칙 #5
# ──────────────────────────────────────────────────────────────────
echo ""
echo "📋 RULE 4: DB 직접 접근 (services 레이어 우회) 검사..."

# components/ 또는 app/page 파일에서 supabase from() 직접 호출하는 경우
DB_VIOLATIONS=$(grep -rn "supabase\.from(" src/components/ src/app/ 2>/dev/null | \
  grep -v "services/" || true)

if [ -n "$DB_VIOLATIONS" ]; then
  echo -e "${RED}❌ 위반 발견: components 또는 pages에서 DB 직접 접근${NC}"
  echo "$DB_VIOLATIONS" | head -10
  echo "  → services/ 레이어를 통해 접근해야 합니다"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ 통과${NC}"
fi

# ──────────────────────────────────────────────────────────────────
# RULE 5: console.log 프로덕션 코드 잔류 검사
# ──────────────────────────────────────────────────────────────────
echo ""
echo "📋 RULE 5: console.log 잔류 검사..."

CONSOLE_VIOLATIONS=$(grep -rn "console\.log(" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | \
  grep -v "__tests__" | \
  grep -v ".test." | \
  grep -v ".spec." || true)

if [ -n "$CONSOLE_VIOLATIONS" ]; then
  echo -e "${YELLOW}⚠️  경고: console.log 발견 (프로덕션 코드에서 제거 권장)${NC}"
  echo "$CONSOLE_VIOLATIONS" | head -10
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${GREEN}✅ 통과${NC}"
fi

# ──────────────────────────────────────────────────────────────────
# 결과 요약
# ──────────────────────────────────────────────────────────────────
echo ""
echo "======================================"
echo "📊 검증 결과 요약"
echo "======================================"

if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}❌ 오류: $ERRORS 건 (반드시 수정 필요)${NC}"
fi
if [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠️  경고: $WARNINGS 건 (검토 권장)${NC}"
fi
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}🎉 모든 아키텍처 규칙 통과!${NC}"
fi

echo ""

# 오류가 있으면 exit 1 (CI에서 빌드 중단)
if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}아키텍처 규칙 위반으로 인해 실패합니다. 위의 오류를 수정하세요.${NC}"
  exit 1
fi

echo "아키텍처 검증 완료."

# 프로젝트: {프로젝트명}

> [!IMPORTANT]
> **AI에게 (MANDATORY CONTEXT LOADING)**
> 코드 작성 또는 수정 전 반드시 아래 문서를 순서대로 읽어라.
> 1. `docs/01_PRD.md` — 제품 목표 & 요구사항 확인
> 2. `docs/02_ADR.md` — 아키텍처 결정 & 기술 스택 확인
> 3. `docs/03_TRD.md` — 구현할 기능의 세부 설계 확인
> 4. `docs/04_UI_GUIDE.md` — UI 컴포넌트 작성 전 필독
>
> 작업 시작 전 `.knowledge/` 폴더에서 관련 패턴과 주의사항(gotchas)을 찾아 읽어라.
> 작업 완료 후 `task.md`를 업데이트하고, 설계 변경이 있을 경우 관련 문서(PRD/ADR/TRD)를 반드시 반영하라.

---

## 기술 스택
- **프레임워크**: {예: Next.js 15 (App Router)}
- **언어**: {예: TypeScript (strict mode)}
- **스타일링**: {예: Tailwind CSS v4}
- **데이터베이스**: {예: Supabase (PostgreSQL + RLS)}
- **상태관리**: {예: Zustand / React Query}
- **테스트**: {예: Vitest + Playwright}

---

## 아키텍처 핵심 원칙 (CRITICAL — 절대 위반 금지)

- **CRITICAL**: 모든 외부 API 호출 로직은 `app/api/` 라우트 핸들러 또는 Server Component에서만 처리한다. Client Component에서 직접 외부 API를 절대 호출하지 않는다.
- **CRITICAL**: 환경 변수(`.env`)에 있는 시크릿 키를 절대 클라이언트 번들에 노출하지 않는다.
- **CRITICAL**: 새 기능 구현 전에 반드시 `docs/03_TRD.md`에 해당 기능의 설계를 먼저 작성하거나 확인한다 (Design-First).
- **CRITICAL**: 타입 정의 없이 `any` 타입 사용 금지. 불확실한 경우 `unknown`을 사용하고 타입 가드를 작성한다.
- **CRITICAL**: 데이터베이스 직접 접근은 `services/` 레이어를 통해서만 한다.

---

## 디렉토리 구조

```
src/
├── app/               # 페이지 + API 라우트 (Next.js App Router)
├── components/        # 재사용 가능한 UI 컴포넌트
│   ├── ui/            # 원자 단위 컴포넌트 (Button, Input, Card)
│   └── features/      # 도메인별 복합 컴포넌트
├── types/             # TypeScript 타입 & 인터페이스 정의
├── lib/               # 유틸리티 함수 & 공통 헬퍼
├── services/          # 외부 API 클라이언트 & DB 접근 레이어
├── hooks/             # 커스텀 React 훅
└── constants/         # 상수값 정의
```

---

## 개발 워크플로우 (AI 에이전트 필독)

```
[기획] PRD 작성 → [설계] ADR + TRD 작성 → [구현] 코드 작성 → [리뷰] QA 체크 → [문서화] 변경사항 반영
```

1. **PRD 확인**: 기능이 MVP 스코프 내에 있는지 확인. Out of Scope라면 구현하지 않는다.
2. **ADR 확인**: 선택한 기술 스택 및 아키텍처 제약을 확인한다.
3. **TRD 작성**: 새 기능은 TRD에 설계를 먼저 명시한 후 구현한다.
4. **코드 구현**: TRD의 API 시그니처와 에러 처리 정책을 준수한다.
5. **QA 자가 검토**: 검증 스크립트 실행 (`scripts/validate-arch.ps1` 또는 `scripts/validate-arch.sh`). ADR/TRD과 구현 간 불일치가 있으면 반드시 수정 후 진행한다.
6. **문서 업데이트**: 설계 변경 시 해당 문서(PRD/ADR/TRD) 및 `task.md`를 업데이트한다.

---

## 검증 명령어

```bash
# Windows PowerShell
powershell -ExecutionPolicy Bypass -File scripts/validate-arch.ps1
powershell -ExecutionPolicy Bypass -File scripts/sync-docs.ps1

# Linux / macOS / Git Bash
bash scripts/validate-arch.sh
bash scripts/sync-docs.sh
```

# web-app 보안 감사 및 강화 가이드 (Security Audit & Hardening Guide)
<!-- 작성일: 2026-11-01 | 상태: Approved | 대상: web-app -->

## 1. 개요 및 목적
본 문서는 `web-app`(사무실 관리자용 백오피스 대시보드)의 전반적인 보안 아키텍처 점검 결과와 도출된 취약점, 그리고 단계별 강화 로드맵을 정의합니다.
Next.js Server Component 및 Server Action, Supabase PostgreSQL RLS 환경에서 최소 권한 원칙(Principle of Least Privilege)과 심층 방어(Defense in Depth)를 달성하는 것을 목표로 합니다.

---

## 2. 보안 취약점 및 개선점 진단 (Security Findings)

### 2.1 🚨 높은 우선순위 (High Severity)
1. **Server Action 레벨의 인증/인가(RBAC) 검증 부재**:
   - **현황**: Next.js Server Action(`actions.ts`)은 브라우저에서 직접 POST 요청(`Next-Action` 헤더)으로 호출 가능한 독립 RPC 엔드포인트입니다.
   - **문제점**: 미들웨어가 페이지 라우트(`/orders`, `/settings/users` 등) 접근은 차단하지만, Server Action 자체에는 세션(`supabase.auth.getUser()`) 및 역할(`ADMIN`, `SUPERVISOR`) 검증 가드가 결여되어 있었습니다.
   - **위험도**: 인가 우회(Broken Access Control) 공격 가능성.

2. **과도한 `SERVICE_ROLE_KEY` 의존 및 RLS(Row Level Security) 바이패스**:
   - **현황**: 비즈니스 서비스 레이어(`orders.service.ts` 등)에서 `SUPABASE_SERVICE_ROLE_KEY`를 사용하는 Admin 클라이언트를 기본 사용하여 모든 주문/품목 데이터에 접근.
   - **문제점**: Supabase DB의 RLS 정책이 완전히 무력화되어 코드 레벨에서 화주사(`client_id`) 필터를 누락할 경우 타 테넌트 데이터 유출 위험.

3. **외부 API 라우트 인증 부재 (`/api/notifications/kakao/order`)**:
   - **현황**: 카카오톡 주문 알림 발송 엔드포인트가 인증 없이 공개됨.
   - **문제점**: 외부에서 임의의 `order_id`로 대량 요청 시 카카오톡 스팸 전송 및 DoS(API 할당량 소진) 발생 위험.

### 2.2 ⚠️ 중간 우선순위 (Medium Severity)
1. **HTTP 보안 헤더(Security Headers) 미설정**:
   - `next.config.ts`에 `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Content-Security-Policy (CSP)` 등 표준 보안 헤더 부재 (클릭재킹 및 MIME 스니핑 취약).
2. **MFA (TOTP) 검증의 Server Action 누락**:
   - 미들웨어에서만 AAL2(TOTP 완료)를 검사하여, 비밀번호만 입력된 1단계 인증(`aal1`) 상태에서 세션 쿠키를 이용해 Server Action을 직접 호출할 위험 존재.
3. **요청 속도 제한(Rate Limiting) 부재**:
   - 로그인, 비밀번호 변경, 알림 발송 엔드포인트에 대한 무차별 대입(Brute-force) 및 자원 고갈 방지 체계 부재.

### 2.3 💡 권장 모범 사례 (Low / Best Practices)
1. **Zod를 통한 입력값 런타임 검증 (Input Validation)**: FormData 및 JSON 페이로드 스키마 검증.
2. **에러 메시지 마스킹 (Information Exposure)**: DB 내부 오류 메시지의 클라이언트 노출 차단.
3. **초기 임시 비밀번호 무작위화**: 하드코딩된 초기 비밀번호 대신 안전한 1회용 무작위 난수 생성.

---

## 3. 단계별 보안 강화 로드맵 (Actionable Roadmap)

| 단계 | 목표 영역 | 핵심 구현 내용 | 상태 |
| :--- | :--- | :--- | :---: |
| **Phase 1** | **Server Action & API 인가 강화** | • 공통 RBAC 세션 검증 가드 (`requireRole`, `requireAuth`) 구현 및 전 Server Action 적용<br>• `/api/notifications/kakao/order` 내부 인증 토큰 헤더 검증 추가 | **진행 중 (In Progress)** |
| **Phase 2** | **HTTP 헤더 & RLS 전환** | • `next.config.ts` 보안 헤더(HSTS, CSP, X-Frame) 설정<br>• 서비스 계층에서 User Context SSR 클라이언트로 점진적 전환 | 계획됨 (Planned) |
| **Phase 3** | **입력 검증 & Rate Limiting** | • Zod 스키마 검증 체계 구축<br>• 로그인/인증 엔드포인트 Rate Limiting 적용 | 계획됨 (Planned) |

---

## 4. Phase 1 구현 사양

### 4.1 공통 인증/인가 가드 모듈 (`src/lib/auth/guard.ts`)
- `requireAuth()`: 로그인된 사용자(`user`) 객체를 반환하며, 비로그인 시 즉시 예외 발생.
- `requireRole(allowedRoles: UserRole[])`: 사용자 메타데이터의 `role`이 허용된 목록에 포함되어 있는지 검증.
- `requireAdmin()`: `role === 'ADMIN'`만 허용.
- `requireManager()`: `ADMIN` 또는 `SUPERVISOR`만 허용.

### 4.2 API 엔드포인트 보호
- `/api/notifications/kakao/order`:
  - 헤더 `x-internal-secret` 또는 `Authorization: Bearer <INTERNAL_API_SECRET>` 검증.
  - 불일치 시 `401 Unauthorized` 반환.

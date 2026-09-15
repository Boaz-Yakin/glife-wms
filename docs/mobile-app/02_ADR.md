# Architecture Decision Records (ADR)
<!-- ADR: "어떤 시스템/기술 구조를 가져가는가?" -->
<!-- 작성일: 2026-09-08 | 프로젝트: mobile-app (현장 재고관리 및 피킹 전용 앱) -->

## 철학

> **"현장 속도(0.05초)와 데이터 정합성(단일 PostgreSQL 트랜잭션) 최우선."**  
> 단일 앱이지만 현장 작업자(`PICKER`)와 재고검사자(`INSPECTOR`)의 작업 맥락을 물리적으로 격리하여, 조작 실수 제로와 극도의 단순성을 달성한다.

---

## ADR-001: Next.js 15 App Router 기반 라우트 그룹 `(picking)` / `(inventory)` 분리

**상태**: Accepted  
**결정일**: 2026-09-08  
**결정자**: Core Team

### Context (배경)
동일한 mobile-app 내에서 피킹 작업자와 재고검사자가 함께 사용하지만, 두 역할의 UI/UX 요구사항은 정반대입니다.
- **피커**: 1초 1동선, No-Click, 메뉴/헤더 완전 제거, 풀스크린, 대형 폰트.
- **재고검사자**: 품목 검색, 로케이션 이동 입력, 실사 오차 조정, 고밀도 데이터 테이블.

### Decision (결정)
Next.js 15 App Router의 **Route Groups** 기능을 사용하여 완전히 독립된 두 레이아웃으로 분리합니다.
- `src/app/(picking)/layout.tsx`: 전역 바코드 인터셉터 탑재, 풀스크린, 네비게이션 제거.
- `src/app/(inventory)/layout.tsx`: 탭/바텀시트 네비게이션, 검색창 및 폼 컨트롤 최적화.

### Consequences (결과 & 트레이드오프)
| 장점 | 단점 |
|---|---|
| 단일 배포 번들로 유지보수 비용 최소화 | 라우트 그룹 간 상태 공유 시 전역 스토어 설계 필요 |
| 피커 작업 중 다른 메뉴로의 실수 이탈 원천 차단 | 역할별 레이아웃 중복 코드 약간 발생 가능 |

---

## ADR-002: 역할 기반 라우팅 및 보안 제어 (Role-Based Access Control)

**상태**: Accepted  
**결정일**: 2026-09-08  
**결정자**: Core Team

### Context (배경)
로그인 정보(`users.role`: `PICKER`, `INSPECTOR`, `ADMIN`)에 따라 진입 화면과 접근 가능한 기능이 달라져야 하며, 타 역할의 경로 접근 및 데이터 변조를 차단해야 합니다.

### Decision (결정)
1. **Next.js Middleware (`src/middleware.ts`) 레벨 라우팅 제어**:
   - `PICKER` 로그인 시 ➔ `/picking/run`으로 즉시 강제 이동. `/inventory/*` 접근 시 자동 튕겨냄.
   - `INSPECTOR` 로그인 시 ➔ `/inventory`로 즉시 강제 이동. `/picking/*` 접근 시 자동 튕겨냄.
   - `ADMIN` / `SUPERVISOR` ➔ 상단 모드 전환 스위치 활성화.
2. **백엔드 서비스 레이어 검증**:
   - `services/inventory.service.ts`: 재고 실사 및 강제 수량 변경은 `INSPECTOR` / `ADMIN` 권한만 허용.
   - `services/picking.service.ts`: 주문 피킹 완료 트랜잭션은 `PICKER` / `ADMIN` 권한만 허용.

---

## ADR-003: 단일 PostgreSQL(Supabase) 엔진 및 원자적 재고 차감

**상태**: Accepted  
**결정일**: 2026-09-08  
**결정자**: Core Team

### Context (배경)
기존 구글 시트의 동시 덮어쓰기 유실(Lost Update)과 API Rate Limit 한계를 극복하고, 마이너스 재고 발생을 원천 차단해야 합니다.

### Decision (결정)
- Supabase PostgreSQL을 단일 진실 공급원(SSOT)으로 도입.
- 원자적 SQL 연산과 DB Check 제약조건(`chk_positive_stock`) 적용:
  ```sql
  UPDATE inventory 
  SET on_hand_qty = on_hand_qty - 1 
  WHERE location_id = $1 AND item_id = $2 AND on_hand_qty >= 1;
  ```
- 피킹 주문 생성 시 `allocated_qty` 소프트 할당 적용으로 이중 피킹 방지.

---

## ADR-004: 블루투스 링 스캐너(HID) 전역 키보드 웨지 인터셉터

**상태**: Accepted  
**결정일**: 2026-09-08  
**결정자**: Core Team

### Context (배경)
현장 피커들은 핑거 링 스캐너로 초고속 연속 스캔을 수행합니다. 특정 입력창(Input Box)에 포커스가 맞춰져 있지 않아도 바코드가 100% 인식되어야 합니다.

### Decision (결정)
- `window.addEventListener('keydown')`을 가로채는 커스텀 훅(`useBarcodeScanner`) 구현.
- 50ms 이내 연속으로 유입되는 키 입력 및 종단 문자(Enter)를 바코드 스트링으로 조합하여 특정 input 포커스 여부와 무관하게 즉각 액션 트리거.

---

## ADR-005: 클라이언트 상태 관리 및 오프라인 대응

**상태**: Accepted  
**결정일**: 2026-09-08  
**결정자**: Core Team

### Decision (결정)
- **클라이언트 전역 상태**: Zustand (현재 피킹 세션, 스캔 큐, 사운드/진동 설정)
- **서버 상태 & 캐싱**: TanStack Query + Supabase Realtime (피킹 오더 배정 실시간 알림)
- **오프라인 버퍼링**: 음영 구역 진입 시 IndexedDB에 바코드 스캔 이벤트를 큐잉하고 네트워크 복구 시 순차 전송.

---

## ADR-006: 재고 실사/조정 트랜잭션 무결성 및 감사 로그(Audit Trail) 보장

**상태**: Accepted  
**결정일**: 2026-09-08  
**결정자**: Core Team

### Context (배경)
현장 재고검사자가 실사(Cycle Count)를 수행하여 전산 수량을 보정할 때, 잘못된 수정이나 데이터 유실을 방지하고 "누가, 왜, 언제, 얼마만큼 바꿨는지"를 엄격히 추적할 수 있어야 합니다.

### Decision (결정)
1. 재고 조정 이력을 기록하는 `inventory_adjustments` 테이블을 분리 신설.
2. 실사 보정 시 `inventory` 테이블 갱신과 `inventory_adjustments` 로그 삽입을 단일 PostgreSQL 트랜잭션(ACID)으로 묶어 원자성 보장.
3. 사유 코드(Reason Code: `DAMAGED`(파손), `LOST`(분실), `FOUND`(초과발견), `COUNT_MISMATCH`(단순오차), `EXPIRED`(유통기한경과)) 입력을 필수로 강제.

---

## ADR-007: 현장 모바일 최적화 UX (Thumb-Zone & 인라인 넘버패드)

**상태**: Accepted  
**결정일**: 2026-09-08  
**결정자**: Core Team

### Context (배경)
창고 현장 작업자는 서서 걷거나 한 손으로 상품을 들고 다른 한 손으로만 모바일 기기를 조작하는 경우가 빈번합니다. 시스템 기본 가상 키보드가 올라오면 화면의 절반을 가려 전산 수량 대조가 불가능해지는 치명적인 UX 저하가 발생합니다.

### Decision (결정)
1. **Thumb-Zone 레이아웃**: 핵심 확인/스캔/저장 버튼을 화면 하단 엄지손가락 도달 반경에 56px 이상의 대형 터치 타겟으로 배치.
2. **인라인 퀵 카운터 & 넘버패드**:
   - 모바일 기본 키보드 팝업을 억제하고 화면 하단에 `[-10]`, `[-1]`, `[+1]`, `[+10]`, `[전산일치=One-Tap]` 인라인 퀵 버튼 제공.
3. **바코드 스캐너 하드웨어 & 카메라 하이브리드 지원**:
   - 블루투스 링스캐너 연결 시 자동 감지(HID), 미연결 시 모바일 카메라를 통한 뷰파인더 팝업 스캔 제공.


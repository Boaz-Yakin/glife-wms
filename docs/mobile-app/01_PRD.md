# PRD-001: mobile-app (현장 작업자용 모바일/PWA 재고관리 및 피킹 시스템)
<!-- Product Requirements Document: "무엇을, 왜 만드는가?" -->
<!-- 작성일: 2026-09-08 | 상태: Approved | 버전: v1.0 -->

**상태**: Approved  
**작성일**: 2026-09-08  
**버전**: v1.0  
**관련 문서**: 
- [DB 개선 사항](../common/DB_개선_사항.md)
- [재고관리 및 피킹 시스템 구성 제안](../common/재고관리_및_피킹_시스템_구성_제안.md)
- [바코드 시스템 설계서](Barcode_System_Guide.md)
- [ADR 아키텍처 결정](02_ADR.md)

---

## 1. Executive Summary & Problem Statement (문제 정의 및 목표)

### 1.1 배경 및 현재 문제점
현재 물류 현장은 구글 스프레드시트 기반으로 주문과 재고를 연동하고 있어 다음과 같은 치명적 병목이 발생하고 있습니다.
1. **실시간 실물 재고(On-hand Qty) 부재**: 로케이션 텍스트만 존재하고 수량이 없어 피킹 중 결품 발생 빈번.
2. **동시성 충돌 및 API 한계**: 다중 작업자가 동시 접근 시 데이터 유실(Lost Update) 및 Google API Rate Limit(분당 300회) 초과 에러 발생.
3. **비효율적 현장 동선**: 상온/냉동(Cold Chain) 분기 부재, 창고 랙 통로 기준 S-Shape 최적 동선 미지원으로 불필요한 이동 시간 과다 소모.
4. **UI 복잡도 및 오작동**: 모바일 화면에서 작은 버튼을 직접 터치해야 하므로 장갑 착용 작업자의 오입력 및 작업 지연 유발.

### 1.2 시스템 목표
> **"단일 PostgreSQL(Supabase) 엔진을 기반으로, 현장 작업자에게 터치가 필요 없는 0.05초 응답의 'No-Click 고속 피킹'과 '실시간 모바일 재고 관리' 환경을 제공한다."**

---

## 2. Target Users & Environment (주 사용자 및 환경)

| 사용자 유형 (Role) | 기본 진입 화면 | UI/UX 특성 및 제공 기능 |
|---|---|---|
| **피킹 작업자 (`PICKER`)** | `/picking/run` (피킹 러너) | **[No-Click 풀스크린 모드]**<br>• 헤더/네비게이션바 완전 제거, 초대형 텍스트<br>• S-Shape 최단 동선 가이드, Cold Chain 잠금 제어<br>• 바코드 연속 스캔(로케이션 ➔ UPC) 자동 카운트<br>• 3대 명령 바코드(`CMD-SKIP`, `CMD-UNDO`, `CMD-DONE`)<br>• *재고 수정/이동/관리자 메뉴 완전 비노출 (오조작 원천 방지)* |
| **재고검사자 (`INSPECTOR`)** | `/inventory` (현장 재고 메인) | **[현장 고밀도 인스펙션 모드]**<br>• 바코드 퀵 조회 (로케이션별 적치 현황 & SKU 위치 역추적)<br>• 로케이션 간 재고 이동 (Bin-to-Bin Transfer)<br>• 긴급/순환 실사 (Cycle Count: `CMD-SKIP` 발생 품목 자동 큐)<br>• 실재고 수량 보정 및 사유 코드 입력<br>• 간이 입고 적치 (Put-away)<br>• *피킹 실행 화면 비노출 또는 조회 전용* |
| **현장 관리자 (`ADMIN`/`SUPERVISOR`)** | 모드 선택 / 대시보드 | • 피킹 모드 ↔ 재고검사 모드 간 자유로운 스위칭 권한<br>• 실시간 현장 피킹 진행률 및 결품 이슈 모니터링 |

---

## 3. Role-Based Routing & Screen Architecture (역할 기반 화면 및 라우팅 구조)

```
                       [공통 로그인 화면: /login]
                       (전화번호+PIN 또는 작업자 바코드 스캔)
                                   │
                     ┌─────────────┴─────────────┐
                     ▼ (로그인 세션의 role 확인)    ▼
            [role === 'PICKER']             [role === 'INSPECTOR']
                     │                               │
        (자동 강제 리다이렉트)               (자동 강제 리다이렉트)
                     ▼                               ▼
       ┌───────────────────────────┐   ┌───────────────────────────┐
       │ (picking) 라우트 그룹      │   │ (inventory) 라우트 그룹    │
       │ • /picking/run            │   │ • /inventory/lookup       │
       │ • 풀스크린 No-Click PWA   │   │ • /inventory/transfer     │
       │ • 전역 바코드 인터셉터    │   │ • /inventory/cycle-count  │
       │ • 오디오/진동 즉각 피드백 │   │ • /inventory/put-away     │
       └───────────────────────────┘   └───────────────────────────┘
```

- **Next.js Middleware 보안 제어**:
  - `PICKER` 권한 사용자가 `/inventory/*` 경로로 직접 URL 진입 시 `/picking/run`으로 자동 튕겨냄 (접근 차단).
  - `INSPECTOR` 권한 사용자가 `/picking/*` 경로로 직접 URL 진입 시 `/inventory`로 자동 리다이렉트.
- **백엔드 서비스 레이어 검증**:
  - 재고 강제 조정(Adjustment) 및 실사 확정 API는 `INSPECTOR` 또는 `ADMIN` 토큰만 승인.
  - 피킹 품목 상태 전송 API는 `PICKER` 또는 `ADMIN` 토큰만 승인.

---

## 4. Core Features — MVP Scope (핵심 기능 정의)

### 4.1 피킹 작업자 (`PICKER`) 전용 모듈 (`/picking/run`)
- **[F-01] 송장/주문 피킹 오더 인계 & 큐 배정**:
  - 상태가 `ALLOCATED`인 주문을 작업자가 선택하거나 전용 시작 바코드로 작업 시작.
- **[F-02] S-Shape 최적 동선 가이드**:
  - 로케이션 좌표(`zone`, `aisle`, `section`, `tier`)에 따라 지그재그 S-Shape 최단 경로로 품목 자동 정렬.
- **[F-03] Cold Chain 단계 분기 제어**:
  - 상온 구역(`Zone A`) 피킹이 100% 완료되기 전까지 냉동 차량 구역(`Zone F`) 품목의 진입을 차단하여 신선도 유지.
- **[F-04] 바코드 기반 No-Click 워크플로우**:
  - `로케이션 바코드 스캔` ➔ 일치 시 활성화 ➔ `상품 UPC 바코드 스캔` ➔ 수량 카운트 ➔ 다음 품목 자동 전환.
- **[F-05] 3대 명령 바코드(Command Barcode) 지원**:
  - `CMD-SKIP`: 재고 부족 시 다음 로케이션으로 스킵 처리 + 재고 테이블에 실사 요청 플래그 트리거.
  - `CMD-UNDO`: 직전 오스캔 1회 즉시 취소 및 원복.
  - `CMD-DONE`: 작업 조기 마감 및 확정 전송.
- **[F-06] 오디오 & 햅틱 피드백**:
  - 성공음(고음 비프), 실패음(경고 버저음), 진동 패턴을 통해 화면을 보지 않고도 스캔 결과 인지.

### 4.2 재고검사자 (`INSPECTOR`) 전용 모듈 (`/inventory`)
- **[F-07] 바코드 퀵 조회 (Instant Lookup)**:
  - 랙 바코드 스캔 시 해당 로케이션 내 전 품목 및 수량(실재고, 할당재고, 가용재고) 표시.
  - 상품 바코드 스캔 시 해당 상품이 적치된 모든 로케이션 목록 및 유효기간/수량 표시.
- **[F-08] 로케이션 간 재고 이동 (Bin-to-Bin Transfer)**:
  - 출발 로케이션 스캔 ➔ 품목 스캔 ➔ 수량 입력(또는 박스 스캔) ➔ 도착 로케이션 스캔으로 즉시 전산 이동 처리.
- **[F-09] 긴급/순환 실사 (Cycle Counting)**:
  - 피킹 중 `CMD-SKIP`이 발생한 로케이션/품목이 '긴급 실사 목록'에 자동 등록되어 현장 관리자가 실물 수량 실사 후 즉시 보정.
- **[F-10] 간이 입고 적치 (Put-away)**:
  - 입고 대기 상품을 비어있는 기본 적치 로케이션(`items.default_location_id`)으로 할당 및 적치 완료.

### 4.3 공통 기반 모듈 (Common / Infrastructure)
- **[F-11] 작업자 간편 인증 & 역할 분기**:
  - 전화번호 + PIN 4자리 입력 또는 작업자 고유 바코드 스캔 로그인 ➔ 역할(`PICKER`/`INSPECTOR`) 판별 후 해당 모드로 자동 진입.
- **[F-12] 작업 감사 및 생산성 추적 (Audit Trail)**:
  - `order_items`에 `picker_id`, `picked_at`을 기록하고, 재고 변경 시 `inspector_id`, `adjusted_at` 기록.
- **[F-13] 오프라인 버퍼링 & 실시간 동기화**:
  - Supabase Realtime으로 다른 작업자나 관리자의 주문/재고 변동 무지연 수신.
  - 음영 구역 발생 시 로컬 IndexedDB에 스캔 큐 임시 저장 후 재연결 시 원자적 전송.

---

## 4. Out of Scope — MVP 제외 사항 (mobile-app vs web-app 경계)

mobile-app의 극단적 경량성과 속도 유지를 위해 다음 기능은 **web-app(사무실 관리자용 웹)**으로 이관하고 mobile-app 구현에서 제외합니다.

- ❌ **대시보드 종합 매출/출고 통계 및 엑셀 다운로드** (web-app 전용)
- ❌ **상품/매장/로케이션 마스터 신규 등록 및 수정** (web-app 전용)
- ❌ **바코드 라벨 대량 템플릿 출력(Zebra/브라더 프린터 네트워크 연동)** (web-app 전용)
- ❌ **주문 수기 생성/변경 및 매장 청구서 발행** (web-app 및 기존 g-manager 전용)
- ❌ **다국어(i18n) 지원 및 복잡한 조직 권한 매트릭스** (단순 역할 기반 4단계로 한정)

---

## 5. Technical Architecture & Non-Functional Requirements (비기능 요구사항)

| 항목 | 요구 사양 | 검증 기준 |
|---|---|---|
| **응답 레이턴시** | 바코드 스캔 후 검증 및 상태 변경 응답 < 50ms | 로컬 네트워크 기준 p95 < 50ms |
| **동시성 무결성** | 동일 로케이션/품목 동시 피킹 시 마이너스 재고 차단 | PostgreSQL Atomic Update (`qty >= 1`) 및 제약조건 검증 |
| **모바일 UI 최적화** | 풀스크린 PWA, 하단/상단 브라우저 UI 숨김, 큰 텍스트(24px+) | 5.5인치 모바일 화면 기준 시인성 확보 |
| **스캔 하드웨어 연동** | Bluetooth HID 링스캐너 키보드 이벤트 전역 인터셉트 | Enter/Tab 종단 문자 자동 파싱 및 Focus 독립 동작 |

---

## 6. Release Phases (단계별 개발 계획)

- **Phase 1: DB 마이그레이션 & Supabase 백엔드 셋업 (1주차)**
  - `DB 개선 사항.md` 기반 PostgreSQL 스키마 **9개 테이블** (�실 + 감사 로그 + 실사 큐 포함) + 데이터 무결성 제약조건 적용.
  - Server Component / Next.js Route Handler 기반 핵심 서비스 레이어(`inventory.service`) 구축.
- **Phase 2: [우선 착수] 현장 재고 조사/실사 모듈 PWA 구현 (2주차)**
  - 한 손 조작 최적화 바코드 퀵 조회(로케이션/SKU 스캔) 및 재고 실사(Cycle Count) 플로우.
  - 전산 재고 vs 실물 재고 오차 비교, 즉시 보정 및 사유 코드 입력 UI.
  - 로케이션 간 재고 이동(Bin-to-Bin) 및 실사 감사 로그(Audit Log) 연동.
- **Phase 3: No-Click 초고속 피킹 러너 PWA 구현 (3주차)**
  - 전역 바코드 이벤트 리스너, S-Shape 동선 정렬 엔진, Cold Chain 게이트, 사운드/햅틱 엔진 구축.
- **Phase 4: 현장 검증 및 하드웨어 튜닝 (4주차)**
  - 블루투스 핑거 링 스캐너 실물 연동 테스트, 오프라인 IndexedDB 동기화 검증, 작업자 UAT.

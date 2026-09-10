# 프로젝트 작업 목록 (Task Tracker)

> [!NOTE]
> AI 에이전트는 작업 착수 시 `[/]`(진행중)로 표시하고, 완료 시 `[x]`(완료)로 업데이트합니다.

---

## 📌 Phase 0: 기획 & 설계 (Design-First)
- [x] 0.1 제품 기획서 확정 (`docs/01_PRD.md` - 현장 WMS_APP 및 역할별 분기)
- [x] 0.2 아키텍처 결정 확정 (`docs/02_ADR.md` - ADR-001 ~ ADR-007)
- [x] 0.3 초기 핵심 기능 TRD 작성 (`docs/03_TRD.md` - TRD-001 재고 조사/실사 모듈)
- [x] 0.4 UI/UX 디자인 시스템 가이드 보완 (`docs/04_UI_GUIDE.md` - 현장 인스펙션 컴포넌트)
- [x] 0.5 바코드 시스템 표준 규격 및 연동 설계서 확정 (`docs/Glife WMS Barcode System.md`)
- [x] 0.6 구글 시트(glifeinfo) vs Supabase DB 일관성 및 충돌 분석 완료 (`docs/issues/01_google_sheets_vs_supabase_consistency_analysis.md`)

---

## 🏗️ Phase 1: 기반 아키텍처 & DB 셋업
- [x] 1.1 Supabase(PostgreSQL) DDL 스크립트 작성 및 마이그레이션 적용 (**9개 핵심 테이블**: stores, users, locations, items, inventory, orders, order_items, `inventory_adjustments`, `cycle_count_requests`)
  - locations 신표준 좌표 체계 적용 (Zone·Aisle·Bay·Level[A/B/C/D]·Bin), 바코드 형식: `LOC-A0105B01`
  - users.role: `'ADMIN'`, `'INSPECTOR'`, `'PICKER'`, `'STORE'` (4종)
  - RLS 정책 적용 (inventory_adjustments: INSPECTOR/ADMIN INSERT만 허용)
  - Realtime 구독 활성화 (cycle_count_requests 테이블)
  - `adjust_inventory_stock()` PostgreSQL RPC 함수 등록
- [x] 1.2 프로젝트 디렉토리 뼈대 생성 (`src/components`, `src/services`, `src/types`, `src/app/(inventory)`)
- [x] 1.3 DB 클라이언트 및 기본 서비스 레이어 (`services/inventory.service.ts`)
- [x] 1.4 전역 바코드 이벤트 리스너(HID 링스캐너) 및 사운드/햅틱 피드백 셋업

---

## 🔍 Phase 2: [우선 착수] 현장 재고 조사/실사 모듈 (`/inventory`)
- [x] 2.1 [F-07] 바코드 퀵 조회 뷰어 `/inventory/lookup` (로케이션 스캔 ➔ 품목 리스트 / 상품 스캔 ➔ 로케이션 목록)
- [x] 2.2 [F-09] 실사 큐 화면 `/inventory/queue` (URGENT 긴급/NORMAL 정기 목록, Realtime 배너 연동)
- [x] 2.3 [F-09] 재고 실사(Cycle Count) UI `/inventory/count` (One-Tap 전산 일치, 인라인 퀵 증감 패드 `[-10]/[-1]/[+1]/[+10]`)
- [x] 2.4 [F-09] 재고 오차 보정 API 및 PostgreSQL 단일 트랜잭션 (원장 갱신 + 감사 로그 기록)
- [x] 2.5 [F-08] 로케이션 간 재고 이동 `/inventory/transfer` (Bin-to-Bin Transfer)
- [x] 2.6 [F-09] 피킹 결품(`CMD-SKIP`) 자동 연동 긴급 실사 큐 조회 및 완료 처리

---

## ⚡ Phase 3: No-Click 초고속 피킹 러너 (`/picking/run`)
- [x] 3.1 [F-01] 송장/주문 목록 조회 및 피킹 작업 시작
- [x] 3.2 [F-02/F-03] S-Shape 최단 동선 정렬 및 Cold Chain 게이트
- [x] 3.3 [F-04/F-05] No-Click 바코드 연속 스캔 및 3대 명령 바코드(`SKIP`/`UNDO`/`DONE`)
- [x] 3.4 [F-06] 실시간 오디오/진동 피드백 및 결과 안내

---

## 🛡️ Phase 4: QA, 현장 하드웨어 연동 및 안정성 검증
- [x] 4.1 아키텍처 규칙 검증 통과 (`scripts/validate-arch.ps1` 실행)
- [ ] 4.2 핑거 링 스캐너 연속 스캔 및 50ms 이내 반응성 검증
- [x] 4.3 동시 실사/피킹 시 마이너스 재고 차단 원자성 검증
- [x] 4.4 오프라인 서비스 워커 캐싱 및 IndexedDB 큐 테스트

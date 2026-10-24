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

---

## 🏬 Phase 5: web-app 3PL 멀티테넌트 매장 관리 (Store Master)
- [x] 5.1 `stores` 테이블 스키마 확장 (`client_id` FK, `is_active`, `phone`, `contact_person`, `note`, `(client_id, store_no)` 복합 유니크 마이그레이션 적용)
- [x] 5.2 `stores.service.ts` 서비스 레이어 및 주문 참조 검사 (`checkStoreOrderCount`) 구현
- [x] 5.3 Server Actions (`createStoreAction`, `updateStoreAction`, `toggleStoreStatusAction`, `deleteStoreAction`) 안전 처리 구현
- [x] 5.4 매장 UI 컴포넌트 (`StoresTable`, `StoreFormDialog`, `StoreDeleteDialog`) 및 `/master/stores` 페이지 구현
- [x] 5.5 AppSidebar `Master Data` 하위 메뉴에 `Stores` 연동 및 프로덕션 빌드 검증 완료

---

## 🔐 Phase 6: web-app Google OTP (TOTP) 무과금 2단계 인증 구현
- [x] 6.1 `docs/web-app/03_TRD.md`에 전화번호+비밀번호 + Google OTP (TOTP) 설계 반영
- [x] 6.2 `src/lib/supabase/middleware.ts`에 AAL2 다중인증 검증 및 라우팅 가드 적용
- [x] 6.3 `src/app/(auth)/login/page.tsx`에 2단계 Google OTP 인증 UI 및 챌린지 로직 구현
- [x] 6.4 `src/app/(dashboard)/settings/security/page.tsx`에 QR 코드 스캔 기반 Google OTP 등록/해제 관리 UI 구현
- [x] 6.5 `src/components/AppSidebar.tsx` 메뉴 연동 및 전체 빌드 검증

---

## 👤 Phase 7: web-app 내 계정 정보(My Account Profile & Password) 수정 기능
- [x] 7.1 Server Actions (`getMyProfileAction`, `updateMyProfileAction`, `updateMyPasswordAction`) 구현
- [x] 7.2 `/settings/profile` 페이지 및 프로필/비밀번호 변경 UI 컴포넌트 구현
- [x] 7.3 `TopHeader` 상단 계정 정보 프로필 바로가기 및 `AppSidebar` 내 메뉴 연동
- [x] 7.4 전체 프로덕션 빌드 검증
## 📦 Phase 8: Items Master 한글 필드 완전 제거 및 RLS 보안 강화 (방안 1 적용)
- [x] 8.1 Supabase `items` 테이블에서 `name_kr`, `desc_kr` 컬럼 완전 영구 삭제 (`DROP COLUMN`)
- [x] 8.2 RLS 무한 재귀 영구 방지용 `is_admin()`, `get_my_role()` `SECURITY DEFINER` 함수 마이그레이션 적용
- [x] 8.3 `web-app` 서비스, 타입 (`database.ts`, `supabase.ts`), 액션, UI 폼 (`ItemFormDialog`), CSV 템플릿 정리 완료
- [x] 8.4 Next.js Turbopack 프로덕션 빌드 검증 완료

---

## 🚀 Phase 9: web-app 대시보드 고도화 Phase 2 (LogistiX Flow™ & 공정 품질 관제탑)
- [x] 9.1 `dashboard.service.ts`에 `getLogistixFlowMetrics()` 서비스 함수 및 프로세스별 SLA 지표 집계 로직 구축 (Dock-to-Stock 리드타임, CMD-SKIP 회피율 연계 가이드 피킹 정확도 %, 순환실사 장부 일치율 %)
- [x] 9.2 `DockToStockGauge.tsx` 반원형(180도) SVG 속도계 게이지 컴포넌트 개발 (목표 30분 마커, 진행도 색상 코딩, 실시간 수치 표출)
- [x] 9.3 `ProcessQualityCard.tsx` 5대 엔드투엔드 공정 카드 컴포넌트 개발 (Receiving, Place Smart, Guided Picking, Packing QC, Cycle Count 정확도 및 실시간 SLA 뱃지)
- [x] 9.4 `LogistixFlowPanel.tsx` 통합 관제탑 패널 컴포넌트 개발 및 실시간 연결 상태 표시
- [x] 9.5 `WarehouseSelector.tsx` 멀티 창고(전체 센터, 김포 메인센터, 용인 저온센터) 셀렉터 개발 및 URL SearchParams 동기화
- [x] 9.6 `src/app/(dashboard)/dashboard/page.tsx` 메인 대시보드 페이지에 통합 연동 및 Turbopack 프로덕션 빌드 검증 완료

---

## 💡 Phase 10: web-app 대시보드 고도화 Phase 3 (Inventory Intelligence & Tabbed Navigation)
- [x] 10.1 `dashboard.service.ts`에 `getInventoryIntelligenceData()` 순수 실데이터 쿼리 함수 구축 (Dead Stock 60일 분석, 안전재고 미달 Smart Reorder 큐, 고회전 품목 Dynamic Slotting 전진 배치)
- [x] 10.2 `DashboardTabNav.tsx` 대시보드 상단 세그먼트 탭 네비게이션 구현 (`Operations` / `Inventory Intelligence` / `2D Layout Map`) 및 URL SearchParams 연동
- [x] 10.3 `DeadStockCard.tsx` 체화 재고 지표 요약 및 비유동 자산 목록 카드 구현
- [x] 10.4 `SmartReorderQueue.tsx` 결품 방지 자동 보충 제안 및 1-Click PO 생성 카드 구현
- [x] 10.5 `DynamicSlottingCard.tsx` 보관 온도 불일치 및 피킹 동선 최적화 슬로팅 제안 카드 구현
- [x] 10.6 `src/app/(dashboard)/dashboard/page.tsx`에 탭별 분기 렌더링 통합 및 Turbopack 프로덕션 빌드 검증 완료

---

## 🗺️ Phase 11: web-app 대시보드 고도화 Phase 4 (2D Digital Warehouse Layout Map & Rack Elevation)
- [x] 11.1 `dashboard.service.ts`에 `getWarehouseMapData()` 실데이터 쿼리 함수 구축 (표준 바코드 좌표 `LOC-Zone(1)Aisle(2)Bay(2)Level(1)Bin(2)` 파싱, 베이별 점유율 및 S자 피킹 동선 좌표 계산)
- [x] 11.2 `WarehouseMapViewer.tsx` 2D 디지털 플로어 플랜 뷰어 컴포넌트 개발 (입고 하역장, 통로별 랙 베이, 냉장 챔버 구역, 출하 패킹장, S-Shape 피킹 동선 토글 및 점유율 히트맵 범례)
- [x] 11.3 `RackElevationView.tsx` 4단 수직 랙 입면도(Elevation View) 다이얼로그 개발 (Level A 골든존 뱃지, 빈 슬롯/실제 SKU 정보, 수량 및 재고 가치 표출)
- [x] 11.4 `warehouse-layout.actions.ts` 표준 창고 좌표 생성 및 초기화 Server Action 개발 (데이터 부재 시 원클릭 표준 레이아웃 생성 지원)
- [x] 11.5 `dashboard/page.tsx` 3번째 탭(`2D Layout Map`)에 통합 연동 및 Turbopack 프로덕션 빌드 검증 완료

---

## 📝 Phase 12: web-app 주문 상세(Order Details) 편집 및 라인 아이템 관리
- [x] 12.1 `03_TRD.md` 설계 문서 및 `task.md` 갱신
- [x] 12.2 `orders.service.ts`에 주문 일자, 품목 수정/추가/삭제 및 마스터 상품 검색 서비스 함수 개발
- [x] 12.3 `orders/actions.ts` Server Action 개발 및 캐시 무효화(`revalidatePath`) 연동
- [x] 12.4 `OrderDetailsDialog.tsx` UI 고도화 (Order Date 수정, 품목별 UOM/단가/수량 인라인 편집, 실시간 합계 계산, 품목 삭제 및 신규 품목 검색/추가)
- [x] 12.5 빌드 검증 및 QA 테스트 완료

---

## 🧾 Phase 13: web-app 인보이스 발행일(Invoice Date) 분리 관리
- [x] 13.1 `/grill-me` 설계 인터뷰 및 `docs/web-app/03_TRD.md` §6.3 반영
- [x] 13.2 `lib/date.ts` NY 기준 날짜 변환/검증 헬퍼 (`toAtlantaDateString`, `validateInvoiceDate`)
- [x] 13.3 `orders.service.ts#updateOrder` `invoiceDate` 지원 + 쓰기 전 서버 검증 (invoice_date ≥ order_date)
- [x] 13.4 `OrderDetailsDialog.tsx` Invoice Date 카드 (Not set 표시, ✕ 초기화, 인라인 검증, 발행 후 수정 확인창)
- [x] 13.5 TypeScript 검사 통과
- [x] 13.6 브라우저 수동 QA (설정/초기화/주문일 충돌 차단/발행 주문 확인창)

---

## 💰 Phase 14: web-app 주문 품목 UOM 변경에 따른 단가 연동 및 목록/상세 합계 일치화
- [x] 14.1 `lib/pricing.ts`의 `getOrderItemEffectivePrice()`에서 주문 품목 UOM 우선 참조 버그 수정 및 `orderItem.price` fallback 보완
- [x] 14.2 `services/orders.service.ts`의 `getOrders()` 총액 계산 로직을 확정 단가(`item.price`) 최우선 사용으로 통일
- [x] 14.3 `OrderDetailsDialog.tsx`의 `handleUomChange()`에서 UOM별 단가 추천 매핑 정확도 보정
- [x] 14.4 `ORD-20261015-KCVM` 주문 데이터 검증 ($787.16 ➔ $915.60 상세와 100% 일치) 및 Turbopack 프로덕션 빌드 검증 완료
- [x] 14.5 `OrderDetailsDialog.tsx` & `orders.service.ts`에 G-manager 피킹 수량(`picked_qty`) 우선 연동 및 0개 피킹(미출고/결품) 시각적 표시 지원

---

## 🏭 Phase 15: web-app 창고 로케이션 구조 동적 설정 및 120개 로케이션(Zone A/F 10-Bay 3-Level) 개편
- [x] 15.1 창고 표준 구조 재구성: Zone A(상온 1 aisle × 10 bays × 3 tiers × 2 bins = 60), Zone F(냉동 1 aisle × 10 bays × 3 tiers × 2 bins = 60), 총 120개 로케이션 DB 마이그레이션 및 샘플 재고 분산 적재 완료
- [x] 15.2 `warehouse-layout.actions.ts`에 동적 창고 구조 조회(`getWarehouseStructureConfigAction`) 및 적용(`applyWarehouseStructureAction`) 서버 액션 개발
- [x] 15.3 대화형 창고 구조 설정 모달(`WarehouseStructureModal.tsx`) 개발 (Aisles, Bays, Levels, Bins 자유 설정 및 120개 원클릭 프리셋 지원)
- [x] 15.4 `WarehouseMapViewer.tsx` 2D 디지털 플로어 뷰어 10개 Bay 5열 반응형 그리드 최적화 및 구조 설정 버튼 연동
- [x] 15.5 `LocationsTable.tsx` 로케이션 마스터 페이지에 "Configure Structure" 액션 버튼 마운트
- [x] 15.6 `dashboard.service.ts` 동적 층수 감지 및 랙 점유율 계산 로직 고도화 완료
- [x] 15.7 2D 레이아웃 맵 랙 입면도(`RackElevationView`)에서 특정 Bin 슬롯 클릭 시 상품 검색 및 수량 직접 배정/수정/비우기 기능 개발 (`BinAssignModal.tsx`, `bin-inventory.actions.ts`)

---

## 🗑️ Phase 16: web-app 특정 주문 삭제 기능 (Order Deletion)
- [x] 16.1 `docs/web-app/03_TRD.md` §6.4 주문 삭제 설계 및 안전 정책 반영
- [x] 16.2 `orders.service.ts#deleteOrder` 서비스 로직 구현 (주문 유효성 검사, `order_items` 및 `orders` 연계 삭제)
- [x] 16.3 `orders/actions.ts#deleteOrderAction` Server Action 구현 및 캐시 무효화(`revalidatePath`)
- [x] 16.4 `OrdersTable.tsx` 각 행 삭제 버튼(Trash2) 및 확인 모달(Dialog) 연동, sonner 토스트 피드백
- [x] 16.5 `OrderDetailsDialog.tsx` 모달 Footer에 'Delete Order' 액션 및 2차 확인 모달 추가
- [x] 16.6 Next.js Turbopack 빌드(`npm run build`) 및 아키텍처 규칙 검증 통과

---

## 🧾 Phase 17: web-app 주문 다중 인보이스 번호(Grocery, General, Frozen) 조회 및 UI 고도화
- [x] 17.1 `services/orders.service.ts`의 `OrderData` 인터페이스에 `category_invoices` 필드 추가 및 주문 검색 필터(`search`)에 `invoice_number` 검색 지원 추가
- [x] 17.2 `OrdersTable.tsx`의 `Invoice No.` 컬럼에 다중 인보이스 뱃지(`+N`) 및 카테고리별 툴팁(Tooltip) 조회 연동
- [x] 17.3 `OrderDetailsDialog.tsx` 상단 요약 카드에 카테고리별 인보이스(Grocery, General, Frozen) 개별 뱃지 칩 표시 연동
- [x] 17.4 TypeScript 정적 검증(`tsc --noEmit`), Next.js Turbopack 프로덕션 빌드 및 아키텍처 규칙 검증 통과

---

## 🔄 Phase 18: WMS 주문 상태(Order Status) G-manager 실무 표준 통일
- [x] 18.1 `types/database.ts`에 G-manager 표준 상태(`PACKED`, `INVOICED`, `SHIPPED`) 추가
- [x] 18.2 `OrdersTable.tsx` 필터 드롭다운을 실데이터 기준 6대 표준 상태(`Pending`, `Picking`, `Packed`, `Invoiced`, `Shipped`, `Canceled`)로 전면 개편 및 뱃지 색상/라벨 매핑 확장
- [x] 18.3 `OrderDetailsDialog.tsx`의 `statusBadgeVariants`에 6대 표준 상태 뱃지 매핑 완료
- [x] 18.4 `services/dashboard.service.ts` 대시보드 KPI 쿼리(출고량, 피킹 완료율 등)에서 실제 상태(`SHIPPED`, `PACKED`, `INVOICED`)가 포함되도록 통계 쿼리 확장
- [x] 18.5 TypeScript 타입 검증 및 Next.js Turbopack 빌드 검증 완료

---

## 🏢 Phase 19: 주문 화주사(Client) 데이터 정합성 보정 (23건 ➔ 24건 일치화)
- [x] 19.1 WMS vs G-manager 주문 수 불일치 원인 분석 (WMS의 Active Client `Food Depot` 필터링 및 `Cosmetics Co` 소속 주문 1건 확인)
- [x] 19.2 식품 품목 주문 `ORD-20261014-W78H`의 `client_id`를 `Cosmetics Co`에서 `Food Depot`(`9df4f04d-b4be-4256-bfa5-aa48c4fd5d13`)으로 업데이트
- [x] 19.3 WMS `Food Depot` 기준 주문 24건 및 DB 전체 24건 100% 일치 확인 완료

---

## 📄 Phase 20: web-app 주문 관리(Orders) 페이지네이션 및 페이지당 표시 개수 컨트롤 구현
- [x] 20.1 `(dashboard)/orders/page.tsx`에 `limit` 쿼리 파라미터 지원 및 기본 표시 개수를 50개(`limit = 50`)로 확장 (초기 24건 전체 및 SHIPPED 주문 즉시 노출)
- [x] 20.2 `OrdersTable.tsx`에 `currentPage`, `pageSize` 프로퍼티 연동 및 하단 페이지네이션 UI 구현 (Showing X to Y of Z orders, 페이지당 20/50/100/200개 선택 드롭다운, 이전/다음/첫/마지막/페이지번호 이동 버튼)
- [x] 20.3 TypeScript 정적 검증(`tsc --noEmit`), Next.js Turbopack 프로덕션 빌드(`npm run build`) 및 아키텍처 규칙 검증 통과 완료

---

## 🏬 Phase 21: web-app 특정 주문 화주사(Client) 수정 기능 구현
- [x] 21.1 `docs/web-app/03_TRD.md` §6.5 주문 화주사 변경(Client Reassignment) 설계 반영
- [x] 21.2 `services/orders.service.ts`: `OrderData`에 `client` 조인 추가, `UpdateOrderPayload.clientId` 인터페이스 확장 및 `updateOrder` 서비스에 `orders.client_id` 원자적 갱신 로직 구현
- [x] 21.3 `(dashboard)/orders/page.tsx`: `getClients()` 연동하여 화주사 마스터 목록 조회 및 `OrdersTable`에 주입
- [x] 21.4 `OrdersTable.tsx`: 테이블에 `Client` 컬럼(화주사명, 코드) 추가 및 `OrderDetailsDialog`로 `clients` 목록 전달
- [x] 21.5 `OrderDetailsDialog.tsx`: 상단 요약 카드에 `Client` 카드 배치, 화주사 `Select` 드롭다운 제공, 변경 감지(`isClientChanged`, `Modified` 뱃지, `isDirty` 연동) 및 `Save Changes` 클릭 시 주문 일자/품목과 함께 일괄 저장 연동
- [x] 21.6 `OrderDetailsDialog.tsx` Client 카드 드롭다운 트리거에 UUID 대신 화주사 이름(`Food Depot`, `Cosmetics Co` 등)이 명확히 표시되도록 `SelectValue` 렌더링 보정
- [x] 21.7 TypeScript 정적 검증(`tsc --noEmit`), Next.js Turbopack 프로덕션 빌드(`npm run build`) 및 아키텍처 규칙 검증 통과 완료

---

## 🏷️ Phase 22: web-app 주문 상태(Order Status) 변경 기능 구현
- [x] 22.1 `docs/web-app/03_TRD.md` §6.6 주문 상태 변경(Order Status Update) 설계 반영 (지원 상태: `PENDING`, `PICKING`, `PACKED`, `INVOICED`, `SHIPPED`, `CANCELED`)
- [x] 22.2 `services/orders.service.ts`: `updateOrderStatus(orderId, status)` 단독 상태 변경 서비스 구현 및 `updateOrder(payload)`에 `status` 헤더 갱신 지원 추가 (DB 제약조건 및 유효 상태 검증)
- [x] 22.3 `(dashboard)/orders/actions.ts`: `updateOrderStatusAction(orderId, status)` Server Action 추가 (`/orders`, `/dashboard` 캐시 재검증 포함)
- [x] 22.4 `OrdersTable.tsx`: 테이블의 Status 컬럼은 고정된 뱃지(Read-Only)로 명확히 표시하여 실수 방지 및 안정성 확보
- [x] 22.5 `OrderDetailsDialog.tsx`: 다이얼로그 헤더의 기존 정적 뱃지를 상태 선택 `<Select>` 드롭다운으로 교체, `isStatusChanged` 감지 시 `Modified` 표시 및 `isDirty` / `Save Changes` 통합 저장 연동
- [x] 22.6 TypeScript 정적 검증, Next.js Turbopack 프로덕션 빌드(`npm run build`) 및 아키텍처 규칙 검증 통과 완료

---

## 🏷️ Phase 23: web-app 선반 랙 실물 라벨 인쇄(Shelf Rack Labels) 규격 구현
- [x] 23.1 선반 랙 공식 물리적 라벨 규격(100mm × 45mm, 단별 컬러 밴드, 44pt 시각적 계층화) 컴포넌트(`ShelfRackLabelCard`) 구현
- [x] 23.2 4대 단(Level) 컬러 밴드(A단 초록, B단 노랑/골드, C단 파랑, D단 보라) 및 구역(Zone A 상온, Zone F 냉동) 뱃지 스타일링 반영
- [x] 23.3 브라우저 인쇄 CSS 및 `@page` 설정에 `-webkit-print-color-adjust: exact` 적용하여 컬러 밴드 색상 누락 방지 및 롤 라벨지(100×45mm), A4(2열 그리드), Letter(2열 그리드) 완벽 호환
- [x] 23.4 DB 등록 로케이션 일괄 불러오기(`initialDbCodes`), 4단 컬러 밴드 샘플, Zone A/F 원클릭 프리셋 지원
- [x] 23.5 TypeScript 정적 검증, Next.js Turbopack 프로덕션 빌드(`npm run build`) 및 아키텍처 규칙 검증 통과 완료

---

## 📱 Phase 24: web-app 선반 랙 2D QR 코드 라벨 시스템 및 영문화 통합
- [x] 24.1 `qrcode.react` 라이브러리 도입 및 고해상도 벡터 SVG(`QRCodeSVG`) 기반 2D QR 코드 라벨 렌더링 구현
- [x] 24.2 라벨 심볼로지 선택 기능 구현 (`symbology: "qr" | "barcode"`, 기본값: `qr` 2D QR 코드)
- [x] 24.3 100mm × 45mm 실물 규격 최적화: 좌측 휴먼 리더블 좌표계(구역/통로/베이/단/빈 44pt 시각적 계층화) + 우측 34mm 고정밀 정방형 QR 코드 + 우측 7.5mm 단별 컬러 밴드(초록/골드/파랑/보라) 배치
- [x] 24.4 브라우저 인쇄 미리보기에서 배경 그래픽 옵션 해제 시에도 컬러 밴드가 인쇄되도록 SVG `<rect>` 벡터 처리
- [x] 24.5 프로젝트 전역 언어 영문화(English Unified) 원칙 적용 및 US Letter(8.5" × 11") 10라벨/시트 절단선 가이드 통합
- [x] 24.6 Next.js Turbopack 프로덕션 빌드(`npm run build`) 및 아키텍처 규칙 검증 통과 완료

---

## ⚡ Phase 25: 선반 랙 2D QR 코드 지그재그(Staggered / Anti-Crossfire) 배치 및 LEVEL 용어 통일
- [x] 25.1 용어 전면 통일: 기존 `Tier` 용어를 글로벌 물류창고 표준인 `Level`로 전체 교체 (`LEVEL A/B/C/D`, `Level A • Bin 01` 등)
- [x] 25.2 오스캔 방지(Anti-Crossfire) 지그재그(Staggered) 교차 배치 구현:
  - **Level A (1단/바닥)**: 좌측 좌표계/뱃지, 우측 정방형 QR 코드 + 하단 간이 로케이션 코드(`01-05-A`)
  - **Level B (2단/골든존)**: 좌측 정방형 QR 코드 + 하단 간이 로케이션 코드(`01-05-B`), 우측 좌표계/뱃지
  - **Level C (3단/상단)**: 좌측 좌표계/뱃지, 우측 정방형 QR 코드 + 하단 간이 로케이션 코드(`01-05-C`)
  - **Level D (4단/최상단)**: 좌측 정방형 QR 코드 + 하단 간이 로케이션 코드(`01-05-D`), 우측 좌표계/뱃지
- [x] 25.3 QR 코드 정렬 모드 컨트롤러 구현 (`⚡ Zig-Zag (Staggered)`, `➡️ All Right`, `⬅️ All Left`)
- [x] 25.4 Next.js Turbopack 프로덕션 빌드(`npm run build`) 및 아키텍처 규칙 검증 통과 완료

---

## ↕ Phase 26: 선반 랙 2D QR 코드 상하 지그재그(Vertical Top ↔ Bottom) 교차 배치 구현
- [x] 26.1 상하 지그재그(Vertical Zig-Zag) 레이아웃 엔진 구현:
  - **Level A / C (홀수단)**: QR 코드를 **상단(TOP)**에 고정(24mm 벡터 QR) + 하단에 녹색 계열 간이 로케이션 태그(`01-05-A` + `▲ TOP QR`) 배치, 좌측 좌표계 하단 집중
  - **Level B / D (짝수단)**: 상단에 황색 계열 간이 로케이션 태그(`01-05-B` + `▼ BTM QR`) + QR 코드를 **하단(BOTTOM)**에 고정, 좌측 좌표계 상단 집중
- [x] 26.2 가로 선반 빔(Shelf Rack Beam) 라벨 연속 부착 시 수평 스캐너 레이저/카메라 오스캔(Crossfire) 완전 차단
- [x] 26.3 다채널 정렬 모드 컨트롤러 확장 (`↕ Top ↔ Bottom (Vertical Zig-Zag • 기본값)`, `↔ Left ↔ Right (Horizontal)`, `⤡ Diagonal (Corner)`)
- [x] 26.4 Next.js Turbopack 프로덕션 빌드(`npm run build`) 및 아키텍처 규칙 검증 통과 완료

---

## 📐 Phase 27: 바코드/QR 라벨 카드 세로 길이 컴팩트(Compact Beam Fit) 최적화
- [x] 27.1 선반 랙 빔 규격에 맞춘 컴팩트 세로 길이 축소 (기존 45mm → **30mm 컴팩트 기본값**, 35mm 미디엄, 45mm 풀사이즈 동적 지원)
- [x] 27.2 100mm × 30mm 슬림 폼팩터 내 요소 정밀 재배치:
  - 우측 6.5mm 수직 Level 컬러 밴드(A 초록 / B 골드 / C 파랑 / D 보라, SVG 벡터)
  - 28mm 정밀 2D QR 코드 컬럼: 상단(Level A/C) ↔ 하단(Level B/D) 상하 지그재그 유지, `01-05-A` 간이 태그 및 `▲ TOP` / `▼ BTM` 미니 뱃지 일체형 배치
  - 좌측 좌표계 계층 구조: 통로/베이(15pt bold) + 단/빈(27pt black mono) + 기계 판독용 로케이션 코드(`LOC-A0105B01`) 및 뱃지 완벽 압축
- [x] 27.3 라벨 높이 선택 UI(`CardHeight`: `30mm Compact • Default`, `35mm Medium`, `45mm Full Size`) 및 US Letter 시트 인쇄 효율 60% 향상 (장당 10개 → **16개 출력**)
- [x] 27.4 Next.js Turbopack 프로덕션 빌드(`npm run build`), 브라우저 비주얼 검증 및 아키텍처 규칙 검증 통과 완료

---

## 📏 Phase 28: 바코드/QR 라벨 카드 가로 길이 컴팩트(Compact Width 65mm / 60mm) 최적화
- [x] 28.1 랙 빔 공간 절약형 컴팩트 가로 너비 구현:
  - 세로 길이는 안정적인 가독성을 위해 표준 `45mm` 유지
  - 가로 너비를 기존 100mm(4")에서 **`65mm Compact Width (2.5")` 기본값**으로 전면 최적화
  - 가로 너비 동적 선택기(`CardWidth`: `60mm Slim`, `65mm Compact • 기본값`, `75mm Medium`, `100mm Full Width`) 구현
- [x] 28.2 65mm 컴팩트 너비 내 시각 요소 정밀 압축:
  - 좌측 좌표계: 상단 통로/베이(14pt mono bold) + 하단 30pt 대형 단/빈(B01) 수직 스택으로 좁은 너비에서 가독성 극대화
  - 우측 25.5mm 2D QR 코드 컬럼: 상하 지그재그(Top ↔ Bottom) 및 미니 태그 일체형 유지
  - 우측 5.5mm Level 컬러 밴드: SVG 벡터 100% 보존
## 📷 Phase 29: mobile-app 스마트폰 내장 카메라 바코드/2D QR 스캐너 연동
- [x] 29.1 `html5-qrcode` 기반 모바일 웹 전용 고성능 카메라 스캐너 컴포넌트(`CameraBarcodeScanner.tsx`) 구현:
  - 2D QR 코드, Code 128, UPC/EAN 등 물류창고 바코드 멀티 포맷 지원
  - 플래시/손전등(Torch) 토글 및 전면/후면 카메라 전환 지원
  - 스캔 레이저 뷰파인더 애니메이션 및 스캔 시 사운드/진동 피드백(`feedback.normal()`) 연동
- [x] 29.2 피킹 러너(`/picking/run`) 상단 헤더에 `Camera` 스캔 버튼 연동 (로케이션 QR 및 품목 바코드 연속 인식)
- [x] 29.3 재고 실사 및 조회(`/inventory/lookup`) 메인 카드에 `Start Phone Camera Scan` 전면 배치 및 수동 입력 폴백 지원
- [x] 29.4 로케이션 간 재고 이동(`/inventory/transfer`) 헤더에 `Camera` 스캔 버튼 연동 (출발지 로케이션 ➔ 품목 ➔ 도착지 로케이션 연속 스캔)
- [x] 29.5 `mobile-app` ESLint(`npm run lint`) 및 Next.js Turbopack 프로덕션 빌드(`npm run build`) 무결점 통과 완료

---

## 🔢 Phase 30: mobile-app Lookup 및 Queue 실사(Count) 진입 버튼 보강
- [x] 30.1 `(inventory)/lookup/page.tsx`: 바코드 스캔 결과 카드에 스캔 대상(`locId` / `itemId`) 기반 `Start Count` 버튼 추가 및 최하단 직접 실사 바로가기 버튼 배치
- [x] 30.2 `(inventory)/queue/page.tsx`: 상단 탭 우측에 `+ Start Count` 고정 버튼 추가 및 대기열 공백 시 직관적인 `Start Direct Count` 액션 카드 표시
- [x] 30.3 TypeScript 정적 타입 검증(`tsc --noEmit`), 프로덕션 빌드 통과 및 Vercel 프로덕션 배포 완료

---

## 🔐 Phase 31: mobile-app 작업자 인증 & 역할 기반 접근 제어 (F-11, TRD-002)
- [x] 31.1 `/grill-me` 설계 인터뷰 (Q1~Q11) 및 `docs/mobile-app/03_TRD.md` TRD-002 작성
- [x] 31.2 DB 마이그레이션: `users.must_change_pin`, `auth_login_attempts` (RLS, service_role 전용)
- [x] 31.3 `@supabase/ssr` 도입, `lib/supabase/server.ts`·`client.ts`, `services/auth.service.ts#requireWorker`
- [x] 31.4 `src/proxy.ts` 라우트 가드 (Next.js 16 proxy, 역할별 리다이렉트, PIN 변경 강제)
- [x] 31.5 `/login` (전화번호 + 6자리 PIN 키패드), `/api/auth/login` (5회 실패 15분 잠금), `/login/change-pin`, ADMIN `/mode`
- [x] 31.6 API 보호: `adjust`·`queue`·`picking/*`에 `requireWorker` 적용, 본문 `userId` 제거 (`USR-TEST-1` 삭제)
- [x] 31.7 오프라인 스캔 큐에 `userId` 저장 및 사용자 불일치 시 전송 보류 + 경고
- [x] 31.8 web-app: PICKER/INSPECTOR 로그인 차단, Users 화면 6자리 PIN 검증 + 임시 PIN 발급
- [x] 31.9 TRD-002 §6 수용 기준 QA, lint/build, `validate-arch.ps1` 통과

---

## 🔍 Phase 32: mobile-app 현장 재고 실데이터 조회(Lookup) & 로케이션 이동(Transfer) 및 목 데이터 전면 제거
- [x] 32.1 `services/inventory.service.ts`에 `lookupByLocation(code)` 및 `lookupByItem(code)` 실데이터 조인 쿼리 함수 구현 (실재고, 할당재고, 가용재고 `on_hand - allocated` 정확 계산)
- [x] 32.2 `app/api/inventory/lookup/route.ts` API Route Handler 신설 (`GET /api/inventory/lookup?type=location|item&code=...`, `requireWorker(INSPECTOR_ROLES)` 세션 검증)
- [x] 32.3 `(inventory)/lookup/page.tsx` 실데이터 연동 (스캔 시 API 즉시 조회, 로케이션 내 적치 상품 목록 카드, 상품 스캔 시 보관 로케이션 목록 카드 렌더링 및 `Start Count` 바로가기)
- [x] 32.4 `transferInventoryStock()` 서비스 및 트랜잭션 함수 구현 (출발지 차감 + 도착지 증가 원자성 보장, 마이너스 재고 차단, 감사 로그 기록)
- [x] 32.5 `services/inventory.service.ts#transferInventoryStock` 및 `app/api/inventory/transfer/route.ts` API Route Handler 신설 (`POST /api/inventory/transfer`, 작업자 ID 세션 주입)
- [x] 32.6 `(inventory)/transfer/page.tsx` 4단계 위저드(출발지 로케이션 스캔 ➔ 이동 품목 선택 ➔ 수량 패드 ➔ 도착지 스캔) 실API 연동 및 햅틱/사운드 피드백 적용
- [x] 32.7 `picking.service.ts` 목 데이터(`mock-order-1/2`, `mock-item-1/2/3`) 전면 제거 및 실데이터 주문/로케이션 조회 연결
- [x] 32.8 `(inventory)/page.tsx` 대시보드 및 `(inventory)/count/page.tsx` 하드코딩 제거 및 실 DB 집계/조회/조정 반영
- [x] 32.9 TypeScript 정적 타입 검증, Next.js Turbopack 빌드(`npm run build`) 및 아키텍처 규칙 검증 통과

---

## ⏱️ Phase 33: mobile-app 피킹 작업자 감사 추적 & 생산성 연동 (F-12 Audit Trail)
- [ ] 33.1 `services/picking.service.ts`에 피킹 품목 확정 및 세션 작업자(`picker_id`), 완료시각(`picked_at`) 기록 RPC/서비스 함수 구현
- [ ] 33.2 `app/api/picking/complete/route.ts` API Route Handler 생성 및 `(picking)/picking/run/page.tsx` 피킹 완료(`CMD-DONE` 및 전체 품목 완료) 시 실세션 `picker_id` 연계 저장
- [ ] 33.3 `web-app` 주문 상세(`OrderDetailsDialog`) 및 대시보드 지표에서 실제 피킹 작업자(`first_name`, `phone`) 및 리드타임 표출 연동
- [ ] 33.4 TypeScript 정적 타입 검증, Next.js Turbopack 빌드 및 아키텍처 규칙 검증 통과

---

## 📥 Phase 34: mobile-app 간이 입고 적치 및 초기 재고 설정 모듈 (F-10 Put-away & Initial Stock In)
- [x] 34.1 `docs/mobile-app/03_TRD.md`에 TRD-003 간이 입고 적치 및 초기 재고 설정 상세 설계 작성 (Design-First 원칙 준수)
- [x] 34.2 `services/inventory.service.ts`에 `putAwayStock` 원자적 신규 등록/가산 로직 및 감사 로그(`inventory_adjustments`) 연동 구현
- [x] 34.3 `app/api/inventory/put-away/route.ts` API Route Handler 생성 (`POST /api/inventory/put-away`, `requireWorker(INSPECTOR_ROLES)` 세션 검증)
- [x] 34.4 `(inventory)/put-away/page.tsx` 모바일 현장 입고/초기적치 화면 구현 (로케이션 스캔 ➔ 상품 스캔 ➔ 수량 넘버패드 ➔ 즉시 원장 반영, 오디오/진동 피드백 및 연속 적치 지원)
- [x] 34.5 `(inventory)/layout.tsx` 하단 5대 네비게이션 탭(`Put-away`), 재고 메인 홈 CTA 배너, `/inventory/lookup` 빈 랙 원클릭 연동 배치
- [x] 34.6 TypeScript 정적 타입 검증, Next.js Turbopack 빌드(`npm run build`) 및 아키텍처 규칙 검증 통과

---

## 🚀 Phase 35: 카메라 바코드 스캔 확인성 강화, RLS 예외 보정, 목데이터 원장 초기화 및 v0.1.1 프로덕션 배포
- [x] 35.1 `CameraBarcodeScanner` 시각적 확정 피드백 강화: 초록색 록온 타겟팅 사각 프레임, 650ms 딜레이 프로그레스 바, 디코딩 코드 프리뷰 뱃지, 오디오/햅틱 피드백 적용
- [x] 35.2 `mobile-app` Put-away 단계별 UUID 파싱 및 Supabase RLS 권한 수정: `createAdminClient`를 통한 재고 원장(`inventory`) 및 감사 로그(`inventory_adjustments`) 안전 트랜잭션 기록
- [x] 35.3 DB 시드/목데이터 101개 전량 삭제(`public.inventory` 0건 초기화): `web-app` 로케이션 마스터(56개 랙 전체 `Empty Slot (0 units)`) 및 재고 현황판 클린 상태 전환
- [x] 35.4 `web-app`, `mobile-app` 버전 `v0.1.1` 태깅 및 Git 메인 브랜치 푸시
- [x] 35.5 Vercel 프로덕션 배포 완료 (`web-app`: https://glife-web-app.vercel.app, `mobile-app`: https://glife-mobile-app.vercel.app)

---

## 🎯 Phase 36: 이동(Transfer) 후 잔여 0 재고 슬롯 필터링 및 화주사(`client_id`) 일관성 보정 (v0.1.3 배포)
- [x] 36.1 `web-app` 재고 현황(`Inventory Status`): 이동 후 잔여 수량이 0인 슬롯(`on_hand_qty = 0 && allocated_qty = 0`)이 테이블에 노출되지 않도록 실재고 보유 조건(`on_hand_qty > 0 || allocated_qty > 0`) 필터링 적용
- [x] 36.2 `mobile-app` 로케이션 및 품목 조회(`lookupByLocation`, `lookupByItem`): 이동 완료로 빈 랙 슬롯이 조회되지 않도록 실재고 보유 조건 추가
- [x] 36.3 `mobile-app` 적치 및 이동 시 상품의 `client_id` 원자적 전파 및 누락 방지 처리
- [x] 36.4 DB 내 `client_id` 미지정 잔여 레코드 보정 완료
- [x] 36.5 `web-app`, `mobile-app` v0.1.3 태깅 및 Vercel 프로덕션 배포 완료

---

## 🔄 Phase 37: 4대 앱 통합 재고 라이프사이클 엔진 구축 (OrderAPP, G-manager, WMS Web & Mobile)
- [x] 37.1 DB 테이블 `order_item_allocations` 구축: 주문 품목별 할당 로케이션(`inventory_id`), 수량(`allocated_qty`) 정밀 추적
- [x] 37.2 주문 자동 소프트 할당 RPC(`allocate_single_order_item`, `allocate_order_stock`) 및 트리거(`trg_order_items_inventory_sync`): 주문 인입 즉시 가용 재고 한도 내 로케이션별 `allocated_qty` 자동 증가
- [x] 37.3 주문 상태별 자동 라이프사이클 트리거(`trg_orders_inventory_sync`):
  - `CANCELED` 전환 시: 묶여 있던 `allocated_qty` 자동 환원 (`deallocate_order_stock`)
  - `SHIPPED` 출고 전환 시: `allocated_qty` 해제 + `on_hand_qty` 실물 확정 차감 + `inventory_adjustments` 출고 감사 로그 기록 (`fulfill_order_stock`)
  - `PENDING`/`PICKING` 복구 시: 재할당 자동 실행
- [x] 37.4 기존 활성 주문(`ORD-20261022-C4V8` 등) 미할당 데이터 일괄 동기화 완료 (`sync_all_active_order_allocations`: Shin Cups Black 3박스 할당 정합성 복원)
- [x] 37.5 `mobile-app` 피킹 완료 API(`POST /api/picking/complete`) 신설 및 피킹 화면(`CMD-DONE` 및 전체 완료) 상태 연동
- [x] 37.6 `web-app`, `mobile-app` v0.1.4 릴리스 및 프로덕션 배포

---

## 🛒 Phase 38: OrderAPP 실시간 창고 가용 재고 연동 및 백오더(B안) 안내 체계 구축
- [x] 38.1 `OrderAPP` 재고 정책 설정 모듈 신설 ([`stockPolicy.ts`](file:///C:/Users/boazn/Projects/OrderAPP/dashboard/src/utils/stockPolicy.ts)): B안(`BACKORDER_ALLOWED`) 기본 적용 및 A안(`HARD_LIMIT`) 전환 토글 구조 확립
- [x] 38.2 `OrderAPP` 상품 API([`GET /api/items`](file:///C:/Users/boazn/Projects/OrderAPP/dashboard/src/app/api/items/route.ts)): `inventory` 테이블 병렬 조회를 통한 품목별 실시간 가용 재고(`available_qty = Math.max(0, on_hand - allocated)`) 산출 및 반환
- [x] 38.3 상품 카드 UI 재고 상태 뱃지([`StockBadge`](file:///C:/Users/boazn/Projects/OrderAPP/dashboard/src/app/page.tsx)): 재고 여유(`>10`), 잔여(`1~10`), 품절(`<=0`) 3단계 상태 시각화
- [x] 38.4 수량 선택 위젯([`QtyWidget`](file:///C:/Users/boazn/Projects/OrderAPP/dashboard/src/app/page.tsx)): 가용 재고 초과 시 백오더(초과 예약발주) 실시간 인디케이터 표시 (A안 활성화 시 증량 버튼 자동 차단)
- [x] 38.5 주문 검토 모달 백오더 배너 및 품목별 분할 안내: 초과 품목에 대해 즉시 출고 가능 수량과 예약발주(백오더) 수량 분리 명시 및 주문 메모 자동 태깅(`[백오더 발생: ...]`)
- [x] 38.6 주문 API([`POST /api/order`](file:///C:/Users/boazn/Projects/OrderAPP/dashboard/src/app/api/order/route.ts)): A안(`HARD_LIMIT`) 전환 시 레이스 컨디션을 방지하는 서버사이드 재고 최종 검증 가드 구현
- [x] 38.7 빌드 검증 및 `OrderAPP` GitHub `master` 푸시 배포 완료

---

## 📦 Phase 39: 스테이징(바닥 적치) 로케이션(LOC-S****) 체계 구축 및 Cross-docking(A안) 연동
- [x] 39.1 스테이징 바닥 로케이션 DB 마이그레이션 신설 및 적용 ([`20261023180500_add_staging_locations.sql`](file:///c:/Users/boazn/Projects/WMS/supabase/migrations/20261023180500_add_staging_locations.sql)): 표준 10자리 규격 준수 `LOC-S0101A01` ~ `LOC-S0110A01` (총 10개 구획, `zone_type='A'`) DB upsert 완료
- [x] 39.2 A안(실시간 가용 / Cross-docking) 자동 연동 확인: `inventory`에 등록 시 `available_qty` 즉시 반영 및 주문 자동 소프트 할당(`allocate_single_order_item`) 정합성 검증
- [x] 39.3 `web-app` 라벨 인쇄 시스템 연동 ([`PrintClient.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/app/%28dashboard%29/master/labels/PrintClient.tsx)): `Zone S (Staging Floor)` 전용 앰버 뱃지 스타일링 및 원클릭 바코드 인쇄 프리셋(`LOC-S0101A01~S0110A01`) 탑재
- [x] 39.4 `mobile-app` 바코드 스캔 및 적치/이동 정합성 검증: `Put-away`, `Lookup`, `Relocate`에서 `LOC-S` 접두어 자동 파싱 및 현장 작업 지원 확인

---

## 📷 Phase 40: 카메라 바코드 스캐너 시각 피드백 고도화 (1초 오버랩 & 일치/불일치 검증 UX)
- [x] 40.1 카메라 스캐너 컴포넌트 고도화 ([`camera-scanner.tsx`](file:///c:/Users/boazn/Projects/WMS/mobile-app/src/components/features/camera-scanner.tsx)):
  - 검증 인터페이스(`onValidate`, `onMismatch`) 및 기본 DB 연동 비동기 검증(`defaultValidator`) 탑재
  - **인식영역(사각BOX) 1초(1000ms) 유지 시간 보장**: 급작스러운 화면 전환 방지 및 작업자 시각 인지 확보
  - **일치(성공) 시**: 사각BOX 내 **옅은 녹색 사각형 오버랩**(`bg-emerald-500/25`), 체크 뱃지, 1초 게이지 애니메이션 후 화면 복귀
  - **불일치(실패/미등록) 시**: 사각BOX 내 **적색 사각형 오버랩**(`bg-rose-500/30`), 경고 뱃지, 에러 버저 사운드 후 1초 뒤 화면 복귀
- [x] 40.2 피킹 실행 화면 연동 ([`picking/run/page.tsx`](file:///c:/Users/boazn/Projects/WMS/mobile-app/src/app/%28picking%29/picking/run/page.tsx)):
  - 로케이션 대기 상태(`WAITING_LOCATION`) / 아이템 대기 상태(`WAITING_ITEM`)별 목표 정보 일치 여부 정밀 검증
- [x] 40.3 적치 및 로케이션 이동 화면 연동 ([`put-away/page.tsx`](file:///c:/Users/boazn/Projects/WMS/mobile-app/src/app/inventory/put-away/page.tsx), [`transfer/page.tsx`](file:///c:/Users/boazn/Projects/WMS/mobile-app/src/app/inventory/transfer/page.tsx)):
  - 스캔 대상(`LOCATION` vs `ITEM`) 타입 판별 및 등록 정보 검증 후 녹색/적색 오버랩 적용
- [x] 40.4 모바일 앱 프로덕션 빌드 타입 검증 및 번들 정합성 확인 완료

---

## 🏷️ Phase 41: Item (SKU) Master 품목명 및 Description 병기 표시
- [x] 41.1 품목 마스터 테이블 UI 개선 ([`ItemsTable.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/components/features/master/ItemsTable.tsx)):
  - `Item Name` 컬럼에 `desc_en`이 존재할 경우 `Item Name (Description)` 형식으로 병기 렌더링
  - 검색창 플레이스홀더를 `Search Item Name, SKU, or Description...`으로 확장
- [x] 41.2 마스터 서비스 검색 쿼리 확장 ([`master.service.ts`](file:///c:/Users/boazn/Projects/WMS/web-app/src/services/master.service.ts)):
  - `getItems` 검색 시 `desc_en` 필드도 OR 검색 조건에 포함하여 설명(규격, 용량 등)으로도 품목 검색 지원
- [x] 41.3 `web-app` Next.js 16 프로덕션 빌드 검증 완료

---

## 📊 Phase 42: Inventory Status 및 Audit 이력 품목명 (Description) 병기 표시
- [x] 42.1 재고 현황 테이블 UI 개선 ([`InventoryTable.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/components/features/inventory/InventoryTable.tsx)):
  - `Item Name` 컬럼에 `desc_en`이 존재할 경우 `Item Name (Description)` 형식으로 병기 렌더링
  - 엑셀 다운로드 내보내기 시에도 `Item Name (Description)` 적용
  - 검색창 플레이스홀더를 `Search Item Name, SKU, or Description...`으로 확장
- [x] 42.2 재고 서비스 검색 쿼리 확장 ([`inventory.service.ts`](file:///c:/Users/boazn/Projects/WMS/web-app/src/services/inventory.service.ts)):
  - `getInventoryList` 조회 시 `desc_en` 필드 추가 및 Description 키워드 OR 검색 조건 연동
- [x] 42.3 재고 감사 이력 화면 연동 ([`AuditTable.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/components/features/inventory/AuditTable.tsx), [`audit.service.ts`](file:///c:/Users/boazn/Projects/WMS/web-app/src/services/audit.service.ts)):
  - 감사 로그 테이블 및 엑셀 리포트에서도 `Item Name (Description)`으로 통일 표기
- [x] 42.4 `web-app` Next.js 16 프로덕션 빌드 검증 완료

---

## 🏷️ Phase 43: 선반 랙 로케이션 라벨 인쇄 2단(Level A, B) 정합성 일치화 (존재하지 않는 C단 제거)
- [x] 43.1 2D 레이아웃 맵 및 실제 창고 구조(Level A, Level B 2단)와 불일치하던 가상 C단 코드(`LOC-*C01`) 제거
- [x] 43.2 [`warehouse-layout.ts`](file:///c:/Users/boazn/Projects/WMS/web-app/src/types/warehouse-layout.ts) 및 [`warehouse-layout.actions.ts`](file:///c:/Users/boazn/Projects/WMS/web-app/src/app/actions/warehouse-layout.actions.ts)의 `DEFAULT_WAREHOUSE_CONFIG` 기본 레벨(단수)을 3에서 2로 조정
- [x] 43.3 [`PrintClient.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/app/%28dashboard%29/master/labels/PrintClient.tsx):
  - Zone A / Zone F 프리셋 버튼 클릭 시 실제 DB에 등록된 2단 로케이션(`A01`, `A02`, `B01`, `B02`)을 우선 로드하도록 개선
  - fallback 상수에서 존재하지 않는 C단(`C01`)을 완전히 제거하고 2단 규격에 맞게 동기화
  - 페이지 최초 마운트 시 DB 실제 2단 로케이션 코드로 기본 텍스트에어리어 초기화
- [x] 43.4 Next.js 16 프로덕션 빌드(`npm run build`) 통과 및 Vercel 프로덕션 배포 완료

---

## 🎨 Phase 44: web-app 주문 상태(Order Status)별 고유 컬러 뱃지 및 필터 UI 개선
- [x] 44.1 전용 주문 상태 뱃지 컴포넌트 신설 ([`OrderStatusBadge.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/components/features/orders/OrderStatusBadge.tsx)):
  - **PENDING (대기)**: 앰버/노랑 (`bg-amber-500/15 text-amber-700 border-amber-500/30`) + 앰버 도트
  - **PICKING (피킹 중)**: 블루 (`bg-blue-500/15 text-blue-700 border-blue-500/30`) + 펄스 애니메이션 도트
  - **PACKED (패킹 완료)**: 퍼플 (`bg-purple-500/15 text-purple-700 border-purple-500/30`) + 퍼플 도트
  - **INVOICED (인보이스 발행)**: 인디고 (`bg-indigo-500/15 text-indigo-700 border-indigo-500/30`) + 인디고 도트
  - **SHIPPED (출고 완료)**: 에메랄드/그린 (`bg-emerald-500/15 text-emerald-700 border-emerald-500/30`) + 에메랄드 도트
  - **CANCELED (주문 취소)**: 로즈/레드 (`bg-rose-500/15 text-rose-700 border-rose-500/30`) + 로즈 도트
- [x] 44.2 주문 목록 테이블 연동 ([`OrdersTable.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/components/features/orders/OrdersTable.tsx)):
  - 테이블 Status 컬럼을 `OrderStatusBadge`로 교체하여 한눈에 식별 가능하도록 시각화
  - 상단 Status 필터 드롭다운 각 옵션에 컬러 인디케이터 도트 적용
- [x] 44.3 주문 상세 다이얼로그 연동 ([`OrderDetailsDialog.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/components/features/orders/OrderDetailsDialog.tsx)):
  - 다이얼로그 헤더의 Status 변경 드롭다운 트리거 및 선택 아이템에 `OrderStatusBadge` 적용
- [x] 44.4 Next.js 16 프로덕션 빌드(`npm run build`) 통과 및 배포 완료

---

## 📊 Phase 45: 대시보드 원형(도넛) 차트 툴팁 외측 표시 및 중앙 메트릭 오버랩 방지
- [x] 45.1 `StorageCapacityChart` ([`StorageCapacityChart.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/components/features/dashboard/StorageCapacityChart.tsx)):
  - 호버 툴팁이 도넛 중앙의 `24.2% OCCUPIED` 메트릭과 오버랩되는 현상 해결
  - `containerRef` 및 `ResizeObserver`를 통한 컨테이너 크기 동적 감지
  - 커서의 방위각/사분면에 따라 툴팁 카드를 도넛 링 외측(Top은 상단, Bottom은 하단, Left/Right는 좌우 외측)으로 자동 투영하는 `getOutsideTooltipStyle` 적용
  - 컬러 도트, 호버 품목/구역명, 빈 개수 및 백분율을 선명하게 표시
- [x] 45.2 `InventoryStatusChart` ([`InventoryStatusChart.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/components/features/dashboard/InventoryStatusChart.tsx)):
  - `Inventory Health Index` 도넛 차트 역시 원형 외측으로 툴팁 팝업이 위치하도록 `getOutsideTooltipStyle` 일원화
  - 범례 컬러 도트와 수량(units), 백분율(%)을 함께 표기
- [x] 45.3 Next.js 16 프로덕션 빌드(`npm run build`) 통과 및 Vercel 프로덕션 배포 완료

---

## 📅 Phase 46: 아이템 유통기한(Expiration Date) 및 선입선출(FEFO) 체계 구축
- [x] 46.1 DB 스키마 마이그레이션 스크립트 작성 ([`20261024101500_add_inventory_expiration_tracking.sql`](file:///c:/Users/boazn/Projects/WMS/supabase/migrations/20261024101500_add_inventory_expiration_tracking.sql)):
  - `public.inventory`에 `expiration_date DATE`, `lot_no VARCHAR(50)` 컬럼 및 인덱스 신설
  - `public.items`에 `min_outbound_days INT DEFAULT 14` (출고 최소 잔여 유효일수) 추가
  - 기존 재고 대상 일괄 초기화(Seed/Backfill) 쿼리 포함
- [x] 46.2 TypeScript 데이터베이스 타입 동기화 ([`database.ts`](file:///c:/Users/boazn/Projects/WMS/web-app/src/types/database.ts), [`supabase.ts`](file:///c:/Users/boazn/Projects/WMS/web-app/src/types/supabase.ts)):
  - `inventory` 테이블 Row/Insert/Update에 `expiration_date`, `lot_no` 필드 추가
  - `items` 테이블에 `min_outbound_days` 필드 추가
- [x] 46.3 재고 현황 서비스 및 테이블 연동 ([`inventory.service.ts`](file:///c:/Users/boazn/Projects/WMS/web-app/src/services/inventory.service.ts), [`InventoryTable.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/components/features/inventory/InventoryTable.tsx)):
  - `getInventoryList`에 유통기한 및 Lot 번호 조회 및 계산 로직 연동
  - 재고 테이블에 `Exp. Date / D-Day` 및 `Lot No.` 컬럼 추가
  - 남은 일수에 따른 단계별 컬러 뱃지(`D-Day/Expired` 붉은색 펄스, `D-Critical(≤14일)` 붉은색 뱃지, `D-Warning(15~45일)` 노란색 뱃지, `D-Safe(>45일)` 초록색 뱃지) 구현
  - 엑셀 내보내기에 유통기한(`Exp. Date`) 및 `Lot No` 포함
- [x] 46.4 대시보드 FEFO & 만료 위험 분석 모듈 신설 ([`ExpirationAlertCard.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/components/features/dashboard/ExpirationAlertCard.tsx), [`dashboard.service.ts`](file:///c:/Users/boazn/Projects/WMS/web-app/src/services/dashboard.service.ts), [`dashboard/page.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/app/(dashboard)/dashboard/page.tsx)):
  - `getExpirationRiskMetrics()`로 전체 재고 중 만료 임박(Critical/Warning/Safe) 건수 및 수량, 긴급 FEFO 큐 산출
  - Intelligence 탭 상단 KPI에 `FEFO Near-Expiry Risk` 카드 배치
  - 하단 분석 영역에 `ExpirationAlertCard`를 배치하여 로케이션, Lot, D-Day, 재고 수량 우선순위 표기
- [x] 46.5 Next.js 16 프로덕션 빌드(`npm run build`) 통과 및 Vercel 프로덕션 배포 완료

---

## 📱 Phase 47: 모바일 앱 입고 적치(Put-away) 유통기한(Expiration Date) & Lot 번호 실시간 입력 연동
- [x] 47.1 모바일 앱 타입 및 API 확장 ([`supabase.ts`](file:///c:/Users/boazn/Projects/WMS/mobile-app/src/types/supabase.ts), [`route.ts`](file:///c:/Users/boazn/Projects/WMS/mobile-app/src/app/api/inventory/put-away/route.ts)):
  - `inventory` 테이블 Row 타입에 `expiration_date`, `lot_no` 필드 추가
  - `/api/inventory/put-away` 요청 본문에서 `expirationDate` 및 `lotNo` 수신 및 서비스 전달
- [x] 47.2 모바일 재고 서비스 고도화 ([`inventory.service.ts`](file:///c:/Users/boazn/Projects/WMS/mobile-app/src/services/inventory.service.ts)):
  - `findItemRecord` 및 `lookupByItem`에서 `shelf_life_days` 및 `min_outbound_days` 조회 지원
  - `putAwayStock`에서 적치 시 `expiration_date` 및 `lot_no`를 `inventory`에 upsert 반영
  - `inventory_adjustments` 변경 로그에 Expiration Date 및 Lot No 기록
- [x] 47.3 모바일 입고 적치 UI 고도화 ([`put-away/page.tsx`](file:///c:/Users/boazn/Projects/WMS/mobile-app/src/app/inventory/put-away/page.tsx)):
  - 상품 스캔 시 품목 마스터의 `shelf_life_days`를 읽어 **입고일 + Shelf Life 일수로 기본 유통기한 자동 계산 및 입력**
  - 당일 날짜 기반 기본 Lot 번호(`LOT-YYMMDD-SKU`) 자동 생성
  - Step 3 화면에 **유통기한(FEFO) & 로트 번호 입력 카드** 배치
  - D-Day 실시간 계산 뱃지 및 빠른 날짜 프리셋(`+30일`, `+90일`, `+180일`, `+1년`) 원클릭 지원
  - 적치 완료 성공 화면에 등록된 `Exp. Date (FEFO)` 및 `Lot No` 명확히 표기
- [x] 47.4 모바일 앱 Next.js 16 프로덕션 빌드(`npm run build`) 검증 통과 완료

---

## ⚡ Phase 48: 품목별 소진율(Velocity) & 리드타임 기반 가용재고(Available) 동적 임계치 자동 산출 체계 구축
- [x] 48.1 DB 스키마 마이그레이션 적용 ([`20261024130000_add_lead_time_and_dynamic_stock_thresholds.sql`](file:///c:/Users/boazn/Projects/WMS/supabase/migrations/20261024130000_add_lead_time_and_dynamic_stock_thresholds.sql), [`20261024130500_update_dynamic_thresholds_rpc.sql`](file:///c:/Users/boazn/Projects/WMS/supabase/migrations/20261024130500_update_dynamic_thresholds_rpc.sql)):
  - `public.items` 테이블에 `lead_time_days INT DEFAULT 7` (공급 리드타임), `target_service_level NUMERIC(3, 2) DEFAULT 0.95` (결품 방지 신뢰수준 95%) 컬럼 신설
  - 통계적 동적 임계치 산출 RPC 함수 `calculate_item_dynamic_thresholds(p_client_id, p_lookback_days)` 구축 (275개 SKU 대상 실시간 소진율 $ADU$, 출고 변동성 $\sigma_D$, 안전재고 $SS$, 재주문점 $ROP$, 잉여 상한 $Surplus$ 자동 집계)
  - `supabase db push`를 통해 원격 프로덕션 DB 마이그레이션 및 권한 부여 완료
- [x] 48.2 재고 서비스 백엔드 연동 ([`inventory.service.ts`](file:///c:/Users/boazn/Projects/WMS/web-app/src/services/inventory.service.ts)):
  - `getItemDynamicThresholdsMap()` 함수 신설 및 `getInventoryList` 병렬 조회 연동
  - `items` 쿼리에 `min_stock_qty`, `lead_time_days` 컬럼 추가 및 각 인벤토리 행에 `dynamicThreshold` 메타데이터 자동 매핑
- [x] 48.3 가용재고(Available) 컬러 뱃지 및 임계치 설정 UI 구현 ([`InventoryTable.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/components/features/inventory/InventoryTable.tsx)):
  - 텍스트 없이 깔끔한 4단계 컬러 수치 뱃지 (🔴 Stockout / 🟠 Low / 🟢 Optimal / 🔵 Surplus)
  - **Thresholds 설정 팝오버**:
    - ⚡ **Auto-Tuned Mode (동적 통계 산출)**: 실시간 일평균 소진율($ADU$)과 공급 리드타임($L$) 기반 품목별 맞춤 $SS$ 및 $ROP$ 실시간 적용
    - ⚙️ **Manual Mode (수동 고정값)**: Low / Optimal 임계치 직접 입력 및 `localStorage` 영구 보존
  - Available 배지 호버 시 품목별 소진 속도 및 임계치 세부 내역(`Daily Burn`, `Lead Time`, `Safety Stock`, `Reorder Point`) 툴팁 제공
  - 엑셀 내보내기 리포트에 `Daily Velocity (ADU)`, `Safety Stock`, `Reorder Point`, `Lead Time` 자동 포함
- [x] 48.4 Next.js 16 프로덕션 빌드(`npm run build`) 타입 및 번들링 100% 통과 완료

---

## 👥 Phase 49: 사용자 관리(User Management) 안전 삭제(Safe Deletion) 및 외래키 연계 해결
- [x] 49.1 원인 규명: 과거 주문(`orders.user_id`), 재고 조정(`inventory_adjustments.adjusted_by`), 실사 요청(`cycle_count_requests`)에 참조된 유저 삭제 시 외래키 제약조건(`violates foreign key constraint`)으로 인한 DB 레벨 삭제 차단 현상 확인
- [x] 49.2 DB 마이그레이션 적용 ([`20261024134000_cascade_user_deletion.sql`](file:///c:/Users/boazn/Projects/WMS/supabase/migrations/20261024134000_cascade_user_deletion.sql)):
  - `orders.user_id` 외래키 `ON DELETE SET NULL` 제약조건 변경
  - `inventory_adjustments.adjusted_by` 컬럼 NOT NULL 해제 및 `ON DELETE SET NULL` 적용
  - `cycle_count_requests` (`requested_by`, `reported_by`, `completed_by`) NOT NULL 해제 및 `ON DELETE SET NULL` 적용
  - `supabase db push`를 통해 원격 프로덕션 DB 배포 완료
- [x] 49.3 백엔드 삭제 액션 강화 ([`actions.ts`](file:///c:/Users/boazn/Projects/WMS/web-app/src/app/(dashboard)/settings/users/actions.ts)):
  - `deleteUserAction`: 삭제 전 연관된 외래키 참조 명시적 nullify 처리, `auth_login_attempts` 잔여 로그인 잠금 기록 정리, `public.users` 및 `auth.users` 2단계 완전 삭제 파이프라인 구축
- [x] 49.4 프론트엔드 UX 고도화 ([`UsersTable.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/components/features/settings/UsersTable.tsx)):
  - 테이블 Row 'Manage' 컬럼에 원클릭 삭제(`Trash2`) 버튼 직관적 추가
  - 모달 내 Delete 버튼 및 행 삭제 버튼 클릭 시 실시간 로딩 토스트(`toast.loading`) 및 성공/실패 피드백 제공
- [x] 49.5 Next.js 16 프로덕션 빌드(`npm run build`) 검증 100% 통과 완료

---

## 🎭 Phase 50: 사용자 역할(Role) 변경 즉시 반영 및 DB enum 동기화
- [x] 50.1 원인 규명:
  - PostgreSQL의 `user_role` enum 타입에 `'SUPERVISOR'`가 누락되어 있어 드롭다운에서 SUPERVISOR 선택 시 `22P02 invalid input value for enum user_role: "SUPERVISOR"` DB 오류 발생
  - 테이블의 Role 셀렉트 변경 시 클라이언트 상태 업데이트 및 `router.refresh()` 누락으로 변경 사항이 즉각 뷰에 반영되지 않음
  - 'Edit User' 모달 폼에 Role 선택 필드가 누락되어 정보 수정 창에서 역할 변경 불가
- [x] 50.2 DB 마이그레이션 적용 ([`20261024135000_add_supervisor_to_user_role.sql`](file:///c:/Users/boazn/Projects/WMS/supabase/migrations/20261024135000_add_supervisor_to_user_role.sql)):
  - `ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'SUPERVISOR'` 원격 프로덕션 DB 배포 완료
- [x] 50.3 Server Actions 동기화 강화 ([`actions.ts`](file:///c:/Users/boazn/Projects/WMS/web-app/src/app/(dashboard)/settings/users/actions.ts)):
  - `updateUserRoleAction`: `public.users`와 `auth.users` user_metadata 동시 원자적 갱신
  - `updateUserAction`: 모달 폼 저장 시 `role` 필드 반영 및 Supabase Auth 메타데이터 연계 동기화
- [x] 50.4 프론트엔드 반응형 상태 및 UI 개선 ([`UsersTable.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/components/features/settings/UsersTable.tsx)):
  - 테이블 내 드롭다운 변경 시 낙관적 업데이트(Optimistic Update) 적용 및 에러 시 자동 롤백
  - 작업 진행 상황 실시간 토스트(`Updating role to...`) 안내
  - 'Edit User' 모달에 Role 셀렉트 박스 추가
  - 역할 수정/삭제 완료 후 `router.refresh()` 및 로컬 상태 동기화로 무새로고침 즉각 반영
- [x] 50.5 Next.js 16 프로덕션 빌드(`npm run build`) 검증 100% 통과 완료

---

## 📊 Phase 51: [1단계] 다중 시트 통합 재고 리포트(Executive Multi-Sheet Excel) 체계 구축
- [x] 51.1 `lib/export.ts` 다중 시트 엑셀 내보내기 엔진 (`exportMultiSheetExcel`) 구현 (열 너비 자동 계산 및 워크시트 분할)
- [x] 51.2 5대 전문 워크시트 자동 생성 파이프라인 구축 ([`InventoryTable.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/components/features/inventory/InventoryTable.tsx)):
  - Sheet 1: `All Inventory` (전체 재고 현황 및 로케이션, ADU, SS, ROP, DOS)
  - Sheet 2: `Reorder Suggestions` (발주 제안서: Available ≤ ROP, 긴급도 Critical/High/Normal, 부족 수량, 추천 발주량 ROQ, 리드타임)
  - Sheet 3: `Stockout Risk (DOS)` (결품 위험: DOS ≤ 7일 품목 정렬, 일일 소진율, 잔여일수)
  - Sheet 4: `FEFO & Expiry Alert` (유통기한 임박/만료: D-Day 순 정렬, 잔여 일수, Lot 번호, 상태 라벨)
  - Sheet 5: `Overstock & Dead Stock` (잉여/부동 재고: Available ≥ Surplus 및 최근 30일 무출고 품목)
- [x] 51.3 `InventoryTable` 상단에 [Export All Reports (5-in-1 .xlsx)] 스마트 내보내기 버튼 탑재

---

## 📈 Phase 52: [2단계] 종합 재고 분석 보고서 허브(`/inventory/reports`) 구축
- [x] 52.1 리포트 전용 백엔드 집계 서비스 구축 ([`services/reports.service.ts`](file:///c:/Users/boazn/Projects/WMS/web-app/src/services/reports.service.ts))
- [x] 52.2 4대 핵심 KPI 카드 및 인터랙티브 탭 UI 구현 ([`InventoryReportsView.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/components/features/inventory/InventoryReportsView.tsx))
- [x] 52.3 보고서 전용 라우트 생성 ([`app/(dashboard)/inventory/reports/page.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/app/(dashboard)/inventory/reports/page.tsx))
- [x] 52.4 사이드바 네비게이션 서브메뉴 연동 ([`AppSidebar.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/components/AppSidebar.tsx))
- [x] 52.5 Next.js 16 프로덕션 빌드(`npm run build`) 100% 통과 검증 완료

---

## 🏷️ Phase 53: 바코드 라벨 인쇄 센터 다목적화 (랙 로케이션 vs 아이템 상품 바코드 모드)
- [x] 53.1 데이터 레이어 확장: `master/labels/page.tsx`에서 `locations` 및 `items` 마스터 목록 동시 로드
- [x] 53.2 `ItemBarcodePrintClient.tsx` 아이템 바코드 인쇄 컴포넌트 개발:
  - 품목 검색 및 빠른 선택, 품목별 인쇄 매수(Copies) 증감 패드
  - 바코드 형식(Code128 1D 바코드 vs QR Code) 및 라벨 규격(롤 라벨 50×30mm, 60×40mm, 80×50mm / A4 24칸)
  - `Item Name (Description)` 공식 포맷 표기
  - 브라우저 인쇄(`@media print`) 무결점 최적화 레이아웃
- [x] 53.3 `MasterLabelsHub.tsx` 모드 선택 허브 래퍼 구축 (상단 탭 전환: 📍 Rack Location vs 🏷️ Item Barcode)
- [x] 53.4 Next.js 16 프로덕션 빌드(`npm run build`) 100% 통과 검증 완료

---

## 🎨 Phase 54: 랙 로케이션 라벨(Rack Locations Labels) 설정 & 인쇄 화면 UX/UI 전면 개편
- [x] 54.1 정보 계층 구조(Hierarchy) 최적화:
  - 상단 비대했던 4단 레벨 카드들을 슬림한 인라인 컬러 뱃지 리본(`Level A~D Color Band Legend`)으로 압축
  - 좌측 설정 패널(7 cols)과 우측 타겟 로케이션 큐 패널(5 cols)의 2열 그리드 구조로 정돈
- [x] 54.2 라벨 설정(Dimensions & Symbology) 조작성 개선:
  - Label Width (60mm / 65mm Default / 75mm / 100mm) & Height (45mm / 35mm / 30mm) 모던 필(Pill) 셀렉터 적용
  - 바코드 심볼(2D QR Code vs 1D Barcode) 및 Anti-Crossfire 오독 방지 지그재그 정렬(Top-Bottom, Left-Right, Diagonal) 컨트롤 정리
  - Paper Size 및 재단 보조선(Cut-Line) 토글 버튼 직관화
- [x] 54.3 인쇄 대상 로케이션 관리 및 프리셋 고도화:
  - 원클릭 퀵 프리셋 칩(`All Locations`, `Zone A`, `Zone F`, `Staging Floor 01~10`, `A~D Demo`, `Clear`)
  - 실시간 대상 로케이션 수 카운트 뱃지 및 모노스페이스 코드 텍스트에어리어
- [x] 54.4 인쇄 미리보기(Print Preview) 사용자 경험 강화:
  - 실제 크기(Actual Size 100%) vs 축소 개요(Compact Overview 85%) 줌 토글 탑재
  - 화면상에서 수십 장의 라벨 검토 시 가독성 및 조작 편의성 극대화
- [x] 54.5 Next.js 16 프로덕션 빌드(`npm run build`) 100% 통과 검증 완료

---

## 🛠️ Phase 55: 랙 로케이션 패널 높이 동기화 및 아이템 바코드 전체 검색/카테고리 필터 고도화
- [x] 55.1 랙 로케이션 큐(Target Locations Queue) 패널 높이 동기화 및 스크롤 개선:
  - CSS Grid `items-stretch` 및 `min-h-0` flexbox 체계를 적용하여 좌측 `Geometry & Hardware Alignment` 카드와 우측 큐 카드의 높이를 1:1 완벽 일치
  - 로케이션 코드 Textarea를 flex-1 확장 및 `overflow-y-auto` 독립 세로 스크롤로 구성하여 수십~수백 개 코드 입력 시에도 좌측 카드 높이를 초과하지 않고 정돈된 뷰 유지
- [x] 55.2 아이템 바코드(Item Barcodes) 전체 품목 검색 및 카테고리 필터 개선:
  - 기존 초기 화면의 15개 제한(`slice(0, 15)`)을 제거하여 전체 288개 SKU가 스크롤 가능한 카탈로그에 표시되도록 개선
  - 13개 카테고리(Beverage, General, Candy, Nuts, Ramyun 등) 원클릭 필터 드롭다운 탑재
  - 스마트 토큰 다중 검색(SKU 하이픈 유무 무관 일치, Name, Description, Category, UPC) 및 실시간 검색어 초기화(Clear) 버튼 지원
  - `MasterLabelsPage` 및 `getItems`에 3PL 활성 클라이언트 무관 창고 전체 품목 로드 안전 장치(Fallback) 적용
- [x] 55.3 Next.js 16 프로덕션 빌드(`npm run build`) 100% 통과 검증 완료















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

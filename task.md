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
- [x] 22.4 `OrdersTable.tsx`: 테이블의 Status 컬럼에 인라인 `<Select>` 드롭다운 컴포넌트(`OrderStatusCell`) 연동 (상태 즉시 변경, 로딩 스피너 및 sonner 토스트 피드백)
- [x] 22.5 `OrderDetailsDialog.tsx`: 다이얼로그 헤더의 기존 정적 뱃지를 상태 선택 `<Select>` 드롭다운으로 교체, `isStatusChanged` 감지 및 `isDirty` / `Save Changes` 통합 저장 연동
- [x] 22.6 TypeScript 정적 검증, Next.js Turbopack 프로덕션 빌드(`npm run build`) 및 아키텍처 규칙 검증 통과 완료


-- ==============================================================================
-- Phase 1 - Step 3: Tenant Composite Indexes for High-Speed Querying
-- Description: 멀티테넌트 환경에서 테이블 풀스캔을 원천 방지하고 테넌트별 초고속 조회를 보장하는 복합 인덱스 생성
-- ==============================================================================

-- 1. 화주사(clients) 인덱스
CREATE INDEX IF NOT EXISTS idx_clients_tenant_code 
ON public.clients(tenant_id, code);

-- 2. 품목(items) 인덱스: SKU 조회 및 활성 상태 필터링 최적화
CREATE INDEX IF NOT EXISTS idx_items_tenant_sku 
ON public.items(tenant_id, sku);

CREATE INDEX IF NOT EXISTS idx_items_tenant_active 
ON public.items(tenant_id, is_active);

-- 3. 재고(inventory) 인덱스: 품목별/로케이션별 재고 실시간 집계 최적화
CREATE INDEX IF NOT EXISTS idx_inventory_tenant_item 
ON public.inventory(tenant_id, item_id);

CREATE INDEX IF NOT EXISTS idx_inventory_tenant_location 
ON public.inventory(tenant_id, location_id);

-- 4. 로케이션(locations) 인덱스: 바코드 스캔 및 랙 좌표 검색 최적화
CREATE INDEX IF NOT EXISTS idx_locations_tenant_code 
ON public.locations(tenant_id, code);

-- 5. 주문(orders) 인덱스: 대시보드 상태별 탭 및 주문 일자 정렬 최적화
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status 
ON public.orders(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_orders_tenant_date 
ON public.orders(tenant_id, order_date DESC);

-- 6. 주문 상세(order_items) 인덱스: 주문별 품목 리스트 조회 최적화
CREATE INDEX IF NOT EXISTS idx_order_items_tenant_order 
ON public.order_items(tenant_id, order_id);

-- 7. 매장/거래처(stores, partners) 인덱스: partners는 code 대신 name 컬럼 사용
CREATE INDEX IF NOT EXISTS idx_stores_tenant_no 
ON public.stores(tenant_id, store_no);

CREATE INDEX IF NOT EXISTS idx_partners_tenant_name 
ON public.partners(tenant_id, name);

-- 8. 번들 변환(item_conversions) 인덱스: De-kit 자동 해체 시 부모 품목 매핑 최적화
CREATE INDEX IF NOT EXISTS idx_conversions_tenant_parent 
ON public.item_conversions(tenant_id, parent_item_id);

-- 9. 사용자(users) 인덱스: 테넌트별 작업자 및 역할 조회
CREATE INDEX IF NOT EXISTS idx_users_tenant_role 
ON public.users(tenant_id, role);

-- 10. PostgREST 스키마 캐시 새로고침
NOTIFY pgrst, 'reload schema';

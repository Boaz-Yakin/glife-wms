-- ======================================================================================
-- Script: audit-pack-prices.sql
-- Description: 품목 마스터의 UOM 및 가격(pack_price, box_price, unit_price) 정합성 점검 쿼리
-- ======================================================================================

-- 1. [핵심 점검] UOM이 'PACK'인데 pack_price가 0이거나 NULL인 품목 조회
-- 이 품목들은 OrderApp/g-manager/WMS에서 pack_price 대신 fallback(box_price 등)으로 계산될 위험이 있습니다.
SELECT 
    id,
    sku,
    name_en,
    uom,
    unit_price,
    pack_price,
    box_price,
    units_per_box,
    is_active
FROM public.items
WHERE UPPER(TRIM(uom)) = 'PACK'
  AND (pack_price IS NULL OR pack_price = 0);

-- 2. [전체 UOM별 가격 설정 현황 통계]
SELECT 
    UPPER(TRIM(uom)) AS uom_type,
    COUNT(*) AS total_items,
    COUNT(CASE WHEN pack_price > 0 THEN 1 END) AS with_pack_price,
    COUNT(CASE WHEN box_price > 0 THEN 1 END) AS with_box_price,
    COUNT(CASE WHEN unit_price > 0 THEN 1 END) AS with_unit_price
FROM public.items
GROUP BY UPPER(TRIM(uom))
ORDER BY total_items DESC;

-- 3. [신규 함수 및 뷰 검증 쿼리]
-- 마이그레이션(20261012201500_add_effective_pricing_support.sql) 적용 후 테스트
SELECT 
    sku,
    name_en,
    uom,
    unit_price,
    pack_price,
    box_price,
    effective_price,
    public.get_effective_price_for_item(id, 'PACK') AS test_pack_order_price,
    public.get_effective_price_for_item(id, 'BOX') AS test_box_order_price,
    public.get_effective_price_for_item(id, 'EA') AS test_ea_order_price
FROM public.items_with_pricing
LIMIT 10;

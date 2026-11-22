-- Migration: Fix v_warehouse_summary to only include standard CJ 768 slots (aisles 1-3)
-- Excludes regular WMS racking locations (LOC-A*, LOC-F*, LOC-S*)

CREATE OR REPLACE VIEW public.v_warehouse_summary AS
SELECT 
    l.id AS location_id,
    l.code AS location_code,
    l.zone_type,
    COUNT(p.id) AS stored_pallet_count,
    CASE WHEN COUNT(p.id) > 0 THEN '보관중' ELSE '빈자리' END AS slot_status,
    STRING_AGG(DISTINCT p.batch_no, ', ') AS batch_list,
    STRING_AGG(p.pallet_no, ', ' ORDER BY p.pallet_no) AS pallet_list
FROM public.locations l
LEFT JOIN public.pallets p 
    ON l.id = p.location_id AND p.status = 'STORED'
WHERE l.code ~ '^[1-3]-[LR]-[0-9]{2}-(FLOOR|[ABC])$'
GROUP BY l.id, l.code, l.zone_type;

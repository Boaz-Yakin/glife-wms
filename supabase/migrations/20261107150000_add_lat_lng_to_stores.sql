-- ==============================================================================
-- Migration: Add Latitude and Longitude to Stores
-- Description: GPS 기반 매장 근접도 계산 및 자동 선택을 위한 위경도 컬럼 추가
-- ==============================================================================

ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7);

-- 거리 및 위치 기반 룩업 성능 최적화를 위한 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_stores_lat_lng ON public.stores(latitude, longitude);

COMMENT ON COLUMN public.stores.latitude IS '매장 위치 위도 (GPS)';
COMMENT ON COLUMN public.stores.longitude IS '매장 위치 경도 (GPS)';

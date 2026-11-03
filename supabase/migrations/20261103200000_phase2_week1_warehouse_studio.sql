-- ==============================================================================
-- Phase 2 - Week 1: 2D Visual Warehouse Studio & Location Spatial Metadata DDL
-- Description: 창고 2D 인터랙티브 스튜디오를 위한 위치 좌표 DDL 확장 및 레이아웃 직렬화 테이블
-- Target Tables: locations (좌표/온도대 확장), warehouse_layouts (신설)
-- Migration Date: 2026-11-03
-- ==============================================================================

-- 1. locations 테이블 공간 메타데이터 컬럼 확장
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS pos_x NUMERIC(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pos_y NUMERIC(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rotation INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS temperature_zone VARCHAR(20) DEFAULT 'ROOM'; -- ROOM(상온), CHILLED(냉장), FROZEN(냉동)

COMMENT ON COLUMN public.locations.pos_x IS '2D 창고 맵 그리드 X 좌표 (단위: 그리드 칸수 또는 미터)';
COMMENT ON COLUMN public.locations.pos_y IS '2D 창고 맵 그리드 Y 좌표 (단위: 그리드 칸수 또는 미터)';
COMMENT ON COLUMN public.locations.rotation IS '보관 랙 회전 각도 (0, 90, 180, 270도)';
COMMENT ON COLUMN public.locations.temperature_zone IS '로케이션 보관 온도대 (ROOM, CHILLED, FROZEN)';

-- 2. 테넌트별 2D 창고 도면 및 레이아웃 메타데이터 테이블 신설
CREATE TABLE IF NOT EXISTS public.warehouse_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    warehouse_name VARCHAR(100) NOT NULL DEFAULT 'Main Warehouse',
    grid_width INT NOT NULL DEFAULT 60,
    grid_height INT NOT NULL DEFAULT 40,
    layout_data JSONB NOT NULL DEFAULT '{"nodes": [], "viewport": {"zoom": 1, "panX": 0, "panY": 0}}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_tenant_warehouse_name UNIQUE (tenant_id, warehouse_name)
);

COMMENT ON TABLE public.warehouse_layouts IS 'B2B SaaS 테넌트별 2D 비주얼 창고 도면 배치 직렬화 데이터';

-- 3. 테넌트 인덱스 부여
CREATE INDEX IF NOT EXISTS idx_warehouse_layouts_tenant ON public.warehouse_layouts(tenant_id);

-- 4. Supabase Row-Level Security (RLS) 테넌트 격리 정책 적용
ALTER TABLE public.warehouse_layouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation warehouse_layouts" ON public.warehouse_layouts;
CREATE POLICY "Tenant Isolation warehouse_layouts" ON public.warehouse_layouts
FOR ALL USING (
    tenant_id = public.get_current_tenant_id()
    OR public.is_platform_super_admin()
)
WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    OR public.is_platform_super_admin()
);

-- 5. Glife 1호 테넌트 기본 도면 시드 생성 (무중단 보장)
INSERT INTO public.warehouse_layouts (
    tenant_id,
    warehouse_name,
    grid_width,
    grid_height,
    layout_data
)
VALUES (
    '9df4f04d-b4be-4256-bfa5-aa48c4fd5d13',
    'Glife Primary Logistics Center',
    60,
    40,
    '{
        "viewport": {"zoom": 1, "panX": 20, "panY": 20},
        "nodes": [
            {
                "id": "node-dock-01",
                "type": "DOCK",
                "label": "Inbound / Outbound Dock",
                "x": 2,
                "y": 2,
                "width": 12,
                "height": 4,
                "zone": "DOCK",
                "temperature": "ROOM",
                "color": "#64748b"
            },
            {
                "id": "node-staging-01",
                "type": "STAGING",
                "label": "Staging Floor (Zone S)",
                "x": 2,
                "y": 8,
                "width": 12,
                "height": 10,
                "zone": "S",
                "rackPrefix": "S01",
                "bays": 10,
                "levels": 1,
                "bins": 1,
                "temperature": "ROOM",
                "color": "#f59e0b"
            },
            {
                "id": "node-rack-a",
                "type": "RACK",
                "label": "Ambient Shelf (Zone A)",
                "x": 18,
                "y": 4,
                "width": 16,
                "height": 28,
                "zone": "A",
                "rackPrefix": "A01",
                "bays": 10,
                "levels": 2,
                "bins": 2,
                "temperature": "ROOM",
                "color": "#10b981"
            },
            {
                "id": "node-cold-f",
                "type": "RACK",
                "label": "Frozen Storage (Zone F)",
                "x": 38,
                "y": 4,
                "width": 16,
                "height": 28,
                "zone": "F",
                "rackPrefix": "F01",
                "bays": 10,
                "levels": 2,
                "bins": 2,
                "temperature": "FROZEN",
                "color": "#06b6d4"
            }
        ]
    }'::jsonb
)
ON CONFLICT (tenant_id, warehouse_name) DO NOTHING;

-- ======================================================================================
-- Migration: 20261113223000_add_orders_deleted_at_soft_delete.sql
-- Description: 주문 실수 삭제 방지 및 복원을 위한 Soft Delete (deleted_at) 지원
-- ======================================================================================

-- 1. orders 테이블에 deleted_at 컬럼 추가 (NULL = 정상 활성 주문, 타임스탬프 = 휴지통 상태)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- 2. deleted_at 필터링 및 정렬 성능 최적화를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON public.orders(deleted_at);

-- 3. 권한 부여 (기존 권한 유지)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated, service_role;

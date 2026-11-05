-- ======================================================================================
-- Migration: 20261105171500_add_category_credits_to_orders.sql
-- Description: G-manager 인보이스 크레딧(할인/반품) 관리를 위해 orders 테이블에 category_credits 컬럼 추가
-- ======================================================================================

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS category_credits JSONB DEFAULT '{}'::jsonb;

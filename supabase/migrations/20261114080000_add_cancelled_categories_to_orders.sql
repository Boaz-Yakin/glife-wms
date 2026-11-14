-- ======================================================================================
-- Migration: 20261114080000_add_cancelled_categories_to_orders.sql
-- Description: Orders 테이블에 부분 취소된 카테고리 목록(cancelled_categories) 필드 추가
-- ======================================================================================

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS cancelled_categories JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.orders.cancelled_categories IS 'Array of cancelled category names (e.g. ["FROZEN", "GENERAL"]). Items in these categories are excluded from billing and picking, with invoices voided.';

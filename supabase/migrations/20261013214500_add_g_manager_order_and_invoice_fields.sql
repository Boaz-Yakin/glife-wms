-- ======================================================================================
-- Migration: 20261013214500_add_g_manager_order_and_invoice_fields.sql
-- Description: G-manager 통합을 위한 주문 상태, 인보이스 및 피킹 수량 지원 컬럼 추가
-- ======================================================================================

-- 1. order_status ENUM에 G-manager 상태값 확장
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'PACKED';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'INVOICED';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'SHIPPED';

-- 2. orders 테이블: 인보이스 정보 컬럼 추가
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS category_invoices JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS invoice_date DATE;

-- 인보이스 번호 검색용 인덱스
CREATE INDEX IF NOT EXISTS idx_orders_invoice_number ON public.orders(invoice_number);

-- 3. order_items 테이블: 피킹 수량 및 수기 품목 컬럼 추가
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS picked_qty INT,
ADD COLUMN IF NOT EXISTS invoice_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS custom_item_name VARCHAR(255);

-- 4. 현장 수기 품목(미등록 품목) 추가 허용을 위해 item_id NOT NULL 제약 해제
ALTER TABLE public.order_items
ALTER COLUMN item_id DROP NOT NULL;

-- 5. 권한 부여
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated, service_role;
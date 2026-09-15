-- ==========================================
-- Supabase Schema Initialization
-- WMS & OrderApp Migration (Phase 1)
-- ==========================================

-- 1. Custom Types (Enums)
CREATE TYPE user_role AS ENUM ('ADMIN', 'INSPECTOR', 'PICKER', 'STORE');
CREATE TYPE order_status AS ENUM ('PENDING', 'RECEIVED', 'ALLOCATED', 'PICKING', 'PICKED', 'DISPATCHED', 'CANCELED');
CREATE TYPE zone_type AS ENUM ('A', 'F'); -- A: Ambient, F: Frozen
CREATE TYPE partner_type AS ENUM ('MANUFACTURER', 'SUPPLIER', 'BOTH');

-- 2. Tables

-- 2.1 Users (Extends auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone VARCHAR(20) UNIQUE,
    name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'STORE',
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 Stores
CREATE TABLE public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_no VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 Locations
CREATE TABLE public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Format: LOC-Zone(1)Aisle(2)Bay(2)Level(1)Bin(2) e.g., LOC-A0105B01
    code VARCHAR(20) UNIQUE NOT NULL CHECK (code ~ '^LOC-[A-Z][0-9]{2}[0-9]{2}[A-D][0-9]{2}$'),
    zone_type zone_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 Partners (Manufacturers & Suppliers)
CREATE TABLE public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type partner_type NOT NULL DEFAULT 'BOTH',
    contact_person VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 Items
CREATE TABLE public.items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    upc VARCHAR(50),
    name_en VARCHAR(255) NOT NULL,
    name_kr VARCHAR(255),
    item_volume DECIMAL(10, 3),
    desc_en TEXT,
    desc_kr TEXT,
    category VARCHAR(100),
    note TEXT,
    uom VARCHAR(20) NOT NULL,
    box_price DECIMAL(10, 2),
    pack_price DECIMAL(10, 2),
    unit_price DECIMAL(10, 2) NOT NULL,
    units_per_box INT,
    zone_type zone_type NOT NULL DEFAULT 'A',
    min_stock_qty INT DEFAULT 0,
    shelf_life_days INT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    manufacturer_id UUID REFERENCES public.partners(id),
    supplier_id UUID REFERENCES public.partners(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 Inventory (Ledger)
CREATE TABLE public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.items(id),
    location_id UUID NOT NULL REFERENCES public.locations(id),
    on_hand_qty INT NOT NULL DEFAULT 0,
    allocated_qty INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (item_id, location_id),
    CHECK (on_hand_qty >= 0),
    CHECK (allocated_qty >= 0),
    CHECK (on_hand_qty >= allocated_qty) -- Cannot allocate more than on-hand
);

-- 2.6 Orders
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(50) UNIQUE NOT NULL, -- e.g., ORD-20260908-001
    user_id UUID REFERENCES public.users(id),
    store_id UUID NOT NULL REFERENCES public.stores(id),
    status order_status NOT NULL DEFAULT 'PENDING',
    order_date TIMESTAMPTZ DEFAULT NOW(),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.7 Order Items
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id),
    qty INT NOT NULL CHECK (qty > 0),
    uom VARCHAR(20) NOT NULL,
    price DECIMAL(10, 2) NOT NULL, -- Unit price at the time of order
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.8 Inventory Adjustments (History / Logs)
CREATE TABLE public.inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES public.inventory(id),
    adjusted_by UUID NOT NULL REFERENCES public.users(id),
    previous_qty INT NOT NULL,
    new_qty INT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.9 Cycle Count Requests
CREATE TABLE public.cycle_count_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES public.locations(id),
    requested_by UUID NOT NULL REFERENCES public.users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime for cycle_count_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.cycle_count_requests;

-- ==========================================
-- 3. RPC Functions
-- ==========================================

-- RPC: adjust_inventory_stock
-- Safely adjusts inventory on_hand_qty and logs the adjustment
CREATE OR REPLACE FUNCTION public.adjust_inventory_stock(
    p_inventory_id UUID,
    p_new_qty INT,
    p_user_id UUID,
    p_reason TEXT
) RETURNS VOID AS $$
DECLARE
    v_previous_qty INT;
BEGIN
    -- Get current quantity and lock row
    SELECT on_hand_qty INTO v_previous_qty
    FROM public.inventory
    WHERE id = p_inventory_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Inventory record not found';
    END IF;

    -- Update inventory
    UPDATE public.inventory
    SET on_hand_qty = p_new_qty,
        updated_at = NOW()
    WHERE id = p_inventory_id;

    -- Insert log
    INSERT INTO public.inventory_adjustments (inventory_id, adjusted_by, previous_qty, new_qty, reason)
    VALUES (p_inventory_id, p_user_id, v_previous_qty, p_new_qty, p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- 4. Row Level Security (RLS) Policies
-- ==========================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_count_requests ENABLE ROW LEVEL SECURITY;

-- users: Users can read their own profile, ADMIN can read all
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.users FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
);

-- stores, locations, partners, items: Anyone authenticated can read
CREATE POLICY "Authenticated users can view stores" ON public.stores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view locations" ON public.locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view partners" ON public.partners FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view items" ON public.items FOR SELECT TO authenticated USING (true);

-- inventory: Authenticated can read
CREATE POLICY "Authenticated users can view inventory" ON public.inventory FOR SELECT TO authenticated USING (true);

-- orders: STORE sees own, others (ADMIN/PICKER/INSPECTOR) see all
CREATE POLICY "Stores can view own orders" ON public.orders FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'PICKER', 'INSPECTOR'))
);

-- order_items: Follows orders policy implicitly based on app logic, but explicitly we allow same
CREATE POLICY "Stores can view own order items" ON public.order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND (orders.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'PICKER', 'INSPECTOR')))
  )
);

-- inventory_adjustments: Only INSPECTOR/ADMIN can INSERT
CREATE POLICY "Inspector and Admin can insert adjustments" ON public.inventory_adjustments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'INSPECTOR'))
);
CREATE POLICY "Authenticated can read adjustments" ON public.inventory_adjustments FOR SELECT TO authenticated USING (true);

-- cycle_count_requests: Authenticated can read, INSPECTOR/ADMIN can insert/update
CREATE POLICY "Authenticated can view cycle counts" ON public.cycle_count_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inspector and Admin can manage cycle counts" ON public.cycle_count_requests FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'INSPECTOR'))
);

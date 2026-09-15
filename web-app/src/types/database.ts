// src/types/supabase.ts
// Supabase DB 타입 정의 (수동 관리 - 추후 supabase gen types로 자동 생성 가능)

export type Database = {
  public: {
    Enums: {
      adjustment_reason: 'COUNT_MISMATCH' | 'DAMAGED' | 'LOST' | 'FOUND' | 'EXPIRED';
      user_role: 'ADMIN' | 'INSPECTOR' | 'PICKER' | 'STORE';
      order_status: 'PENDING' | 'RECEIVED' | 'ALLOCATED' | 'PICKING' | 'PICKED' | 'DISPATCHED' | 'CANCELED';
      zone_type: 'A' | 'F';
      partner_type: 'MANUFACTURER' | 'SUPPLIER' | 'BOTH';
    };
    Tables: {
      inventory: {
        Row: {
          id: string;
          item_id: string;
          location_id: string;
          on_hand_qty: number;
          allocated_qty: number;
          created_at: string;
          updated_at: string;
        };
      };
      items: {
        Row: {
          id: string;
          sku: string;
          upc: string | null;
          name_en: string;
          name_kr: string | null;
          item_volume: number | null;
          desc_en: string | null;
          desc_kr: string | null;
          category: string | null;
          note: string | null;
          uom: string;
          box_price: number | null;
          pack_price: number | null;
          unit_price: number;
          units_per_box: number | null;
          zone_type: 'A' | 'F';
          min_stock_qty: number | null;
          shelf_life_days: number | null;
          image_url: string | null;
          is_active: boolean;
          manufacturer_id: string | null;
          supplier_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: any;
        Update: any;
      };
      partners: {
        Row: {
          id: string;
          name: string;
          type: 'MANUFACTURER' | 'SUPPLIER' | 'BOTH';
          contact_person: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: any;
        Update: any;
      };
      locations: {
        Row: {
          id: string;
          code: string;
          zone_type: 'A' | 'F';
          created_at: string;
          updated_at: string;
        };
      };
      inventory_adjustments: {
        Row: {
          id: string;
          inventory_id: string;
          adjusted_by: string;
          previous_qty: number;
          new_qty: number;
          reason: string | null;
          created_at: string;
        };
      };
    };
  };
};

// src/types/supabase.ts
// Supabase DB 타입 정의 (수동 관리 - 추후 supabase gen types로 자동 생성 가능)

export type Database = {
  public: {
    Enums: {
      adjustment_reason: 'COUNT_MISMATCH' | 'DAMAGED' | 'LOST' | 'FOUND' | 'EXPIRED';
      user_role: 'ADMIN' | 'INSPECTOR' | 'PICKER' | 'STORE';
      order_status: 'PENDING' | 'RECEIVED' | 'ALLOCATED' | 'PICKING' | 'PICKED' | 'DISPATCHED' | 'CANCELED';
      zone_type: 'A' | 'F';
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

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cycle_count_requests: {
        Row: {
          created_at: string | null
          id: string
          location_id: string
          requested_by: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_id: string
          requested_by: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location_id?: string
          requested_by?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cycle_count_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_count_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          allocated_qty: number
          client_id: string | null
          created_at: string | null
          id: string
          item_id: string
          location_id: string
          on_hand_qty: number
          updated_at: string | null
        }
        Insert: {
          allocated_qty?: number
          client_id?: string | null
          created_at?: string | null
          id?: string
          item_id: string
          location_id: string
          on_hand_qty?: number
          updated_at?: string | null
        }
        Update: {
          allocated_qty?: number
          client_id?: string | null
          created_at?: string | null
          id?: string
          item_id?: string
          location_id?: string
          on_hand_qty?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_adjustments: {
        Row: {
          adjusted_by: string
          created_at: string | null
          id: string
          inventory_id: string
          new_qty: number
          previous_qty: number
          reason: string | null
        }
        Insert: {
          adjusted_by: string
          created_at?: string | null
          id?: string
          inventory_id: string
          new_qty: number
          previous_qty: number
          reason?: string | null
        }
        Update: {
          adjusted_by?: string
          created_at?: string | null
          id?: string
          inventory_id?: string
          new_qty?: number
          previous_qty?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustments_adjusted_by_fkey"
            columns: ["adjusted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          box_price: number | null
          category: string | null
          client_id: string
          created_at: string | null
          desc_en: string | null
          desc_kr: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          item_volume: number | null
          manufacturer_id: string | null
          min_stock_qty: number | null
          name_en: string
          name_kr: string | null
          note: string | null
          pack_price: number | null
          shelf_life_days: number | null
          sku: string
          supplier_id: string | null
          unit_price: number
          units_per_box: number | null
          uom: string
          upc: string | null
          updated_at: string | null
          volume_unit: string | null
          zone_type: Database["public"]["Enums"]["zone_type"]
        }
        Insert: {
          box_price?: number | null
          category?: string | null
          client_id: string
          created_at?: string | null
          desc_en?: string | null
          desc_kr?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          item_volume?: number | null
          manufacturer_id?: string | null
          min_stock_qty?: number | null
          name_en: string
          name_kr?: string | null
          note?: string | null
          pack_price?: number | null
          shelf_life_days?: number | null
          sku: string
          supplier_id?: string | null
          unit_price: number
          units_per_box?: number | null
          uom: string
          upc?: string | null
          updated_at?: string | null
          volume_unit?: string | null
          zone_type?: Database["public"]["Enums"]["zone_type"]
        }
        Update: {
          box_price?: number | null
          category?: string | null
          client_id?: string
          created_at?: string | null
          desc_en?: string | null
          desc_kr?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          item_volume?: number | null
          manufacturer_id?: string | null
          min_stock_qty?: number | null
          name_en?: string
          name_kr?: string | null
          note?: string | null
          pack_price?: number | null
          shelf_life_days?: number | null
          sku?: string
          supplier_id?: string | null
          unit_price?: number
          units_per_box?: number | null
          uom?: string
          upc?: string | null
          updated_at?: string | null
          volume_unit?: string | null
          zone_type?: Database["public"]["Enums"]["zone_type"]
        }
        Relationships: [
          {
            foreignKeyName: "items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          code: string
          created_at: string | null
          id: string
          updated_at: string | null
          zone_type: Database["public"]["Enums"]["zone_type"]
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          zone_type: Database["public"]["Enums"]["zone_type"]
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          zone_type?: Database["public"]["Enums"]["zone_type"]
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          order_id: string
          price: number
          qty: number
          uom: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          order_id: string
          price: number
          qty: number
          uom: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string
          order_id?: string
          price?: number
          qty?: number
          uom?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string
          note: string | null
          order_date: string | null
          order_no: string
          status: Database["public"]["Enums"]["order_status"]
          store_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          order_date?: string | null
          order_no: string
          status?: Database["public"]["Enums"]["order_status"]
          store_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          order_date?: string | null
          order_no?: string
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          type: Database["public"]["Enums"]["partner_type"]
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          type?: Database["public"]["Enums"]["partner_type"]
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          type?: Database["public"]["Enums"]["partner_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      stores: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          name: string
          store_no: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          name: string
          store_no: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          name?: string
          store_no?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          first_name: string
          id: string
          last_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          first_name: string
          id: string
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          first_name?: string
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_inventory_stock: {
        Args: {
          p_inventory_id: string
          p_new_qty: number
          p_reason: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      order_status:
        | "PENDING"
        | "RECEIVED"
        | "ALLOCATED"
        | "PICKING"
        | "PICKED"
        | "DISPATCHED"
        | "CANCELED"
      partner_type: "MANUFACTURER" | "SUPPLIER" | "BOTH"
      user_role: "ADMIN" | "INSPECTOR" | "PICKER" | "STORE"
      zone_type: "A" | "F"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      order_status: [
        "PENDING",
        "RECEIVED",
        "ALLOCATED",
        "PICKING",
        "PICKED",
        "DISPATCHED",
        "CANCELED",
      ],
      partner_type: ["MANUFACTURER", "SUPPLIER", "BOTH"],
      user_role: ["ADMIN", "INSPECTOR", "PICKER", "STORE"],
      zone_type: ["A", "F"],
    },
  },
} as const

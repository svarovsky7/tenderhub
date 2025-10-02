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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      boq_item_version_mappings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          item_number: string | null
          item_type: string | null
          mapping_type: string | null
          new_boq_item_id: string
          new_tender_id: string
          old_boq_item_id: string
          old_tender_id: string
          position_mapping_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          item_number?: string | null
          item_type?: string | null
          mapping_type?: string | null
          new_boq_item_id: string
          new_tender_id: string
          old_boq_item_id: string
          old_tender_id: string
          position_mapping_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          item_number?: string | null
          item_type?: string | null
          mapping_type?: string | null
          new_boq_item_id?: string
          new_tender_id?: string
          old_boq_item_id?: string
          old_tender_id?: string
          position_mapping_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boq_item_version_mappings_new_boq_item_id_fkey"
            columns: ["new_boq_item_id"]
            isOneToOne: false
            referencedRelation: "boq_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boq_item_version_mappings_new_tender_id_fkey"
            columns: ["new_tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boq_item_version_mappings_old_boq_item_id_fkey"
            columns: ["old_boq_item_id"]
            isOneToOne: false
            referencedRelation: "boq_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boq_item_version_mappings_old_tender_id_fkey"
            columns: ["old_tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boq_item_version_mappings_position_mapping_id_fkey"
            columns: ["position_mapping_id"]
            isOneToOne: false
            referencedRelation: "tender_version_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      boq_items: {
        Row: {
          base_quantity: number | null
          client_position_id: string | null
          commercial_cost: number
          commercial_markup_coefficient: number
          consumption_coefficient: number | null
          conversion_coefficient: number | null
          created_at: string
          currency_rate: number | null
          currency_type: string | null
          delivery_amount: number | null
          delivery_price_type:
            | Database["public"]["Enums"]["delivery_price_type"]
            | null
          description: string
          detail_cost_category_id: string | null
          id: string
          imported_at: string | null
          item_number: string
          item_type: Database["public"]["Enums"]["boq_item_type"]
          material_id: string | null
          material_type: Database["public"]["Enums"]["material_type"] | null
          note: string | null
          quantity: number
          quote_link: string | null
          sort_order: number | null
          sub_number: number | null
          tender_id: string
          total_amount: number | null
          unit: string
          unit_rate: number
          updated_at: string
          work_id: string | null
        }
        Insert: {
          base_quantity?: number | null
          client_position_id?: string | null
          commercial_cost?: number
          commercial_markup_coefficient?: number
          consumption_coefficient?: number | null
          conversion_coefficient?: number | null
          created_at?: string
          currency_rate?: number | null
          currency_type?: string | null
          delivery_amount?: number | null
          delivery_price_type?:
            | Database["public"]["Enums"]["delivery_price_type"]
            | null
          description: string
          detail_cost_category_id?: string | null
          id?: string
          imported_at?: string | null
          item_number: string
          item_type: Database["public"]["Enums"]["boq_item_type"]
          material_id?: string | null
          material_type?: Database["public"]["Enums"]["material_type"] | null
          note?: string | null
          quantity: number
          quote_link?: string | null
          sort_order?: number | null
          sub_number?: number | null
          tender_id: string
          total_amount?: number | null
          unit: string
          unit_rate: number
          updated_at?: string
          work_id?: string | null
        }
        Update: {
          base_quantity?: number | null
          client_position_id?: string | null
          commercial_cost?: number
          commercial_markup_coefficient?: number
          consumption_coefficient?: number | null
          conversion_coefficient?: number | null
          created_at?: string
          currency_rate?: number | null
          currency_type?: string | null
          delivery_amount?: number | null
          delivery_price_type?:
            | Database["public"]["Enums"]["delivery_price_type"]
            | null
          description?: string
          detail_cost_category_id?: string | null
          id?: string
          imported_at?: string | null
          item_number?: string
          item_type?: Database["public"]["Enums"]["boq_item_type"]
          material_id?: string | null
          material_type?: Database["public"]["Enums"]["material_type"] | null
          note?: string | null
          quantity?: number
          quote_link?: string | null
          sort_order?: number | null
          sub_number?: number | null
          tender_id?: string
          total_amount?: number | null
          unit?: string
          unit_rate?: number
          updated_at?: string
          work_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boq_items_client_position_id_fkey"
            columns: ["client_position_id"]
            isOneToOne: false
            referencedRelation: "client_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boq_items_client_position_id_fkey"
            columns: ["client_position_id"]
            isOneToOne: false
            referencedRelation: "client_positions_with_boq_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boq_items_detail_cost_category_id_fkey"
            columns: ["detail_cost_category_id"]
            isOneToOne: false
            referencedRelation: "detail_cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boq_items_detail_cost_category_id_fkey"
            columns: ["detail_cost_category_id"]
            isOneToOne: false
            referencedRelation: "v_cost_categories_full"
            referencedColumns: ["detail_category_id"]
          },
          {
            foreignKeyName: "boq_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boq_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials_library_with_names"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boq_items_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boq_items_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boq_items_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works_library_with_names"
            referencedColumns: ["id"]
          },
        ]
      }
      client_positions: {
        Row: {
          client_note: string | null
          created_at: string
          hierarchy_level: number | null
          id: string
          is_additional: boolean | null
          item_no: string
          manual_note: string | null
          manual_volume: number | null
          parent_position_id: string | null
          position_number: number
          position_type: string | null
          tender_id: string
          total_commercial_materials_cost: number | null
          total_commercial_works_cost: number | null
          total_materials_cost: number | null
          total_works_cost: number | null
          unit: string | null
          updated_at: string
          volume: number | null
          work_name: string
        }
        Insert: {
          client_note?: string | null
          created_at?: string
          hierarchy_level?: number | null
          id?: string
          is_additional?: boolean | null
          item_no: string
          manual_note?: string | null
          manual_volume?: number | null
          parent_position_id?: string | null
          position_number: number
          position_type?: string | null
          tender_id: string
          total_commercial_materials_cost?: number | null
          total_commercial_works_cost?: number | null
          total_materials_cost?: number | null
          total_works_cost?: number | null
          unit?: string | null
          updated_at?: string
          volume?: number | null
          work_name: string
        }
        Update: {
          client_note?: string | null
          created_at?: string
          hierarchy_level?: number | null
          id?: string
          is_additional?: boolean | null
          item_no?: string
          manual_note?: string | null
          manual_volume?: number | null
          parent_position_id?: string | null
          position_number?: number
          position_type?: string | null
          tender_id?: string
          total_commercial_materials_cost?: number | null
          total_commercial_works_cost?: number | null
          total_materials_cost?: number | null
          total_works_cost?: number | null
          unit?: string | null
          updated_at?: string
          volume?: number | null
          work_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_positions_parent_position_id_fkey"
            columns: ["parent_position_id"]
            isOneToOne: false
            referencedRelation: "client_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_positions_parent_position_id_fkey"
            columns: ["parent_position_id"]
            isOneToOne: false
            referencedRelation: "client_positions_with_boq_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_positions_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_costs_by_category: {
        Row: {
          commercial_materials: number | null
          commercial_submaterials: number | null
          commercial_subworks: number | null
          commercial_total: number | null
          commercial_works: number | null
          created_at: string | null
          detail_cost_category_id: string
          direct_materials: number | null
          direct_submaterials: number | null
          direct_subworks: number | null
          direct_total: number | null
          direct_works: number | null
          id: string
          last_calculation_date: string | null
          markup_coefficient_materials: number | null
          markup_coefficient_submaterials: number | null
          markup_coefficient_subworks: number | null
          markup_coefficient_works: number | null
          tender_id: string
          updated_at: string | null
        }
        Insert: {
          commercial_materials?: number | null
          commercial_submaterials?: number | null
          commercial_subworks?: number | null
          commercial_total?: number | null
          commercial_works?: number | null
          created_at?: string | null
          detail_cost_category_id: string
          direct_materials?: number | null
          direct_submaterials?: number | null
          direct_subworks?: number | null
          direct_total?: number | null
          direct_works?: number | null
          id?: string
          last_calculation_date?: string | null
          markup_coefficient_materials?: number | null
          markup_coefficient_submaterials?: number | null
          markup_coefficient_subworks?: number | null
          markup_coefficient_works?: number | null
          tender_id: string
          updated_at?: string | null
        }
        Update: {
          commercial_materials?: number | null
          commercial_submaterials?: number | null
          commercial_subworks?: number | null
          commercial_total?: number | null
          commercial_works?: number | null
          created_at?: string | null
          detail_cost_category_id?: string
          direct_materials?: number | null
          direct_submaterials?: number | null
          direct_subworks?: number | null
          direct_total?: number | null
          direct_works?: number | null
          id?: string
          last_calculation_date?: string | null
          markup_coefficient_materials?: number | null
          markup_coefficient_submaterials?: number | null
          markup_coefficient_subworks?: number | null
          markup_coefficient_works?: number | null
          tender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commercial_costs_by_category_detail_cost_category_id_fkey"
            columns: ["detail_cost_category_id"]
            isOneToOne: false
            referencedRelation: "detail_cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_costs_by_category_detail_cost_category_id_fkey"
            columns: ["detail_cost_category_id"]
            isOneToOne: false
            referencedRelation: "v_cost_categories_full"
            referencedColumns: ["detail_category_id"]
          },
          {
            foreignKeyName: "commercial_costs_by_category_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_categories: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          unit: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          unit?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          unit?: string | null
        }
        Relationships: []
      }
      cost_nodes: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          kind: string
          location_id: string | null
          name: string
          parent_id: string | null
          path: unknown
          sort_order: number
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          kind: string
          location_id?: string | null
          name: string
          parent_id?: string | null
          path: unknown
          sort_order?: number
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          location_id?: string | null
          name?: string
          parent_id?: string | null
          path?: unknown
          sort_order?: number
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_nodes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_nodes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_cost_categories_full"
            referencedColumns: ["location_id"]
          },
          {
            foreignKeyName: "cost_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cost_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "vw_cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "vw_detail_cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_nodes_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      detail_cost_categories: {
        Row: {
          cost_category_id: string
          created_at: string | null
          id: string
          location_id: string
          name: string
          unit: string | null
          unit_cost: number | null
        }
        Insert: {
          cost_category_id: string
          created_at?: string | null
          id?: string
          location_id: string
          name: string
          unit?: string | null
          unit_cost?: number | null
        }
        Update: {
          cost_category_id?: string
          created_at?: string | null
          id?: string
          location_id?: string
          name?: string
          unit?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "detail_cost_categories_cost_category_id_fkey"
            columns: ["cost_category_id"]
            isOneToOne: false
            referencedRelation: "cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detail_cost_categories_cost_category_id_fkey"
            columns: ["cost_category_id"]
            isOneToOne: false
            referencedRelation: "v_cost_categories_full"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "detail_cost_categories_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detail_cost_categories_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_cost_categories_full"
            referencedColumns: ["location_id"]
          },
        ]
      }
      location: {
        Row: {
          city: string | null
          code: string | null
          country: string | null
          created_at: string | null
          id: string
          region: string | null
          title: string | null
        }
        Insert: {
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          region?: string | null
          title?: string | null
        }
        Update: {
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          region?: string | null
          title?: string | null
        }
        Relationships: []
      }
      material_names: {
        Row: {
          created_at: string | null
          id: string
          name: string
          unit: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          unit?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      materials_library: {
        Row: {
          consumption_coefficient: number | null
          conversion_coefficient: number | null
          created_at: string
          currency_type: string | null
          default_type: Database["public"]["Enums"]["material_type"] | null
          delivery_amount: number | null
          delivery_price_type: string | null
          id: string
          item_type: string | null
          material_type: string | null
          name_id: string
          quote_link: string | null
          unit_rate: number | null
          updated_at: string
        }
        Insert: {
          consumption_coefficient?: number | null
          conversion_coefficient?: number | null
          created_at?: string
          currency_type?: string | null
          default_type?: Database["public"]["Enums"]["material_type"] | null
          delivery_amount?: number | null
          delivery_price_type?: string | null
          id?: string
          item_type?: string | null
          material_type?: string | null
          name_id: string
          quote_link?: string | null
          unit_rate?: number | null
          updated_at?: string
        }
        Update: {
          consumption_coefficient?: number | null
          conversion_coefficient?: number | null
          created_at?: string
          currency_type?: string | null
          default_type?: Database["public"]["Enums"]["material_type"] | null
          delivery_amount?: number | null
          delivery_price_type?: string | null
          id?: string
          item_type?: string | null
          material_type?: string | null
          name_id?: string
          quote_link?: string | null
          unit_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_materials_library_name"
            columns: ["name_id"]
            isOneToOne: false
            referencedRelation: "material_names"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_cost_volumes: {
        Row: {
          created_at: string | null
          detail_cost_category_id: string
          id: string
          tender_id: string
          unit_total: number | null
          updated_at: string | null
          volume: number
        }
        Insert: {
          created_at?: string | null
          detail_cost_category_id: string
          id?: string
          tender_id: string
          unit_total?: number | null
          updated_at?: string | null
          volume?: number
        }
        Update: {
          created_at?: string | null
          detail_cost_category_id?: string
          id?: string
          tender_id?: string
          unit_total?: number | null
          updated_at?: string | null
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "tender_cost_volumes_detail_cost_category_id_fkey"
            columns: ["detail_cost_category_id"]
            isOneToOne: false
            referencedRelation: "detail_cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_cost_volumes_detail_cost_category_id_fkey"
            columns: ["detail_cost_category_id"]
            isOneToOne: false
            referencedRelation: "v_cost_categories_full"
            referencedColumns: ["detail_category_id"]
          },
          {
            foreignKeyName: "tender_cost_volumes_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_items: {
        Row: {
          amount: number | null
          created_at: string
          id: string
          location_id: string | null
          name_snapshot: string
          node_id: string | null
          note: string | null
          qty: number
          tender_id: string
          unit_id: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          id?: string
          location_id?: string | null
          name_snapshot: string
          node_id?: string | null
          note?: string | null
          qty?: number
          tender_id: string
          unit_id?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          id?: string
          location_id?: string | null
          name_snapshot?: string
          node_id?: string | null
          note?: string | null
          qty?: number
          tender_id?: string
          unit_id?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_cost_categories_full"
            referencedColumns: ["location_id"]
          },
          {
            foreignKeyName: "tender_items_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "cost_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_items_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "vw_cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_items_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "vw_detail_cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_items_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_markup_percentages: {
        Row: {
          contingency_costs: number | null
          created_at: string
          general_costs_without_subcontract: number | null
          id: string
          is_active: boolean | null
          materials_cost_growth: number | null
          mbp_gsm: number | null
          mechanization_service: number | null
          notes: string | null
          overhead_own_forces: number | null
          overhead_subcontract: number | null
          profit_own_forces: number | null
          profit_subcontract: number | null
          subcontract_materials_cost_growth: number | null
          subcontract_works_cost_growth: number | null
          tender_id: string
          updated_at: string
          warranty_period: number | null
          works_16_markup: number | null
          works_cost_growth: number | null
        }
        Insert: {
          contingency_costs?: number | null
          created_at?: string
          general_costs_without_subcontract?: number | null
          id?: string
          is_active?: boolean | null
          materials_cost_growth?: number | null
          mbp_gsm?: number | null
          mechanization_service?: number | null
          notes?: string | null
          overhead_own_forces?: number | null
          overhead_subcontract?: number | null
          profit_own_forces?: number | null
          profit_subcontract?: number | null
          subcontract_materials_cost_growth?: number | null
          subcontract_works_cost_growth?: number | null
          tender_id: string
          updated_at?: string
          warranty_period?: number | null
          works_16_markup?: number | null
          works_cost_growth?: number | null
        }
        Update: {
          contingency_costs?: number | null
          created_at?: string
          general_costs_without_subcontract?: number | null
          id?: string
          is_active?: boolean | null
          materials_cost_growth?: number | null
          mbp_gsm?: number | null
          mechanization_service?: number | null
          notes?: string | null
          overhead_own_forces?: number | null
          overhead_subcontract?: number | null
          profit_own_forces?: number | null
          profit_subcontract?: number | null
          subcontract_materials_cost_growth?: number | null
          subcontract_works_cost_growth?: number | null
          tender_id?: string
          updated_at?: string
          warranty_period?: number | null
          works_16_markup?: number | null
          works_cost_growth?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tender_markup_percentages_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_version_history: {
        Row: {
          action: string
          details: Json | null
          dop_transferred: number | null
          id: string
          ip_address: unknown | null
          performed_at: string | null
          performed_by: string | null
          positions_added: number | null
          positions_modified: number | null
          positions_removed: number | null
          tender_id: string
          user_agent: string | null
          version_number: number
        }
        Insert: {
          action: string
          details?: Json | null
          dop_transferred?: number | null
          id?: string
          ip_address?: unknown | null
          performed_at?: string | null
          performed_by?: string | null
          positions_added?: number | null
          positions_modified?: number | null
          positions_removed?: number | null
          tender_id: string
          user_agent?: string | null
          version_number: number
        }
        Update: {
          action?: string
          details?: Json | null
          dop_transferred?: number | null
          id?: string
          ip_address?: unknown | null
          performed_at?: string | null
          performed_by?: string | null
          positions_added?: number | null
          positions_modified?: number | null
          positions_removed?: number | null
          tender_id?: string
          user_agent?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "tender_version_history_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_version_mappings: {
        Row: {
          action_type: string | null
          confidence_score: number | null
          context_score: number | null
          created_at: string | null
          fuzzy_score: number | null
          hierarchy_score: number | null
          id: string
          is_dop: boolean | null
          mapping_status: string | null
          mapping_type: string | null
          new_client_note: string | null
          new_item_no: string | null
          new_position_id: string | null
          new_position_number: string | null
          new_tender_id: string
          new_unit: string | null
          new_volume: number | null
          new_work_name: string | null
          notes: string | null
          old_client_note: string | null
          old_item_no: string | null
          old_position_id: string | null
          old_position_number: string | null
          old_tender_id: string
          old_unit: string | null
          old_volume: number | null
          old_work_name: string | null
          parent_mapping_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string | null
        }
        Insert: {
          action_type?: string | null
          confidence_score?: number | null
          context_score?: number | null
          created_at?: string | null
          fuzzy_score?: number | null
          hierarchy_score?: number | null
          id?: string
          is_dop?: boolean | null
          mapping_status?: string | null
          mapping_type?: string | null
          new_client_note?: string | null
          new_item_no?: string | null
          new_position_id?: string | null
          new_position_number?: string | null
          new_tender_id: string
          new_unit?: string | null
          new_volume?: number | null
          new_work_name?: string | null
          notes?: string | null
          old_client_note?: string | null
          old_item_no?: string | null
          old_position_id?: string | null
          old_position_number?: string | null
          old_tender_id: string
          old_unit?: string | null
          old_volume?: number | null
          old_work_name?: string | null
          parent_mapping_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string | null
        }
        Update: {
          action_type?: string | null
          confidence_score?: number | null
          context_score?: number | null
          created_at?: string | null
          fuzzy_score?: number | null
          hierarchy_score?: number | null
          id?: string
          is_dop?: boolean | null
          mapping_status?: string | null
          mapping_type?: string | null
          new_client_note?: string | null
          new_item_no?: string | null
          new_position_id?: string | null
          new_position_number?: string | null
          new_tender_id?: string
          new_unit?: string | null
          new_volume?: number | null
          new_work_name?: string | null
          notes?: string | null
          old_client_note?: string | null
          old_item_no?: string | null
          old_position_id?: string | null
          old_position_number?: string | null
          old_tender_id?: string
          old_unit?: string | null
          old_volume?: number | null
          old_work_name?: string | null
          parent_mapping_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tender_version_mappings_new_position_id_fkey"
            columns: ["new_position_id"]
            isOneToOne: false
            referencedRelation: "client_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_version_mappings_new_position_id_fkey"
            columns: ["new_position_id"]
            isOneToOne: false
            referencedRelation: "client_positions_with_boq_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_version_mappings_new_tender_id_fkey"
            columns: ["new_tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_version_mappings_old_position_id_fkey"
            columns: ["old_position_id"]
            isOneToOne: false
            referencedRelation: "client_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_version_mappings_old_position_id_fkey"
            columns: ["old_position_id"]
            isOneToOne: false
            referencedRelation: "client_positions_with_boq_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_version_mappings_old_tender_id_fkey"
            columns: ["old_tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_version_mappings_parent_mapping_id_fkey"
            columns: ["parent_mapping_id"]
            isOneToOne: false
            referencedRelation: "tender_version_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      tenders: {
        Row: {
          area_client: number | null
          area_sp: number | null
          bsm_link: string | null
          client_name: string
          cny_rate: number | null
          created_at: string
          description: string | null
          eur_rate: number | null
          id: string
          parent_version_id: string | null
          qa_form_link: string | null
          submission_deadline: string | null
          tender_number: string
          title: string
          tz_clarification_link: string | null
          updated_at: string
          upload_folder: string | null
          usd_rate: number | null
          version: number
          version_created_at: string | null
          version_created_by: string | null
          version_status: string | null
        }
        Insert: {
          area_client?: number | null
          area_sp?: number | null
          bsm_link?: string | null
          client_name: string
          cny_rate?: number | null
          created_at?: string
          description?: string | null
          eur_rate?: number | null
          id?: string
          parent_version_id?: string | null
          qa_form_link?: string | null
          submission_deadline?: string | null
          tender_number: string
          title: string
          tz_clarification_link?: string | null
          updated_at?: string
          upload_folder?: string | null
          usd_rate?: number | null
          version?: number
          version_created_at?: string | null
          version_created_by?: string | null
          version_status?: string | null
        }
        Update: {
          area_client?: number | null
          area_sp?: number | null
          bsm_link?: string | null
          client_name?: string
          cny_rate?: number | null
          created_at?: string
          description?: string | null
          eur_rate?: number | null
          id?: string
          parent_version_id?: string | null
          qa_form_link?: string | null
          submission_deadline?: string | null
          tender_number?: string
          title?: string
          tz_clarification_link?: string | null
          updated_at?: string
          upload_folder?: string | null
          usd_rate?: number | null
          version?: number
          version_created_at?: string | null
          version_created_by?: string | null
          version_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenders_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          code: string
          id: string
          title: string
        }
        Insert: {
          code: string
          id?: string
          title: string
        }
        Update: {
          code?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      work_material_links: {
        Row: {
          client_position_id: string
          created_at: string
          delivery_amount: number | null
          delivery_price_type:
            | Database["public"]["Enums"]["delivery_price_type"]
            | null
          id: string
          material_boq_item_id: string | null
          material_quantity_per_work: number | null
          notes: string | null
          sub_material_boq_item_id: string | null
          sub_work_boq_item_id: string | null
          updated_at: string
          usage_coefficient: number | null
          work_boq_item_id: string | null
        }
        Insert: {
          client_position_id: string
          created_at?: string
          delivery_amount?: number | null
          delivery_price_type?:
            | Database["public"]["Enums"]["delivery_price_type"]
            | null
          id?: string
          material_boq_item_id?: string | null
          material_quantity_per_work?: number | null
          notes?: string | null
          sub_material_boq_item_id?: string | null
          sub_work_boq_item_id?: string | null
          updated_at?: string
          usage_coefficient?: number | null
          work_boq_item_id?: string | null
        }
        Update: {
          client_position_id?: string
          created_at?: string
          delivery_amount?: number | null
          delivery_price_type?:
            | Database["public"]["Enums"]["delivery_price_type"]
            | null
          id?: string
          material_boq_item_id?: string | null
          material_quantity_per_work?: number | null
          notes?: string | null
          sub_material_boq_item_id?: string | null
          sub_work_boq_item_id?: string | null
          updated_at?: string
          usage_coefficient?: number | null
          work_boq_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_work_material_links_material"
            columns: ["material_boq_item_id"]
            isOneToOne: false
            referencedRelation: "boq_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_work_material_links_position"
            columns: ["client_position_id"]
            isOneToOne: false
            referencedRelation: "client_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_work_material_links_position"
            columns: ["client_position_id"]
            isOneToOne: false
            referencedRelation: "client_positions_with_boq_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_work_material_links_sub_material"
            columns: ["sub_material_boq_item_id"]
            isOneToOne: false
            referencedRelation: "boq_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_work_material_links_sub_work"
            columns: ["sub_work_boq_item_id"]
            isOneToOne: false
            referencedRelation: "boq_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_work_material_links_work"
            columns: ["work_boq_item_id"]
            isOneToOne: false
            referencedRelation: "boq_items"
            referencedColumns: ["id"]
          },
        ]
      }
      work_material_templates: {
        Row: {
          created_at: string
          id: string
          is_linked_to_work: boolean
          material_library_id: string | null
          notes: string | null
          sub_material_library_id: string | null
          sub_work_library_id: string | null
          template_description: string | null
          template_name: string
          updated_at: string
          work_library_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_linked_to_work?: boolean
          material_library_id?: string | null
          notes?: string | null
          sub_material_library_id?: string | null
          sub_work_library_id?: string | null
          template_description?: string | null
          template_name: string
          updated_at?: string
          work_library_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_linked_to_work?: boolean
          material_library_id?: string | null
          notes?: string | null
          sub_material_library_id?: string | null
          sub_work_library_id?: string | null
          template_description?: string | null
          template_name?: string
          updated_at?: string
          work_library_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_material_templates_material_library_id_fkey"
            columns: ["material_library_id"]
            isOneToOne: false
            referencedRelation: "materials_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_material_templates_material_library_id_fkey"
            columns: ["material_library_id"]
            isOneToOne: false
            referencedRelation: "materials_library_with_names"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_material_templates_sub_material_library_id_fkey"
            columns: ["sub_material_library_id"]
            isOneToOne: false
            referencedRelation: "materials_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_material_templates_sub_material_library_id_fkey"
            columns: ["sub_material_library_id"]
            isOneToOne: false
            referencedRelation: "materials_library_with_names"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_material_templates_sub_work_library_id_fkey"
            columns: ["sub_work_library_id"]
            isOneToOne: false
            referencedRelation: "works_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_material_templates_sub_work_library_id_fkey"
            columns: ["sub_work_library_id"]
            isOneToOne: false
            referencedRelation: "works_library_with_names"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_material_templates_work_library_id_fkey"
            columns: ["work_library_id"]
            isOneToOne: false
            referencedRelation: "works_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_material_templates_work_library_id_fkey"
            columns: ["work_library_id"]
            isOneToOne: false
            referencedRelation: "works_library_with_names"
            referencedColumns: ["id"]
          },
        ]
      }
      work_names: {
        Row: {
          created_at: string | null
          id: string
          name: string
          unit: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          unit?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      works_library: {
        Row: {
          created_at: string
          currency_type: string | null
          id: string
          item_type: string | null
          name_id: string
          unit_rate: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_type?: string | null
          id?: string
          item_type?: string | null
          name_id: string
          unit_rate?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_type?: string | null
          id?: string
          item_type?: string | null
          name_id?: string
          unit_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_works_library_name"
            columns: ["name_id"]
            isOneToOne: false
            referencedRelation: "work_names"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      client_positions_with_boq_summary: {
        Row: {
          boq_items_count: number | null
          client_note: string | null
          created_at: string | null
          hierarchy_level: number | null
          id: string | null
          is_additional: boolean | null
          item_no: string | null
          manual_note: string | null
          manual_volume: number | null
          materials_count: number | null
          parent_position_id: string | null
          position_number: number | null
          position_type: string | null
          tender_id: string | null
          total_boq_cost: number | null
          total_commercial_materials_cost: number | null
          total_commercial_works_cost: number | null
          total_materials_cost: number | null
          total_works_cost: number | null
          unit: string | null
          updated_at: string | null
          volume: number | null
          work_name: string | null
          works_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_positions_parent_position_id_fkey"
            columns: ["parent_position_id"]
            isOneToOne: false
            referencedRelation: "client_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_positions_parent_position_id_fkey"
            columns: ["parent_position_id"]
            isOneToOne: false
            referencedRelation: "client_positions_with_boq_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_positions_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      materials_library_with_names: {
        Row: {
          consumption_coefficient: number | null
          conversion_coefficient: number | null
          created_at: string | null
          currency_type: string | null
          delivery_amount: number | null
          delivery_price_type: string | null
          id: string | null
          item_type: string | null
          material_type: string | null
          name: string | null
          name_id: string | null
          quote_link: string | null
          unit: string | null
          unit_rate: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_materials_library_name"
            columns: ["name_id"]
            isOneToOne: false
            referencedRelation: "material_names"
            referencedColumns: ["id"]
          },
        ]
      }
      v_commercial_costs_summary: {
        Row: {
          category_name: string | null
          client_name: string | null
          commercial_materials: number | null
          commercial_submaterials: number | null
          commercial_subworks: number | null
          commercial_total: number | null
          commercial_works: number | null
          detail_name: string | null
          direct_materials: number | null
          direct_submaterials: number | null
          direct_subworks: number | null
          direct_total: number | null
          direct_works: number | null
          id: string | null
          last_calculation_date: string | null
          location: string | null
          markup_amount: number | null
          markup_percent: number | null
          tender_title: string | null
        }
        Relationships: []
      }
      v_cost_categories_full: {
        Row: {
          category_id: string | null
          category_name: string | null
          detail_category_id: string | null
          detail_name: string | null
          full_category_path: string | null
          location_display: string | null
          location_id: string | null
          unit: string | null
          unit_cost: number | null
        }
        Relationships: []
      }
      vw_cost_categories: {
        Row: {
          id: string | null
          is_active: boolean | null
          name: string | null
          path: unknown | null
          sort_order: number | null
        }
        Insert: {
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          path?: unknown | null
          sort_order?: number | null
        }
        Update: {
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          path?: unknown | null
          sort_order?: number | null
        }
        Relationships: []
      }
      vw_detail_cost_categories: {
        Row: {
          category_id: string | null
          id: string | null
          is_active: boolean | null
          location_id: string | null
          name: string | null
          path: unknown | null
          sort_order: number | null
          unit_id: string | null
        }
        Insert: {
          category_id?: string | null
          id?: string | null
          is_active?: boolean | null
          location_id?: string | null
          name?: string | null
          path?: unknown | null
          sort_order?: number | null
          unit_id?: string | null
        }
        Update: {
          category_id?: string | null
          id?: string | null
          is_active?: boolean | null
          location_id?: string | null
          name?: string | null
          path?: unknown | null
          sort_order?: number | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_nodes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_nodes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_cost_categories_full"
            referencedColumns: ["location_id"]
          },
          {
            foreignKeyName: "cost_nodes_parent_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "cost_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_nodes_parent_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vw_cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_nodes_parent_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vw_detail_cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_nodes_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      works_library_with_names: {
        Row: {
          created_at: string | null
          currency_type: string | null
          id: string | null
          item_type: string | null
          name: string | null
          name_id: string | null
          unit: string | null
          unit_rate: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_works_library_name"
            columns: ["name_id"]
            isOneToOne: false
            referencedRelation: "work_names"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _calc_path: {
        Args: { p_parent: string; p_pos: number }
        Returns: unknown
      }
      _ltree_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      _ltree_gist_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      _make_label: {
        Args: { pos: number }
        Returns: string
      }
      apply_temp_mappings: {
        Args: Record<PropertyKey, never>
        Returns: {
          detail_code: string
          location_code: string
          mapping_id: string
          status: string
        }[]
      }
      auto_match_positions: {
        Args: { p_new_tender_id: string; p_old_tender_id: string }
        Returns: {
          confidence_score: number
          mapping_type: string
          new_position_id: string
          old_position_id: string
        }[]
      }
      bulk_upsert_category_location_mappings: {
        Args: { p_mappings: Json }
        Returns: {
          error_count: number
          success_count: number
        }[]
      }
      calculate_boq_item_total: {
        Args: {
          p_delivery_amount: number
          p_delivery_price_type: Database["public"]["Enums"]["delivery_price_type"]
          p_item_type: string
          p_quantity: number
          p_unit_rate: number
        }
        Returns: number
      }
      calculate_commercial_cost: {
        Args: {
          p_delivery_amount: number
          p_delivery_price_type: Database["public"]["Enums"]["delivery_price_type"]
          p_item_type: Database["public"]["Enums"]["boq_item_type"]
          p_markup_coefficient: number
          p_unit_rate: number
        }
        Returns: number
      }
      calculate_fuzzy_score: {
        Args: { str1: string; str2: string }
        Returns: number
      }
      calculate_tender_costs: {
        Args: { p_tender_id: string }
        Returns: {
          items_count: number
          total_base: number
          total_by_category: Json
          total_by_location: Json
          total_with_markup: number
        }[]
      }
      check_boq_mappings: {
        Args: { p_new_tender_id: string }
        Returns: {
          count: number
          item_type: string
          mapping_type: string
        }[]
      }
      check_transfer_functions: {
        Args: Record<PropertyKey, never>
        Returns: {
          function_name: string
          is_available: boolean
          parameters: string
          return_type: string
        }[]
      }
      cleanup_draft_versions: {
        Args: { p_parent_tender_id: string }
        Returns: number
      }
      clear_all_category_location_mappings: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      complete_version_transfer: {
        Args: { p_new_tender_id: string; p_old_tender_id: string }
        Returns: Json
      }
      complete_version_transfer_with_links: {
        Args: { p_new_tender_id: string; p_old_tender_id: string }
        Returns: Json
      }
      create_tender_version: {
        Args: { p_created_by?: string; p_parent_tender_id: string }
        Returns: string
      }
      debug_cost_nodes: {
        Args: { p_category_name?: string; p_limit?: number }
        Returns: {
          category_name: string
          kind: string
          location_code: string
          location_country: string
          location_id: string
          location_title: string
          name: string
          node_id: string
          parent_id: string
        }[]
      }
      debug_transfer_mapping: {
        Args: { p_mapping_id: string }
        Returns: Json
      }
      diagnose_tender_transfer: {
        Args: { p_new_tender_id: string; p_old_tender_id: string }
        Returns: Json
      }
      drop_client_positions_indexes: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      find_cost_node_by_combination: {
        Args: {
          p_category_id: string
          p_detail_id: string
          p_location_id: string
        }
        Returns: string
      }
      find_location_id: {
        Args: { p_identifier: string }
        Returns: string
      }
      find_or_create_cost_node: {
        Args: {
          p_category_id: string
          p_detail_name: string
          p_location_id: string
        }
        Returns: string
      }
      generate_unique_location_code: {
        Args: { p_name: string; p_type?: string }
        Returns: string
      }
      get_client_positions_count: {
        Args: {
          p_category_filter?: string[]
          p_search_query?: string
          p_tender_id: string
        }
        Returns: number
      }
      get_client_positions_optimized: {
        Args: {
          p_category_filter?: string[]
          p_limit?: number
          p_offset?: number
          p_search_query?: string
          p_tender_id: string
        }
        Returns: {
          boq_items_count: number
          client_note: string
          created_at: string
          hierarchy_level: number
          id: string
          is_additional: boolean
          item_no: string
          manual_note: string
          manual_volume: number
          materials_count: number
          parent_position_id: string
          position_number: number
          position_type: string
          tender_id: string
          total_boq_cost: number
          total_commercial_materials_cost: number
          total_commercial_works_cost: number
          total_materials_cost: number
          total_works_cost: number
          unit: string
          updated_at: string
          volume: number
          work_name: string
          works_count: number
        }[]
      }
      get_cost_categories: {
        Args: Record<PropertyKey, never>
        Returns: {
          code: string
          description: string
          id: string
          name: string
        }[]
      }
      get_cost_node_display: {
        Args: { p_cost_node_id: string }
        Returns: string
      }
      get_cost_structure_mappings: {
        Args: {
          p_category_id?: string
          p_detail_id?: string
          p_location_id?: string
        }
        Returns: {
          category_id: string
          category_name: string
          detail_id: string
          detail_name: string
          detail_unit: string
          location_id: string
          location_name: string
          mapping_id: string
          quantity: number
          total_price: number
          unit_price: number
        }[]
      }
      get_details_by_category: {
        Args: { p_category_id: string }
        Returns: {
          has_single_location: boolean
          id: string
          location_id: string
          location_name: string
          name: string
          unit: string
          unit_cost: number
        }[]
      }
      get_location_hierarchy: {
        Args: { p_location_id?: string }
        Returns: {
          children_count: number
          code: string
          id: string
          level: number
          name: string
          parent_id: string
          path: string[]
        }[]
      }
      get_locations_by_detail: {
        Args: { p_category_id: string; p_detail_name: string }
        Returns: {
          detail_id: string
          location_id: string
          location_name: string
          unit_cost: number
        }[]
      }
      get_locations_for_detail_category: {
        Args: { p_detail_category_id: string }
        Returns: {
          location_code: string
          location_description: string
          location_id: string
          location_name: string
          sort_order: number
        }[]
      }
      get_mapping_statistics: {
        Args: Record<PropertyKey, never>
        Returns: {
          avg_locations_per_detail: number
          categories_with_details: number
          details_with_locations: number
          total_categories: number
          total_detail_categories: number
          total_locations: number
          total_mappings: number
        }[]
      }
      get_materials_for_work: {
        Args: { p_work_boq_item_id: string }
        Returns: {
          link_id: string
          material_description: string
          material_id: string
          material_quantity: number
          material_unit: string
          material_unit_rate: number
          total_cost: number
          total_needed: number
        }[]
      }
      get_next_client_position_number: {
        Args: { p_tender_id: string }
        Returns: number
      }
      get_next_position_number: {
        Args: { p_tender_id: string }
        Returns: number
      }
      get_next_sub_number: {
        Args: { p_client_position_id: string }
        Returns: number
      }
      get_tender_costs_by_category: {
        Args: { p_tender_id: string }
        Returns: {
          category_name: string
          detail_category_id: string
          detail_name: string
          full_path: string
          location_display: string
          materials_sum: number
          total_sum: number
          unit: string
          works_sum: number
        }[]
      }
      get_tender_costs_by_type: {
        Args: { tender_id: string }
        Returns: {
          item_count: number
          item_type: Database["public"]["Enums"]["boq_item_type"]
          total_amount: number
        }[]
      }
      get_works_using_material: {
        Args: { p_material_boq_item_id: string }
        Returns: {
          link_id: string
          total_material_usage: number
          work_description: string
          work_id: string
          work_quantity: number
          work_unit: string
          work_unit_rate: number
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      hash_ltree: {
        Args: { "": unknown }
        Returns: number
      }
      import_cost_category_row: {
        Args: {
          p_category_name: string
          p_category_unit: string
          p_detail_name: string
          p_detail_unit: string
          p_location_name: string
        }
        Returns: Json
      }
      import_costs_row: {
        Args: {
          p_cat_name?: string
          p_cat_order?: number
          p_cat_unit?: string
          p_det_name?: string
          p_det_unit?: string
          p_loc_name?: string
        }
        Returns: Json
      }
      initialize_commercial_costs_for_all_tenders: {
        Args: Record<PropertyKey, never>
        Returns: {
          categories_count: number
          tender_id: string
          tender_title: string
        }[]
      }
      lca: {
        Args: { "": unknown[] }
        Returns: unknown
      }
      lquery_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      lquery_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      lquery_recv: {
        Args: { "": unknown }
        Returns: unknown
      }
      lquery_send: {
        Args: { "": unknown }
        Returns: string
      }
      ltree_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_gist_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_gist_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      ltree_gist_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_recv: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_send: {
        Args: { "": unknown }
        Returns: string
      }
      ltree2text: {
        Args: { "": unknown }
        Returns: string
      }
      ltxtq_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltxtq_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltxtq_recv: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltxtq_send: {
        Args: { "": unknown }
        Returns: string
      }
      nlevel: {
        Args: { "": unknown }
        Returns: number
      }
      rebuild_boq_mappings: {
        Args: { p_new_tender_id: string; p_old_tender_id: string }
        Returns: Json
      }
      recalculate_commercial_costs_by_category: {
        Args: { p_tender_id: string }
        Returns: undefined
      }
      renumber_client_positions: {
        Args: { p_tender_id: string }
        Returns: number
      }
      rpc_move_material: {
        Args: {
          p_material: string
          p_mode?: string
          p_new_index?: number
          p_source_work: string
          p_target_work: string
        }
        Returns: Json
      }
      rpc_resolve_conflict: {
        Args: {
          p_src_id: string
          p_strategy: string
          p_target_work: string
          p_tgt_id: string
        }
        Returns: Json
      }
      rpc_transfer_boq: {
        Args: { mapping_id: string }
        Returns: Json
      }
      rpc_transfer_dop: {
        Args: { new_tender_id: string; old_tender_id: string }
        Returns: Json
      }
      safe_upsert_cost_category: {
        Args: { p_description?: string; p_name: string; p_sort_order?: number }
        Returns: string
      }
      safe_upsert_location: {
        Args: { p_name: string; p_sort_order?: number }
        Returns: string
      }
      safe_upsert_mapping: {
        Args: {
          p_detail_category_id: string
          p_discount_percent?: number
          p_location_id: string
          p_quantity?: number
          p_unit_price?: number
        }
        Returns: string
      }
      save_boq_mapping: {
        Args: {
          p_mapping_type?: string
          p_new_boq_id: string
          p_new_tender_id: string
          p_old_boq_id: string
          p_old_tender_id: string
          p_position_mapping_id?: string
        }
        Returns: string
      }
      schema_cache_purge: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      search_cost_nodes: {
        Args: { p_limit?: number; p_search_term: string }
        Returns: {
          category_id: string
          category_name: string
          cost_node_id: string
          detail_id: string
          detail_name: string
          display_name: string
          location_id: string
          location_name: string
        }[]
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      simple_transfer_all_data: {
        Args: { p_new_tender_id: string; p_old_tender_id: string }
        Returns: Json
      }
      simple_transfer_boq: {
        Args: {
          p_new_position_id: string
          p_new_tender_id: string
          p_old_position_id: string
        }
        Returns: Json
      }
      tender_totals_tree: {
        Args: { p_tender_id: string }
        Returns: {
          kind: string
          node_id: string
          node_name: string
          path: unknown
          total: number
        }[]
      }
      test_cost_node_finder: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      test_mapping_transfer: {
        Args: { p_mapping_id: string }
        Returns: Json
      }
      test_single_mapping_transfer: {
        Args: { p_mapping_id: string }
        Returns: Json
      }
      test_versioning_transfer: {
        Args: { p_new_tender_id: string; p_old_tender_id: string }
        Returns: Json
      }
      text2ltree: {
        Args: { "": string }
        Returns: unknown
      }
      transfer_all_tender_data: {
        Args: { p_new_tender_id: string; p_old_tender_id: string }
        Returns: Json
      }
      transfer_all_version_data: {
        Args: { p_new_tender_id: string; p_old_tender_id: string }
        Returns: Json
      }
      transfer_boq_items: {
        Args: { p_mapping_id: string }
        Returns: boolean
      }
      transfer_boq_items_fixed: {
        Args: { p_mapping_id: string }
        Returns: Json
      }
      transfer_boq_items_rpc: {
        Args: { mapping_id: string }
        Returns: boolean
      }
      transfer_boq_items_v2: {
        Args: { p_mapping_id: string }
        Returns: boolean
      }
      transfer_boq_items_with_creation: {
        Args: { p_mapping_id: string }
        Returns: Json
      }
      transfer_boq_with_mapping: {
        Args: { p_mapping_id: string }
        Returns: Json
      }
      transfer_dop_positions: {
        Args: { p_new_tender_id: string; p_old_tender_id: string }
        Returns: Json
      }
      transfer_dop_positions_fixed: {
        Args: { p_new_tender_id: string; p_old_tender_id: string }
        Returns: Json
      }
      transfer_dop_positions_rpc: {
        Args: { new_tender_id: string; old_tender_id: string }
        Returns: Json
      }
      transfer_dop_positions_v2: {
        Args: { p_new_tender_id: string; p_old_tender_id: string }
        Returns: Json
      }
      transfer_dop_with_mapping: {
        Args: { p_new_tender_id: string; p_old_tender_id: string }
        Returns: Json
      }
      transfer_links_final: {
        Args: { p_new_position_id: string; p_old_position_id: string }
        Returns: Json
      }
      transfer_links_fixed: {
        Args: { p_mapping_id: string }
        Returns: Json
      }
      transfer_links_using_mapping: {
        Args: {
          p_new_position_id: string
          p_new_tender_id: string
          p_old_position_id: string
        }
        Returns: Json
      }
      transfer_links_with_boq_mapping: {
        Args: { p_new_position_id: string; p_old_position_id: string }
        Returns: Json
      }
      transfer_mapping_data: {
        Args: { p_mapping_id: string }
        Returns: Json
      }
      transfer_mapping_data_v2: {
        Args: { p_mapping_id: string }
        Returns: Json
      }
      transfer_single_mapping: {
        Args: { p_mapping_id: string }
        Returns: Json
      }
      transfer_work_material_links: {
        Args: { p_new_position_id: string; p_old_position_id: string }
        Returns: number
      }
      transfer_work_material_links_v2: {
        Args: { p_new_position_id: string; p_old_position_id: string }
        Returns: Json
      }
      update_boq_currency_rates: {
        Args: {
          p_cny_rate?: number
          p_eur_rate?: number
          p_tender_id: string
          p_usd_rate?: number
        }
        Returns: {
          updated_cny_items: number
          updated_eur_items: number
          updated_items_count: number
          updated_usd_items: number
        }[]
      }
      upsert_cost_category: {
        Args: { p_description?: string; p_name: string }
        Returns: string
      }
      upsert_detail_cost_category: {
        Args: {
          p_base_price?: number
          p_category_id: string
          p_name: string
          p_unit: string
        }
        Returns: string
      }
      upsert_location: {
        Args:
          | {
              p_description?: string
              p_location_type?: string
              p_name: string
              p_parent_id?: string
            }
          | { p_description?: string; p_name: string; p_parent_id?: string }
        Returns: string
      }
    }
    Enums: {
      boq_item_type: "work" | "material" | "sub_work" | "sub_material"
      client_position_status: "active" | "inactive" | "completed"
      delivery_price_type: "included" | "not_included" | "amount"
      material_type: "main" | "auxiliary"
      tender_status: "draft" | "active" | "submitted" | "awarded" | "closed"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      boq_item_type: ["work", "material", "sub_work", "sub_material"],
      client_position_status: ["active", "inactive", "completed"],
      delivery_price_type: ["included", "not_included", "amount"],
      material_type: ["main", "auxiliary"],
      tender_status: ["draft", "active", "submitted", "awarded", "closed"],
    },
  },
} as const

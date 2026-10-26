
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "cuts": {
                  Row: {
                    "category": string | null,"created_at": string,"current_price": number,"id": string,"is_active": boolean,"name": string,"owner_id": string,"price_updated_at": string,"unit": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: string | null,"created_at"?: string,"current_price": number,"id"?: string,"is_active"?: boolean,"name": string,"owner_id": string,"price_updated_at"?: string,"unit"?: string,"updated_at"?: string
                  }
                  Update: {
                    "category"?: string | null,"created_at"?: string,"current_price"?: number,"id"?: string,"is_active"?: boolean,"name"?: string,"owner_id"?: string,"price_updated_at"?: string,"unit"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"price_change_batches": {
                  Row: {
                    "affected_count": number,"changed_by": string,"created_at": string,"id": string,"operation_type": string,"original_batch_id": string | null,"owner_id": string,"percentage": number | null,"request_id": string | null,"rounding_mode": string | null,"selection_scope": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "affected_count": number,"changed_by": string,"created_at"?: string,"id"?: string,"operation_type": string,"original_batch_id"?: string | null,"owner_id": string,"percentage"?: number | null,"request_id"?: string | null,"rounding_mode"?: string | null,"selection_scope"?: string | null
                  }
                  Update: {
                    "affected_count"?: number,"changed_by"?: string,"created_at"?: string,"id"?: string,"operation_type"?: string,"original_batch_id"?: string | null,"owner_id"?: string,"percentage"?: number | null,"request_id"?: string | null,"rounding_mode"?: string | null,"selection_scope"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "batches_original_fk"
      columns: ["original_batch_id","owner_id"]
isOneToOne: false
      referencedRelation: "price_change_batches"
      referencedColumns: ["id","owner_id"]
    }
                  ]
                },"price_history": {
                  Row: {
                    "batch_id": string | null,"change_type": string,"changed_at": string,"changed_by": string,"cut_id": string,"id": string,"new_price": number,"old_price": number | null,"owner_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "batch_id"?: string | null,"change_type": string,"changed_at"?: string,"changed_by": string,"cut_id": string,"id"?: string,"new_price": number,"old_price"?: number | null,"owner_id": string
                  }
                  Update: {
                    "batch_id"?: string | null,"change_type"?: string,"changed_at"?: string,"changed_by"?: string,"cut_id"?: string,"id"?: string,"new_price"?: number,"old_price"?: number | null,"owner_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "history_batch_fk"
      columns: ["batch_id","owner_id"]
isOneToOne: false
      referencedRelation: "price_change_batches"
      referencedColumns: ["id","owner_id"]
    },{
      foreignKeyName: "history_cut_fk"
      columns: ["cut_id","owner_id"]
isOneToOne: false
      referencedRelation: "cuts"
      referencedColumns: ["id","owner_id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "apply_bulk_price_update":
{ Args: { "p_expected": Json,"p_percentage": number,"p_request_id": string,"p_rounding_mode": string,"p_scope": string }; Returns: {
              "affected_count": number,
"changed_by": string,
"created_at": string,
"id": string,
"operation_type": string,
"original_batch_id": string | null,
"owner_id": string,
"percentage": number | null,
"request_id": string | null,
"rounding_mode": string | null,
"selection_scope": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "price_change_batches"
        isOneToOne: true
        isSetofReturn: false
      } },
"calculate_new_price":
{ Args: { "p_percentage": number,"p_price": number,"p_rounding": string }; Returns: number
                           },
"create_cut":
{ Args: { "p_category": string,"p_is_active"?: boolean,"p_name": string,"p_price": number,"p_unit": string }; Returns: {
              "category": string | null,
"created_at": string,
"current_price": number,
"id": string,
"is_active": boolean,
"name": string,
"owner_id": string,
"price_updated_at": string,
"unit": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "cuts"
        isOneToOne: true
        isSetofReturn: false
      } },
"revert_bulk_price_update":
{ Args: { "p_batch_id": string,"p_request_id": string }; Returns: {
              "affected_count": number,
"changed_by": string,
"created_at": string,
"id": string,
"operation_type": string,
"original_batch_id": string | null,
"owner_id": string,
"percentage": number | null,
"request_id": string | null,
"rounding_mode": string | null,
"selection_scope": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "price_change_batches"
        isOneToOne: true
        isSetofReturn: false
      } },
"set_cut_price":
{ Args: { "p_cut_id": string,"p_expected_price"?: number,"p_new_price": number }; Returns: {
              "category": string | null,
"created_at": string,
"current_price": number,
"id": string,
"is_active": boolean,
"name": string,
"owner_id": string,
"price_updated_at": string,
"unit": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "cuts"
        isOneToOne: true
        isSetofReturn: false
      } },
"validate_price":
{ Args: { "p_price": number }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const


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
            "account_deletion_requests": {
                  Row: {
                    "account_id": string,"cancelled_at": string | null,"created_at": string,"id": string,"requested_at": string,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "account_id": string,"cancelled_at"?: string | null,"created_at"?: string,"id"?: string,"requested_at"?: string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "account_id"?: string,"cancelled_at"?: string | null,"created_at"?: string,"id"?: string,"requested_at"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"app_settings": {
                  Row: {
                    "created_at": string,"int_value": number | null,"is_public": boolean,"key": string,"text_value": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"int_value"?: number | null,"is_public"?: boolean,"key": string,"text_value"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"int_value"?: number | null,"is_public"?: boolean,"key"?: string,"text_value"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"id": string,"metadata": NonNullable<Json>,"subject_id": string | null,"subject_type": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"subject_id"?: string | null,"subject_type"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"subject_id"?: string | null,"subject_type"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"consents": {
                  Row: {
                    "consent_type": Database["public"]['Enums']["consent_type"],"created_at": string,"document_version": string,"granted": boolean,"id": string,"source": Database["public"]['Enums']["consent_source"],"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "consent_type": Database["public"]['Enums']["consent_type"],"created_at"?: string,"document_version": string,"granted": boolean,"id"?: string,"source": Database["public"]['Enums']["consent_source"],"user_id"?: string | null
                  }
                  Update: {
                    "consent_type"?: Database["public"]['Enums']["consent_type"],"created_at"?: string,"document_version"?: string,"granted"?: boolean,"id"?: string,"source"?: Database["public"]['Enums']["consent_source"],"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"legal_versions": {
                  Row: {
                    "consent_type": Database["public"]['Enums']["consent_type"],"created_at": string,"updated_at": string,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "consent_type": Database["public"]['Enums']["consent_type"],"created_at"?: string,"updated_at"?: string,"version": string
                  }
                  Update: {
                    "consent_type"?: Database["public"]['Enums']["consent_type"],"created_at"?: string,"updated_at"?: string,"version"?: string
                  }
                  Relationships: [
                    
                  ]
                },"patient_addresses": {
                  Row: {
                    "city": string,"created_at": string,"id": string,"is_default": boolean,"label": string,"landmark": string | null,"latitude": number | null,"line1": string,"line2": string | null,"longitude": number | null,"patient_profile_id": string,"pincode": string,"state": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "city": string,"created_at"?: string,"id"?: string,"is_default"?: boolean,"label": string,"landmark"?: string | null,"latitude"?: number | null,"line1": string,"line2"?: string | null,"longitude"?: number | null,"patient_profile_id": string,"pincode": string,"state": string,"updated_at"?: string
                  }
                  Update: {
                    "city"?: string,"created_at"?: string,"id"?: string,"is_default"?: boolean,"label"?: string,"landmark"?: string | null,"latitude"?: number | null,"line1"?: string,"line2"?: string | null,"longitude"?: number | null,"patient_profile_id"?: string,"pincode"?: string,"state"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "patient_addresses_patient_profile_id_fkey"
      columns: ["patient_profile_id"]
isOneToOne: false
      referencedRelation: "patient_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"patient_profiles": {
                  Row: {
                    "archived_at": string | null,"archived_by": string | null,"consultation_language": string | null,"contact_phone": string | null,"created_at": string,"created_by": string | null,"date_of_birth": string | null,"full_name": string,"gender": Database["public"]['Enums']["profile_gender"] | null,"id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"archived_by"?: string | null,"consultation_language"?: string | null,"contact_phone"?: string | null,"created_at"?: string,"created_by"?: string | null,"date_of_birth"?: string | null,"full_name": string,"gender"?: Database["public"]['Enums']["profile_gender"] | null,"id"?: string,"updated_at"?: string
                  }
                  Update: {
                    "archived_at"?: string | null,"archived_by"?: string | null,"consultation_language"?: string | null,"contact_phone"?: string | null,"created_at"?: string,"created_by"?: string | null,"date_of_birth"?: string | null,"full_name"?: string,"gender"?: Database["public"]['Enums']["profile_gender"] | null,"id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profile_access": {
                  Row: {
                    "account_id": string,"created_at": string,"granted_at": string,"id": string,"patient_profile_id": string,"relationship": Database["public"]['Enums']["profile_relationship"],"revoked_at": string | null,"role": Database["public"]['Enums']["profile_access_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "account_id": string,"created_at"?: string,"granted_at"?: string,"id"?: string,"patient_profile_id": string,"relationship": Database["public"]['Enums']["profile_relationship"],"revoked_at"?: string | null,"role"?: Database["public"]['Enums']["profile_access_role"],"updated_at"?: string
                  }
                  Update: {
                    "account_id"?: string,"created_at"?: string,"granted_at"?: string,"id"?: string,"patient_profile_id"?: string,"relationship"?: Database["public"]['Enums']["profile_relationship"],"revoked_at"?: string | null,"role"?: Database["public"]['Enums']["profile_access_role"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_access_patient_profile_id_fkey"
      columns: ["patient_profile_id"]
isOneToOne: false
      referencedRelation: "patient_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"email": string | null,"full_name": string,"id": string,"last_seen_at": string | null,"phone": string | null,"preferred_language": string,"step_up_cleared_session": string | null,"step_up_pending_sessions": (string)[],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"email"?: string | null,"full_name": string,"id": string,"last_seen_at"?: string | null,"phone"?: string | null,"preferred_language"?: string,"step_up_cleared_session"?: string | null,"step_up_pending_sessions"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"email"?: string | null,"full_name"?: string,"id"?: string,"last_seen_at"?: string | null,"phone"?: string | null,"preferred_language"?: string,"step_up_cleared_session"?: string | null,"step_up_pending_sessions"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"rate_limits": {
                  Row: {
                    "hits": number,"key_hash": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "hits": number,"key_hash": string,"window_start": string
                  }
                  Update: {
                    "hits"?: number,"key_hash"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"user_roles": {
                  Row: {
                    "created_at": string,"role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"role"?: Database["public"]['Enums']["app_role"],"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "actable_profile_ids":
{ Args: { "p_capability": Database["public"]['Enums']["profile_capability"] }; Returns: string[]
                           },
"active_dependent_count":
{ Args: { "p_account": string }; Returns: number
                           },
"archive_dependent":
{ Args: { "p_profile_id": string }; Returns: undefined
                           },
"can_act_for":
{ Args: { "p_capability": Database["public"]['Enums']["profile_capability"],"p_profile": string }; Returns: boolean
                           },
"cancel_account_deletion":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"complete_step_up":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"complete_step_up_server":
{ Args: { "p_session_id": string,"p_user_id": string }; Returns: undefined
                           },
"create_dependent":
{ Args: { "p_adult_permission"?: boolean,"p_consultation_language"?: string,"p_contact_phone"?: string,"p_date_of_birth": string,"p_full_name": string,"p_gender"?: Database["public"]['Enums']["profile_gender"],"p_relationship": Database["public"]['Enums']["profile_relationship"] }; Returns: string
                           },
"current_session_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"delete_patient_address":
{ Args: { "p_address_id": string }; Returns: undefined
                           },
"dependent_cap":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"ensure_self_profile":
{ Args: { "p_account": string }; Returns: undefined
                           },
"finish_signup":
{ Args: { "p_full_name": string,"p_marketing": boolean,"p_source": Database["public"]['Enums']["consent_source"] }; Returns: undefined
                           },
"has_current_terms":
{ Args: { "p_user_id": string }; Returns: boolean
                           },
"has_role":
{ Args: { "p_role": Database["public"]['Enums']["app_role"] }; Returns: boolean
                           },
"ist_today":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"my_auth_state":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"normalise_person_name":
{ Args: { "p_name": string }; Returns: string
                           },
"raise_profile_error":
{ Args: { "p_key": string }; Returns: undefined
                           },
"rate_limit_hit":
{ Args: { "p_key_hash": string,"p_max": number,"p_window_seconds": number }; Returns: boolean
                           },
"rate_limit_reset":
{ Args: { "p_key_hash": string }; Returns: undefined
                           },
"rate_limits_cleanup":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"record_consent":
{ Args: { "p_granted": boolean }; Returns: undefined
                           },
"record_sign_out_everywhere":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"request_account_deletion":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"restore_dependent":
{ Args: { "p_profile_id": string }; Returns: undefined
                           },
"self_profile_id":
{ Args: { "p_account": string }; Returns: string
                           },
"set_default_address":
{ Args: { "p_address_id": string }; Returns: undefined
                           },
"step_up_needed":
{ Args: { "p_cleared": string,"p_last_seen_at": string,"p_session": string }; Returns: boolean
                           },
"touch_last_seen":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"unconfirmed_users_older_than":
{ Args: { "p_age": string }; Returns: string[]
                           },
"update_patient_profile":
{ Args: { "p_adult_permission"?: boolean,"p_clear"?: (string)[],"p_consultation_language"?: string,"p_contact_phone"?: string,"p_date_of_birth"?: string,"p_full_name"?: string,"p_gender"?: Database["public"]['Enums']["profile_gender"],"p_profile_id": string }; Returns: undefined
                           },
"upsert_patient_address":
{ Args: { "p_address_id"?: string,"p_city": string,"p_clear"?: (string)[],"p_label": string,"p_landmark"?: string,"p_latitude"?: number,"p_line1": string,"p_line2"?: string,"p_longitude"?: number,"p_pincode": string,"p_profile_id": string,"p_state": string }; Returns: string
                           },
"write_audit":
{ Args: { "p_action": string,"p_actor_id": string,"p_metadata"?: Json,"p_subject_id": string,"p_subject_type": string }; Returns: undefined
                           }
          }
          Enums: {
            "app_role": "patient"|"clinic_admin"|"clinic_staff"|"doctor"|"pharmacy_staff"|"shop_partner"|"delivery_partner"|"support"|"admin","consent_source": "phone"|"email"|"google"|"profile","consent_type": "terms_privacy"|"marketing","profile_access_role": "owner","profile_capability": "read"|"manage"|"book"|"view_records","profile_gender": "female"|"male"|"other"|"prefer_not_to_say","profile_relationship": "self"|"child"|"parent"|"spouse"|"sibling"|"grandparent"|"other"
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
            "app_role": ["patient", "clinic_admin", "clinic_staff", "doctor", "pharmacy_staff", "shop_partner", "delivery_partner", "support", "admin"],"consent_source": ["phone", "email", "google", "profile"],"consent_type": ["terms_privacy", "marketing"],"profile_access_role": ["owner"],"profile_capability": ["read", "manage", "book", "view_records"],"profile_gender": ["female", "male", "other", "prefer_not_to_say"],"profile_relationship": ["self", "child", "parent", "spouse", "sibling", "grandparent", "other"]
          }
        }
} as const

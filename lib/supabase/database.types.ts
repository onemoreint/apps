// Tipos de la base de datos para @supabase/supabase-js.
// Escritos a mano para la Fase B a partir de las migraciones; cuando el stack
// local esté activo se regeneran con `npm run db:types` y deben coincidir.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type MembershipRole = "propietario" | "administrador" | "optometra" | "asistente" | "cajero";
export type MembershipStatus = "activa" | "suspendida";

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          slug: string;
          trade_name: string;
          legal_name: string | null;
          nit: string | null;
          timezone: string;
          currency: string;
          is_demo: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: {
          trade_name?: string;
          legal_name?: string | null;
          nit?: string | null;
          timezone?: string;
        };
        Relationships: [];
      };
      locations: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          address: string | null;
          city: string | null;
          phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          name: string;
          address?: string | null;
          city?: string | null;
          phone?: string | null;
        };
        Update: {
          name?: string;
          address?: string | null;
          city?: string | null;
          phone?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: { full_name?: string; phone?: string | null };
        Relationships: [];
      };
      memberships: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: MembershipRole;
          status: MembershipStatus;
          location_id: string | null;
          invited_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      permissions: {
        Row: { code: string; area: string; description: string; is_clinical: boolean };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      role_permissions: {
        Row: { organization_id: string; role: MembershipRole; permission_code: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      org_settings: {
        Row: {
          organization_id: string;
          discount_threshold_pct: number;
          clinical_ranges: Json;
          cylinder_convention: "negativo" | "positivo" | null;
          receipt_footer: string | null;
          updated_at: string;
        };
        Insert: never;
        Update: {
          discount_threshold_pct?: number;
          cylinder_convention?: "negativo" | "positivo" | null;
          receipt_footer?: string | null;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: number;
          organization_id: string | null;
          actor_id: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      invitations: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          role: MembershipRole;
          token_hash: string;
          expires_at: string;
          accepted_at: string | null;
          revoked_at: string | null;
          invited_by: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_organization: {
        Args: {
          p_trade_name: string;
          p_slug: string;
          p_legal_name: string | null;
          p_nit: string | null;
          p_timezone: string;
          p_location_name: string;
          p_location_city: string | null;
        };
        Returns: string;
      };
      invite_member: {
        Args: { p_org: string; p_email: string; p_role: MembershipRole };
        Returns: string;
      };
      revoke_invitation: { Args: { p_invitation: string }; Returns: undefined };
      accept_invitation: { Args: { p_token: string }; Returns: string };
      update_member_role: { Args: { p_membership: string; p_role: MembershipRole }; Returns: undefined };
      set_member_status: { Args: { p_membership: string; p_status: MembershipStatus }; Returns: undefined };
      set_role_permission: {
        Args: { p_org: string; p_role: MembershipRole; p_perm: string; p_granted: boolean };
        Returns: undefined;
      };
      my_permissions: { Args: { p_org: string }; Returns: string[] };
      login_guard: { Args: { p_email: string }; Returns: Json };
      record_login_failure: { Args: { p_email: string }; Returns: undefined };
      clear_login_failures: { Args: Record<string, never>; Returns: undefined };
    };
    Enums: {
      membership_role: MembershipRole;
      membership_status: MembershipStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

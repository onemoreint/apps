// Tipos de la base de datos para @supabase/supabase-js.
// Escritos a mano para la Fase B a partir de las migraciones; cuando el stack
// local esté activo se regeneran con `npm run db:types` y deben coincidir.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type MembershipRole = "propietario" | "administrador" | "optometra" | "asistente" | "cajero";
export type MembershipStatus = "activa" | "suspendida";

export type AvNotation = "snellen_pies" | "snellen_metros" | "decimal" | "logmar";
export type AppointmentStatus = "programada" | "confirmada" | "atendida" | "cancelada" | "no_asistio";
export type EncounterStatus = "borrador" | "finalizada" | "anulada";
export type PrescriptionStatus = "borrador" | "validada" | "reemplazada" | "anulada";
export type ConsentKind = "tratamiento_datos" | "atencion_optometrica" | "otro";
export type ConsentChannel = "firma_presencial" | "documento_escaneado" | "firma_electronica";
export type RefractionMethod = "lensometria" | "autorrefraccion" | "retinoscopia" | "subjetivo" | "cicloplegia";
export type PrismBase = "arriba" | "abajo" | "nasal" | "temporal";

export type PatientWritable = {
  doc_type: string;
  doc_number: string;
  first_name: string;
  second_name?: string | null;
  first_surname: string;
  second_surname?: string | null;
  birth_date?: string | null;
  sex_code?: string | null;
  gender_identity_code?: string | null;
  nationality_code?: string | null;
  ethnicity_code?: string | null;
  ethnic_community?: string | null;
  disability_code?: string | null;
  occupation_code?: string | null;
  residence_country_code?: string | null;
  residence_municipality_code?: string | null;
  residence_zone_code?: string | null;
  payer_code?: string | null;
  payer_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  guardian_name?: string | null;
  guardian_doc?: string | null;
  guardian_relationship?: string | null;
};

export type PatientRow = { [K in keyof PatientWritable]-?: Exclude<PatientWritable[K], undefined> } & {
  id: string;
  organization_id: string;
  search_text: string;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EncounterRow = {
  id: string;
  organization_id: string;
  location_id: string;
  patient_id: string;
  professional_id: string;
  appointment_id: string | null;
  status: EncounterStatus;
  started_at: string;
  ended_at: string | null;
  modality_code: string | null;
  service_group_code: string | null;
  environment_code: string | null;
  admission_route_code: string | null;
  care_cause_code: string | null;
  discharge_condition_code: string | null;
  referral_provider_code: string | null;
  reason_for_visit: string | null;
  current_illness: string | null;
  personal_history: string | null;
  ocular_history: string | null;
  medications: string | null;
  allergies: Json;
  family_history: Json;
  risk_factors: Json;
  findings: Json;
  template_snapshot: Json;
  assessment: string | null;
  plan: string | null;
  version: number;
  finalized_at: string | null;
  finalized_by: string | null;
  content_hash: string | null;
  annul_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PrescriptionRow = {
  id: string;
  organization_id: string;
  patient_id: string;
  encounter_id: string | null;
  origin: "interna" | "externa";
  professional_id: string | null;
  external_issuer_name: string | null;
  external_issuer_card: string | null;
  external_issued_on: string | null;
  transcribed_by: string | null;
  series_id: string;
  version: number;
  supersedes_id: string | null;
  version_reason: string | null;
  status: PrescriptionStatus;
  lens_type: "monofocal" | "bifocal" | "progresivo" | "ocupacional" | "otro" | null;
  usage: string | null;
  pd_far: string | null;
  pd_near: string | null;
  observations: string | null;
  cylinder_convention: "negativo" | "positivo" | null;
  draft_version: number;
  validated_at: string | null;
  validated_by: string | null;
  author_snapshot: Json;
  content_hash: string | null;
  annul_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

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
          reps_code: string | null;
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
          reps_code?: string | null;
        };
        Update: {
          name?: string;
          address?: string | null;
          city?: string | null;
          phone?: string | null;
          reps_code?: string | null;
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
          av_notation: AvNotation | null;
          require_principal_diagnosis: boolean;
          encounter_template: Json;
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
      ref_codes: {
        Row: {
          catalog: string;
          code: string;
          label: string;
          source: string;
          is_provisional: boolean;
          is_active: boolean;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      professionals: {
        Row: {
          id: string;
          organization_id: string;
          membership_id: string | null;
          full_name: string;
          doc_type: string;
          doc_number: string;
          profession: "optometra" | "oftalmologo" | "otro";
          professional_card: string | null;
          verified_at: string | null;
          verified_by: string | null;
          verification_note: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          membership_id?: string | null;
          full_name: string;
          doc_type: string;
          doc_number: string;
          profession?: "optometra" | "oftalmologo" | "otro";
          professional_card?: string | null;
        };
        Update: {
          membership_id?: string | null;
          full_name?: string;
          doc_type?: string;
          doc_number?: string;
          profession?: "optometra" | "oftalmologo" | "otro";
          professional_card?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      patients: {
        Row: PatientRow;
        Insert: PatientWritable & { organization_id: string };
        Update: Partial<PatientWritable> & { version?: number };
        Relationships: [];
      };
      consent_texts: {
        Row: {
          id: string;
          organization_id: string;
          kind: ConsentKind;
          version: number;
          title: string;
          body: string;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: { organization_id: string; kind: ConsentKind; title: string; body: string };
        Update: { is_active?: boolean };
        Relationships: [];
      };
      consents: {
        Row: {
          id: string;
          organization_id: string;
          patient_id: string;
          consent_text_id: string;
          decision: "otorgado" | "negado";
          channel: ConsentChannel;
          signed_by_guardian: boolean;
          recorded_by: string | null;
          recorded_at: string;
          revoked_at: string | null;
          revoked_by: string | null;
          revocation_reason: string | null;
        };
        Insert: {
          organization_id: string;
          patient_id: string;
          consent_text_id: string;
          decision: "otorgado" | "negado";
          channel: ConsentChannel;
          signed_by_guardian?: boolean;
        };
        Update: never;
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string;
          organization_id: string;
          location_id: string;
          patient_id: string;
          professional_id: string;
          starts_at: string;
          ends_at: string;
          status: AppointmentStatus;
          reason: string | null;
          cancel_reason: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          location_id: string;
          patient_id: string;
          professional_id: string;
          starts_at: string;
          ends_at: string;
          status?: AppointmentStatus;
          reason?: string | null;
        };
        Update: {
          location_id?: string;
          professional_id?: string;
          starts_at?: string;
          ends_at?: string;
          status?: AppointmentStatus;
          reason?: string | null;
          cancel_reason?: string | null;
        };
        Relationships: [];
      };
      clinical_encounters: {
        Row: EncounterRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      encounter_visual_acuity: {
        Row: {
          id: string;
          organization_id: string;
          encounter_id: string;
          eye: "OD" | "OI" | "AO";
          distance: "lejos" | "intermedia" | "cerca";
          correction: "sin" | "con" | "estenopeico";
          value: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      encounter_refractions: {
        Row: {
          id: string;
          organization_id: string;
          encounter_id: string;
          method: RefractionMethod;
          eye: "OD" | "OI";
          sphere: string | null;
          cylinder: string | null;
          axis: number | null;
          addition: string | null;
          prism: string | null;
          prism_base: PrismBase | null;
          visual_acuity: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      encounter_diagnoses: {
        Row: {
          id: string;
          organization_id: string;
          encounter_id: string;
          position: number;
          kind: "principal" | "relacionado";
          cie10_code: string;
          diagnosis_type_code: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      encounter_procedures: {
        Row: {
          id: string;
          organization_id: string;
          encounter_id: string;
          cups_code: string;
          mode: "realizado" | "ordenado";
          notes: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      encounter_amendments: {
        Row: {
          id: string;
          organization_id: string;
          encounter_id: string;
          professional_id: string;
          reason: string;
          content: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      prescriptions: {
        Row: PrescriptionRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      prescription_eyes: {
        Row: {
          prescription_id: string;
          organization_id: string;
          eye: "OD" | "OI";
          sphere: string | null;
          cylinder: string | null;
          axis: number | null;
          addition: string | null;
          prism: string | null;
          prism_base: PrismBase | null;
          dnp: string | null;
          height: string | null;
          visual_acuity: string | null;
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
      verify_professional: { Args: { p_professional: string; p_note: string }; Returns: undefined };
      revoke_consent: { Args: { p_consent: string; p_reason: string }; Returns: undefined };
      update_clinical_settings: {
        Args: {
          p_org: string;
          p_av_notation: AvNotation | null;
          p_cylinder_convention: "negativo" | "positivo" | null;
          p_require_principal: boolean;
          p_template: Json;
          p_ranges: Json;
        };
        Returns: undefined;
      };
      start_encounter: { Args: { p_patient: string; p_location: string; p_appointment?: string | null }; Returns: string };
      save_encounter_draft: { Args: { p_encounter: string; p_version: number; p_payload: Json }; Returns: number };
      finalize_encounter: { Args: { p_encounter: string; p_version: number }; Returns: undefined };
      annul_encounter_draft: { Args: { p_encounter: string; p_version: number; p_reason: string }; Returns: undefined };
      add_encounter_amendment: { Args: { p_encounter: string; p_reason: string; p_content: string }; Returns: string };
      verify_encounter_integrity: { Args: { p_encounter: string }; Returns: boolean | null };
      save_prescription_draft: {
        Args: { p_prescription: string | null; p_draft_version: number | null; p_payload: Json };
        Returns: string;
      };
      validate_prescription: { Args: { p_prescription: string; p_draft_version: number }; Returns: undefined };
      new_prescription_version: { Args: { p_prescription: string; p_reason: string }; Returns: string };
      annul_prescription: { Args: { p_prescription: string; p_reason: string }; Returns: undefined };
    };
    Enums: {
      membership_role: MembershipRole;
      membership_status: MembershipStatus;
      appointment_status: AppointmentStatus;
      encounter_status: EncounterStatus;
      prescription_status: PrescriptionStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

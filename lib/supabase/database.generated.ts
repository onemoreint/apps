// ARCHIVO GENERADO por scripts/gen-db-types.mjs. No editar a mano.
import type { Json } from "./database.types";

export type GeneratedTables = {
  suppliers: {
    Row: {
      id: string;
      organization_id: string;
      name: string;
      nit: string | null;
      contact_name: string | null;
      phone: string | null;
      email: string | null;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      organization_id: string;
      name: string;
      nit?: string | null;
      contact_name?: string | null;
      phone?: string | null;
      email?: string | null;
    };
    Update: {
      name?: string;
      nit?: string | null;
      contact_name?: string | null;
      phone?: string | null;
      email?: string | null;
      is_active?: boolean;
    };
    Relationships: [];
  };
  products: {
    Row: {
      id: string;
      organization_id: string;
      sku: string;
      name: string;
      kind: "montura" | "lente_oftalmico" | "lente_contacto" | "accesorio" | "servicio" | "otro";
      brand: string | null;
      description: string | null;
      unit_price: number;
      cost: number | null;
      tracks_stock: boolean;
      stock_min: number;
      supplier_id: string | null;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      organization_id: string;
      sku: string;
      name: string;
      kind: "montura" | "lente_oftalmico" | "lente_contacto" | "accesorio" | "servicio" | "otro";
      brand?: string | null;
      description?: string | null;
      unit_price: number;
      cost?: number | null;
      tracks_stock?: boolean;
      stock_min?: number;
      supplier_id?: string | null;
    };
    Update: {
      name?: string;
      brand?: string | null;
      description?: string | null;
      unit_price?: number;
      cost?: number | null;
      stock_min?: number;
      supplier_id?: string | null;
      is_active?: boolean;
    };
    Relationships: [];
  };
  inventory_stock: {
    Row: {
      organization_id: string;
      product_id: string;
      location_id: string;
      quantity: number;
      updated_at: string;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  inventory_movements: {
    Row: {
      id: string;
      organization_id: string;
      location_id: string;
      product_id: string;
      movement_type: "entrada" | "salida_venta" | "devolucion_venta" | "ajuste_positivo" | "ajuste_negativo";
      quantity: number;
      unit_cost: number | null;
      reason: string | null;
      sale_item_id: string | null;
      created_by: string | null;
      created_at: string;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  payment_methods: {
    Row: {
      id: string;
      organization_id: string;
      name: string;
      kind: "efectivo" | "tarjeta" | "transferencia" | "otro";
      is_active: boolean;
      created_at: string;
    };
    Insert: {
      organization_id: string;
      name: string;
      kind: "efectivo" | "tarjeta" | "transferencia" | "otro";
    };
    Update: {
      name?: string;
      is_active?: boolean;
    };
    Relationships: [];
  };
  quotes: {
    Row: {
      id: string;
      organization_id: string;
      location_id: string;
      number: number;
      patient_id: string | null;
      prescription_id: string | null;
      status: string;
      valid_until: string;
      notes: string | null;
      subtotal: number;
      discount_total: number;
      total: number;
      discount_status: string;
      discount_reviewed_by: string | null;
      discount_reviewed_at: string | null;
      annul_reason: string | null;
      version: number;
      created_by: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  quote_items: {
    Row: {
      id: string;
      organization_id: string;
      quote_id: string;
      position: number;
      product_id: string;
      description: string;
      quantity: number;
      unit_price: number;
      discount_amount: number;
      line_total: number;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  sales: {
    Row: {
      id: string;
      organization_id: string;
      location_id: string;
      number: number;
      patient_id: string | null;
      prescription_id: string | null;
      quote_id: string | null;
      status: string;
      subtotal: number;
      discount_total: number;
      total: number;
      discount_approved_by: string | null;
      seller_id: string;
      notes: string | null;
      annulled_at: string | null;
      annulled_by: string | null;
      annul_reason: string | null;
      created_at: string;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  sale_items: {
    Row: {
      id: string;
      organization_id: string;
      sale_id: string;
      position: number;
      product_id: string;
      description: string;
      quantity: number;
      unit_price: number;
      discount_amount: number;
      line_total: number;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  cash_sessions: {
    Row: {
      id: string;
      organization_id: string;
      location_id: string;
      opened_by: string;
      opened_at: string;
      opening_amount: number;
      status: string;
      closed_at: string | null;
      closed_by: string | null;
      close_notes: string | null;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  cash_movements: {
    Row: {
      id: string;
      organization_id: string;
      session_id: string;
      kind: string;
      amount: number;
      reason: string;
      created_by: string | null;
      created_at: string;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  cash_session_counts: {
    Row: {
      session_id: string;
      organization_id: string;
      payment_method_id: string;
      expected: number;
      counted: number;
      difference: number;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  payments: {
    Row: {
      id: string;
      organization_id: string;
      sale_id: string;
      cash_session_id: string;
      payment_method_id: string;
      amount: number;
      reference: string | null;
      receipt_number: number;
      received_by: string;
      created_at: string;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  payment_reversals: {
    Row: {
      id: string;
      organization_id: string;
      payment_id: string;
      reason: string;
      cash_session_id: string | null;
      reversed_by: string;
      created_at: string;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  payment_reversal_requests: {
    Row: {
      id: string;
      organization_id: string;
      payment_id: string;
      reason: string;
      requested_by: string;
      status: string;
      resolved_by: string | null;
      resolved_at: string | null;
      resolution_note: string | null;
      created_at: string;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  laboratories: {
    Row: {
      id: string;
      organization_id: string;
      name: string;
      nit: string | null;
      contact_name: string | null;
      phone: string | null;
      email: string | null;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      organization_id: string;
      name: string;
      nit?: string | null;
      contact_name?: string | null;
      phone?: string | null;
      email?: string | null;
    };
    Update: {
      name?: string;
      nit?: string | null;
      contact_name?: string | null;
      phone?: string | null;
      email?: string | null;
      is_active?: boolean;
    };
    Relationships: [];
  };
  lab_order_statuses: {
    Row: {
      id: string;
      organization_id: string;
      name: string;
      kind: "inicial" | "proceso" | "recibido" | "calidad_aprobada" | "calidad_rechazada" | "entregado" | "cancelado";
      position: number;
      is_active: boolean;
    };
    Insert: {
      organization_id: string;
      name: string;
      kind: "inicial" | "proceso" | "recibido" | "calidad_aprobada" | "calidad_rechazada" | "entregado" | "cancelado";
      position?: number;
    };
    Update: {
      name?: string;
      position?: number;
      is_active?: boolean;
    };
    Relationships: [];
  };
  lab_orders: {
    Row: {
      id: string;
      organization_id: string;
      number: number;
      location_id: string;
      sale_id: string;
      patient_id: string;
      prescription_id: string;
      laboratory_id: string;
      status_id: string;
      rx_snapshot: Json;
      frame_description: string | null;
      lens_description: string;
      instructions: string | null;
      promised_date: string;
      created_by: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  lab_order_events: {
    Row: {
      id: string;
      organization_id: string;
      order_id: string;
      status_id: string;
      note: string | null;
      created_by: string | null;
      created_at: string;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  quality_checks: {
    Row: {
      id: string;
      organization_id: string;
      order_id: string;
      result: string;
      checklist: Json;
      notes: string | null;
      checked_by: string;
      created_at: string;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  deliveries: {
    Row: {
      id: string;
      organization_id: string;
      sale_id: string;
      lab_order_id: string | null;
      received_by_name: string;
      received_by_doc: string | null;
      balance_at_delivery: number;
      balance_authorized_by: string | null;
      notes: string | null;
      delivered_by: string;
      created_at: string;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  warranties: {
    Row: {
      id: string;
      organization_id: string;
      sale_id: string;
      lab_order_id: string | null;
      kind: string;
      description: string;
      status: string;
      resolution: string | null;
      opened_by: string | null;
      closed_at: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  warranty_events: {
    Row: {
      id: string;
      organization_id: string;
      warranty_id: string;
      status: string;
      note: string | null;
      created_by: string | null;
      created_at: string;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  export_jobs: {
    Row: {
      id: string;
      organization_id: string;
      kind: string;
      params: Json;
      row_count: number;
      reason: string;
      created_by: string;
      created_at: string;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  privacy_requests: {
    Row: {
      id: string;
      organization_id: string;
      patient_id: string | null;
      requester_name: string;
      requester_doc: string | null;
      requester_contact: string | null;
      kind: string;
      description: string;
      received_at: string;
      due_date: string;
      status: string;
      response: string | null;
      responded_at: string | null;
      responded_by: string | null;
      created_by: string | null;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
};

export type GeneratedViews = {
  sale_balances: {
    Row: {
      sale_id: string | null;
      organization_id: string | null;
      total: number | null;
      paid: number | null;
      balance: number | null;
    };
    Relationships: [];
  };
};

export type GeneratedFunctions = {
  save_quote: { Args: { p_quote: string | null; p_version: number | null; p_payload: Json | null }; Returns: string };
  review_quote_discount: { Args: { p_quote: string | null; p_approve: boolean | null }; Returns: undefined };
  annul_quote: { Args: { p_quote: string | null; p_reason: string | null }; Returns: undefined };
  create_sale: { Args: { p_payload: Json | null }; Returns: string };
  register_payment: { Args: { p_sale: string | null; p_method: string | null; p_amount: number | null; p_reference: string | null }; Returns: string };
  request_payment_reversal: { Args: { p_payment: string | null; p_reason: string | null }; Returns: string };
  reverse_payment: { Args: { p_payment: string | null; p_reason: string | null }; Returns: string };
  reject_reversal_request: { Args: { p_request: string | null; p_note: string | null }; Returns: undefined };
  open_cash_session: { Args: { p_location: string | null; p_opening: number | null }; Returns: string };
  add_cash_movement: { Args: { p_session: string | null; p_kind: string | null; p_amount: number | null; p_reason: string | null }; Returns: string };
  cash_session_expected: { Args: { p_session: string | null }; Returns: { payment_method_id: string | null; method_name: string | null; method_kind: "efectivo" | "tarjeta" | "transferencia" | "otro" | null; expected: number | null }[] };
  close_cash_session: { Args: { p_session: string | null; p_counts: Json | null; p_notes: string | null }; Returns: undefined };
  register_inventory_movement: { Args: { p_product: string | null; p_location: string | null; p_type: "entrada" | "salida_venta" | "devolucion_venta" | "ajuste_positivo" | "ajuste_negativo" | null; p_quantity: number | null; p_unit_cost: number | null; p_reason: string | null }; Returns: string };
  create_lab_order: { Args: { p_payload: Json | null }; Returns: string };
  change_lab_order_status: { Args: { p_order: string | null; p_status: string | null; p_note: string | null }; Returns: undefined };
  cancel_lab_order: { Args: { p_order: string | null; p_reason: string | null }; Returns: undefined };
  record_quality_check: { Args: { p_order: string | null; p_result: string | null; p_checklist: Json | null; p_notes: string | null }; Returns: string };
  register_delivery: { Args: { p_sale: string | null; p_order: string | null; p_name: string | null; p_doc: string | null; p_notes: string | null; p_allow_balance: boolean | null }; Returns: string };
  open_warranty: { Args: { p_sale: string | null; p_order: string | null; p_kind: string | null; p_description: string | null }; Returns: string };
  update_warranty: { Args: { p_warranty: string | null; p_status: string | null; p_note: string | null }; Returns: undefined };
  annul_sale: { Args: { p_sale: string | null; p_reason: string | null }; Returns: undefined };
  dashboard_indicators: { Args: { p_org: string | null }; Returns: Json };
  report_sales_summary: { Args: { p_org: string | null; p_from: string | null; p_to: string | null }; Returns: Json };
  report_by_seller: { Args: { p_org: string | null; p_from: string | null; p_to: string | null }; Returns: { seller_id: string | null; seller_name: string | null; sales_count: number | null; gross: number | null; discounts: number | null; net: number | null }[] };
  report_by_product: { Args: { p_org: string | null; p_from: string | null; p_to: string | null }; Returns: { product_id: string | null; sku: string | null; name: string | null; quantity: number | null; gross: number | null; discounts: number | null; net: number | null }[] };
  log_export: { Args: { p_org: string | null; p_kind: string | null; p_params: Json | null; p_rows: number | null; p_reason: string | null }; Returns: string };
  register_privacy_request: { Args: { p_org: string | null; p_payload: Json | null }; Returns: string };
  update_privacy_request: { Args: { p_request: string | null; p_status: string | null; p_response: string | null }; Returns: undefined };
};

export type GeneratedEnums = {
  appointment_status: "programada" | "confirmada" | "atendida" | "cancelada" | "no_asistio";
  encounter_status: "borrador" | "finalizada" | "anulada";
  lab_status_kind: "inicial" | "proceso" | "recibido" | "calidad_aprobada" | "calidad_rechazada" | "entregado" | "cancelado";
  membership_role: "propietario" | "administrador" | "optometra" | "asistente" | "cajero";
  membership_status: "activa" | "suspendida";
  movement_type: "entrada" | "salida_venta" | "devolucion_venta" | "ajuste_positivo" | "ajuste_negativo";
  payment_kind: "efectivo" | "tarjeta" | "transferencia" | "otro";
  prescription_status: "borrador" | "validada" | "reemplazada" | "anulada";
  product_kind: "montura" | "lente_oftalmico" | "lente_contacto" | "accesorio" | "servicio" | "otro";
};

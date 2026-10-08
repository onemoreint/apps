/** Respuesta de get_menu(token). Montos en USD (numéricos de Postgres llegan como number). */
export interface PublicBusiness {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string;
  instagram: string | null;
  show_bs: boolean;
  exchange_rate: number;
  primary_color: string;
  payment_methods: string[];
  order_types: OrderType[];
}

export type OrderType = 'pickup' | 'delivery' | 'dine_in';

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  pickup: 'Para llevar',
  delivery: 'Delivery',
  dine_in: 'Comer en el local',
};

export const ORDER_TYPE_EMOJI: Record<OrderType, string> = {
  pickup: '🥡',
  delivery: '🛵',
  dine_in: '🍽️',
};

/** Datos que el cliente indica al confirmar (no hay mesas: un solo enlace). */
export interface CustomerInfo {
  name: string;
  phone: string;
  type: OrderType;
  address: string;
  payment: string;
}

export type Badge = 'recomendado' | 'especial' | 'nuevo' | 'oferta' | 'favorito';
export type Craving = 'contundente' | 'queso' | 'tocineta' | 'picante' | 'compartir';

export interface MenuCategory {
  id: string;
  name: string;
  emoji: string | null;
  image_url: string | null;
}

export interface MenuOption {
  id: string;
  name: string;
  price_delta_usd: number;
}

export interface MenuOptionGroup {
  id: string;
  name: string;
  selection: 'single' | 'multiple';
  min_select: number;
  max_select: number;
  options: MenuOption[];
}

export interface MenuProduct {
  id: string;
  category_id: string;
  type: 'simple' | 'combo';
  name: string;
  description: string | null;
  image_url: string | null;
  price_usd: number;
  available: boolean;
  featured: boolean;
  upsell: boolean;
  /** Etiquetas editoriales que pone el restaurante (nunca estadísticas). */
  badges: Badge[];
  /** Antojos para "¿No sabes qué pedir?". */
  cravings: Craving[];
  /** Precio anterior: solo se usa si es mayor que el actual. */
  compare_at_price_usd: number | null;
  /** Combo que se ofrece al agregar este producto. */
  combo_upgrade_id: string | null;
  group_ids: string[];
  combo_items: { label: string; quantity: number }[];
}

export interface Menu {
  business: PublicBusiness;
  categories: MenuCategory[];
  products: MenuProduct[];
  option_groups: MenuOptionGroup[];
}

/** Respuesta de create_order. */
export interface CreatedOrder {
  code: string;
  order_number: number;
  created_at: string;
  customer: { name: string; phone: string | null; type: OrderType; address: string | null; payment: string | null };
  subtotal_usd: number;
  extras_usd: number;
  total_usd: number;
  exchange_rate: number;
  show_bs: boolean;
  total_bs: number;
  notes: string | null;
  items: {
    product_name: string;
    quantity: number;
    unit_price_usd: number;
    line_total_usd: number;
    notes?: string | null;
    options: { group_name: string; option_name: string; price_delta_usd: number }[];
  }[];
}

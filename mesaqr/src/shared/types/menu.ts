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
}

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
  group_ids: string[];
  combo_items: { label: string; quantity: number }[];
}

export interface Menu {
  business: PublicBusiness;
  table: { number: number; label: string | null };
  categories: MenuCategory[];
  products: MenuProduct[];
  option_groups: MenuOptionGroup[];
}

/** Respuesta de create_order. */
export interface CreatedOrder {
  code: string;
  order_number: number;
  created_at: string;
  table_number: number;
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
    options: { group_name: string; option_name: string; price_delta_usd: number }[];
  }[];
}

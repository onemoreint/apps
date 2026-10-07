export interface Business {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string;
  instagram: string | null;
  currency: 'USD';
  show_bs: boolean;
  exchange_rate: number;
  exchange_rate_updated_at: string;
  primary_color: string;
}

export interface Category {
  id: string;
  business_id: string;
  name: string;
  emoji: string | null;
  image_url: string | null;
  sort_order: number;
  active: boolean;
}

export interface Product {
  id: string;
  business_id: string;
  category_id: string;
  type: 'simple' | 'combo';
  name: string;
  description: string | null;
  image_url: string | null;
  price_usd: number;
  active: boolean;
  available: boolean;
  featured: boolean;
  upsell: boolean;
  sort_order: number;
}

export interface OptionGroup {
  id: string;
  business_id: string;
  name: string;
  selection: 'single' | 'multiple';
  min_select: number;
  max_select: number;
  sort_order: number;
  active: boolean;
}

export interface Option {
  id: string;
  group_id: string;
  name: string;
  price_delta_usd: number;
  available: boolean;
  sort_order: number;
}

export interface DiningTable {
  id: string;
  business_id: string;
  number: number;
  label: string | null;
  qr_token: string;
  active: boolean;
}

export type OrderStatus = 'draft' | 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  code: string;
  table_number: number;
  status: OrderStatus;
  subtotal_usd: number;
  extras_usd: number;
  total_usd: number;
  total_bs: number;
  exchange_rate: number;
  notes: string | null;
  created_at: string;
  order_items?: {
    id: string;
    product_name: string;
    quantity: number;
    unit_price_usd: number;
    line_total_usd: number;
    sort_order: number;
    order_item_options: { id: string; option_name: string; price_delta_usd: number }[];
  }[];
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  draft: 'Borrador',
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  ready: 'Listo',
  completed: 'Entregado',
  cancelled: 'Cancelado',
};

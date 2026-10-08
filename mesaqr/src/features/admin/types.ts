import type { Badge, Craving } from '@/shared/types/menu';
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
  payment_methods: string[];
  pickup_enabled: boolean;
  delivery_enabled: boolean;
  dine_in_enabled: boolean;
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
  badges: Badge[];
  cravings: Craving[];
  compare_at_price_usd: number | null;
  combo_upgrade_id: string | null;
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

export type OrderStatus = 'draft' | 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  code: string;
  status: OrderStatus;
  customer_name: string | null;
  customer_phone: string | null;
  order_type: 'pickup' | 'delivery' | 'dine_in' | null;
  address: string | null;
  payment_method: string | null;
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
    notes: string | null;
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

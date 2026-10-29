import type { Contenido } from '@/core/tipos';

export type EstadoPedido =
  | 'solicitud_recibida'
  | 'pendiente_confirmacion'
  | 'confirmado'
  | 'en_preparacion'
  | 'listo'
  | 'entregado'
  | 'cancelado';

export const ESTADOS: { valor: EstadoPedido; texto: string; clase: string }[] = [
  { valor: 'solicitud_recibida', texto: 'Solicitud recibida', clase: 'bg-rosa text-primario' },
  { valor: 'pendiente_confirmacion', texto: 'Pendiente de confirmación', clase: 'bg-amber-100 text-amber-900' },
  { valor: 'confirmado', texto: 'Confirmado', clase: 'bg-sky-100 text-sky-900' },
  { valor: 'en_preparacion', texto: 'En preparación', clase: 'bg-violet-100 text-violet-900' },
  { valor: 'listo', texto: 'Listo para entregar', clase: 'bg-teal-100 text-teal-900' },
  { valor: 'entregado', texto: 'Entregado', clase: 'bg-emerald-100 text-emerald-900' },
  { valor: 'cancelado', texto: 'Cancelado', clase: 'bg-stone-200 text-stone-700' },
];

export const textoEstado = (e: string) => ESTADOS.find((x) => x.valor === e)?.texto ?? e;
export const claseEstado = (e: string) => ESTADOS.find((x) => x.valor === e)?.clase ?? 'bg-crema-2';

export type TiendaFila = {
  id: string;
  slug: string;
  nombre: string;
  demo: boolean;
  activa: boolean;
  whatsapp: string;
  dias_atencion: number[];
  dias_max_anticipacion: number;
  franjas: string[];
  recogida: boolean;
  domicilio: boolean;
  direccion_recogida: string;
  contenido: Partial<Contenido>;
  meses_retencion: number;
};

export type Membresia = { rol: 'propietaria' | 'equipo'; tienda: TiendaFila };

export type CategoriaFila = { id: string; tienda_id: string; nombre: string; descripcion: string; orden: number; activa: boolean; foto_url: string };

export type VarianteFila = { id?: string; nombre: string; precio: number | null; disponible: boolean; orden: number };

export type ProductoFila = {
  id: string;
  tienda_id: string;
  categoria_id: string | null;
  nombre: string;
  descripcion: string;
  precio: number;
  presentacion: string;
  fotos: string[];
  activo: boolean;
  disponible: boolean;
  destacado: boolean;
  nuevo: boolean;
  por_encargo: boolean;
  horas_preparacion: number;
  cantidad_minima: number;
  sabores: string[];
  sabores_max: number;
  ingredientes: string;
  alergenos: string;
  conservacion: string;
  orden: number;
  dp_variantes?: (VarianteFila & { id: string })[];
};

export type ZonaFila = { id: string; tienda_id: string; nombre: string; tarifa: number | null; activa: boolean; orden: number };

export type PedidoFila = {
  id: string;
  codigo: string;
  estado: EstadoPedido;
  cliente_nombre: string;
  cliente_telefono: string;
  fecha_entrega: string;
  franja: string;
  modalidad: 'recogida' | 'domicilio';
  zona_nombre: string;
  direccion: string;
  barrio: string;
  observaciones: string;
  subtotal: number;
  domicilio: number | null;
  domicilio_pendiente: boolean;
  total: number;
  notas_internas: string;
  datos_anonimizados: boolean;
  creado_en: string;
  dp_pedido_items?: { nombre: string; detalle: string; cantidad: number; precio_unitario: number; subtotal: number; producto_id: string | null }[];
};

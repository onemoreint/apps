/** Tipos del catálogo público y del pedido. Los precios son pesos colombianos enteros (sin decimales). */

export type Variante = {
  id: string;
  nombre: string;
  /** Precio propio de la variante. null = usa el precio base del producto. */
  precio: number | null;
  disponible: boolean;
};

export type Producto = {
  id: string;
  categoria_id: string | null;
  nombre: string;
  descripcion: string;
  precio: number;
  presentacion: string;
  fotos: string[];
  disponible: boolean;
  destacado: boolean;
  nuevo: boolean;
  por_encargo: boolean;
  horas_preparacion: number;
  cantidad_minima: number;
  sabores: string[];
  /** Cuántos sabores puede elegir el cliente (cajas y combos permiten varios). */
  sabores_max: number;
  ingredientes: string;
  alergenos: string;
  conservacion: string;
  variantes: Variante[];
  orden: number;
};

export type Categoria = { id: string; nombre: string; descripcion: string; orden: number; foto_url?: string };

export type Zona = {
  id: string;
  nombre: string;
  /** null = el domicilio se cotiza por WhatsApp. */
  tarifa: number | null;
};

export type PreguntaFrecuente = { pregunta: string; respuesta: string };
export type Testimonio = { nombre: string; texto: string };

/** Textos y apariencia editables desde el panel. */
export type Contenido = {
  eslogan: string;
  mensaje_bienvenida: string;
  logo_url: string;
  banner_url: string;
  colores: { primario: string; acento: string };
  como_pedir: string[];
  info_entregas: string;
  info_anticipacion: string;
  eventos_texto: string;
  faq: PreguntaFrecuente[];
  /** Solo opiniones reales de clientes. Vacío = la sección no se muestra. */
  testimonios: Testimonio[];
  ciudad: string;
  horario_texto: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  correo: string;
  privacidad: string;
  /** Dirección visible para clientes. */
  direccion?: string;
  /** Coordenadas para el mapa (null = sin mapa). */
  mapa_lat?: number | null;
  mapa_lng?: number | null;
};

export type Tienda = {
  slug: string;
  nombre: string;
  /** Número con código de país, solo dígitos con +: "+573001234567". */
  whatsapp: string;
  demo: boolean;
  /** 0 = domingo … 6 = sábado. */
  dias_atencion: number[];
  dias_max_anticipacion: number;
  franjas: string[];
  recogida: boolean;
  domicilio: boolean;
  direccion_recogida: string;
  contenido: Contenido;
};

export type Catalogo = {
  tienda: Tienda;
  categorias: Categoria[];
  productos: Producto[];
  zonas: Zona[];
  /** Fechas cerradas (AAAA-MM-DD) desde hoy en adelante. */
  fechas_bloqueadas: string[];
  /** Hora local del negocio según el servidor: "AAAA-MM-DDTHH:mm". */
  ahora: string;
};

export type LineaCarrito = {
  clave: string;
  producto_id: string;
  variante_id: string | null;
  sabores: string[];
  cantidad: number;
};

export type Modalidad = 'recogida' | 'domicilio';

export type DatosPedido = {
  nombre: string;
  telefono: string;
  fecha: string;
  franja: string;
  modalidad: Modalidad;
  zona_id: string;
  direccion: string;
  barrio: string;
  observaciones: string;
  acepta_datos: boolean;
};

/** Lo que devuelve el servidor tras registrar la solicitud (o el cálculo local en modo demostración). */
export type ResumenPedido = {
  codigo: string | null;
  items: { nombre: string; detalle: string; cantidad: number; precio_unitario: number; subtotal: number }[];
  subtotal: number;
  /** null = domicilio pendiente de cotizar (o no aplica si es recogida). */
  domicilio: number | null;
  domicilio_pendiente: boolean;
  total: number;
};

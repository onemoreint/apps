/* ==========================================================================
   MI TIENDA RESIDENCIAL — Configuración de la tienda
   --------------------------------------------------------------------------
   Este es el ÚNICO archivo que necesitas cambiar para personalizar la tienda
   de cada conjunto residencial (nombre, logo, WhatsApp, pagos, horarios...).

   IMPORTANTE:
   - Aquí solo van datos PÚBLICOS (los que el residente igual verá en pantalla).
   - Nunca pongas aquí contraseñas, claves secretas de Supabase ni tokens.
   - En la fase 2 estos datos se leerán desde Supabase y se editarán desde
     el panel administrativo. Este archivo quedará como respaldo.
   ========================================================================== */

window.TIENDA_CONFIG = {
  // Identificador corto de la tienda (sin espacios ni tildes). Se usa en los
  // números de pedido y, en la fase 2, para separar los datos de cada tienda.
  slug: "demo",
  prefijoPedido: "FDL",

  nombre: "Flor de Lotto",
  conjunto: "Conjunto Residencial Demo",
  eslogan: "Minimercado · Víveres y consumo en general",
  logo: "img/logo-flor-de-lotto.webp", // Logo redondo de la tienda (ideal 384×384 px)

  // WhatsApp de la tienda: código de país + número, solo dígitos.
  whatsapp: "573000000000",

  moneda: "COP",

  // Torres disponibles en el conjunto (para el selector del formulario).
  torres: ["1", "2", "3", "4", "5", "6"],

  entrega: {
    domicilioActivo: true,
    recogidaActiva: true,
    costoDomicilio: 2000,
    domicilioGratisDesde: 50000, // pon 0 para no ofrecer domicilio gratis
    pedidoMinimo: 5000,
    puntoRecogida: "Local 1, junto a la portería principal",
    tiempoEstimado: "20 a 40 minutos"
  },

  // Horario de atención. Días: 0 = domingo, 1 = lunes ... 6 = sábado.
  // Formato 24 horas "HH:MM".
  horarios: [
    { dias: [1, 2, 3, 4, 5], abre: "07:00", cierra: "21:00" },
    { dias: [6], abre: "08:00", cierra: "21:00" },
    { dias: [0], abre: "08:00", cierra: "14:00" }
  ],

  // Métodos de pago. Pon activo:false para ocultar uno.
  // Estos datos los ve el residente para poder transferir.
  //
  // qrImagen (opcional): si la tienda tiene el QR OFICIAL de Nequi, Daviplata
  // o Bre-B (el que genera la app del banco), guarda la imagen en img/ y pon
  // aquí su ruta, ej. "img/qr-nequi.png". Ese QR sí se puede escanear desde la
  // app del banco para pagar. Si lo dejas vacío, la tienda genera un QR
  // informativo con los datos de la cuenta y el valor del pedido.
  pagos: [
    {
      id: "nequi",
      nombre: "Nequi",
      activo: true,
      titular: "Nombre del titular",
      numero: "300 000 0000",
      qrImagen: "",
      instrucciones: "Envía el valor exacto desde tu app Nequi al número indicado."
    },
    {
      id: "daviplata",
      nombre: "Daviplata",
      activo: true,
      titular: "Nombre del titular",
      numero: "300 000 0000",
      qrImagen: "",
      instrucciones: "Envía el valor exacto desde tu app Daviplata."
    },
    {
      id: "transferencia",
      nombre: "Transferencia bancaria",
      activo: true,
      titular: "Nombre del titular",
      banco: "Banco de ejemplo",
      tipoCuenta: "Ahorros",
      numero: "000-000000-00",
      documento: "C.C. 0.000.000",
      qrImagen: "",
      instrucciones: "Transfiere el valor exacto y anota la referencia que te da tu banco."
    },
    {
      id: "efectivo",
      nombre: "Efectivo",
      activo: true,
      instrucciones: "Pagas al recibir. Dinos con cuánto vas a pagar para llevarte el cambio exacto."
    }
  ],

  // Créditos que aparecen al pie de la página.
  creditos: {
    desarrollador: "José Lugo",
    telefono: "+57 312 638 7467",
    correo: "jose.lugocdv@gmail.com"
  }
};

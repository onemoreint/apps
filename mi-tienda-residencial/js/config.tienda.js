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
  prefijoPedido: "MTR",

  nombre: "Mi Tienda Residencial",
  conjunto: "Conjunto Residencial Demo",
  eslogan: "Lo que necesitas, sin salir del conjunto",
  logo: "img/logo.svg", // Cambia por la ruta o URL del logo de la tienda

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
  pagos: [
    {
      id: "nequi",
      nombre: "Nequi",
      activo: true,
      titular: "Nombre del titular",
      numero: "300 000 0000",
      instrucciones: "Envía el valor exacto desde tu app Nequi al número indicado."
    },
    {
      id: "daviplata",
      nombre: "Daviplata",
      activo: true,
      titular: "Nombre del titular",
      numero: "300 000 0000",
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
      instrucciones: "Transfiere el valor exacto y anota la referencia que te da tu banco."
    }
  ],

  // Créditos que aparecen al pie de la página.
  creditos: {
    desarrollador: "José Lugo",
    telefono: "+57 312 638 7467",
    correo: "jose.lugocdv@gmail.com"
  }
};

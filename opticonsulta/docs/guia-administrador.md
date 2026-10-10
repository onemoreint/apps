# Guía del administrador

Para el propietario y los administradores de la óptica. Cada sección dice qué permiso necesita; la [matriz de permisos](matriz-permisos.md) muestra qué rol lo tiene por defecto.

## Puesta en marcha

La página **Inicio** muestra la lista «Puesta en marcha» con los cuatro primeros pasos (equipo, autorización de datos, profesionales y datos legales). La configuración completa, en orden:

1. **Datos de la óptica** (Configuración · `settings.manage`): razón social, NIT, sedes con dirección y teléfono, y el código de prestador REPS de cada sede si lo tiene. El NIT y la sede aparecen en los recibos internos y en las fórmulas impresas.
2. **Equipo** (`users.manage`): invita a cada persona con su rol. El sistema no envía correos: copia el enlace de invitación y entrégalo por un canal de confianza. El enlace caduca y se usa una sola vez.
3. **Texto de autorización de datos** (Privacidad · `privacy.manage`): pega el texto que redactó tu asesor jurídico. Cada publicación crea una versión nueva; las autorizaciones ya firmadas conservan la suya. Sin autorización vigente no se inicia una consulta.
4. **Profesionales** (`professionals.manage`): registra a cada optómetra, vincúlalo a su usuario y verifica su tarjeta profesional (por ejemplo, en ReTHUS), anotando fuente y fecha. Solo una tarjeta verificada aparece impresa.
5. **Catálogos** (los importa quien administra la base): CIE-10, CUPS y tablas SISPRO. Configuración muestra cuáles faltan.
6. **Productos, proveedores y medios de pago** (Productos · `catalog.manage`): el precio del catálogo es el que usan las ventas. Usa precio 0 para lentes según fórmula u otros de precio variable; el precio se indica en cada venta. «Controlar existencias» se decide al crear el producto y no cambia después.
7. **Laboratorios y estados** (Laboratorio › Laboratorios y estados): registra los laboratorios (`lab.manage`) y, si quieres, estados intermedios como «En biselado» (`settings.manage`). Los estados del sistema se pueden renombrar, no eliminar.
8. **Parámetros** (Configuración): porcentaje de descuento que no requiere aprobación (10 % por defecto) y pie del recibo interno.

## Roles y permisos

**Roles y permisos** (`roles.manage`, solo propietario) muestra una tabla de permisos por rol. Los cambios aplican de inmediato. Reglas que la base impone:

- El propietario conserva todos sus permisos.
- Los permisos clínicos solo se asignan al rol optómetra (la casilla aparece deshabilitada para los demás).
- Nadie cambia su propio rol ni se suspende a sí mismo; siempre queda al menos un propietario activo.

Si alguien deja la óptica, **suspéndelo** en Equipo el mismo día. Su historial (consultas, ventas, auditoría) se conserva a su nombre.

## Controles diarios

- **Caja:** cada persona abre su caja al empezar y la cierra al terminar contando por medio de pago. En Caja ves las cajas del equipo y la diferencia de cada cierre. Puedes cerrar la caja que alguien dejó abierta («Cerrar» en la lista). Investiga cualquier diferencia distinta de cero.
- **Reversiones:** el cajero solicita, un administrador revierte desde la venta indicando el motivo. Revertir efectivo exige tener tu propia caja abierta en la sede de la venta, porque el dinero sale de ella.
- **Descuentos:** Cotizaciones › «Descuentos por aprobar». Un descuento sobre el límite solo se vende si se aprobó.
- **Anulaciones:** solo una venta sin pagos vigentes, sin órdenes activas y sin entregas. Devuelve las existencias. Para lo ya entregado, abre una garantía.
- **Entregas con saldo:** solo con `discount.approve`, marcando la autorización; queda registrada a tu nombre.
- **Laboratorio:** revisa las órdenes atrasadas (Inicio y Laboratorio).
- **Inventario:** «Ver solo bajo mínimo». Los ajustes exigen motivo y quedan como movimiento; nada se borra.

## Privacidad y solicitudes de titulares

- **Solicitudes de titulares** (registra `privacy.register`; responde `privacy.manage`): registra el mismo día cada consulta o reclamo sobre datos personales. El sistema calcula una fecha límite en días hábiles (10 para consultas, 15 para reclamos) **sin descontar festivos**, por lo que puede vencer antes que el plazo legal; confirma los plazos y las prórrogas con tu asesor. Una solicitud solo se cierra registrando la respuesta dada.
- **Exportaciones** (Reportes · `export.data`): cada una exige motivo y queda registrada. No hay exportación de historias clínicas.
- **Auditoría** (`audit.read`): registro inmutable de quién hizo qué y cuándo.

## Respaldo

Sigue [respaldo-y-restauracion.md](respaldo-y-restauracion.md): respaldo lógico periódico guardado cifrado y simulacro de restauración trimestral.

## Lo que OptiConsulta no hace

No emite factura electrónica DIAN (el recibo interno lo dice en el documento), no envía RIPS ni el RDA al Ministerio, no se integra con EPS, no envía WhatsApp ni SMS, no sugiere diagnósticos ni modifica fórmulas, y no lleva contabilidad ni nómina. Ver [riesgos.md](riesgos.md).

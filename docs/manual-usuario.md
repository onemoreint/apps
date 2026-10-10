# Manual de uso

Cada persona ve en el menú solo los módulos de su rol. Si necesitas algo que no aparece, pídelo al propietario: el permiso se controla en la base de datos, no solo en la pantalla.

## Entrar

1. Abre la dirección de la óptica e inicia sesión con tu correo y contraseña.
2. Tras varios intentos fallidos el acceso se bloquea unos minutos. Usa «Olvidé mi contraseña» para crear una nueva.
3. La sesión se cierra tras un tiempo sin uso. Cierra sesión si compartes el equipo.

## Inicio

Tarjetas con lo pendiente de tu rol: citas de hoy, consultas en borrador, órdenes atrasadas o listas, productos bajo mínimo, ventas con saldo. Cada tarjeta lleva al módulo.

## Agenda y pacientes (asistente, optómetra)

- **Pacientes › Registrar paciente**: datos de identificación y contacto. Registra la **autorización de tratamiento de datos** en la ficha antes de la consulta.
- **Agenda**: crea, mueve o cancela citas (cancelar pide motivo). El sistema impide dos citas del mismo profesional a la misma hora.

## Consulta y fórmula (optómetra)

- Desde la ficha del paciente o la cita: **Iniciar consulta**. Solo quien la inicia la edita. Los campos vacíos quedan vacíos: el sistema no completa valores.
- **Finalizar consulta** la sella. Después solo se agregan **adendas** con motivo.
- **Fórmula**: créala desde la consulta o la ficha, revísala y usa **Validar fórmula**. Para corregir una validada, usa **Corregir con versión nueva** e indica el motivo; la anterior se conserva. La vista imprimible muestra la tarjeta profesional solo si fue verificada.
- Una fórmula traída de otro profesional se registra como **externa** (asistente u optómetra), con emisor y fecha.

## Cotizar y vender (asistente, cajero)

1. **Ventas › Nueva venta** (o «Nueva venta» en la ficha del paciente). Para lentes, elige el paciente y la **fórmula vigente**.
2. Agrega productos. El precio sale del catálogo; los de precio variable piden el precio. Los descuentos van por línea.
3. Si el descuento supera el límite de la óptica, guárdalo como **cotización**: un administrador lo aprueba y luego se convierte en venta con un clic.
4. **Confirmar venta** descuenta las existencias.

## Cobrar (cajero)

1. **Caja › Abrir caja** con la base de efectivo.
2. En la venta, **Registrar pago** con el medio y el valor (puede ser un abono).
3. **Imprimir recibo**: es un **recibo interno de caja, no una factura electrónica**. Si el cliente necesita factura electrónica, la óptica la expide en su propio sistema de facturación.
4. ¿Error en un pago? **Solicitar reversión** con lo que pasó; un administrador la revisa. Los pagos no se borran.
5. Al terminar, **Cerrar caja**: escribe lo contado por cada medio de pago (efectivo, comprobantes de tarjeta, transferencias). El sistema calcula la diferencia.

## Laboratorio y entrega

Crear órdenes y cambiar su estado: asistente o administrador (`lab.manage`). Control de calidad y entrega: también el optómetra.

1. En la venta (con paciente y fórmula vigente): **Crear orden de laboratorio** con laboratorio, fecha prometida y descripción. La orden copia la fórmula tal como está.
2. En **Laboratorio**, actualiza el estado (enviada, en proceso, recibida). Cada cambio queda en el historial.
3. Cuando llega: **Control de calidad**. Marca cada verificación que hiciste; para aprobar deben estar todas. Si algo falla, **rechaza** con el motivo: la orden queda «Rechazada en calidad» y, para reenviarla, se actualiza su estado (por ejemplo, a «Enviada al laboratorio»).
4. Con calidad aprobada, en la venta: **Registrar entrega** con el nombre (y documento) de quien recibe. Si hay saldo, cóbralo antes o pide autorización a un administrador.

## Garantías

En la venta: **Abrir garantía o incidencia** con la descripción. En **Garantías**, registra cada gestión; cerrar exige escribir la resolución.

## Inventario y productos

- **Inventario**: existencias por sede, movimientos recientes y registro de entradas (con la factura del proveedor como referencia) o ajustes (con motivo).
- **Productos**: catálogo, precios y proveedores (administrador).

## Reportes (propietario, administrador)

Elige el periodo: venta neta, pagos, anulaciones y descuentos; por medio de pago, por vendedor y por producto. Las definiciones están en [indicadores.md](indicadores.md). **Exportar a CSV** pide el motivo y queda registrado.

## Solicitudes de titulares (asistente registra; administrador responde)

Cuando alguien pide conocer, corregir o eliminar sus datos, o revoca su autorización: **Solicitudes de titulares › Registrar solicitud** el mismo día. El sistema muestra la fecha límite de respuesta.

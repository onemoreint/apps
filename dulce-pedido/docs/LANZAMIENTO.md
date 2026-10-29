# Lista de comprobación para lanzar una tienda

## Negocio
- [ ] Nombre, logo y foto principal propios (no de demostración).
- [ ] WhatsApp con +57 correcto; probar el botón flotante desde otro celular.
- [ ] Ciudad, horario y redes sociales.
- [ ] Política de privacidad revisada (responsable, contacto, plazo de conservación).
- [ ] Testimonios solo si son reales y con permiso; si no, vacíos.

## Catálogo
- [ ] Todas las fotos son de productos reales de la tienda.
- [ ] Precios confirmados por la propietaria, incluidas las presentaciones.
- [ ] Tiempos de preparación y cantidades mínimas realistas.
- [ ] Ingredientes y alérgenos solo cuando están confirmados.
- [ ] Productos de prueba eliminados u ocultos.
- [ ] Tienda creada con `demo = false` (las creadas con `dp_crear_tienda` ya lo están).

## Entregas
- [ ] Recogida y/o domicilio según la operación real.
- [ ] Zonas con tarifa o «se cotiza».
- [ ] Días de atención, franjas y fechas bloqueadas próximas (festivos, vacaciones).

## Prueba completa (desde un celular)
- [ ] Abrir el enlace, buscar un producto y filtrar por categoría.
- [ ] Agregar un producto con presentación y otro con sabores; cambiar cantidades.
- [ ] Intentar una fecha imposible: el sistema no la permite.
- [ ] Enviar el pedido: el mensaje llega al WhatsApp de la tienda con el código y los valores correctos.
- [ ] Ver la solicitud en el panel, cambiar su estado y luego cancelarla.
- [ ] Compartir el enlace en un chat y verificar la vista previa (imagen y título).

## Cuentas y seguridad
- [ ] La propietaria entra al panel con su correo y cambió su contraseña.
- [ ] URL de la tienda agregada a *Redirect URLs* en Supabase (recuperación de contraseña).
- [ ] Protección de contraseñas filtradas activada en Supabase.
- [ ] Plan de respaldos acordado.

## Comunicación
- [ ] Explicar a la propietaria que «solicitud» no es «pedido confirmado».
- [ ] Mensaje para sus clientes: «Ahora puedes ver nuestro catálogo y pedir aquí: [enlace]».
- [ ] Código QR del enlace para el local o los empaques.

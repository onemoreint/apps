# Riesgos conocidos

Riesgos que siguen abiertos con la versión actual, cómo se mitigan y qué queda. Revisar antes de cada piloto.

| # | Riesgo | Mitigación actual | Riesgo que queda / acción |
| --- | --- | --- | --- |
| 1 | Uso con datos reales sin validación jurídica | Avisos en README, matriz legal con todo «pendiente» | **Alto** hasta que un asesor revise la [matriz legal](matriz-legal.md) |
| 2 | Confundir el recibo interno con una factura | El documento dice «No es una factura electrónica de venta» | La óptica debe facturar en su sistema; capacitar al personal |
| 3 | Pérdida de datos | Respaldos del proveedor, respaldo lógico con restauración verificada y prueba automática | Depende de que la óptica haga y custodie respaldos y simulacros |
| 4 | Copias de respaldo o CSV filtrados | Exportaciones con motivo y registro; sin exportación clínica | Los archivos salen del control de la aplicación: cifrarlos y limitar quién exporta |
| 5 | Cuenta comprometida o compartida | Contraseñas robustas, bloqueo por intentos, sesión con caducidad, suspensión de usuarios, auditoría | Sin segundo factor en esta versión; no compartir cuentas |
| 6 | Catálogos provisionales o desactualizados | Configuración muestra los faltantes; importador con ensayo | Cargar las tablas oficiales vigentes antes del piloto |
| 7 | Plazos de titulares calculados sin festivos | El cálculo vence antes o igual que el legal | Confirmar plazos y prórrogas con el asesor |
| 8 | Datos en región fuera de Colombia | Documentado en despliegue y matriz legal | Evaluación jurídica de transferencia internacional |
| 9 | Diferencias de caja | Caja por persona, cierre sin mostrar el esperado al cajero (medida de interfaz), reversión solo por administrador con motivo | Revisión diaria del administrador |
| 10 | Descuentos o entregas con saldo indebidos | Umbral configurable con aprobación; entrega con saldo solo autorizada y registrada | Revisión de auditoría |
| 11 | Inventario descuadrado por error humano | Existencias derivadas de movimientos; ajustes con motivo; verificación en el respaldo | Conteos físicos periódicos |
| 12 | Funcionalidades fuera de alcance esperadas por usuarios | Lista explícita en README y guía del administrador | RDA, RIPS, factura electrónica, EPS, mensajería, contabilidad, nómina, multisede avanzada y portal del paciente no existen |
| 13 | Pruebas E2E sin Docker | Pila local con binarios oficiales de Auth y PostgREST; 23 pruebas aprobadas | No reproduce todo Supabase (Storage, Realtime, Kong, plantillas de correo); la prueba de registro con correo no se ha ejecutado aquí |
| 14 | Tipos de TypeScript escritos o generados localmente | `scripts/gen-db-types.mjs` los deriva de la base migrada y de los privilegios reales | Comparar con `supabase gen types` cuando haya stack con Docker |
| 15 | Rendimiento con volúmenes grandes | Índices por organización; listados limitados | Sin paginación completa en algunos listados (100–200 filas); medir con datos de un año |
| 16 | Dependencia de un proveedor (Supabase) | Esquema y migraciones en PostgreSQL estándar; respaldo lógico portable | Migrar exige reemplazar Auth |

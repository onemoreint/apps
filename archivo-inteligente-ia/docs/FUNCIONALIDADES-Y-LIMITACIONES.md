# Funcionalidades implementadas y limitaciones del MVP

## Funcionalidades implementadas (verificadas con `tests/e2e.py`)

**Dashboard**
- 6 indicadores calculados desde los registros: total, activos, cerrados, pendientes de clasificación, transferencias pendientes y alertas.
- Gráfico de aperturas y cierres de los últimos 12 meses (SVG propio).
- Distribución de estados por dependencia, actividades de los últimos 30 días y últimos movimientos.

**Expedientes**
- Formulario con los 11 campos pedidos, más soporte, folios y próxima revisión.
- Validaciones: código único y con formato válido, fechas no futuras, cierre posterior a la apertura, coherencia entre estado y fecha de cierre, y subserie que pertenezca a la serie.
- Código autogenerado (`DEP-SERIE-AÑO-###`), catálogo configurable de demostración y sugerencia de ARCHI dentro del formulario.
- Búsqueda, filtros (dependencia, estado, pendientes de clasificación), detalle con historial, edición, cierre y reapertura.

**Inventario**
- Búsqueda instantánea multi-campo, 6 filtros, ordenamiento por columna (selector en móvil) y paginación.
- CSV con separador `;` y BOM (abre bien en Excel en español), protegido contra inyección de fórmulas.
- Impresión y registro de cambios (auditoría de demostración) exportable a CSV.

**Transferencias**
- Seis estados con transiciones controladas. La devolución exige un motivo.
- Validación de elegibilidad: cerrado, clasificado, con responsable y ubicación, y sin otra transferencia en curso.
- Al completarse, los expedientes pasan a *Transferido*, se marca el archivo central y se actualiza la ubicación.
- Historial de estados y comprobante imprimible.

**ARCHI IA**
- Modo demostración por reglas locales, rotulado como simulación: clasificación con confianza heurística, metadatos (dependencia, vigencia, estado, soporte, referencia), campos incompletos, nombre normalizado, resumen y razones.
- Avisa si la descripción parece contener datos personales.
- Aplicar una sugerencia exige la confirmación del funcionario y queda auditado. Rechazar una sugerencia también queda auditado.
- Modo IA real preparado: solo HTTPS, solo con autorización explícita, sin claves en el navegador. Respuesta validada contra el catálogo y vuelta automática a la simulación si falla.

**Alertas**
- Reglas configurables: campos obligatorios, pendientes de clasificación, inconsistencias, revisiones programadas, revisiones periódicas y transferencias detenidas.
- Filtros por dependencia, tipo y prioridad, con responsables y acciones correctivas (*En curso* o *Resuelta*).

**Informes**
- General, por dependencia, transferencias, registros incompletos, actividades pendientes y resumen ejecutivo.
- Exportación CSV y vista imprimible para guardar como PDF.

**Productividad**
- Parámetros editables por actividad y totales: horas tradicional y digital, ahorro y porcentaje de reducción.
- Aviso permanente de que es una simulación hipotética.

**Configuración**
- Municipio (Girardota, La Estrella o genérico), perfil demo, reglas de alertas y modo de IA.
- Catálogo ampliable con series, subseries y palabras clave.
- Respaldo e importación JSON (validada y saneada) y restauración de la base de demostración.

**Transversal**
- Responsive: menú lateral en escritorio; navegación inferior y hojas modales en móvil.
- Escape automático de todo contenido dinámico (probado con un intento de XSS) y política CSP.
- Sin dependencias externas, sin llamadas a internet en modo demostración, y funciona abriendo el archivo directamente o desde un servidor.

## Limitaciones del MVP

1. **Sin autenticación ni roles.** El "perfil de usuario" es solo una etiqueta. Cualquiera con el navegador puede modificar los datos.
2. **Datos locales en el navegador.** IndexedDB no se comparte entre equipos ni usuarios; borrar los datos del navegador los elimina. No apto para información real.
3. **Auditoría no inalterable.** El registro de cambios vive en el mismo almacenamiento local y puede borrarse.
4. **ARCHI en modo demostración no es IA.** Es una coincidencia de palabras clave; su "confianza" es un puntaje heurístico. El modo IA real necesita un backend que no forma parte de este MVP y no se ha probado contra ningún proveedor.
5. **Catálogo ficticio.** Series, subseries y reglas no provienen de ninguna TRD/CCD; no hay tiempos de retención ni disposición final.
6. **Sin documentos electrónicos.** Se gestionan metadatos de expedientes; no se cargan, firman ni preservan archivos (no hay foliado electrónico, índice electrónico ni hash).
7. **Transferencias simplificadas.** No se genera el Formato Único de Inventario Documental (FUID) oficial ni se valida contra un cronograma.
8. **Rendimiento probado con unos cientos de registros.** Para decenas de miles se necesita paginación y búsqueda en un servidor.
9. **PDF a través del navegador** (Imprimir › Guardar como PDF), sin un generador propio.
10. **Productividad hipotética.** Los valores por defecto son supuestos, no mediciones.

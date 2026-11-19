# Propuesta de evolución hacia una versión institucional

> Hoja de ruta orientativa. Antes de implementarla, la entidad debe verificar el marco normativo vigente (Ley 594 de 2000, Ley 1712 de 2014, Ley 1581 de 2012, Decreto 1080 de 2015, Decreto 1078 de 2015, MIPG y lineamientos del AGN) con sus áreas jurídica, de archivo y de TI.

## Fase 1 · Piloto controlado (1 dependencia)
- Cargar el **CCD y la TRD aprobados** de la entidad en lugar del catálogo de demostración.
- Medir los tiempos reales del proceso actual para alimentar el simulador con datos propios.
- Desplegar en infraestructura de la entidad o en una nube contratada, con datos de prueba anonimizados.

## Fase 2 · Arquitectura con backend
```
Navegador (PWA) ──HTTPS──► API institucional ──► Base de datos (PostgreSQL)
                               │                   └─ réplicas y copias cifradas
                               ├─► Almacenamiento de documentos (cifrado en reposo)
                               ├─► Servicio de IA (proveedor aprobado, clave solo en el servidor)
                               └─► Directorio de usuarios (SSO / Azure AD / LDAP)
```
- El frontend actual se conserva. La capa `AI.db` se reemplaza por llamadas a la API, sin reescribir las pantallas.

## Requisitos de seguridad para la versión institucional
| Tema | Requisito |
|------|-----------|
| **Autenticación** | SSO institucional, MFA para administradores y bloqueo por intentos fallidos |
| **Autorización por roles** | Productor de dependencia, técnico de archivo, archivo central, aprobador, auditor y administrador. Permisos por dependencia y por acción |
| **Auditoría persistente** | Registro solo de anexado (append-only) con quién, qué, cuándo, IP y valores antes/después; firmado o encadenado con hash; retención definida |
| **Cifrado** | TLS 1.2+ en tránsito; cifrado en reposo para la base y los documentos; gestión de llaves (KMS) |
| **Copias de seguridad** | Automáticas, cifradas, fuera del sitio, con pruebas periódicas de restauración y RPO/RTO definidos |
| **Retención y disposición** | Tiempos de la TRD, disposición final (conservación total, selección, eliminación) con actas y aprobaciones |
| **Datos personales** | Política de tratamiento, clasificación de información (pública, clasificada, reservada según la Ley 1712), minimización y anonimización antes de enviar a IA |
| **IA** | Proveedor aprobado, acuerdo de tratamiento de datos, sin entrenamiento con datos de la entidad, registro de cada consulta, validación humana obligatoria y evaluación de sesgos |
| **Interoperabilidad** | API documentada (OpenAPI); integración con ventanilla única, PQRSD y sistemas financieros; exportación del FUID |
| **Despliegue seguro** | Ambientes separados (desarrollo, pruebas, producción), pipeline CI/CD con análisis de dependencias, pruebas de penetración y monitoreo |

## Contrato sugerido para el modo IA real
`POST {endpoint}`, con autenticación de sesión institucional:
```json
{ "tarea": "clasificar_expediente", "descripcion": "texto", "dependencia": "HAC",
  "catalogo": [{ "id": "S08", "nombre": "...", "subseries": [{ "id": "S08.3", "nombre": "..." }] }] }
```
Respuesta esperada:
```json
{ "sugerencias": [{ "serieId": "S08", "subserieId": "S08.3", "confianza": 87, "motivos": ["..."] }],
  "incompletos": ["..."], "nombreNormalizado": "...", "resumen": "...", "razones": ["..."] }
```
El backend guarda la clave del proveedor, aplica la anonimización, limita la tasa de solicitudes y registra cada consulta. El frontend descarta las series que no estén en el catálogo.

## Fase 3 · Hacia un SGDEA
- Gestión de documentos electrónicos: captura, foliado e índice electrónico, hash, firma digital y metadatos de preservación.
- Expedientes híbridos, préstamo documental, consultas ciudadanas (Ley 1712) e indicadores MIPG.
- Evaluación contra los requisitos de SGDEA del AGN antes de afirmar que se cumplen.

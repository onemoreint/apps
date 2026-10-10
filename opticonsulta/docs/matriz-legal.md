# Matriz de requisitos legales

> **Este documento no es una opinión jurídica ni declara cumplimiento.** Relaciona normas colombianas que, según el equipo técnico, pueden aplicar a una óptica con consultorio de optometría, y qué controles técnicos ofrece OptiConsulta. Todas las filas están **pendientes de validación por un asesor jurídico** de la óptica, que debe confirmar la vigencia de cada norma, sus modificaciones y si aplica al caso concreto. OptiConsulta no está certificado, habilitado ni registrado ante ninguna autoridad.

Estados: **Pendiente** = sin validar por asesor. **Fuera de alcance** = el producto no lo cubre por decisión de alcance.

## Datos personales

| Norma (a verificar) | Tema | Lo que hace OptiConsulta | A cargo de la óptica | Estado |
| --- | --- | --- | --- | --- |
| Ley 1581 de 2012; Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015) | Autorización previa para tratar datos; datos sensibles (salud) | Textos de autorización versionados e inmutables; registro de autorización, negativa y revocación por paciente; sin autorización vigente no se inicia consulta ni fórmula | Redactar el texto y la política de tratamiento; obtener la autorización por un medio que pueda probar | Pendiente |
| Ley 1581 de 2012, arts. 14 y 15 | Consultas y reclamos de titulares | Registro de solicitudes con fecha límite conservadora (10 días hábiles consultas, 15 reclamos, sin festivos) y respuesta obligatoria para cerrar | Responder dentro del plazo legal, aplicar prórrogas si proceden, verificar identidad | Pendiente |
| Ley 1581 de 2012, art. 17; Decreto 1074 de 2015 | Seguridad de la información | RLS por óptica, permisos por rol verificados en la base, auditoría inmutable, cabeceras de seguridad, sin datos clínicos en registros de depuración, exportaciones registradas | Política interna, gestión de cuentas, equipos y respaldos cifrados | Pendiente |
| Ley 1581 de 2012, art. 26 | Transferencia internacional de datos | Ninguno: la base se aloja en la región del proveedor que se elija (fuera de Colombia) | Evaluar la transferencia o transmisión y sus requisitos; contrato con el proveedor | Pendiente |
| Decreto 1074 de 2015 (RNBD) | Registro Nacional de Bases de Datos ante la SIC | Ninguno | Determinar si está obligada a registrar y hacerlo | Pendiente |

## Historia clínica y atención

| Norma (a verificar) | Tema | Lo que hace OptiConsulta | A cargo de la óptica | Estado |
| --- | --- | --- | --- | --- |
| Resolución 1995 de 1999 | Historia clínica: integralidad, secuencialidad, confidencialidad, custodia | Solo optómetras leen y escriben lo clínico; consulta finalizada sellada (SHA-256) e inmutable; correcciones por adenda con autor y fecha; auditoría | Custodia, acceso del paciente a su historia, procedimientos internos | Pendiente |
| Resolución 839 de 2017 | Conservación de la historia clínica | Nada se borra: anulaciones con motivo; respaldo verificable | Definir y cumplir el plazo de conservación y la disposición final | Pendiente |
| Ley 2015 de 2020; Resolución 866 de 2021 y la normativa del RDA (Res. 1888 de 2025, a verificar) | Historia clínica electrónica interoperable y Resumen Digital de Atención | Modelo de datos con los elementos del RDA de consulta externa y panel de datos faltantes | Envío del RDA al Ministerio (requiere credenciales y guía oficial) | **Fuera de alcance** (el envío) |
| Ley 527 de 1999; Decreto 2364 de 2012 | Validez de mensajes de datos y firma electrónica | Autoría por usuario autenticado, sello de contenido y auditoría | Determinar si ese mecanismo basta como firma de la historia y de la fórmula | Pendiente |
| Ley 372 de 1997; Ley 650 de 2001 | Ejercicio y ética de la optometría | Solo profesionales registrados firman; tarjeta impresa solo si se verificó | Verificar idoneidad del personal (ReTHUS) | Pendiente |
| Resolución 3100 de 2019 | Habilitación de servicios de salud (REPS) | Campo para el código REPS por sede | Habilitar el servicio si aplica; OptiConsulta no habilita nada | Pendiente |
| Resolución 2275 de 2023 (RIPS) | RIPS como soporte de la factura electrónica en salud | Ninguno | Generar RIPS con otra herramienta si aplica | **Fuera de alcance** |

## Comercial

| Norma (a verificar) | Tema | Lo que hace OptiConsulta | A cargo de la óptica | Estado |
| --- | --- | --- | --- | --- |
| Estatuto Tributario; Resolución DIAN 000165 de 2023 | Factura electrónica de venta | Solo **recibo interno de caja**, marcado «No es una factura electrónica de venta» | Expedir factura electrónica con un proveedor autorizado | **Fuera de alcance** |
| Ley 1480 de 2011 | Estatuto del Consumidor: garantías e información | Registro de garantías e incidencias con historial | Términos de garantía, información al consumidor | Pendiente |

## Decisiones que necesitan al asesor

1. Texto de autorización de datos y política de tratamiento.
2. Si la autoría por usuario y el sello bastan como firma de la historia y la fórmula.
3. Plazos de respuesta a titulares y prórrogas (el sistema no conoce festivos).
4. Plazo de conservación de historias, respaldos y exportaciones.
5. Quién puede exportar historias clínicas (`export.clinical` no está asignado).
6. Transferencia internacional por el alojamiento elegido y RNBD.
7. Si los permisos clínicos deben poder asignarse a otros roles (hoy solo optómetra).

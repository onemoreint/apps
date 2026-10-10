# Fase C — Agenda, pacientes, consultas y fórmulas (modelo preparado para el RDA)

Fecha: 9 de octubre de 2026.

## Qué incluye

- **Pacientes** con los elementos de identificación del RDA de consulta externa (Res. 866 de 2021 / anexo de la Res. 1888 de 2025): tipo y número de documento, nombres y apellidos separados, fecha de nacimiento, sexo biológico, nacionalidad, residencia (país, municipio DIVIPOLA, zona), EAPB, etnia, discapacidad, ocupación y acudiente. Búsqueda sin tildes; control de edición concurrente.
- **Autorizaciones**: textos versionados e inmutables por óptica (los redacta su asesor jurídico) y registro de autorización, negativa y revocación por paciente. **Sin autorización vigente de tratamiento de datos no se inicia consulta ni se crea fórmula.**
- **Profesionales** vinculados a usuarios, con tarjeta profesional declarada y verificación registrada (fuente y fecha). Cambiar documento, nombre o tarjeta invalida la verificación.
- **Agenda** por día, semana y mes, filtrable por profesional; la base impide citas cruzadas del mismo profesional; cancelar exige motivo; solo iniciar la consulta marca una cita como atendida.
- **Consulta optométrica**: contexto RDA (modalidad, grupo, entorno, vía de ingreso, causa, condición y destino), anamnesis, alergias, antecedentes familiares (CIE-10) y factores de riesgo estructurados, agudeza visual (OD/OI/AO, lejos/cerca, sin/con/estenopeico), refracción por método (lensometría, autorrefracción, retinoscopía, subjetivo, cicloplegia), secciones de examen configurables, diagnósticos CIE-10 con tipo, procedimientos CUPS, análisis y plan.
  - Solo el profesional autor edita su borrador. Finalizar sella el contenido con SHA-256; después solo se agregan **adendas** (con su propio autor). Un borrador puede anularse con motivo; nada se borra.
  - Panel de **datos faltantes para el RDA** en cada consulta, con el número de elemento y dónde corregirlo.
- **Fórmulas** internas (del profesional) y externas (transcritas, con emisor y fecha, nunca atribuidas a un profesional de la óptica). Validación con sello, **versiones** con motivo (la anterior queda «reemplazada» con sus valores intactos), anulación con motivo y **vista imprimible** que solo muestra la tarjeta profesional si fue verificada.
- **Ajustes clínicos** (rol optómetra): notación de agudeza visual, convención de cilindro, diagnóstico principal obligatorio, secciones del examen y rangos (mínimo, máximo, paso) por campo. **Sin valores clínicos por defecto.**
- **Catálogos de referencia** e importador de CSV oficiales (ver [catalogos.md](catalogos.md)).

## Reglas clínicas que la base aplica siempre

Son reglas de notación, no valores clínicos:

- Un cilindro distinto de cero requiere eje, y un eje requiere cilindro.
- El eje es un entero de 0 a 180.
- Prisma y base van juntos.
- Adición, prisma, DNP, altura y distancia pupilar no pueden ser negativos.

Los rangos y pasos solo se aplican si el optómetra los configura. La agudeza visual se valida contra la notación configurada; sin notación, se acepta texto libre de hasta 20 caracteres. CD, MM, PL y NPL se aceptan siempre.

## Decisiones técnicas

| Decisión | Motivo |
| --- | --- |
| Escritura clínica solo por RPC (sin INSERT/UPDATE para `authenticated`) | Valida autoría, permiso, consentimiento, códigos y rangos en una sola transacción |
| Inmutabilidad por triggers que aplican a todos los roles | Ni un superusuario modifica una consulta finalizada o una fórmula validada; las pruebas lo verifican |
| Sello SHA-256 del contenido al finalizar o validar | Detecta alteraciones hechas por fuera de la aplicación; la consulta muestra una alerta si no coincide |
| Plantilla de examen copiada a cada consulta al iniciarla | Cambiar la plantilla no altera consultas en curso ni finalizadas |
| Catálogos en una tabla global con validación por trigger | Un importador reemplaza las tablas SISPRO sin migraciones; los códigos retirados se desactivan, no se borran |
| El valor de cada campo vacío se guarda como nulo | Cumple «no completar datos ausentes»; copiar el subjetivo a la fórmula es una acción explícita del profesional |

## Resultado de las pruebas

Ejecutadas el 9 de octubre de 2026 contra PostgreSQL 16.15 con el shim de Supabase:

| Suite | Pruebas | Resultado |
| --- | --: | --- |
| Unitarias (validaciones, zona horaria, verificación RDA, importador, formularios clínicos) | 29 | Aprobadas |
| Tenencia y aislamiento (Fase B) | 46 | Aprobadas |
| Clínica, agenda, consentimiento y aislamiento clínico (Fase C) | 37 | Aprobadas |
| Endurecimiento del esquema | 8 | Aprobadas |
| Extremo a extremo (Playwright) | 3 | No ejecutadas en este entorno (sin acceso a la descarga del navegador) |

La revisión automática del esquema detectó durante el desarrollo una función con permiso de ejecución público, que se corrigió. La verificación por mutación confirmó que las pruebas detectan regresiones: al abrir la política de consultas a quien ve pacientes y al quitar el bloqueo de consultas finalizadas, fallan 3 pruebas; restaurado, pasan todas.

Criterios de aceptación cubiertos: **2** (el cajero no lee notas clínicas, aunque sí los valores de la fórmula para vender), **3** (el optómetra registra consulta y fórmula), **4** (la fórmula conserva historial, autoría y valores originales), **11** (formularios con errores útiles) y **1** extendido a todas las tablas clínicas.

## Pendientes y riesgos

1. **Importar CIE-10, CUPS y tablas SISPRO** antes del piloto; sin CIE-10 no se finaliza ninguna consulta (con la configuración por defecto). Reemplazar los provisionales de tipo de documento y sexo.
2. **Generación y envío del RDA (FHIR R4) al Ministerio**: no implementados. El modelo ya guarda los datos; la integración requiere credenciales del mecanismo IHCE, firma digital y la guía de implementación vigente.
3. **Adjuntar el documento original** de una fórmula externa y el soporte firmado de una autorización: pendiente de Supabase Storage con políticas por organización (no se pudo probar en este entorno).
4. **Firma de la consulta**: hoy es usuario + contraseña + sello de tiempo + hash. Si el asesor exige firma digital certificada, se integra en el paso de finalización.
5. **Valores clínicos por defecto** (rangos, notación, secciones obligatorias): siguen pendientes del optómetra asesor; el sistema funciona sin ellos.
6. **Tipos de la base escritos a mano**: regenerar con `npm run db:types` cuando el stack de Supabase esté activo.

## Pasos para probar en tu equipo

```bash
npx supabase db reset          # aplica las 9 migraciones
npm run dev
```

1. Crea la cuenta, la óptica y, en Privacidad, publica un texto de autorización de prueba.
2. En Equipo, invita a un usuario con rol optómetra; en Profesionales, regístralo y vincúlalo a ese usuario.
3. Importa al menos un CSV de CIE-10 (o inserta códigos de prueba en Studio).
4. Registra un paciente, su autorización, agéndale una cita y, con el usuario optómetra, inicia y finaliza la consulta; luego crea y valida la fórmula e imprímela.

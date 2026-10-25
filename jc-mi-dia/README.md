# JC — Mi Día en Equilibrio

**Organiza tu día, cumple tus metas y haz crecer tus sueños.**

Aplicación web progresiva (PWA) personal para **Jaqueline Cataño**: planificación por horas, asistente de agenda, metas, emprendimiento, gráficos de progreso, evaluación diaria e informes. Funciona sin conexión después de la primera carga y se instala en Android y iPhone.

---

## 1. Archivos del proyecto

```
jc-mi-dia/
├── index.html              ← la aplicación completa (HTML + CSS + JavaScript, sin dependencias)
├── manifest.webmanifest    ← nombre, colores e iconos para la instalación
├── sw.js                   ← service worker (funcionamiento sin conexión y actualizaciones)
├── icon-192.png            ← icono JC
├── icon-512.png            ← icono JC grande
├── icon-512-maskable.png   ← icono adaptable para Android
└── README.md               ← este documento
```

Todos los archivos deben estar **en la misma carpeta**. No se necesita instalar nada, ni base de datos, ni API de pago.

## 2. Qué incluye

| Sección | Funciones |
|---|---|
| **Mi día** | Saludo, fecha, frase del día, objetivo del día, medidor de cumplimiento, próxima actividad, metas, acceso al emprendimiento, tiempo por categoría |
| **Agenda** | Línea de tiempo por horas, crear / editar / duplicar / completar / reprogramar / cancelar / eliminar, detección de cruces de horario, actividades recurrentes diarias y semanales, espacios libres |
| **Asistente** «Jaqueline, organicemos tu día» | Preguntas guiadas, propuesta con horario, duración, prioridad y motivo; aceptar solo las seleccionadas; respeta compromisos fijos y deja ~20 % de margen |
| **Reorganizar mi día** | Reubica lo pendiente por prioridad con pausas; si no alcanza el tiempo: mañana, reducir, dividir, no prioritaria o cancelar. Nada cambia sin aprobación |
| **Mis metas** | Diarias, semanales, mensuales y trimestrales; numéricas o cualitativas; más de 100 % sin deformar el medidor; estados: completada, en progreso, próxima a vencer, plazo cumplido |
| **Mi emprendimiento** | Prospectos, seguimientos, cotizaciones, pedidos, ventas, ingresos y gastos (cliente opcional), metas semanal y mensual, ingreso neto **estimado** |
| **Mi progreso** | Indicadores, medidor diario, barras 7/14/30 días, tendencia, distribución del tiempo (planificado vs real), equilibrio según tus preferencias, metas, panel comercial, logros |
| **Cierre del día** | Resumen, logro principal, prioridad sugerida para mañana y reflexión con tres preguntas |
| **Informes** | Semanales y mensuales con filtro por categoría, exportación CSV y versión imprimible |
| **Ajustes** | Perfil, tema claro/oscuro, categorías (nombre, icono, color), biblioteca de sugerencias, respaldo JSON, datos de demostración, borrar todo, instrucciones de instalación |

## 2.1 Novedades de la versión 1.1.0

**📖 Proverbio diario**
- Cada día aparece una ventana con un proverbio bíblico (35 citas de Proverbios, **Reina-Valera 1909**, dominio público) y una frase práctica «Para hoy».
- Se muestra una vez al día, a la **hora programada** (por defecto 07:00). Si abres la app después de esa hora, aparece al abrirla.
- Botones: **Amén** (cerrar), **Otro** (ver otro proverbio), **Copiar** y **⏰ Hora** (cambiar la hora).
- También aparece como tarjeta en *Mi día*. Se programa o desactiva en **Ajustes → Proverbio diario y alarmas**.

**🔔 Recordatorios con alarma**
- Cada actividad puede tener recordatorio: al empezar, 5, 10, 15, 30 o 60 minutos antes (por defecto, 10 min; se cambia en Ajustes).
- A la hora del recordatorio suena una alarma, vibra y aparece un aviso con **Empezar ahora**, **En 5 min** (posponer) y **Entendido**.
- Las actividades recurrentes conservan su recordatorio en cada repetición.
- **Activar notificaciones** permite avisos del sistema cuando la app está en segundo plano.

**📅 Alarmas garantizadas con la app cerrada**
Una app web no puede sonar por sí sola si está cerrada (es una limitación de Android y iPhone). Por eso la app permite añadir las alarmas al **calendario del teléfono**, que sí suena siempre:
- *Ajustes → Añadir proverbios de 30 días al calendario*: 30 eventos diarios con el texto del proverbio y su alarma.
- *Ajustes → Añadir recordatorios de los próximos 7 días*.
- En cada actividad: *Añadir alarma al calendario del teléfono* (incluye su repetición si es recurrente).

Se descarga un archivo `.ics`: en iPhone se abre y se toca **Añadir todo**; en Android se abre con la app de Calendario (Google Calendar).

## 3. Reglas de cálculo

- **Cumplimiento del día** = completadas ÷ actividades válidas × 100.
- **Válidas** = todas las del día excepto **canceladas** y **reprogramadas**.
- **Reprogramada a otro día:** la original queda «Reprogramada» y no cuenta en su día; se crea una copia que cuenta en la nueva fecha (nunca se cuenta dos veces). Si solo cambia la hora del mismo día, se modifica la misma actividad.
- **Completada fuera de horario:** cuenta como completada en su fecha planificada (queda anotado en el historial).
- **Tiempo real:** solo se suma cuando registras la duración real al completar. Si falta, la app lo indica y nunca usa la duración prevista como si fuera real.
- **Actividades que cruzan medianoche** (p. ej. 23:30 → 00:45) se calculan correctamente (75 min).
- **Recurrentes:** cada ocurrencia se identifica por serie + fecha, así no se duplica al navegar. Al editar o eliminar puedes elegir «solo esta» o «esta y las siguientes».
- **Días sin actividades** se muestran como «Sin registro», nunca como 0 %. Las comparaciones con el periodo anterior solo aparecen con al menos 3 días con datos en cada periodo.
- **Metas numéricas:** actual ÷ objetivo × 100 (puede pasar de 100 %; la barra se limita visualmente a 100 %). **Cualitativas:** estado manual.
- **Emprendimiento:** una cotización o un pedido no es una venta; una venta no es un ingreso hasta que se registra el cobro. **Ingreso neto estimado** = ingresos registrados − gastos registrados (no reemplaza una contabilidad formal).

## 4. Datos y privacidad

- Todo se guarda en **IndexedDB, solo en el navegador y dispositivo donde usas la app**. Nada se envía a servidores.
- **No hay sincronización automática** entre dispositivos. Para pasar los datos a otro teléfono: Ajustes → *Exportar respaldo (JSON)* y luego *Importar respaldo* en el otro.
- Borrar los datos del navegador o desinstalar la app puede eliminar la información: exporta respaldos con frecuencia.
- Los **datos de demostración** se cargan solo si los pides (Ajustes → *Cargar datos de demostración*), aparecen con un aviso amarillo y se borran con un toque sin afectar tus datos reales.

## 5. Publicar gratis en GitHub Pages

1. Crea una cuenta en <https://github.com> (gratis) e inicia sesión.
2. Pulsa **New repository**, ponle un nombre (por ejemplo `jc-mi-dia`), márcalo **Public** y créalo.
3. En el repositorio, pulsa **Add file → Upload files**, arrastra los **7 archivos** de esta carpeta y pulsa **Commit changes**.
4. Ve a **Settings → Pages**. En *Source* elige **Deploy from a branch**, rama **main**, carpeta **/ (root)** y pulsa **Save**.
5. Espera 1–2 minutos. La dirección será: `https://TU-USUARIO.github.io/jc-mi-dia/`

**Alternativa — Cloudflare Pages:** en <https://pages.cloudflare.com> crea un proyecto con **Upload assets** y sube la carpeta. Obtendrás `https://tu-proyecto.pages.dev`.

## 6. Comprobar que todo funciona

1. **HTTPS:** la dirección debe empezar por `https://` (GitHub Pages y Cloudflare lo hacen automáticamente).
2. **Manifest:** en Chrome de computador abre la app → `F12` → pestaña **Application → Manifest**. Debe mostrar «JC — Mi Día en Equilibrio», los tres iconos y sin errores.
3. **Service worker:** **Application → Service workers** debe mostrar `sw.js` como *activated and is running*.
4. **Instalación:** en Chrome de computador aparece un icono de instalar en la barra de direcciones; en el teléfono sigue las instrucciones de la sección 7.
5. **Sin conexión:** abre la app una vez con internet, luego activa el **modo avión** y vuelve a abrirla. Debe cargar y mostrar el aviso «Sin conexión» con todos tus datos.

> ⚠️ Si abres `index.html` haciendo doble clic (dirección `file://`), la app funciona como página web, pero **no se puede instalar ni trabaja sin conexión**. La instalación necesita `https://` (o `http://localhost` para pruebas en el computador: `python -m http.server` dentro de la carpeta y abrir `http://localhost:8000`).

## 7. Instalar en el teléfono

**Android (Chrome)**
1. Abre la dirección de la app en **Chrome**.
2. Si aparece el botón **«Instalar JC Mi Día»** (en el menú ☰ de la app o en Ajustes), tócalo.
3. Si no aparece: menú **⋮** de Chrome → **Instalar aplicación** (o **Añadir a pantalla de inicio**) → **Instalar**.

**iPhone (Safari)**
1. Abre la dirección en **Safari** (en iPhone, la instalación se hace desde Safari).
2. Toca **Compartir** (cuadrado con flecha ↑).
3. Elige **Añadir a pantalla de inicio** → **Añadir**.

La app aparece con el icono **JC** y se abre a pantalla completa, como una app normal.

## 8. Publicar una actualización

1. Modifica los archivos que necesites.
2. Abre `sw.js` y cambia la versión, por ejemplo `jc-mi-dia-v1.1.0` → `jc-mi-dia-v1.1.1`. **Este paso es obligatorio**: así los teléfonos detectan la versión nueva.
3. Sube los archivos modificados al repositorio (Add file → Upload files → Commit).
4. Cuando Jaqueline abra la app, verá el aviso **«Hay una nueva versión — Actualizar»**. Al tocarlo, se recarga con la versión nueva. Sus datos **no se pierden** al actualizar.

## 9. Pruebas realizadas

Se ejecutaron 87 pruebas automáticas de la versión base y 27 de la versión 1.1.0 (proverbio, programación, alarmas, posponer, recurrentes y archivos de calendario) en Chromium (pantalla de teléfono 390 px, también 320 y 360 px) sobre `localhost`, todas superadas:

- Bienvenida, perfil y vistas vacías sin «NaN» ni 0 % engañoso
- Crear, editar (sin duplicar), duplicar, completar con tiempo real, reprogramar, cancelar y eliminar
- Detección de cruces y confirmación explícita
- Duración que cruza medianoche
- Recurrentes diarias y semanales sin duplicados; «solo esta» y «esta y las siguientes»; eliminación de una ocurrencia
- Cumplimiento con canceladas y reprogramadas excluidas
- Asistente: propuesta con motivos, añadir solo seleccionadas, sin cruces, compromiso fijo respetado, sin llenar el día
- Reorganización con aprobación previa
- Metas numéricas por encima de 100 % con barra estable; cualitativas; plazo cumplido
- Emprendimiento: cotización ≠ venta, venta cobrada → ingreso, neto = ingresos − gastos
- Gráficos y tablas alternativas; medidor que se actualiza al completar
- Reflexión diaria, informes semanal y mensual, exportación CSV
- Persistencia tras recargar; exportar, borrar todo, importar y validar respaldos dañados
- Datos de demostración y su borrado sin tocar datos reales
- Tema oscuro, sin desplazamiento horizontal en pantallas pequeñas
- Manifest, iconos, service worker activo y **funcionamiento sin conexión**
- Sin errores en la consola

**No probado automáticamente:** la instalación real en un teléfono Android o iPhone (requiere el dispositivo físico y la app publicada en `https://`). Sigue la sección 6 y 7 para verificarlo después de publicar.

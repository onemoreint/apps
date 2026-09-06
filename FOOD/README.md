# 🍽️ Food Cost Pro 🇨🇴

**Calculadora Profesional de Costos Gastronómicos para Colombia**

Una herramienta web moderna y completamente local para calcular costos de recetas, precios sugeridos y ganancias en pesos colombianos (COP).

---

## ✨ Características

✅ **100% Local** - Todos los datos se guardan en tu dispositivo, nada se envía a servidores  
✅ **Moneda COP** - Diseñada específicamente para Colombia  
✅ **Recetas Ilimitadas** - Crea y guarda todas las recetas que necesites  
✅ **Cálculos Automáticos**:
   - Costo total de materia prima
   - Costo por porción
   - Food Cost %
   - Precio sugerido
   - IVA/Impuestos
   - Ganancia total y por porción

✅ **Múltiples Países** - Aunque está optimizada para Colombia, también funciona con:
   - 🇪🇸 España (EUR)
   - 🇺🇸 Estados Unidos (USD)
   - 🇲🇽 México (MXN)
   - 🇦🇷 Argentina (ARS)
   - 🇨🇱 Chile (CLP)
   - 🇵🇪 Perú (PEN)
   - 🇧🇷 Brasil (BRL)
   - 🇨🇦 Canadá (CAD)
   - 🇻🇪 Venezuela (VES)

✅ **Modo Oscuro** - Tema claro y oscuro  
✅ **Importar/Exportar** - Guarda tus recetas en JSON  
✅ **100% Responsive** - Funciona en móvil, tablet y desktop  
✅ **Sin Dependencias Externas** - Todo funcionando localmente  

---

## 🚀 Cómo Usar

### Opción 1: Descarga Directa
1. Descarga `index.html`
2. Haz doble clic para abrir en tu navegador
3. ¡Listo! Comienza a calcular

### Opción 2: GitHub Pages
1. Fork este repositorio
2. Ve a Settings → Pages
3. Selecciona main branch
4. Tu sitio estará en: `https://tunombre.github.io/food-cost-pro/`

### Opción 3: Acceso Online
[Consulta con el desarrollador para obtener el link público]

---

## 📊 ¿Qué Puedes Hacer?

### Crear una Receta
1. Click en "Nueva Receta"
2. Ingresa nombre, porciones, descripción
3. Define tu Food Cost objetivo (ej: 30%)
4. Agrega el IVA si es necesario

### Agregar Ingredientes
1. Click en "Agregar" en la sección de ingredientes
2. Completa:
   - Nombre del insumo
   - Presentación (kg, libra, etc)
   - Cantidad
   - Costo unitario
   - % de merma (desperdicio)

### Ver Resultados
La calculadora automáticamente te muestra:
- **Costos**: Total, por porción, porcentaje
- **Precios**: Sugerido, con IVA, al público
- **Ganancias**: Total y por porción

### Guardar/Exportar
- Las recetas se guardan automáticamente
- Usa "Exportar" para descargar un backup en JSON
- Usa "Importar" para restaurar recetas

---

## 💡 Ejemplo de Uso

**Receta: Bandeja Paisa**
- Rendimiento: 4 porciones
- Food Cost Objetivo: 30%
- IVA: 19%

Ingredientes:
- Carne molida: 0.5 kg × $18,000 = $9,000
- Arroz: 0.3 kg × $3,500 = $1,050
- Frijoles: 0.3 kg × $4,200 = $1,260
- Plátano: 2 × $1,500 = $3,000
- Huevo: 3 × $800 = $2,400
- Arepa: 1 × $3,000 = $3,000

**Totales:**
- Costo total: $19,710
- Costo por porción: $4,927.50
- Precio sugerido (sin IVA): $65,700
- IVA (19%): $12,483
- Precio al público: $78,183
- Precio por porción: $19,546
- Ganancia total: $58,473

---

## 🔐 Privacidad y Seguridad

✅ **Sin Conexión a Internet** - Funciona completamente offline  
✅ **Sin Base de Datos** - Tus datos no se almacenan en servidores  
✅ **Sin Cookies de Seguimiento** - Sin publicidad, sin análitica  
✅ **LocalStorage del Navegador** - Solo en tu dispositivo  
✅ **HTTPS** - Cuando está hosteada en servidores modernos  

---

## 📱 Compatibilidad

- ✅ Chrome / Chromium
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Navegadores móviles (iOS Safari, Chrome Android)
- ✅ Tablets
- ✅ Funciona sin internet (datos guardados localmente)

---

## 🛠️ Personalización

### Cambiar el País Predeterminado
En el código, busca:
```javascript
const [selectedCountry, setSelectedCountry] = useState('🇨🇴 Colombia');
```

### Cambiar el Número de WhatsApp
Busca y reemplaza:
```
573126387467
```
Por tu número (sin símbolo +)

### Agregar Más Países
En el objeto `currencies`, agrega:
```javascript
'🇵🇦 Panamá': { code: 'PAB', symbol: '$', fixed: 1.0 },
```

---

## 📝 Licencia

Creada por **José Lugo**  
Carmen de Viboral, Antioquia, Colombia  
© 2026 - Todos los derechos reservados

---

## 📞 Contacto

📱 **WhatsApp**: +57 312 638 7467  
📍 **Ubicación**: Carmen de Viboral, Antioquia, Colombia

---

## 🙏 Agradecimientos

Desarrollada con:
- React 18
- Tailwind CSS
- Font Awesome Icons
- 100% amor por la gastronomía colombiana ❤️

---

## 📈 Versión

**Food Cost Pro v2.0**  
Última actualización: 2026

---

**¿Sugerencias o mejoras?** Contacta por WhatsApp 😊

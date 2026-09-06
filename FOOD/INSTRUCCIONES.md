# 🍽️ Food Cost Pro v2 - Instrucciones de Deployment

## ✨ ¿Qué tienes?

Un único archivo `index.html` que es **completamente autónomo**. No necesita:
- ❌ Servidor
- ❌ Base de datos
- ❌ Backend
- ❌ Instalación de dependencias
- ❌ Build tools

**TODO funciona localmente en el navegador del usuario.**

---

## 🚀 Opciones para Subir

### **OPCIÓN 1: Vercel (Recomendado - Más fácil)**

```bash
# 1. Crea una carpeta
mkdir food-cost-pro
cd food-cost-pro

# 2. Coloca el index.html dentro

# 3. Crea package.json
cat > package.json << 'EOF'
{
  "name": "food-cost-pro",
  "version": "1.0.0",
  "description": "Calculadora profesional de costos gastronómicos"
}
EOF

# 4. Deploy
vercel --prod
```

**Resultado:** Tu app estará en: `https://tudominio.vercel.app`

---

### **OPCIÓN 2: Netlify (Muy Fácil - Sin Terminal)**

#### Método A: Drag & Drop
1. Ve a: https://app.netlify.com/drop
2. Arrastra tu `index.html` a la página
3. ¡Listo! Te dará un URL automático

#### Método B: Git
```bash
# 1. Sube el archivo a un repo en GitHub
# 2. Ve a https://app.netlify.com
# 3. Conecta tu repo
# 4. Netlify deployará automáticamente
```

---

### **OPCIÓN 3: GitHub Pages (Gratis - Personalizado)**

```bash
# 1. Crea un repo en GitHub
# 2. Crea una rama gh-pages
# 3. Sube el index.html

git add index.html
git commit -m "Deploy Food Cost Pro"
git push origin gh-pages
```

**URL:** `https://tunombre.github.io/nombre-repo/`

---

### **OPCIÓN 4: Replit (Super fácil, sin terminal local)**

1. Ve a: https://replit.com
2. Crear nuevo proyecto
3. Selecciona HTML/CSS/JS
4. Copia el contenido del `index.html`
5. ¡Publicar!

---

### **OPCIÓN 5: Servidor propio / cPanel**

Si tienes hosting:

```bash
# 1. Conecta por FTP
# 2. Sube index.html a la raíz (public_html/)
# 3. Accede a: www.tudominio.com/index.html
```

---

## 🔐 Seguridad & Privacidad

✅ **Todos los datos se guardan localmente** en el navegador del usuario  
✅ **NADA se envía a servidores** (excepto la actualización de TRM BCV, que es opcional)  
✅ **Sin cookies** de seguimiento  
✅ **Sin anuncios**  
✅ **Completamente HTTPS** en cualquier hosting moderno  

---

## 📱 Funciona en

- ✅ Chrome, Firefox, Safari, Edge
- ✅ Mobile (iOS, Android)
- ✅ Tablet
- ✅ Desktop
- ✅ Sin conexión a internet (datos guardados)

---

## 🛠️ Personalizaciones (Después de subir)

Si necesitas cambiar algo, edita el HTML:

**Para cambiar el número de WhatsApp:**
```html
https://wa.me/573126387467?text=...
```
Reemplaza `573126387467` por tu número

**Para cambiar los +200 Bs de Venezuela:**
Busca en el código: `rate + 200` y cambia el valor

**Para agregar más países:**
Busca la sección `currencies` y agrega:
```javascript
'Panamá': { code: 'PAB', symbol: '$', fixed: 1.0 },
```

---

## 📊 Características Incluidas

✅ Crear y guardar recetas ilimitadas  
✅ Agregar ingredientes con cantidad, costo, merma  
✅ Calcular automáticamente:
  - Costo total materia prima
  - Costo por porción
  - Food Cost %
  - Precio sugerido
  - IVA/Impuestos
  - Ganancia total y por porción

✅ 9 países con su moneda  
✅ TRM BCV actualizada para Venezuela  
✅ Modo oscuro/claro  
✅ Importar/Exportar recetas en JSON  
✅ Botón WhatsApp integrado  
✅ 100% responsive  

---

## 💡 Tips

- **Guarda tus recetas regularmente:** Usa el botón "Exportar" para hacer backup
- **Limpia el cache:** Si algo se ve raro, borra el cache del navegador
- **Comparte:** El URL de Vercel/Netlify es shareable - tus clientes pueden usarla también

---

## 📞 Soporte

Botón de WhatsApp incluido: **+57 312 638 7467**

---

## 📄 Licencia

Creada por José Lugo - Carmen de Viboral, Antioquia, Colombia  
© 2026 - Todos los derechos reservados

---

**¿Preguntas?** Contacta por WhatsApp usando el botón dentro de la app 😊

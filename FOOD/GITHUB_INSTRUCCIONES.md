# 📤 Cómo Subir a GitHub

## Paso 1: Crear el Repositorio

1. Ve a https://github.com/new
2. Nombre: `food-cost-pro` (o el que prefieras)
3. Descripción: "Calculadora profesional de costos gastronómicos para Colombia"
4. Visibilidad: **Public** (si quieres que sea público)
5. Click en "Create repository"

---

## Paso 2: Subir los Archivos

### Opción A: Desde la Terminal (Recomendado)

```bash
# 1. Ve a la carpeta con tus archivos
cd ruta/a/tu/carpeta

# 2. Inicializa git
git init

# 3. Agrega todos los archivos
git add .

# 4. Crea el primer commit
git commit -m "🎉 Initial commit - Food Cost Pro"

# 5. Conecta con GitHub (reemplaza 'usuario' y 'repo')
git remote add origin https://github.com/usuario/food-cost-pro.git

# 6. Sube a GitHub
git branch -M main
git push -u origin main
```

### Opción B: Drag & Drop (Desde GitHub Web)

1. Ve a tu repositorio en GitHub
2. Click en "Add file" → "Upload files"
3. Arrastra los archivos:
   - `index.html`
   - `README.md`
   - `INSTRUCCIONES.md`
   - `.gitignore`
4. Click en "Commit changes"

---

## Paso 3: Habilitar GitHub Pages (Para Hosting Gratis)

1. Ve a tu repositorio
2. Click en **Settings** (⚙️)
3. En el menú lateral, selecciona **Pages**
4. En "Source", selecciona: **main** branch
5. Click en **Save**

**Tu app estará en:** `https://tunombre.github.io/food-cost-pro/`

(Espera 2-3 minutos para que se publique)

---

## ✅ Archivos que Debes Subir

```
📁 food-cost-pro
├── 📄 index.html          ⭐ El archivo principal
├── 📄 README.md           (Descripción del proyecto)
├── 📄 INSTRUCCIONES.md    (Cómo usar)
├── 📄 .gitignore          (Archivos a ignorar)
└── 📄 LICENSE             (Opcional)
```

---

## 🎯 Verificar que Funcione

Después de subir:

1. Ve a tu repositorio
2. Click en el archivo `index.html`
3. Debería mostrar un preview del código
4. O abre directamente: `https://tunombre.github.io/food-cost-pro/`

---

## 📝 Próximos Cambios (En el Futuro)

Si necesitas hacer cambios:

```bash
# 1. Edita el archivo
# 2. Guarda los cambios
# 3. Desde la terminal:

git add .
git commit -m "📝 Descripción del cambio"
git push

# ¡Listo! GitHub Pages se actualizará automáticamente
```

---

## 💡 Tips

✅ **Versiona tu código**: Usa commits descriptivos  
✅ **Crea branches**: Para nuevas features (opcional)  
✅ **Agrega issues**: Para bugs o mejoras futuras  
✅ **Usa Actions**: Para automatizar tareas (avanzado)  

---

## 🔐 Información Importante

- Este repositorio es **público** - todos pueden verlo
- El archivo `index.html` es **autónomo** - no necesita servidor
- Los datos de los usuarios se guardan **localmente** - nunca salen del navegador
- GitHub Pages es **gratuito** y tiene certificado SSL (HTTPS)

---

## ❓ Problemas Comunes

**"No puedo ver los cambios"**
- GitHub Pages tarda 2-3 minutos
- Vacía el cache del navegador (Ctrl+Shift+Delete)
- Intenta en navegador privado

**"El archivo .gitignore no se sube"**
- GitHub oculta archivos que comienzan con punto
- Esto es normal, no es un problema

**"Quiero cambiar el nombre del repositorio"**
- Settings → General → Repository name
- Luego actualiza localmente: `git remote set-url origin https://github.com/usuario/nuevo-nombre.git`

---

## 🚀 Próximo Paso

Después de subir a GitHub, puedes:

1. ✅ Usar GitHub Pages (URL gratis)
2. ✅ Ir a Vercel y conectar tu repo (hosting profesional)
3. ✅ Ir a Netlify y conectar tu repo (más fácil)
4. ✅ Compartir el link con tus clientes

---

**¿Necesitas ayuda?** Contacta por WhatsApp: **+57 312 638 7467**

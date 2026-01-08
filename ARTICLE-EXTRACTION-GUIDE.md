# 📰 Extracción de Artículos Completos - Guía

## 🎯 Cómo Funciona Ahora

El sistema usa **Mozilla Readability** - la misma tecnología del "Reader Mode" de Firefox.

### ✅ Ventajas:
- Funciona 100% en el navegador (sin backend)
- Elimina ads, popups, barras laterales
- Extrae solo el contenido principal
- Formato limpio y legible
- Incluye imágenes del artículo

---

## 🔧 Qué Hace el Sistema

### 1. Descarga el HTML completo del artículo
```
Usuario → Proxy CORS → Sitio de noticias → HTML completo
```

### 2. Readability extrae el contenido principal
```javascript
- Elimina: ads, menús, footers, comentarios
- Conserva: título, texto, imágenes, autor
- Formatea: párrafos, títulos, listas
```

### 3. Muestra en modal limpio
- Texto formateado
- Botón para copiar texto completo
- Link al artículo original
- Opción de ver en Archive.is

---

## ⚠️ Limitaciones

### Algunos sitios NO funcionarán:

#### 1. **Paywall / Suscripción**
```
❌ New York Times (premium)
❌ Washington Post (premium)
❌ Financial Times
✅ Reuters (gratis)
✅ BBC (gratis)
✅ Guardian (gratis)
```

**Solución:** Usar Archive.is (botón incluido)

#### 2. **JavaScript obligatorio**
Algunos sitios cargan contenido con JavaScript después.

**Solución:** La librería Readability hace lo mejor posible con HTML estático.

#### 3. **Anti-scraping**
Algunos sitios detectan y bloquean proxies.

**Solución:** El sistema prueba múltiples proxies automáticamente.

---

## 🎨 Nuevas Funcionalidades

### Botón "📄 Extraer"
- Click → Descarga HTML → Extrae contenido → Muestra limpio
- Incluye autor, fecha, imágenes
- Scroll suave si el artículo es largo

### Botón "📋 Copiar texto"
- Copia el texto completo sin formato HTML
- Útil para pegar en notas, emails, etc.

### Botón "🗄️ Ver en Archive.is"
- Si la extracción falla
- Abre versión archivada del artículo
- Bypasea paywalls (a veces)

---

## 📊 Tasa de Éxito Esperada

### Por tipo de sitio:

| Tipo de Sitio | Tasa de Éxito | Ejemplos |
|---------------|---------------|----------|
| **Noticias gratis** | 80-90% | Reuters, BBC, Guardian |
| **Noticias con ads** | 70-80% | CNN, Fox News |
| **Paywall suave** | 50-60% | NYT (artículos gratis) |
| **Paywall duro** | 10-20% | WSJ, FT |
| **JavaScript pesado** | 40-50% | Medium, blogs modernos |

---

## 🔍 Debugging

### Si no funciona:

**1. Ver consola (F12):**
```javascript
Error extracting article: No se pudo obtener el contenido
```

**2. Verificar qué falló:**
- ¿El proxy pudo descargar el HTML?
- ¿Readability encontró contenido principal?
- ¿El sitio tiene paywall?

**3. Probar alternativas:**
```
→ Botón "Ver en Archive.is"
→ Abrir artículo original
→ Usar extensión de navegador "Reader View"
```

---

## 💡 Alternativas

### Si necesitás mejor tasa de éxito:

#### Opción A: Backend con Puppeteer (más completo)

```javascript
// Servidor Node.js con Puppeteer
app.get('/extract', async (req, res) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(req.query.url);
    const content = await page.content();
    // Procesar con Readability
});
```

**Ventajas:**
- Ejecuta JavaScript del sitio
- Espera a que cargue todo
- Tasa de éxito ~95%

**Desventajas:**
- Necesitas servidor ($5-20/mes)
- Más lento (3-5 segundos por artículo)
- Más complejo de mantener

#### Opción B: Servicios de terceros

**Mercury Parser (gratis con límite):**
```javascript
https://mercury.postlight.com/parser?url=ARTICLE_URL
```

**Diffbot (pago):**
- $299/mes
- Tasa de éxito ~98%
- API profesional

**Article Extractor (API):**
- $10-50/mes
- Buena tasa de éxito
- Fácil de integrar

#### Opción C: Full RSS Services

Algunos sitios ofrecen RSS completo:
```
❌ Reuters: Solo resumen
✅ Ars Technica: Full text en RSS
✅ Algunos blogs: Full text
```

---

## 🎯 Recomendaciones

### Para uso personal/hobby:
✅ **Usar Readability.js** (actual)
- Gratis
- Funciona bien para ~70% de sitios
- Sin costo de servidor

### Para uso profesional:
✅ **Backend con Puppeteer**
- Mejor tasa de éxito
- Control total
- Costo moderado

### Para uso intensivo:
✅ **Servicio de terceros (Mercury/Diffbot)**
- Tasa de éxito máxima
- Sin mantenimiento
- Costo según volumen

---

## 📝 Código de Referencia

### Implementación actual (Readability.js):

```javascript
// 1. Descargar HTML con proxy
const html = await fetch(proxyUrl + articleUrl).then(r => r.text());

// 2. Parsear HTML
const doc = new DOMParser().parseFromString(html, 'text/html');

// 3. Extraer con Readability
const reader = new Readability(doc);
const article = reader.parse();

// 4. Mostrar
modal.innerHTML = article.content;
```

### Si querés agregar backend (ejemplo):

```javascript
// Tu servidor
app.get('/extract', async (req, res) => {
    const { url } = req.query;
    const html = await axios.get(url);
    const article = /* procesar con Readability */;
    res.json(article);
});

// Tu frontend
const article = await fetch(`/extract?url=${articleUrl}`).then(r => r.json());
```

---

## ⚡ Quick Tips

1. **Archive.is es tu amigo** - Bypasea muchos paywalls
2. **RSS full-text** - Algunos sitios lo ofrecen gratis
3. **Reader View** - Extensión de navegador como fallback
4. **12ft.io** - Servicio que quita paywalls (añadir como opción)

---

## 🔗 Enlaces Útiles

- **Readability.js:** https://github.com/mozilla/readability
- **Archive.is:** https://archive.is
- **12ft Ladder:** https://12ft.io
- **Mercury Parser:** https://github.com/postlight/mercury-parser
- **Full-Text RSS:** https://www.fivefilters.org/full-text-rss/

---

**Última actualización:** Enero 2025

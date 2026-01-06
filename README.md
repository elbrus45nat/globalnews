# 🌍 Global News Monitor

Monitor de noticias en tiempo real con feeds RSS de agencias internacionales y visualización geográfica interactiva.

## 🎯 Características

- ✅ **Múltiples fuentes RSS**: Reuters, AFP, TASS, Politico, Le Monde, The Guardian, The Telegraph, Al Jazeera
- ✅ **Mapa interactivo**: Visualización geográfica de noticias con Leaflet/OpenStreetMap
- ✅ **Detección automática de ubicaciones**: Extrae y geolocaliza lugares mencionados en las noticias
- ✅ **Filtros avanzados**: Por fuente, región, búsqueda de texto
- ✅ **3 vistas**: Cards, Lista, Compacta
- ✅ **Auto-actualización**: Refresh automático cada 5 minutos
- ✅ **Clustering de marcadores**: Agrupa noticias cercanas en el mapa
- ✅ **Responsive**: Funciona en desktop y móvil
- ✅ **Sin backend**: 100% frontend, funciona directamente en el navegador

## 📂 Estructura de archivos

```
news-monitor/
├── index.html          # Página principal
├── styles.css          # Estilos (tema oscuro)
├── config.js           # Configuración de fuentes RSS y ubicaciones
├── rss-parser.js       # Parser de feeds RSS
├── geocoding.js        # Detección y geocodificación de ubicaciones
├── map.js              # Gestor del mapa interactivo
├── app.js              # Aplicación principal
└── README.md           # Este archivo
```

## 🚀 Instalación y Uso

### Opción 1: Servidor local simple

```bash
cd news-monitor
python3 -m http.server 8000
# Abrí: http://localhost:8000
```

### Opción 2: Hosting gratuito

**GitHub Pages:**
```bash
git init
git add .
git commit -m "News Monitor"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/news-monitor.git
git push -u origin main
# Activar Pages en Settings → Pages
```

**Netlify:**
1. Arrastrá la carpeta a netlify.com
2. Listo!

**Vercel:**
```bash
npm install -g vercel
vercel
```

## ⚙️ Configuración

### Agregar/modificar fuentes RSS

Editá `config.js`:

```javascript
const RSS_FEEDS = {
    mifuente: {
        name: 'Mi Fuente',
        urls: [
            'https://ejemplo.com/rss',
        ],
        color: '#FF0000'
    }
};
```

### Modificar ubicaciones conocidas

En `config.js`, agregá coordenadas:

```javascript
const LOCATION_COORDS = {
    'Buenos Aires': [-34.6037, -58.3816],
    'Nueva Ciudad': [lat, lng]
};
```

### Ajustar intervalo de actualización

En `config.js`:

```javascript
const CONFIG = {
    UPDATE_INTERVAL: 300000, // 5 minutos en milisegundos
    // ...
};
```

## 🗺️ Sistema de Geolocalización

El monitor detecta ubicaciones de 3 formas:

1. **Patrones predefinidos**: Busca nombres de ciudades/países conocidos en títulos y descripciones
2. **Base de datos local**: 100+ ubicaciones con coordenadas predefinidas
3. **Clasificación por región**: Detecta región geográfica (Europa, Asia, etc.) por palabras clave

### Agregar nuevas ubicaciones

En `config.js`:

```javascript
// Agregar a LOCATION_PATTERNS
const LOCATION_PATTERNS = [
    'Londres', 'París', 'Tu Nueva Ciudad'
];

// Agregar coordenadas
const LOCATION_COORDS = {
    'Tu Nueva Ciudad': [lat, lng]
};
```

## 🔧 Personalización

### Cambiar tema de colores

En `styles.css`:

```css
:root {
    --primary: #1a73e8;     /* Color principal */
    --secondary: #34a853;   /* Color secundario */
    --bg: #131416;          /* Fondo */
    --text: #e8eaed;        /* Texto */
}
```

### Cambiar mapa base

En `map.js`, reemplazá la capa de tiles:

```javascript
// Mapa claro de OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(this.map);

// O Mapa satelital
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Esri'
}).addTo(this.map);
```

## 🌐 CORS y Proxies

Los feeds RSS pueden tener problemas de CORS. El sistema usa por defecto:

```javascript
CORS_PROXY: 'https://api.allorigins.win/raw?url='
```

**Alternativas de proxy:**

- `https://corsproxy.io/?` (sin límites)
- `https://cors-anywhere.herokuapp.com/` (requiere activación)
- Montar tu propio proxy con nginx o Node.js

### Montar proxy propio (Node.js)

```javascript
// proxy-server.js
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());

app.get('/proxy', async (req, res) => {
    const url = req.query.url;
    const response = await fetch(url);
    const data = await response.text();
    res.send(data);
});

app.listen(3000);
```

Luego cambiar en `config.js`:
```javascript
CORS_PROXY: 'http://localhost:3000/proxy?url='
```

## 📊 Análisis de Datos

El sistema incluye capacidades de análisis:

```javascript
// En la consola del navegador:

// Estadísticas geográficas
const stats = geocoder.getGeoStats(app.allNews);
console.log(stats);

// Noticias por región
const europeNews = geocoder.filterByRegion(app.allNews, 'europe');

// Clusters de noticias
const clusters = geocoder.clusterByLocation(app.allNews, 500);
```

## 🔌 Integración con scrapers

Si tenés tus propios scrapers en bash, podés:

1. **Generar RSS propio:**

```bash
#!/bin/bash
# generate-rss.sh
cat > feed.xml << EOF
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>My Custom Feed</title>
    <link>http://localhost:8000</link>
    <description>Custom news feed</description>
$(
  # Tu scraper aquí
  # Por cada noticia, generar:
  echo "<item>"
  echo "  <title>Título</title>"
  echo "  <link>http://ejemplo.com/noticia</link>"
  echo "  <description>Descripción</description>"
  echo "  <pubDate>$(date -R)</pubDate>"
  echo "</item>"
)
  </channel>
</rss>
EOF
```

2. **Servir el RSS:**

```bash
python3 -m http.server 8000 &
```

3. **Agregar a config.js:**

```javascript
mifeed: {
    name: 'Mi Feed',
    urls: ['http://localhost:8000/feed.xml'],
    color: '#00FF00'
}
```

## 📱 Modo offline

Para trabajar sin internet:

1. Descargá los feeds manualmente
2. Guardalos como archivos XML locales
3. Modificá las URLs en `config.js` para apuntar a archivos locales:

```javascript
urls: ['./feeds/reuters.xml']
```

## 🐛 Troubleshooting

**No cargan las noticias:**
- Verificá la consola del navegador (F12)
- Probá sin el proxy (algunas fuentes no lo necesitan)
- Verificá que las URLs RSS sean correctas

**El mapa no se muestra:**
- Verificá la conexión a internet (Leaflet se carga desde CDN)
- Revisá si hay errores de JavaScript en la consola

**Las ubicaciones no se detectan:**
- Agregá más patrones en `LOCATION_PATTERNS`
- Verificá que `LOCATION_COORDS` tenga las coordenadas

**CORS errors:**
- Usá un proxy diferente
- Montá tu propio proxy
- Algunas fuentes requieren autenticación

## 📈 Mejoras futuras

Cosas que podrías agregar:

- [ ] Backend con base de datos (SQLite/PostgreSQL)
- [ ] Análisis de sentimiento de noticias
- [ ] Sistema de alertas por palabras clave
- [ ] Export de datos (CSV, JSON)
- [ ] Graficos de tendencias temporales
- [ ] Integración con tu sistema QGIS
- [ ] Notificaciones push
- [ ] Modo oscuro/claro
- [ ] Múltiples idiomas
- [ ] Cache persistente (IndexedDB)

## 🔗 APIs útiles

Si querés mejorar la detección de ubicaciones:

- **Nominatim (OpenStreetMap)**: Geocoding gratis
  ```javascript
  https://nominatim.openstreetmap.org/search?q=Buenos Aires&format=json
  ```

- **MapBox Geocoding**: 100,000 requests gratis/mes
  ```javascript
  https://api.mapbox.com/geocoding/v5/mapbox.places/Paris.json?access_token=TOKEN
  ```

- **News API**: 100 requests/día gratis
  ```javascript
  https://newsapi.org/v2/everything?q=keyword&apiKey=TOKEN
  ```

## 💡 Tips

1. **Performance**: Si tenés muchas noticias, aumentá `NEWS_PER_PAGE` en `config.js`
2. **Batería móvil**: Desactivá auto-refresh en móviles
3. **Ancho de banda**: El clustering reduce la carga del mapa
4. **Privacidad**: Todo corre local, no se envían datos a servidores

## 📄 Licencia

Uso libre. Modificá como quieras.

## 🤝 Contribuciones

Si encontrás bugs o querés agregar features, avisame!

---

Creado para integrar con tus sistemas de scraping y análisis geográfico de conflictos.

// Gestor del mapa con Leaflet
class MapManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.map = null;
        this.markers = [];
        this.markerClusterGroup = null;
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;

        // Crear mapa
        this.map = L.map(this.containerId).setView(
            CONFIG.DEFAULT_MAP_CENTER,
            CONFIG.DEFAULT_MAP_ZOOM
        );

        // Agregar capa de tiles (OpenStreetMap oscuro)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);

        // Inicializar grupo de clusters
        this.markerClusterGroup = L.markerClusterGroup({
            chunkedLoading: true,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            maxClusterRadius: 50
        });

        this.map.addLayer(this.markerClusterGroup);
        this.initialized = true;
    }

    addNewsMarkers(newsArray, clusterEnabled = true) {
        if (!this.initialized) {
            this.initialize();
        }

        // Limpiar marcadores anteriores
        this.clearMarkers();

        // Limitar cantidad de marcadores para mejor performance
        const maxMarkers = CONFIG.MAX_MAP_MARKERS || 100;
        const newsToShow = newsArray.slice(0, maxMarkers);

        // Agregar nuevos marcadores
        for (const news of newsToShow) {
            if (!news.primaryLocation) continue;

            const marker = this.createMarker(news);
            
            if (clusterEnabled) {
                this.markerClusterGroup.addLayer(marker);
            } else {
                marker.addTo(this.map);
            }
            
            this.markers.push(marker);
        }

        // Ajustar vista si hay marcadores
        if (this.markers.length > 0) {
            if (clusterEnabled && this.markerClusterGroup.getBounds().isValid()) {
                this.map.fitBounds(this.markerClusterGroup.getBounds(), {
                    padding: [50, 50],
                    maxZoom: 10
                });
            }
        }
    }

    createMarker(news) {
        const coords = news.primaryLocation.coords;
        
        // Crear icono personalizado según la fuente
        const icon = this.createCustomIcon(news.sourceColor);
        
        const marker = L.marker(coords, { icon: icon });
        
        // Crear popup
        const popupContent = this.createPopupContent(news);
        marker.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'news-popup'
        });

        // Evento al hacer click
        marker.on('click', () => {
            this.onMarkerClick(news);
        });

        return marker;
    }

    createCustomIcon(color) {
        return L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });
    }

    createPopupContent(news) {
        const date = this.formatDate(news.pubDate);
        const description = this.truncate(news.description, 150);
        
        return `
            <div class="popup-content">
                <div class="popup-source" style="color: ${news.sourceColor}">${news.sourceName}</div>
                <div class="popup-date">${date}</div>
                <div class="popup-title">${news.title}</div>
                <div class="popup-description">${description}</div>
                <div class="popup-location">📍 ${news.primaryLocation.name}</div>
                <a href="${news.link}" target="_blank" class="popup-link">Leer más →</a>
            </div>
        `;
    }

    onMarkerClick(news) {
        // Emitir evento personalizado
        const event = new CustomEvent('newsMarkerClick', { detail: news });
        document.dispatchEvent(event);
    }

    clearMarkers() {
        this.markerClusterGroup.clearLayers();
        this.markers = [];
    }

    toggleClustering(enabled) {
        if (!this.initialized) return;

        if (enabled) {
            this.map.addLayer(this.markerClusterGroup);
        } else {
            this.map.removeLayer(this.markerClusterGroup);
        }
    }

    focusLocation(coords, zoom = 8) {
        if (!this.initialized) return;
        this.map.setView(coords, zoom, {
            animate: true,
            duration: 1
        });
    }

    show() {
        document.getElementById('map-container').style.display = 'block';
        if (this.map) {
            setTimeout(() => this.map.invalidateSize(), 100);
        }
    }

    hide() {
        document.getElementById('map-container').style.display = 'none';
    }

    // Utilidades
    formatDate(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 60) {
            return `Hace ${minutes} min`;
        } else if (hours < 24) {
            return `Hace ${hours} h`;
        } else if (days < 7) {
            return `Hace ${days} días`;
        } else {
            return date.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        }
    }

    truncate(text, length) {
        if (!text || text.length <= length) return text;
        return text.substring(0, length) + '...';
    }

    // Agregar heatmap de noticias (opcional)
    addHeatmap(newsArray) {
        // Crear datos para heatmap
        const heatData = newsArray
            .filter(n => n.primaryLocation)
            .map(n => [
                n.primaryLocation.coords[0],
                n.primaryLocation.coords[1],
                1 // intensidad
            ]);

        // Esto requeriría Leaflet.heat plugin
        // Por ahora solo los marcadores
    }

    // Estadísticas del mapa
    getStats() {
        return {
            totalMarkers: this.markers.length,
            clusterCount: this.markerClusterGroup.getLayers().length,
            bounds: this.map.getBounds()
        };
    }
}

// Instancia global del mapa
const mapManager = new MapManager('map');

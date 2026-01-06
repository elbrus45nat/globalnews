// Geocoding - Detecta ubicaciones en el texto de las noticias
class Geocoder {
    constructor() {
        this.locationCache = new Map();
    }

    // Detectar ubicaciones en el texto
    detectLocations(text) {
        const locations = [];
        const textUpper = text;

        // Buscar cada patrón de ubicación
        for (const location of LOCATION_PATTERNS) {
            // Buscar la ubicación en el texto (case-insensitive)
            const regex = new RegExp(`\\b${location}\\b`, 'gi');
            const matches = text.match(regex);
            
            if (matches && LOCATION_COORDS[location]) {
                locations.push({
                    name: location,
                    coords: LOCATION_COORDS[location],
                    count: matches.length
                });
            }
        }

        // Ordenar por frecuencia de aparición
        locations.sort((a, b) => b.count - a.count);

        // Retornar ubicaciones únicas
        const unique = [];
        const seen = new Set();
        
        for (const loc of locations) {
            if (!seen.has(loc.name)) {
                seen.add(loc.name);
                unique.push(loc);
            }
        }

        return unique;
    }

    // Detectar región basada en palabras clave
    detectRegion(text) {
        const textLower = text.toLowerCase();
        
        for (const [regionId, region] of Object.entries(REGIONS)) {
            for (const keyword of region.keywords) {
                if (textLower.includes(keyword.toLowerCase())) {
                    return regionId;
                }
            }
        }
        
        return null;
    }

    // Obtener coordenadas principales de una noticia
    getMainLocation(newsItem) {
        const fullText = `${newsItem.title} ${newsItem.description}`;
        const locations = this.detectLocations(fullText);
        
        if (locations.length > 0) {
            return {
                name: locations[0].name,
                coords: locations[0].coords
            };
        }
        
        return null;
    }

    // Procesar todas las noticias y agregar información geográfica
    processNewsGeo(newsArray) {
        return newsArray.map(news => {
            const fullText = `${news.title} ${news.description}`;
            const locations = this.detectLocations(fullText);
            const region = this.detectRegion(fullText);
            
            return {
                ...news,
                locations: locations,
                primaryLocation: locations.length > 0 ? locations[0] : null,
                region: region
            };
        });
    }

    // Geocodificar usando Nominatim (OpenStreetMap) - alternativa online
    async geocodeLocation(locationName) {
        // Verificar caché
        if (this.locationCache.has(locationName)) {
            return this.locationCache.get(locationName);
        }

        try {
            const url = `https://nominatim.openstreetmap.org/search?` +
                `q=${encodeURIComponent(locationName)}&format=json&limit=1`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'NewsMonitor/1.0'
                }
            });
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
                this.locationCache.set(locationName, coords);
                return coords;
            }
        } catch (error) {
            console.error(`Error geocoding ${locationName}:`, error);
        }
        
        return null;
    }

    // Obtener noticias por región
    filterByRegion(newsArray, regionId) {
        if (regionId === 'all') {
            return newsArray;
        }

        return newsArray.filter(news => news.region === regionId);
    }

    // Obtener estadísticas geográficas
    getGeoStats(newsArray) {
        const stats = {
            byRegion: {},
            byLocation: {},
            total: newsArray.length,
            withLocation: 0
        };

        // Inicializar contadores de regiones
        for (const regionId of Object.keys(REGIONS)) {
            stats.byRegion[regionId] = 0;
        }

        // Contar
        for (const news of newsArray) {
            if (news.region) {
                stats.byRegion[news.region]++;
            }

            if (news.primaryLocation) {
                stats.withLocation++;
                const locName = news.primaryLocation.name;
                stats.byLocation[locName] = (stats.byLocation[locName] || 0) + 1;
            }
        }

        return stats;
    }

    // Agrupar noticias por ubicación cercana
    clusterByLocation(newsArray, maxDistance = 500) {
        const clusters = [];
        const processed = new Set();

        for (let i = 0; i < newsArray.length; i++) {
            if (processed.has(i) || !newsArray[i].primaryLocation) {
                continue;
            }

            const cluster = {
                center: newsArray[i].primaryLocation.coords,
                location: newsArray[i].primaryLocation.name,
                news: [newsArray[i]]
            };

            processed.add(i);

            // Buscar noticias cercanas
            for (let j = i + 1; j < newsArray.length; j++) {
                if (processed.has(j) || !newsArray[j].primaryLocation) {
                    continue;
                }

                const distance = this.calculateDistance(
                    cluster.center,
                    newsArray[j].primaryLocation.coords
                );

                if (distance < maxDistance) {
                    cluster.news.push(newsArray[j]);
                    processed.add(j);
                }
            }

            clusters.push(cluster);
        }

        return clusters;
    }

    // Calcular distancia entre dos coordenadas (Haversine)
    calculateDistance(coords1, coords2) {
        const R = 6371; // Radio de la Tierra en km
        const dLat = this.toRad(coords2[0] - coords1[0]);
        const dLon = this.toRad(coords2[1] - coords1[1]);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(coords1[0])) * Math.cos(this.toRad(coords2[0])) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        
        return distance;
    }

    toRad(degrees) {
        return degrees * (Math.PI / 180);
    }
}

// Instancia global del geocoder
const geocoder = new Geocoder();

// Parser de RSS que funciona en el navegador
class RSSParser {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutos
    }

    async fetchFeed(url, useProxy = true) {
        // Verificar caché
        const cached = this.cache.get(url);
        if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
            return cached.data;
        }

        try {
            const fetchUrl = useProxy ? `${CONFIG.CORS_PROXY}${encodeURIComponent(url)}` : url;
            const response = await fetch(fetchUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            
            // Verificar si hay errores de parseo
            const parseError = xml.querySelector('parsererror');
            if (parseError) {
                throw new Error('Error parsing XML');
            }
            
            const items = this.parseItems(xml);
            
            // Guardar en caché
            this.cache.set(url, {
                data: items,
                timestamp: Date.now()
            });
            
            return items;
        } catch (error) {
            console.error(`Error fetching RSS feed ${url}:`, error);
            return [];
        }
    }

    parseItems(xml) {
        const items = [];
        
        // Intentar parsear como RSS 2.0
        let entries = xml.querySelectorAll('item');
        
        // Si no hay items, intentar como Atom
        if (entries.length === 0) {
            entries = xml.querySelectorAll('entry');
        }
        
        entries.forEach(entry => {
            const item = this.parseEntry(entry);
            if (item) {
                items.push(item);
            }
        });
        
        return items;
    }

    parseEntry(entry) {
        try {
            // Obtener título
            const title = this.getElementText(entry, ['title']);
            if (!title) return null;

            // Obtener descripción/contenido
            const description = this.getElementText(entry, [
                'description',
                'summary',
                'content',
                'content\\:encoded'
            ]);

            // Obtener link
            const link = this.getLink(entry);

            // Obtener fecha
            const pubDate = this.getDate(entry);

            // Obtener imagen
            const image = this.getImage(entry);

            // Obtener categorías/tags
            const categories = this.getCategories(entry);

            return {
                title: this.cleanText(title),
                description: this.cleanText(description),
                link: link,
                pubDate: pubDate,
                image: image,
                categories: categories,
                id: this.generateId(link, title)
            };
        } catch (error) {
            console.error('Error parsing entry:', error);
            return null;
        }
    }

    getElementText(entry, tags) {
        for (const tag of tags) {
            const element = entry.querySelector(tag);
            if (element) {
                return element.textContent;
            }
        }
        return '';
    }

    getLink(entry) {
        // RSS 2.0
        let link = entry.querySelector('link');
        if (link) {
            return link.textContent || link.getAttribute('href');
        }

        // Atom
        link = entry.querySelector('link[rel="alternate"]');
        if (link) {
            return link.getAttribute('href');
        }

        return '';
    }

    getDate(entry) {
        const dateElement = entry.querySelector('pubDate, published, updated, dc\\:date');
        if (dateElement) {
            const date = new Date(dateElement.textContent);
            return isNaN(date.getTime()) ? new Date() : date;
        }
        return new Date();
    }

    getImage(entry) {
        // Intentar varios formatos de imagen
        
        // Media RSS
        let img = entry.querySelector('media\\:thumbnail, media\\:content');
        if (img) {
            return img.getAttribute('url');
        }

        // Enclosure
        img = entry.querySelector('enclosure[type^="image"]');
        if (img) {
            return img.getAttribute('url');
        }

        // En el contenido
        const content = entry.querySelector('description, content, content\\:encoded');
        if (content) {
            const imgMatch = content.textContent.match(/<img[^>]+src="([^">]+)"/);
            if (imgMatch) {
                return imgMatch[1];
            }
        }

        return null;
    }

    getCategories(entry) {
        const categories = [];
        entry.querySelectorAll('category').forEach(cat => {
            const text = cat.textContent || cat.getAttribute('term');
            if (text) {
                categories.push(text);
            }
        });
        return categories;
    }

    cleanText(text) {
        if (!text) return '';
        
        // Remover HTML tags
        text = text.replace(/<[^>]*>/g, '');
        
        // Decodificar entidades HTML
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        text = textarea.value;
        
        // Limpiar espacios
        text = text.replace(/\s+/g, ' ').trim();
        
        return text;
    }

    generateId(link, title) {
        // Generar un ID único basado en link y título
        const str = link + title;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    async fetchMultipleFeeds(feeds) {
        const allNews = [];
        const promises = [];

        for (const [source, config] of Object.entries(feeds)) {
            for (const url of config.urls) {
                promises.push(
                    this.fetchFeed(url).then(items => {
                        items.forEach(item => {
                            allNews.push({
                                ...item,
                                source: source,
                                sourceName: config.name,
                                sourceColor: config.color
                            });
                        });
                    })
                );
            }
        }

        await Promise.all(promises);

        // Ordenar por fecha (más recientes primero)
        allNews.sort((a, b) => b.pubDate - a.pubDate);

        // Eliminar duplicados basados en título similar
        const uniqueNews = this.removeDuplicates(allNews);

        return uniqueNews;
    }

    removeDuplicates(news) {
        const seen = new Set();
        return news.filter(item => {
            // Crear una clave normalizada del título
            const key = item.title.toLowerCase()
                .replace(/[^a-z0-9]/g, '')
                .substring(0, 50);
            
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    clearCache() {
        this.cache.clear();
    }
}

// Instancia global del parser
const rssParser = new RSSParser();

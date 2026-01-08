// Aplicación principal del monitor de noticias - VERSIÓN MEJORADA
class NewsMonitorApp {
    constructor() {
        this.allNews = [];
        this.filteredNews = [];
        this.currentPage = 1;
        this.newsPerPage = CONFIG.NEWS_PER_PAGE;
        this.autoRefreshInterval = null;
        this.currentView = 'cards';
        this.activeSources = new Set(Object.keys(RSS_FEEDS));
        this.activeRegions = new Set(['all']);
        this.searchQuery = '';
        this.customFeeds = this.loadCustomFeeds(); // Cargar RSS custom del localStorage
        this.mapLoaded = false;
        
        this.init();
    }

    async init() {
        // Setup event listeners PRIMERO
        this.setupEventListeners();
        
        // Cargar noticias iniciales
        await this.loadNews();
        
        // Inicializar mapa de forma lazy (solo si es visible)
        this.initMapLazy();
        
        // Iniciar auto-refresh si está habilitado
        if (CONFIG.ENABLE_AUTO_REFRESH) {
            this.startAutoRefresh();
        }
    }

    initMapLazy() {
        // Solo inicializar mapa cuando el usuario lo necesite o sea visible
        const mapContainer = document.getElementById('map-container');
        
        if (CONFIG.MAP_LAZY_LOAD) {
            // Observar si el mapa es visible
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !this.mapLoaded) {
                        mapManager.initialize();
                        this.mapLoaded = true;
                        this.updateMap();
                    }
                });
            });
            observer.observe(mapContainer);
        } else {
            mapManager.initialize();
            this.mapLoaded = true;
        }
    }

    setupEventListeners() {
        // Botón de refresh
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.loadNews();
        });

        // Filtros de fuentes
        document.querySelectorAll('#source-filters input').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.activeSources.add(e.target.value);
                } else {
                    this.activeSources.delete(e.target.value);
                }
                this.applyFilters();
            });
        });

        // Filtros de regiones
        document.querySelectorAll('#region-filters input').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                if (e.target.value === 'all') {
                    if (e.target.checked) {
                        this.activeRegions = new Set(['all']);
                        document.querySelectorAll('#region-filters input').forEach(cb => {
                            if (cb.value !== 'all') cb.checked = false;
                        });
                    }
                } else {
                    if (e.target.checked) {
                        this.activeRegions.delete('all');
                        this.activeRegions.add(e.target.value);
                        document.querySelector('#region-filters input[value="all"]').checked = false;
                    } else {
                        this.activeRegions.delete(e.target.value);
                        if (this.activeRegions.size === 0) {
                            this.activeRegions.add('all');
                            document.querySelector('#region-filters input[value="all"]').checked = true;
                        }
                    }
                }
                this.applyFilters();
            });
        });

        // Búsqueda
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.applyFilters();
        });

        // Vistas
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentView = e.target.dataset.view;
                this.renderNews();
            });
        });

        // Ordenamiento
        document.getElementById('sort-by').addEventListener('change', (e) => {
            this.sortNews(e.target.value);
        });

        // Opciones
        document.getElementById('auto-refresh').addEventListener('change', (e) => {
            if (e.target.checked) {
                this.startAutoRefresh();
            } else {
                this.stopAutoRefresh();
            }
        });

        document.getElementById('show-map').addEventListener('change', (e) => {
            if (e.target.checked) {
                mapManager.show();
                if (!this.mapLoaded) {
                    mapManager.initialize();
                    this.mapLoaded = true;
                    this.updateMap();
                }
            } else {
                mapManager.hide();
            }
        });

        document.getElementById('cluster-markers').addEventListener('change', (e) => {
            if (this.mapLoaded) {
                mapManager.toggleClustering(e.target.checked);
                mapManager.addNewsMarkers(this.filteredNews, e.target.checked);
            }
        });

        // Limpiar filtros
        document.getElementById('clear-filters').addEventListener('click', () => {
            this.resetFilters();
        });

        // Paginación
        document.getElementById('prev-page').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderNews();
                window.scrollTo(0, 0);
            }
        });

        document.getElementById('next-page').addEventListener('click', () => {
            const maxPages = Math.ceil(this.filteredNews.length / this.newsPerPage);
            if (this.currentPage < maxPages) {
                this.currentPage++;
                this.renderNews();
                window.scrollTo(0, 0);
            }
        });

        // Modal
        document.querySelector('.close').addEventListener('click', () => {
            document.getElementById('news-modal').style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            const modal = document.getElementById('news-modal');
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Evento de click en marcador del mapa
        document.addEventListener('newsMarkerClick', (e) => {
            this.showNewsModal(e.detail);
        });

        // Custom RSS
        this.setupCustomRSSListeners();
    }

    setupCustomRSSListeners() {
        const addBtn = document.getElementById('add-custom-rss');
        const urlInput = document.getElementById('custom-rss-url');
        const nameInput = document.getElementById('custom-rss-name');

        addBtn.addEventListener('click', () => {
            const url = urlInput.value.trim();
            const name = nameInput.value.trim() || 'Custom Feed';
            
            if (url && this.isValidURL(url)) {
                this.addCustomFeed(url, name);
                urlInput.value = '';
                nameInput.value = '';
            } else {
                alert('Por favor ingresa una URL RSS válida');
            }
        });

        // Renderizar feeds custom guardados
        this.renderCustomFeeds();
    }

    isValidURL(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    addCustomFeed(url, name) {
        const id = 'custom_' + Date.now();
        const feed = {
            id: id,
            name: name,
            url: url,
            color: this.generateRandomColor()
        };
        
        this.customFeeds.push(feed);
        this.saveCustomFeeds();
        this.renderCustomFeeds();
        this.activeSources.add(id);
        
        // Recargar noticias con el nuevo feed
        this.loadNews();
    }

    removeCustomFeed(id) {
        this.customFeeds = this.customFeeds.filter(f => f.id !== id);
        this.saveCustomFeeds();
        this.renderCustomFeeds();
        this.activeSources.delete(id);
        this.applyFilters();
    }

    renderCustomFeeds() {
        const container = document.getElementById('custom-rss-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.customFeeds.forEach(feed => {
            const item = document.createElement('div');
            item.className = 'custom-rss-item';
            item.innerHTML = `
                <label>
                    <input type="checkbox" value="${feed.id}" checked data-custom="true">
                    <span style="color: ${feed.color}">${feed.name}</span>
                </label>
                <button class="btn-remove" data-feed-id="${feed.id}">✕</button>
            `;
            container.appendChild(item);
            
            // Event listener para el checkbox
            item.querySelector('input').addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.activeSources.add(feed.id);
                } else {
                    this.activeSources.delete(feed.id);
                }
                this.applyFilters();
            });

            // Event listener para el botón de eliminar
            item.querySelector('.btn-remove').addEventListener('click', (e) => {
                const feedId = e.target.getAttribute('data-feed-id');
                if (confirm(`¿Eliminar "${feed.name}"?`)) {
                    this.removeCustomFeed(feedId);
                }
            });
        });
    }

    loadCustomFeeds() {
        const saved = localStorage.getItem('customRSSFeeds');
        return saved ? JSON.parse(saved) : [];
    }

    saveCustomFeeds() {
        localStorage.setItem('customRSSFeeds', JSON.stringify(this.customFeeds));
    }

    generateRandomColor() {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    async loadNews() {
        const loadingEl = document.querySelector('.loading');
        if (loadingEl) loadingEl.style.display = 'flex';

        try {
            // Combinar feeds predefinidos y custom
            const allFeeds = { ...RSS_FEEDS };
            
            this.customFeeds.forEach(feed => {
                allFeeds[feed.id] = {
                    name: feed.name,
                    urls: [feed.url],
                    color: feed.color
                };
            });

            // Filtrar solo feeds activos
            const activeFeeds = {};
            for (const source of this.activeSources) {
                if (allFeeds[source]) {
                    activeFeeds[source] = allFeeds[source];
                }
            }

            // Verificar que haya feeds activos
            if (Object.keys(activeFeeds).length === 0) {
                throw new Error('No hay fuentes activas seleccionadas');
            }

            // Fetch noticias
            console.log('Cargando noticias de', Object.keys(activeFeeds).length, 'fuentes...');
            const news = await rssParser.fetchMultipleFeeds(activeFeeds);
            
            // Verificar que se obtuvieron noticias
            if (!news || news.length === 0) {
                console.warn('No se obtuvieron noticias de ninguna fuente');
                this.showError('No se pudieron cargar noticias. Verifica tu conexión a internet.');
                return;
            }

            console.log('Noticias cargadas:', news.length);
            
            // Procesar ubicaciones geográficas
            this.allNews = geocoder.processNewsGeo(news);
            
            // Aplicar filtros
            this.applyFilters();
            
            // Actualizar UI
            this.updateStats();
            
        } catch (error) {
            console.error('Error loading news:', error);
            this.showError('Error al cargar noticias: ' + error.message + '. Intenta de nuevo o verifica tu conexión.');
        } finally {
            if (loadingEl) loadingEl.style.display = 'none';
        }
    }

    applyFilters() {
        let filtered = [...this.allNews];

        // Filtrar por fuente
        filtered = filtered.filter(news => this.activeSources.has(news.source));

        // Filtrar por región
        if (!this.activeRegions.has('all')) {
            filtered = filtered.filter(news => 
                news.region && this.activeRegions.has(news.region)
            );
        }

        // Filtrar por búsqueda
        if (this.searchQuery) {
            filtered = filtered.filter(news => 
                news.title.toLowerCase().includes(this.searchQuery) ||
                news.description.toLowerCase().includes(this.searchQuery)
            );
        }

        this.filteredNews = filtered;
        this.currentPage = 1;
        
        this.renderNews();
        if (this.mapLoaded) {
            this.updateMap();
        }
        this.updateStats();
    }

    sortNews(sortBy) {
        switch (sortBy) {
            case 'date-desc':
                this.filteredNews.sort((a, b) => b.pubDate - a.pubDate);
                break;
            case 'date-asc':
                this.filteredNews.sort((a, b) => a.pubDate - b.pubDate);
                break;
            case 'source':
                this.filteredNews.sort((a, b) => a.sourceName.localeCompare(b.sourceName));
                break;
        }
        this.renderNews();
    }

    renderNews() {
        const container = document.getElementById('news-list');
        container.className = `news-list ${this.currentView}-view`;
        container.innerHTML = '';

        // Calcular paginación
        const start = (this.currentPage - 1) * this.newsPerPage;
        const end = start + this.newsPerPage;
        const pageNews = this.filteredNews.slice(start, end);

        if (pageNews.length === 0) {
            container.innerHTML = '<div class="loading"><p>No se encontraron noticias</p></div>';
            return;
        }

        // Renderizar noticias
        pageNews.forEach(news => {
            const card = this.createNewsCard(news);
            container.appendChild(card);
        });

        // Actualizar paginación
        this.updatePagination();
    }

    createNewsCard(news) {
        const card = document.createElement('div');
        card.className = 'news-card';
        
        const date = this.formatDate(news.pubDate);
        const description = this.truncate(news.description, CONFIG.MAX_DESCRIPTION_LENGTH);
        
        let imageHtml = '';
        if (news.image && this.currentView !== 'compact') {
            imageHtml = `<img src="${news.image}" alt="${news.title}" class="news-card-image" 
                             onerror="this.style.display='none'">`;
        }

        let locationHtml = '';
        if (news.primaryLocation) {
            locationHtml = `<div class="news-location">📍 ${news.primaryLocation.name}</div>`;
        }

        let tagsHtml = '';
        if (news.categories && news.categories.length > 0) {
            tagsHtml = '<div class="news-tags">' +
                news.categories.slice(0, 3).map(cat => 
                    `<span class="news-tag">${cat}</span>`
                ).join('') +
                '</div>';
        }

        card.innerHTML = `
            ${imageHtml}
            <div class="news-card-content">
                <div class="news-card-header">
                    <div class="news-source" style="color: ${news.sourceColor}">${news.sourceName}</div>
                    <div class="news-date">${date}</div>
                </div>
                <div class="news-title">${news.title}</div>
                <div class="news-description">${description}</div>
                <div class="news-card-footer">
                    ${locationHtml}
                    ${tagsHtml}
                </div>
                <div class="news-actions">
                    <button class="btn-action" data-action="open" data-url="${news.link.replace(/"/g, '&quot;')}" title="Abrir artículo">
                        🔗 Abrir
                    </button>
                    <button class="btn-action" data-action="extract" data-url="${news.link.replace(/"/g, '&quot;')}" title="Extraer texto completo">
                        📄 Extraer
                    </button>
                    <button class="btn-action" data-action="remove-paywall" data-url="${news.link.replace(/"/g, '&quot;')}" title="Ver sin paywall (12ft.io)">
                        🪜 Sin paywall
                    </button>
                    <button class="btn-action" data-action="share" data-title="${news.title.replace(/"/g, '&quot;')}" data-url="${news.link.replace(/"/g, '&quot;')}" title="Compartir">
                        📤 Compartir
                    </button>
                </div>
            </div>
        `;

        // Agregar event listeners a los botones
        card.querySelector('[data-action="open"]').addEventListener('click', (e) => {
            this.openNewsURL(e.target.getAttribute('data-url'));
        });

        card.querySelector('[data-action="extract"]').addEventListener('click', (e) => {
            this.extractFullArticle(e.target.getAttribute('data-url'));
        });

        card.querySelector('[data-action="remove-paywall"]').addEventListener('click', (e) => {
            const url = e.target.getAttribute('data-url');
            window.open(`https://12ft.io/${url}`, '_blank');
        });

        card.querySelector('[data-action="share"]').addEventListener('click', (e) => {
            const btn = e.target;
            this.shareNews(btn.getAttribute('data-title'), btn.getAttribute('data-url'));
        });

        return card;
    }

    // Nuevas funciones para opciones de noticias
    openNewsURL(url) {
        window.open(url, '_blank');
    }

    async extractFullArticle(url) {
        const modal = document.getElementById('news-modal');
        const modalBody = document.getElementById('modal-body');
        
        modalBody.innerHTML = '<div class="loading"><div class="spinner"></div><p>Extrayendo artículo completo...</p></div>';
        modal.style.display = 'block';

        try {
            // Intentar con múltiples proxies para obtener el HTML
            let html = null;
            let workingProxy = null;

            for (const proxy of CONFIG.CORS_PROXIES) {
                try {
                    const fetchUrl = proxy + encodeURIComponent(url);
                    const response = await fetch(fetchUrl);
                    
                    if (response.ok) {
                        html = await response.text();
                        workingProxy = proxy;
                        break;
                    }
                } catch (error) {
                    continue;
                }
            }

            if (!html) {
                throw new Error('No se pudo obtener el contenido del artículo');
            }

            // Parsear el HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Usar Readability para extraer el contenido principal
            const reader = new Readability(doc);
            const article = reader.parse();

            if (!article || !article.content) {
                throw new Error('No se pudo extraer el contenido del artículo');
            }

            // Mostrar el artículo extraído
            modalBody.innerHTML = `
                <div class="article-header">
                    <h2>${article.title || 'Artículo'}</h2>
                    ${article.byline ? `<p class="article-byline">Por ${article.byline}</p>` : ''}
                    <p class="article-excerpt">${article.excerpt || ''}</p>
                    <p class="article-meta">
                        <small>Fuente: <a href="${url}" target="_blank">${url}</a></small>
                        ${workingProxy ? `<br><small>Obtenido vía: ${workingProxy.split('/')[2]}</small>` : ''}
                    </p>
                </div>
                <hr>
                <div class="article-content">${article.content}</div>
                <br>
                <div class="modal-actions">
                    <button class="modal-btn-open" onclick="window.open('${url}', '_blank')">Ver original →</button>
                    <button class="modal-btn-copy" onclick="navigator.clipboard.writeText(\`${article.textContent}\`).then(() => alert('Texto copiado!'))">📋 Copiar texto</button>
                </div>
            `;
        } catch (error) {
            console.error('Error extracting article:', error);
            modalBody.innerHTML = `
                <h2>Error al extraer artículo</h2>
                <p>${error.message}</p>
                <p>Algunas razones por las que puede fallar:</p>
                <ul>
                    <li>El sitio bloquea el acceso desde proxies</li>
                    <li>El sitio requiere JavaScript para cargar contenido</li>
                    <li>Contenido detrás de paywall</li>
                    <li>Estructura HTML no estándar</li>
                </ul>
                <br>
                <p><strong>Alternativas:</strong></p>
                <ul>
                    <li>Usar la extensión "Reader View" de tu navegador</li>
                    <li>Abrir el artículo directamente</li>
                    <li>Usar archive.is o archive.org</li>
                </ul>
                <br>
                <div class="modal-actions">
                    <button class="modal-btn-open" onclick="window.open('${url}', '_blank')">Abrir artículo original →</button>
                    <button class="modal-btn-archive" onclick="window.open('https://archive.is/newest/${encodeURIComponent(url)}', '_blank')">🗄️ Ver en Archive.is</button>
                </div>
            `;
        }
    }

    shareNews(title, url) {
        if (navigator.share) {
            navigator.share({
                title: decodeURIComponent(title),
                url: url
            }).catch(err => console.log('Error sharing:', err));
        } else {
            // Fallback: copiar al clipboard
            navigator.clipboard.writeText(url).then(() => {
                alert('URL copiada al portapapeles!');
            });
        }
    }

    updateMap() {
        if (!this.mapLoaded) return;
        
        const clusterEnabled = document.getElementById('cluster-markers').checked;
        // Limitar marcadores para mejor performance
        const newsForMap = this.filteredNews.slice(0, CONFIG.MAX_MAP_MARKERS);
        mapManager.addNewsMarkers(newsForMap, clusterEnabled);
    }

    updateStats() {
        document.getElementById('news-count').textContent = 
            `${this.filteredNews.length} noticias`;
        
        document.getElementById('last-update').textContent = 
            `Última actualización: ${new Date().toLocaleTimeString('es-ES')}`;

        // Mostrar proxy en uso
        const proxyEl = document.getElementById('proxy-status');
        if (proxyEl && CONFIG.CORS_PROXIES) {
            const proxyIndex = CONFIG.CURRENT_PROXY_INDEX;
            const proxyUrl = CONFIG.CORS_PROXIES[proxyIndex];
            const proxyName = proxyUrl.split('/')[2].split('.')[0];
            proxyEl.textContent = `🌐 ${proxyName} (${proxyIndex + 1}/${CONFIG.CORS_PROXIES.length})`;
            proxyEl.classList.add('working');
            proxyEl.title = `Usando proxy: ${proxyUrl}`;
        }
    }

    updatePagination() {
        const maxPages = Math.ceil(this.filteredNews.length / this.newsPerPage);
        
        document.getElementById('prev-page').disabled = this.currentPage === 1;
        document.getElementById('next-page').disabled = this.currentPage === maxPages;
        document.getElementById('page-info').textContent = 
            `Página ${this.currentPage} de ${maxPages}`;
    }

    showNewsModal(news) {
        const modal = document.getElementById('news-modal');
        const modalBody = document.getElementById('modal-body');
        
        const date = this.formatDate(news.pubDate);
        
        modalBody.innerHTML = `
            <div class="news-source" style="color: ${news.sourceColor}">${news.sourceName}</div>
            <div class="news-date">${date}</div>
            <h2>${news.title}</h2>
            ${news.image ? `<img src="${news.image}" style="width:100%; margin:1rem 0;">` : ''}
            <p>${news.description}</p>
            ${news.primaryLocation ? `<p><strong>Ubicación:</strong> ${news.primaryLocation.name}</p>` : ''}
            <div class="modal-actions">
                <button class="modal-btn-open" data-url="${news.link}">Abrir artículo →</button>
                <button class="modal-btn-extract" data-url="${news.link}">Extraer texto completo</button>
            </div>
        `;
        
        // Event listeners para botones del modal
        modalBody.querySelector('.modal-btn-open').addEventListener('click', (e) => {
            window.open(e.target.getAttribute('data-url'), '_blank');
        });

        modalBody.querySelector('.modal-btn-extract').addEventListener('click', (e) => {
            this.extractFullArticle(e.target.getAttribute('data-url'));
        });
        
        modal.style.display = 'block';
    }

    resetFilters() {
        this.activeSources = new Set(Object.keys(RSS_FEEDS));
        this.customFeeds.forEach(f => this.activeSources.add(f.id));
        this.activeRegions = new Set(['all']);
        this.searchQuery = '';
        
        document.querySelectorAll('#source-filters input').forEach(cb => cb.checked = true);
        document.querySelectorAll('#region-filters input').forEach(cb => {
            cb.checked = cb.value === 'all';
        });
        document.getElementById('search-input').value = '';
        
        this.applyFilters();
    }

    startAutoRefresh() {
        this.stopAutoRefresh();
        this.autoRefreshInterval = setInterval(() => {
            this.loadNews();
        }, CONFIG.UPDATE_INTERVAL);
    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }

    showError(message) {
        const container = document.getElementById('news-list');
        container.innerHTML = `<div class="loading"><p style="color: var(--danger)">${message}</p></div>`;
    }

    // Utilidades
    formatDate(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) {
            return 'Ahora';
        } else if (minutes < 60) {
            return `Hace ${minutes} min`;
        } else if (hours < 24) {
            return `Hace ${hours} h`;
        } else if (days === 1) {
            return 'Ayer';
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
        if (!text || text.length <= length) return text || '';
        return text.substring(0, length) + '...';
    }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.app = new NewsMonitorApp();
});

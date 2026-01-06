// Aplicación principal del monitor de noticias
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
        
        this.init();
    }

    async init() {
        // Inicializar mapa
        mapManager.initialize();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Cargar noticias iniciales
        await this.loadNews();
        
        // Iniciar auto-refresh si está habilitado
        if (CONFIG.ENABLE_AUTO_REFRESH) {
            this.startAutoRefresh();
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
            } else {
                mapManager.hide();
            }
        });

        document.getElementById('cluster-markers').addEventListener('change', (e) => {
            mapManager.toggleClustering(e.target.checked);
            mapManager.addNewsMarkers(this.filteredNews, e.target.checked);
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
    }

    async loadNews() {
        const loadingEl = document.querySelector('.loading');
        if (loadingEl) loadingEl.style.display = 'flex';

        try {
            // Obtener feeds RSS
            const feeds = {};
            for (const source of this.activeSources) {
                feeds[source] = RSS_FEEDS[source];
            }

            // Fetch noticias
            const news = await rssParser.fetchMultipleFeeds(feeds);
            
            // Procesar ubicaciones geográficas
            this.allNews = geocoder.processNewsGeo(news);
            
            // Aplicar filtros
            this.applyFilters();
            
            // Actualizar UI
            this.updateStats();
            
        } catch (error) {
            console.error('Error loading news:', error);
            this.showError('Error al cargar noticias. Intenta de nuevo.');
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
        this.updateMap();
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
            </div>
        `;

        card.addEventListener('click', () => {
            window.open(news.link, '_blank');
        });

        return card;
    }

    updateMap() {
        const clusterEnabled = document.getElementById('cluster-markers').checked;
        mapManager.addNewsMarkers(this.filteredNews, clusterEnabled);
    }

    updateStats() {
        document.getElementById('news-count').textContent = 
            `${this.filteredNews.length} noticias`;
        
        document.getElementById('last-update').textContent = 
            `Última actualización: ${new Date().toLocaleTimeString('es-ES')}`;
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
            <a href="${news.link}" target="_blank" class="btn-primary">Leer artículo completo →</a>
        `;
        
        modal.style.display = 'block';
    }

    resetFilters() {
        this.activeSources = new Set(Object.keys(RSS_FEEDS));
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

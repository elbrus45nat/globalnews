// ════════════════════════════════════════
// SOURCE META — flags, colors, initials
// ════════════════════════════════════════
const SOURCE_META = {
    'reuters':   { flag: '🌍', color: '#ff7a00', initials: 'REU' },
    'afp':       { flag: '🇫🇷', color: '#003189', initials: 'AFP' },
    'tass':      { flag: '🇷🇺', color: '#cc0000', initials: 'TASS' },
    'politico':  { flag: '🇺🇸', color: '#e40000', initials: 'POL' },
    'lemonde':   { flag: '🇫🇷', color: '#1a1a6e', initials: 'LM' },
    'guardian':  { flag: '🇬🇧', color: '#005689', initials: 'GRD' },
    'telegraph': { flag: '🇬🇧', color: '#0a0a0a', initials: 'TEL' },
    'aljazeera': { flag: '🇶🇦', color: '#8b1a1a', initials: 'AJ' },
    'bbc':       { flag: '🇬🇧', color: '#bb1919', initials: 'BBC' },
    'dw':        { flag: '🇩🇪', color: '#c8102e', initials: 'DW' },
    'apnews':    { flag: '🇺🇸', color: '#d0021b', initials: 'AP' },
    'nyt':       { flag: '🇺🇸', color: '#1a1a1a', initials: 'NYT' },
    'cnn':       { flag: '🇺🇸', color: '#cc0001', initials: 'CNN' },
    'france24':  { flag: '🇫🇷', color: '#f0002a', initials: 'F24' },
    'xinhua':    { flag: '🇨🇳', color: '#de2910', initials: 'XIN' },
    'spiegel':   { flag: '🇩🇪', color: '#e2001a', initials: 'SPG' },
    'scmp':      { flag: '🇭🇰', color: '#cf0a2c', initials: 'SCMP' },
    'elpais':    { flag: '🇪🇸', color: '#d00020', initials: 'EP' },
};

function getSourceMeta(sourceKey) {
    const key = (sourceKey || '').toLowerCase().replace(/[^a-z]/g, '');
    for (const [k, v] of Object.entries(SOURCE_META)) {
        if (key.includes(k)) return v;
    }
    // fallback: usar primeras 3 letras del nombre
    const name = (sourceKey || 'UNK').replace(/[^a-zA-Z]/g, '').toUpperCase();
    return { flag: '🌐', color: '#4a8ff5', initials: name.slice(0, 3) };
}

// ════════════════════════════════════════
// APP
// ════════════════════════════════════════
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
        this.customFeeds = this.loadCustomFeeds();
        this.mapLoaded = false;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadNews();
        this.initMapLazy();
        if (CONFIG.ENABLE_AUTO_REFRESH) this.startAutoRefresh();
    }

    initMapLazy() {
        const mapContainer = document.getElementById('map-container');
        if (CONFIG.MAP_LAZY_LOAD) {
            const observer = new IntersectionObserver(entries => {
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
        document.getElementById('refresh-btn').addEventListener('click', () => this.loadNews());

        document.querySelectorAll('#source-filters input').forEach(cb => {
            cb.addEventListener('change', e => {
                e.target.checked ? this.activeSources.add(e.target.value) : this.activeSources.delete(e.target.value);
                this.applyFilters();
            });
        });

        document.querySelectorAll('#region-filters input').forEach(cb => {
            cb.addEventListener('change', e => {
                if (e.target.value === 'all') {
                    if (e.target.checked) {
                        this.activeRegions = new Set(['all']);
                        document.querySelectorAll('#region-filters input').forEach(c => { if (c.value !== 'all') c.checked = false; });
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

        document.getElementById('search-input').addEventListener('input', e => {
            this.searchQuery = e.target.value.toLowerCase();
            this.applyFilters();
        });

        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentView = e.target.dataset.view;
                this.renderNews();
            });
        });

        document.getElementById('sort-by').addEventListener('change', e => this.sortNews(e.target.value));

        document.getElementById('auto-refresh').addEventListener('change', e => {
            e.target.checked ? this.startAutoRefresh() : this.stopAutoRefresh();
        });

        document.getElementById('show-map').addEventListener('change', e => {
            if (e.target.checked) {
                mapManager.show();
                if (!this.mapLoaded) { mapManager.initialize(); this.mapLoaded = true; this.updateMap(); }
            } else {
                mapManager.hide();
            }
        });

        document.getElementById('cluster-markers').addEventListener('change', e => {
            if (this.mapLoaded) {
                mapManager.toggleClustering(e.target.checked);
                mapManager.addNewsMarkers(this.filteredNews, e.target.checked);
            }
        });

        document.getElementById('clear-filters').addEventListener('click', () => this.resetFilters());

        document.getElementById('prev-page').addEventListener('click', () => {
            if (this.currentPage > 1) { this.currentPage--; this.renderNews(); window.scrollTo(0, 0); }
        });

        document.getElementById('next-page').addEventListener('click', () => {
            const max = Math.ceil(this.filteredNews.length / this.newsPerPage);
            if (this.currentPage < max) { this.currentPage++; this.renderNews(); window.scrollTo(0, 0); }
        });

        document.querySelector('.close').addEventListener('click', () => {
            document.getElementById('news-modal').style.display = 'none';
        });

        window.addEventListener('click', e => {
            const modal = document.getElementById('news-modal');
            if (e.target === modal) modal.style.display = 'none';
        });

        document.addEventListener('newsMarkerClick', e => this.showNewsModal(e.detail));

        this.setupCustomRSSListeners();
    }

    setupCustomRSSListeners() {
        const addBtn    = document.getElementById('add-custom-rss');
        const urlInput  = document.getElementById('custom-rss-url');
        const nameInput = document.getElementById('custom-rss-name');

        addBtn.addEventListener('click', () => {
            const url  = urlInput.value.trim();
            const name = nameInput.value.trim() || 'Custom Feed';
            if (url && this.isValidURL(url)) {
                this.addCustomFeed(url, name);
                urlInput.value = ''; nameInput.value = '';
            } else {
                alert('Por favor ingresa una URL RSS válida');
            }
        });
        this.renderCustomFeeds();
    }

    isValidURL(s) { try { new URL(s); return true; } catch (_) { return false; } }

    addCustomFeed(url, name) {
        const id   = 'custom_' + Date.now();
        const feed = { id, name, url, color: this.generateRandomColor() };
        this.customFeeds.push(feed);
        this.saveCustomFeeds();
        this.renderCustomFeeds();
        this.activeSources.add(id);
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
                    <span style="color:${feed.color}">${feed.name}</span>
                </label>
                <button class="btn-remove" data-feed-id="${feed.id}">✕</button>`;
            container.appendChild(item);
            item.querySelector('input').addEventListener('change', e => {
                e.target.checked ? this.activeSources.add(feed.id) : this.activeSources.delete(feed.id);
                this.applyFilters();
            });
            item.querySelector('.btn-remove').addEventListener('click', e => {
                const fid = e.target.getAttribute('data-feed-id');
                if (confirm(`¿Eliminar "${feed.name}"?`)) this.removeCustomFeed(fid);
            });
        });
    }

    loadCustomFeeds() { const s = localStorage.getItem('customRSSFeeds'); return s ? JSON.parse(s) : []; }
    saveCustomFeeds() { localStorage.setItem('customRSSFeeds', JSON.stringify(this.customFeeds)); }
    generateRandomColor() {
        const c = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
        return c[Math.floor(Math.random() * c.length)];
    }

    async loadNews() {
        const el = document.querySelector('.loading');
        if (el) el.style.display = 'flex';
        try {
            const allFeeds = { ...RSS_FEEDS };
            this.customFeeds.forEach(f => { allFeeds[f.id] = { name: f.name, urls: [f.url], color: f.color }; });

            const active = {};
            for (const s of this.activeSources) { if (allFeeds[s]) active[s] = allFeeds[s]; }
            if (!Object.keys(active).length) throw new Error('No hay fuentes activas');

            const news = await rssParser.fetchMultipleFeeds(active);
            if (!news || !news.length) { this.showError('No se pudieron cargar noticias.'); return; }

            this.allNews = geocoder.processNewsGeo(news);
            this.applyFilters();
            this.updateStats();
        } catch (err) {
            console.error(err);
            this.showError('Error: ' + err.message);
        } finally {
            if (el) el.style.display = 'none';
        }
    }

    applyFilters() {
        let f = [...this.allNews].filter(n => this.activeSources.has(n.source));
        if (!this.activeRegions.has('all'))
            f = f.filter(n => n.region && this.activeRegions.has(n.region));
        if (this.searchQuery)
            f = f.filter(n =>
                n.title.toLowerCase().includes(this.searchQuery) ||
                n.description.toLowerCase().includes(this.searchQuery)
            );
        this.filteredNews = f;
        this.currentPage  = 1;
        this.renderNews();
        if (this.mapLoaded) this.updateMap();
        this.updateStats();
    }

    sortNews(by) {
        if (by === 'date-desc') this.filteredNews.sort((a, b) => b.pubDate - a.pubDate);
        else if (by === 'date-asc') this.filteredNews.sort((a, b) => a.pubDate - b.pubDate);
        else if (by === 'source') this.filteredNews.sort((a, b) => a.sourceName.localeCompare(b.sourceName));
        this.renderNews();
    }

    renderNews() {
        const container = document.getElementById('news-list');
        container.className = `news-list ${this.currentView}-view`;
        container.innerHTML = '';

        const start = (this.currentPage - 1) * this.newsPerPage;
        const page  = this.filteredNews.slice(start, start + this.newsPerPage);

        if (!page.length) {
            container.innerHTML = '<div class="loading"><p>No se encontraron noticias</p></div>';
            return;
        }

        const frag = document.createDocumentFragment();
        page.forEach(n => frag.appendChild(this.createNewsCard(n)));
        container.appendChild(frag);
        this.updatePagination();
    }

    createNewsCard(news) {
        const card = document.createElement('div');
        card.className = 'news-card';

        const meta  = getSourceMeta(news.source);
        const color = news.sourceColor || meta.color;
        const flag  = meta.flag;
        const initials = meta.initials;

        card.style.setProperty('--card-accent', color);

        const date = this.formatDate(news.pubDate);
        const desc = this.truncate(news.description, CONFIG.MAX_DESCRIPTION_LENGTH);
        const cat  = (news.categories && news.categories.length) ? news.categories[0] : (news.region || 'General');

        // ── área de imagen o placeholder con iniciales ──
        let mediaHtml;
        if (news.image && this.currentView !== 'compact') {
            mediaHtml = `
                <div class="news-card-image-wrap">
                    <img class="news-card-image"
                         src="${news.image}"
                         alt=""
                         onerror="this.parentElement.innerHTML='<div class=\\'news-card-placeholder\\'><span class=\\'news-card-initials\\'>${initials}</span></div>'">
                </div>`;
        } else if (this.currentView !== 'compact') {
            mediaHtml = `
                <div class="news-card-image-wrap">
                    <div class="news-card-placeholder">
                        <span class="news-card-initials">${initials}</span>
                    </div>
                </div>`;
        } else {
            mediaHtml = '';
        }

        let locationHtml = news.primaryLocation
            ? `<span class="news-location">📍 ${news.primaryLocation.name}</span>`
            : '';

        card.innerHTML = `
            ${mediaHtml}
            <div class="news-card-content">
                <div class="news-card-header">
                    <span class="news-source" style="color:${color}">${news.sourceName}</span>
                    <span class="news-card-flag">${flag}</span>
                    <span class="news-date">${date}</span>
                </div>
                <div class="news-title">${news.title}</div>
                ${desc ? `<div class="news-description">${desc}</div>` : ''}
                <div class="news-card-footer">
                    ${locationHtml}
                    <span class="news-tag">${cat}</span>
                    <span style="font-size:.75rem;color:var(--text-muted);margin-left:auto">→</span>
                </div>
            </div>
            <div class="news-actions">
                <button class="btn-action" data-action="open"    data-url="${news.link.replace(/"/g, '&quot;')}">🔗 Abrir</button>
                <button class="btn-action" data-action="extract" data-url="${news.link.replace(/"/g, '&quot;')}">📄 Extraer</button>
                <button class="btn-action" data-action="paywall" data-url="${news.link.replace(/"/g, '&quot;')}">🪜 Sin paywall</button>
                <button class="btn-action" data-action="share"   data-url="${news.link.replace(/"/g, '&quot;')}" data-title="${news.title.replace(/"/g, '&quot;')}">📤 Compartir</button>
            </div>`;

        // click en la card → abrir link
        card.addEventListener('click', e => {
            if (e.target.closest('.btn-action')) return;
            window.open(news.link, '_blank');
        });

        card.querySelector('[data-action="open"]').addEventListener('click', e =>
            window.open(e.target.closest('[data-url]').dataset.url, '_blank'));
        card.querySelector('[data-action="extract"]').addEventListener('click', e =>
            this.extractFullArticle(e.target.closest('[data-url]').dataset.url));
        card.querySelector('[data-action="paywall"]').addEventListener('click', e =>
            window.open('https://12ft.io/' + e.target.closest('[data-url]').dataset.url, '_blank'));
        card.querySelector('[data-action="share"]').addEventListener('click', e => {
            const b = e.target.closest('[data-url]');
            this.shareNews(b.dataset.title, b.dataset.url);
        });

        return card;
    }

    async extractFullArticle(url) {
        const modal = document.getElementById('news-modal');
        const body  = document.getElementById('modal-body');
        body.innerHTML = '<div class="loading"><div class="spinner"></div><p>Extrayendo artículo...</p></div>';
        modal.style.display = 'block';
        try {
            let html = null, proxy = null;
            for (const p of CONFIG.CORS_PROXIES) {
                try {
                    const r = await fetch(p + encodeURIComponent(url));
                    if (r.ok) { html = await r.text(); proxy = p; break; }
                } catch (_) {}
            }
            if (!html) throw new Error('No se pudo obtener el contenido');
            const doc     = new DOMParser().parseFromString(html, 'text/html');
            const article = new Readability(doc).parse();
            if (!article?.content) throw new Error('No se pudo extraer el contenido');
            body.innerHTML = `
                <div class="article-header">
                    <h2>${article.title || 'Artículo'}</h2>
                    ${article.byline ? `<p class="article-byline">Por ${article.byline}</p>` : ''}
                    ${article.excerpt ? `<p class="article-excerpt">${article.excerpt}</p>` : ''}
                    <p class="article-meta"><small>Fuente: <a href="${url}" target="_blank">${url}</a></small></p>
                </div>
                <hr style="border-color:var(--border);margin:12px 0">
                <div class="article-content">${article.content}</div>
                <div class="modal-actions">
                    <button class="modal-btn-open" onclick="window.open('${url}','_blank')">Ver original →</button>
                    <button class="modal-btn-copy" onclick="navigator.clipboard.writeText(\`${article.textContent}\`).then(()=>alert('Copiado!'))">📋 Copiar</button>
                </div>`;
        } catch (err) {
            body.innerHTML = `
                <h2>Error al extraer</h2>
                <p style="color:var(--text-secondary);margin-bottom:16px">${err.message}</p>
                <div class="modal-actions">
                    <button class="modal-btn-open" onclick="window.open('${url}','_blank')">Abrir original →</button>
                    <button class="modal-btn-archive" onclick="window.open('https://archive.is/newest/${encodeURIComponent(url)}','_blank')">🗄️ Archive.is</button>
                </div>`;
        }
    }

    shareNews(title, url) {
        if (navigator.share) navigator.share({ title: decodeURIComponent(title || ''), url }).catch(() => {});
        else navigator.clipboard.writeText(url).then(() => alert('URL copiada!'));
    }

    updateMap() {
        if (!this.mapLoaded) return;
        const cluster = document.getElementById('cluster-markers').checked;
        mapManager.addNewsMarkers(this.filteredNews.slice(0, CONFIG.MAX_MAP_MARKERS), cluster);
    }

    updateStats() {
        document.getElementById('news-count').textContent = `${this.filteredNews.length} noticias`;
        document.getElementById('last-update').textContent = `Actualizado: ${new Date().toLocaleTimeString('es-ES')}`;
        const el = document.getElementById('proxy-status');
        if (el && CONFIG.CORS_PROXIES) {
            const i   = CONFIG.CURRENT_PROXY_INDEX;
            const url = CONFIG.CORS_PROXIES[i];
            el.textContent = `🌐 ${url.split('/')[2].split('.')[0]} (${i + 1}/${CONFIG.CORS_PROXIES.length})`;
            el.classList.add('working');
        }
    }

    updatePagination() {
        const max = Math.ceil(this.filteredNews.length / this.newsPerPage);
        document.getElementById('prev-page').disabled = this.currentPage === 1;
        document.getElementById('next-page').disabled = this.currentPage === max;
        document.getElementById('page-info').textContent = `Página ${this.currentPage} de ${max}`;
    }

    showNewsModal(news) {
        const modal = document.getElementById('news-modal');
        const body  = document.getElementById('modal-body');
        const meta  = getSourceMeta(news.source);
        body.innerHTML = `
            <span class="news-source" style="color:${meta.color}">${news.sourceName}</span>
            <span style="margin-left:6px;font-size:14px">${meta.flag}</span>
            <span style="margin-left:8px;font-size:11px;color:var(--text-muted);font-family:var(--mono)">${this.formatDate(news.pubDate)}</span>
            <h2 style="margin:10px 0 10px;font-size:18px;line-height:1.35">${news.title}</h2>
            ${news.image ? `<img src="${news.image}" style="width:100%;margin-bottom:12px;border-radius:6px;max-height:260px;object-fit:cover">` : ''}
            <p style="color:var(--text-secondary);font-size:14px;line-height:1.65">${news.description}</p>
            ${news.primaryLocation ? `<p style="margin-top:8px;font-size:12px;color:var(--text-muted)">📍 ${news.primaryLocation.name}</p>` : ''}
            <div class="modal-actions">
                <button class="modal-btn-open"    data-url="${news.link}">Abrir artículo →</button>
                <button class="modal-btn-extract" data-url="${news.link}">Extraer texto completo</button>
            </div>`;
        body.querySelector('.modal-btn-open').addEventListener('click', e => window.open(e.target.dataset.url, '_blank'));
        body.querySelector('.modal-btn-extract').addEventListener('click', e => this.extractFullArticle(e.target.dataset.url));
        modal.style.display = 'block';
    }

    resetFilters() {
        this.activeSources = new Set(Object.keys(RSS_FEEDS));
        this.customFeeds.forEach(f => this.activeSources.add(f.id));
        this.activeRegions = new Set(['all']);
        this.searchQuery   = '';
        document.querySelectorAll('#source-filters input').forEach(c => c.checked = true);
        document.querySelectorAll('#region-filters input').forEach(c => { c.checked = c.value === 'all'; });
        document.getElementById('search-input').value = '';
        this.applyFilters();
    }

    startAutoRefresh() {
        this.stopAutoRefresh();
        this.autoRefreshInterval = setInterval(() => this.loadNews(), CONFIG.UPDATE_INTERVAL);
    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) { clearInterval(this.autoRefreshInterval); this.autoRefreshInterval = null; }
    }

    showError(msg) {
        document.getElementById('news-list').innerHTML = `<div class="loading"><p style="color:var(--danger)">${msg}</p></div>`;
    }

    formatDate(date) {
        const diff = new Date() - date;
        const m = Math.floor(diff / 60000);
        const h = Math.floor(diff / 3600000);
        const d = Math.floor(diff / 86400000);
        if (m < 1)   return 'Ahora';
        if (m < 60)  return `${m}m ago`;
        if (h < 24)  return `${h}h ago`;
        if (d === 1) return 'Ayer';
        if (d < 7)   return `${d}d ago`;
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }

    truncate(text, len) {
        if (!text || text.length <= len) return text || '';
        return text.substring(0, len) + '...';
    }
}

document.addEventListener('DOMContentLoaded', () => { window.app = new NewsMonitorApp(); });

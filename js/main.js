(function () {
  'use strict';

  const DEFAULT_LANG = 'es';
  const CONTENT_API = 'api/content.php?collection=content';
  let contentData = getDefaultData();

  // ===== LANGUAGE =====
  let currentLang = localStorage.getItem('erandio_lang') || DEFAULT_LANG;
  window.currentLang = currentLang;

  function setLang(lang) {
    currentLang = lang;
    window.currentLang = lang;
    localStorage.setItem('erandio_lang', lang);
    document.body.classList.remove('site-lang-es', 'site-lang-eu');
    document.body.classList.add('site-lang-' + lang);
    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    document.documentElement.lang = lang;
    updateContactPlaceholders(lang);
  }

  function updateContactPlaceholders(lang) {
    document.querySelectorAll('[data-pl-es]').forEach(function (el) {
      el.placeholder = el.getAttribute('data-pl-' + lang);
    });
    var btn = document.getElementById('contact-submit');
    if (btn) {
      btn.textContent = lang === 'eu' ? 'Mezua bidali' : 'Enviar mensaje';
    }
  }

  function getPageBase() {
    var path = window.location.pathname.split('/').pop() || 'index.html';
    return path.replace('.html', '');
  }

  function getLangFromUrl() {
    return window.location.pathname.indexOf('/eu/') !== -1 ? 'eu' : 'es';
  }

  function initLang() {
    var urlLang = getLangFromUrl();
    setLang(urlLang);

    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetLang = this.dataset.lang;
        if (targetLang === urlLang) return;
        var base = getPageBase();
        var targetPage;
        if (targetLang === 'eu') {
          targetPage = 'eu/' + (base === 'index' ? 'index.html' : base + '.html');
        } else {
          targetPage = '../' + (base === 'index' ? 'index.html' : base + '.html');
        }
        // Preserve query params
        var qs = window.location.search;
        window.location.href = targetPage + qs;
      });
    });
  }

  // ===== NAVIGATION =====
  function initNav() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.querySelector('.nav');
    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        nav.classList.toggle('open');
      });
      nav.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          nav.classList.remove('open');
        });
      });
      // Dropdown toggle on mobile
      var navItems = document.querySelectorAll('.nav-item');
      navItems.forEach(function (item) {
        var trigger = item.querySelector('a');
        if (trigger) {
          trigger.addEventListener('click', function (e) {
            if (window.innerWidth <= 768) {
              e.preventDefault();
              item.classList.toggle('dropdown-open');
            }
          });
        }
      });
    }

    // Header scroll effect
    var header = document.querySelector('.header');
    if (header) {
      window.addEventListener('scroll', function () {
        header.classList.toggle('scrolled', window.scrollY > 50);
      });
    }
  }

  // ===== DATA =====
  function getData() {
    return contentData;
  }

  function getDefaultData() {
    return {
      rutas: [],
      patrimonio: [],
      'donde-comer': [],
      'donde-dormir': [],
      'donde-comprar': [],
      eventos: [],
      fiestas: []
    };
  }

  function getProjectPrefix() {
    return getLangFromUrl() === 'eu' ? '../' : '';
  }

  async function loadContentData() {
    var prefix = getProjectPrefix();
    var loadedData = null;
    try {
      var response = await fetch(prefix + CONTENT_API, {
        credentials: 'same-origin',
        cache: 'no-store'
      });
      var payload = await response.json();
      if (!response.ok || !payload.ok || !payload.data || typeof payload.data !== 'object') {
        throw new Error(payload.error || ('HTTP ' + response.status));
      }
      loadedData = payload.data;
    } catch (apiError) {
      var fallbackResponse = await fetch(prefix + 'data/content.json', { cache: 'no-store' });
      if (!fallbackResponse.ok) throw apiError;
      loadedData = await fallbackResponse.json();
    }
    contentData = Object.assign(getDefaultData(), loadedData);
    window.erandioContent = contentData;
    document.dispatchEvent(new CustomEvent('erandio-content-loaded', { detail: contentData }));
    return contentData;
  }

  function resolveMediaPath(path) {
    var value = String(path || '').trim();
    if (!value || /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(value)) return value;
    if (getLangFromUrl() === 'eu' && value.indexOf('../') !== 0) return '../' + value;
    return value;
  }

  function resolveRichHtml(html) {
    var value = String(html || '');
    if (getLangFromUrl() !== 'eu') return value;
    return value.replace(/\b(src|href)=(['"])([^'"]+)\2/gi, function (match, attr, quote, url) {
      return attr + '=' + quote + resolveMediaPath(url) + quote;
    });
  }

  window.resolveMediaPath = resolveMediaPath;

  // ===== SEARCH =====
  function performSearch(query) {
    if (!query.trim()) return [];
    var q = query.toLowerCase().trim();
    var data = getData();
    var categories = ['patrimonio', 'rutas', 'donde-comer', 'donde-dormir', 'donde-comprar', 'eventos', 'fiestas'];
    var results = [];
    categories.forEach(function (cat) {
      (data[cat] || []).forEach(function (item) {
        if (item.visible === false) return;
        var searchable = (item.title_es + ' ' + item.title_eu + ' ' + (item.resumen_es || '') + ' ' + (item.resumen_eu || '') + ' ' + (item.content_es || '') + ' ' + (item.content_eu || '')).toLowerCase();
        if (searchable.indexOf(q) !== -1) {
          results.push({ item: item, category: cat });
        }
      });
    });
    return results;
  }

  // Expose search for buscar.html
  window.performSearch = performSearch;

  function initSearchIcon() {
    var topBar = document.querySelector('.mini-top-bar');
    if (!topBar) return;
    var lang = currentLang || 'es';
    var searchPage = 'buscar.html';
    var icon = document.createElement('a');
    icon.href = searchPage;
    icon.className = 'search-icon-btn';
    icon.setAttribute('aria-label', lang === 'eu' ? 'Bilatu' : 'Buscar');
    icon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>';
    var langSwitch = topBar.querySelector('.lang-switch');
    if (langSwitch) {
      langSwitch.parentNode.insertBefore(icon, langSwitch.nextSibling);
    } else {
      topBar.appendChild(icon);
    }
  }

  // ===== RENDER CARDS =====
  function renderCards(containerId, category, linkPrefix) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var data = getData();
    var items = (data[category] || []).filter(function (i) { return i.visible !== false; });

    if (items.length === 0) {
      container.innerHTML = '<div class="empty-state"><p class="lang-es">No hay contenido disponible. Pronto añadiremos información.</p><p class="lang-eu">Ez dago edukirik eskuragarri. Laster informazioa gehituko dugu.</p></div>';
      return;
    }

    var html = '<div class="cards-grid">';
    items.forEach(function (item) {
      var resumenEs = item.resumen_es || item.content_es || '';
      var resumenEu = item.resumen_eu || item.content_eu || '';
      // Use first image; show badge for multiple
      var images = item.images && item.images.length ? item.images : (item.image ? [item.image] : []);
      var firstImg = images.length ? images[0] : '';
      var imgBadge = images.length > 1 ? '<span class="card-img-badge">+' + (images.length - 1) + '</span>' : '';
      var cardImgHtml = firstImg ? '<div style="position:relative"><img class="card-img" src="' + escapeHtml(resolveMediaPath(firstImg)) + '" alt="' + escapeHtml(item.title_es) + '" loading="lazy">' + imgBadge + '</div>' : '';
      var cardContent = '<div class="card">' + cardImgHtml +
        '<div class="card-body">' +
        '<h3 class="lang-es">' + escapeHtml(item.title_es) + '</h3>' +
        '<h3 class="lang-eu">' + escapeHtml(item.title_eu) + '</h3>' +
        '<div class="rich-text lang-es">' + resolveRichHtml(resumenEs) + '</div>' +
        '<div class="rich-text lang-eu">' + resolveRichHtml(resumenEu) + '</div>' +
        '</div></div>';
      // Wrap in link if linkPrefix provided (for patrimonio detail pages)
      if (linkPrefix) {
        html += '<a href="' + linkPrefix + item.id + '" class="card-link">' + cardContent + '</a>';
      } else {
        html += cardContent;
      }
    });
    html += '</div>';
    container.innerHTML = html;
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }
  window.escapeHtml = escapeHtml;

  // ===== RENDER RUTAS (alternating layout) =====
  function renderRutas(linkPrefix) {
    var container = document.getElementById('rutas-list');
    if (!container) return;

    var data = getData();
    var items = (data.rutas || []).filter(function (i) { return i.visible !== false; });

    if (items.length === 0) {
      container.innerHTML = '<div class="empty-state"><p class="lang-es">No hay rutas disponibles. Pronto añadiremos información.</p><p class="lang-eu">Ez dago ibilbiderik eskuragarri. Laster informazioa gehituko dugu.</p></div>';
      return;
    }

    var html = '';
    items.forEach(function (item, idx) {
      var imgHtml = item.image ? '<img class="ruta-img" src="' + escapeHtml(resolveMediaPath(item.image)) + '" alt="' + escapeHtml(item.title_es) + '" loading="lazy">' : '';
      var itemContent = '<div class="ruta-item">' + imgHtml +
        '<div class="ruta-info">' +
        '<h3 class="lang-es">' + escapeHtml(item.title_es) + '</h3>' +
        '<h3 class="lang-eu">' + escapeHtml(item.title_eu) + '</h3>' +
        '<div class="rich-text lang-es">' + resolveRichHtml(item.resumen_es || item.content_es || '') + '</div>' +
        '<div class="rich-text lang-eu">' + resolveRichHtml(item.resumen_eu || item.content_eu || '') + '</div>' +
        '</div></div>';
      if (linkPrefix) {
        itemContent = '<a href="' + linkPrefix + item.id + '" class="ruta-link">' + itemContent + '</a>';
      }
      html += itemContent;
    });
    container.innerHTML = html;
  }

  // ===== TABS =====
  function initTabs() {
    document.querySelectorAll('.tabs').forEach(function (tabGroup) {
      var btns = tabGroup.querySelectorAll('.tab-btn');
      btns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var target = this.dataset.tab;
          var parent = this.closest('.section') || this.parentElement.nextElementSibling;
          // find all tab contents within the same section
          var contents = this.closest('.section').querySelectorAll('.tab-content');
          btns.forEach(function (b) { b.classList.remove('active'); });
          this.classList.add('active');
          contents.forEach(function (c) {
            c.classList.toggle('active', c.id === target);
          });
        });
      });
    });
  }


  function findDetalleItem(cat, id) {
    var data = getData();
    var items = data[cat] || [];
    return items.find(function (i) { return String(i.id) === String(id); }) || null;
  }

  // ===== RENDER DETALLE PAGE (generic, any category) =====
  function renderDetalle() {
    var container = document.getElementById('detalle-content');
    if (!container) return;

    var params = new URLSearchParams(window.location.search);
    var cat = params.get('cat') || 'patrimonio';
    var id = parseInt(params.get('id'), 10);
    if (!id) {
      container.innerHTML = '<div class="empty-state"><p class="lang-es">Elemento no encontrado.</p><p class="lang-eu">Elementua ez da aurkitu.</p></div>';
      return;
    }

    var item = findDetalleItem(cat, id);
    if (!item) {
      container.innerHTML = '<div class="empty-state"><p class="lang-es">Elemento no encontrado.</p><p class="lang-eu">Elementua ez da aurkitu.</p></div>';
      return;
    }

    var lang = currentLang;
    var suffix = lang === 'eu' ? '_eu' : '_es';
    var title = item['title' + suffix] || item.title_es;

    // Render breadcrumb
    var breadcrumb = document.getElementById('detalle-breadcrumb');
    if (breadcrumb) {
      var catLabels = {
        patrimonio: { es: 'Patrimonio', eu: 'Ondarea' },
        rutas: { es: 'Rutas y planes', eu: 'Ibilbideak eta planak' },
        'donde-comer': { es: 'Dónde comer', eu: 'Non jan' },
        'donde-dormir': { es: 'Dónde dormir', eu: 'Non lo egin' },
        'donde-comprar': { es: 'Dónde comprar', eu: 'Non erosi' },
        eventos: { es: 'Eventos', eu: 'Ekitaldiak' },
        fiestas: { es: 'Fiestas', eu: 'Jaiak' }
      };
      var catEs = catLabels[cat] ? catLabels[cat].es : cat;
      var catEu = catLabels[cat] ? catLabels[cat].eu : cat;
      var page = cat === 'fiestas' ? 'ocio.html' : (cat ? cat + '.html' : 'patrimonio.html');
      breadcrumb.innerHTML =
        '<a href="index.html"><span class="lang-es">Inicio</span><span class="lang-eu">Hasiera</span></a>' +
        '<span class="breadcrumb-sep">›</span>' +
        '<a href="' + page + '"><span class="lang-es">' + catEs + '</span><span class="lang-eu">' + catEu + '</span></a>' +
        '<span class="breadcrumb-sep">›</span>' +
        '<span class="current">' + escapeHtml(title) + '</span>';
    }
    var subtitle = item['subtitle' + suffix] || '';
    var resumen = item['resumen' + suffix] || item.resumen_es || '';
    var contentFull = item['content' + suffix] || item.content_es || '';
    var sources = item['sources' + suffix] || item.sources_es || [];

    var metaHtml = '';
    var fields = [
      { key: 'siglo', label_es: 'Siglo', label_eu: 'Mendea', val: item['siglo' + suffix] || item.siglo_es },
      { key: 'estilo', label_es: 'Estilo', label_eu: 'Estiloa', val: item['estilo' + suffix] || item.estilo_es },
      { key: 'localizacion', label_es: 'Localización', label_eu: 'Kokapena', val: item['localizacion' + suffix] || item.localizacion_es },
      { key: 'ruta', label_es: 'Ruta', label_eu: 'Ibilbidea', val: item['ruta' + suffix] || item.ruta_es }
    ];

    var iconMap = {
      siglo: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>',
      estilo: '<svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
      localizacion: '<svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
      ruta: '<svg viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>'
    };

    fields.forEach(function (f) {
      if (f.val) {
        var label = lang === 'eu' ? f.label_eu : f.label_es;
        metaHtml += '<span class="meta-badge">' + (iconMap[f.key] || '') + label + ': ' + escapeHtml(f.val) + '</span>';
      }
    });

    // Build image carousel (or single image)
    var images = item.images && item.images.length ? item.images : (item.image ? [item.image] : []);
    var imgHtml = '';
    if (images.length === 1) {
      imgHtml = '<img class="detalle-image" src="' + escapeHtml(resolveMediaPath(images[0])) + '" alt="' + escapeHtml(title) + '">';
    } else if (images.length > 1) {
      imgHtml = '<div class="carousel" data-carousel="' + item.id + '"><div class="carousel-track">';
      images.forEach(function (src) {
        imgHtml += '<img src="' + escapeHtml(resolveMediaPath(src)) + '" alt="' + escapeHtml(title) + '" loading="lazy">';
      });
      imgHtml += '</div>' +
        '<button class="carousel-btn prev" data-carousel="' + item.id + '">‹</button>' +
        '<button class="carousel-btn next" data-carousel="' + item.id + '">›</button>' +
        '<div class="carousel-dots" data-carousel="' + item.id + '"></div>' +
        '<span class="carousel-badge">1/' + images.length + '</span></div>';
    }

    var sourcesHtml = '';
    if (sources.length) {
      var sourceTitle = lang === 'eu' ? 'Iturriak' : 'Fuentes';
      sourcesHtml = '<div class="detalle-sources"><h3>' + sourceTitle + '</h3><ul>';
      sources.forEach(function (s) {
        sourcesHtml += '<li>' + escapeHtml(s) + '</li>';
      });
      sourcesHtml += '</ul></div>';
    }

    var subtitleHtml = subtitle ? '<p class="detalle-subtitle">' + escapeHtml(subtitle) + '</p>' : '';

    // Mapa embed
    var mapaHtml = '';
    var mapaEmbed = item.mapa_embed || '';
    var mapaData = item.mapa_data || '';
    if (mapaEmbed) {
      mapaHtml = '<div class="detalle-mapa">' + mapaEmbed + '</div>';
    } else if (mapaData) {
      mapaData = escapeHtml(resolveMediaPath(mapaData));
      mapaHtml = '<div class="detalle-mapa"><p class="lang-es"><a href="' + mapaData + '" download="ruta.gpx" class="hero-btn" style="display:inline-block;padding:10px 24px;font-size:0.9rem">📥 Descargar GPX</a></p><p class="lang-eu"><a href="' + mapaData + '" download="ruta.gpx" class="hero-btn" style="display:inline-block;padding:10px 24px;font-size:0.9rem">📥 GPX jaitsi</a></p></div>';
    }

    container.innerHTML =
      '<div class="detalle-header">' +
      '<h1>' + escapeHtml(title) + '</h1>' +
      subtitleHtml +
      '<div class="detalle-meta">' + metaHtml + '</div>' +
      '</div>' +
      imgHtml +
      mapaHtml +
      '<div class="detalle-body">' + resolveRichHtml(resumen) + (contentFull ? '<hr class="detalle-divider"><div class="detalle-content-full">' + resolveRichHtml(contentFull) + '</div>' : '') + '</div>' +
      sourcesHtml;
  }

  // ===== CAROUSEL INIT =====
  function initCarousels() {
    document.querySelectorAll('.carousel').forEach(function (carousel) {
      var track = carousel.querySelector('.carousel-track');
      var dotsContainer = carousel.querySelector('.carousel-dots');
      var badge = carousel.querySelector('.carousel-badge');
      var prevBtn = carousel.querySelector('.carousel-btn.prev');
      var nextBtn = carousel.querySelector('.carousel-btn.next');
      var slides = track ? track.querySelectorAll('img') : [];
      if (slides.length < 2) return;
      var current = 0;

      // Dots
      slides.forEach(function (_, i) {
        var dot = document.createElement('div');
        dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
        dot.addEventListener('click', function () { goTo(i); });
        dotsContainer.appendChild(dot);
      });
      var dots = dotsContainer.querySelectorAll('.carousel-dot');

      function goTo(index) {
        if (index < 0) index = slides.length - 1;
        if (index >= slides.length) index = 0;
        current = index;
        track.style.transform = 'translateX(-' + (current * 100) + '%)';
        dots.forEach(function (d) { d.classList.remove('active'); });
        dots[current].classList.add('active');
        if (badge) badge.textContent = (current + 1) + '/' + slides.length;
      }

      if (prevBtn) prevBtn.addEventListener('click', function () { goTo(current - 1); });
      if (nextBtn) nextBtn.addEventListener('click', function () { goTo(current + 1); });
    });
  }

  // ===== RENDER FALDÓN (generic, any category) =====
  function renderFaldon() {
    var container = document.getElementById('faldon-cards');
    if (!container) return;

    var params = new URLSearchParams(window.location.search);
    var cat = params.get('cat') || 'patrimonio';
    var currentId = params.get('id');
    var data = getData();
    var items = (data[cat] || []).filter(function (i) { return i.visible !== false && String(i.id) !== String(currentId); });
    if (items.length === 0) {
      container.style.display = 'none';
      return;
    }

    var lang = currentLang;
    var suffix = lang === 'eu' ? '_eu' : '_es';
    var detailPage = 'patrimonio-detalle.html?cat=' + cat + '&id=';

    var html = '';
    items.slice(0, 4).forEach(function (item) {
      var title = item['title' + suffix] || item.title_es;
      var subtitle = item['subtitle' + suffix] || '';
      html += '<a href="' + detailPage + item.id + '" class="faldon-card">' +
        (item.image ? '<img src="' + escapeHtml(resolveMediaPath(item.image)) + '" alt="' + escapeHtml(title) + '" loading="lazy">' : '') +
        '<div class="faldon-body">' +
        '<h4>' + escapeHtml(title) + '</h4>' +
        (subtitle ? '<p>' + escapeHtml(subtitle) + '</p>' : '') +
        '</div></a>';
    });
    container.innerHTML = html;
  }

  // ===== CONTACT FORM =====
  function initContactForm() {
    updateContactPlaceholders(currentLang);
    var form = document.getElementById('contactForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = document.getElementById('contact-submit');
      var originalText = btn.textContent;
      btn.textContent = currentLang === 'eu' ? 'Mezua bidalia!' : 'Mensaje enviado!';
      btn.style.background = '#2e7d32';
      form.reset();
      setTimeout(function () {
        btn.textContent = originalText;
        btn.style.background = '';
      }, 3000);
    });
  }

  // ===== SCROLL REVEAL =====
  function initScrollReveal() {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.card, .highlight-item, .ruta-item, .ocio-card, .llegar-card, .faldon-card, .logo-link-card').forEach(function (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      observer.observe(el);
    });
  }

  // ===== INIT =====
  async function init() {
    initLang();
    initNav();
    initTabs();
    initContactForm();
    initSearchIcon();

    try {
      await loadContentData();
    } catch (error) {
      console.error('No se ha podido cargar el contenido JSON.', error);
      document.body.classList.add('content-load-error');
    }

    var detallePage = 'patrimonio-detalle.html?cat=';
    var sections = [
      { id: 'comer-cards', cat: 'donde-comer' },
      { id: 'dormir-cards', cat: 'donde-dormir' },
      { id: 'comprar-cards', cat: 'donde-comprar' },
      { id: 'eventos-cards', cat: 'eventos' },
      { id: 'fiestas-cards', cat: 'fiestas' }
    ];

    renderRutas(detallePage + 'rutas&id=');
    renderCards('patrimonio-cards', 'patrimonio', detallePage + 'patrimonio&id=');

    sections.forEach(function (s) {
      renderCards(s.id, s.cat, detallePage + s.cat + '&id=');
    });

    // Render detail page if on detalle page
    renderDetalle();
    renderFaldon();
    initCarousels();
    initScrollReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

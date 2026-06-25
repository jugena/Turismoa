(function () {
  'use strict';

  const STORAGE_KEY = 'erandio_turismo_content';
  const DEFAULT_LANG = 'es';

  // ===== LANGUAGE =====
  let currentLang = DEFAULT_LANG;
  try {
    currentLang = localStorage.getItem('erandio_lang') || DEFAULT_LANG;
  } catch (e) {
    console.warn('localStorage is not accessible:', e);
  }
  window.currentLang = currentLang;

  function setLang(lang) {
    currentLang = lang;
    window.currentLang = lang;
    try {
      localStorage.setItem('erandio_lang', lang);
    } catch (e) {
      console.warn('localStorage is not accessible:', e);
    }
    document.body.classList.remove('lang-es', 'lang-eu');
    document.body.classList.add('lang-' + lang);
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
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || getDefaultData();
    } catch (e) {
      return getDefaultData();
    }
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
    // Also search PATRIMONIO_DEFAULT for items not in localStorage
    var storedPat = (data.patrimonio || []).map(function (i) { return i.id; });
    PATRIMONIO_DEFAULT.forEach(function (item) {
      if (storedPat.indexOf(item.id) !== -1) return;
      var searchable = (item.title_es + ' ' + item.title_eu + ' ' + (item.resumen_es || '') + ' ' + (item.resumen_eu || '') + ' ' + (item.content_es || '') + ' ' + (item.content_eu || '')).toLowerCase();
      if (searchable.indexOf(q) !== -1) {
        results.push({ item: item, category: 'patrimonio' });
      }
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
      var imgHtml = item.image ? '<img class="card-img" src="' + item.image + '" alt="' + escapeHtml(item.title_es) + '" loading="lazy">' : '';
      var resumenEs = item.resumen_es || item.content_es || '';
      var resumenEu = item.resumen_eu || item.content_eu || '';
      // Use first image; show badge for multiple
      var images = item.images && item.images.length ? item.images : (item.image ? [item.image] : []);
      var firstImg = images.length ? images[0] : '';
      var imgBadge = images.length > 1 ? '<span class="card-img-badge">+' + (images.length - 1) + '</span>' : '';
      var cardImgHtml = firstImg ? '<div style="position:relative"><img class="card-img" src="' + firstImg + '" alt="' + escapeHtml(item.title_es) + '" loading="lazy">' + imgBadge + '</div>' : '';
      var cardContent = '<div class="card">' + cardImgHtml +
        '<div class="card-body">' +
        '<h3 class="lang-es">' + escapeHtml(item.title_es) + '</h3>' +
        '<h3 class="lang-eu">' + escapeHtml(item.title_eu) + '</h3>' +
        '<div class="rich-text lang-es">' + resumenEs + '</div>' +
        '<div class="rich-text lang-eu">' + resumenEu + '</div>' +
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
      var imgHtml = item.image ? '<img class="ruta-img" src="' + item.image + '" alt="' + escapeHtml(item.title_es) + '" loading="lazy">' : '';
      var itemContent = '<div class="ruta-item">' + imgHtml +
        '<div class="ruta-info">' +
        '<h3 class="lang-es">' + escapeHtml(item.title_es) + '</h3>' +
        '<h3 class="lang-eu">' + escapeHtml(item.title_eu) + '</h3>' +
        '<div class="rich-text lang-es">' + (item.resumen_es || item.content_es || '') + '</div>' +
        '<div class="rich-text lang-eu">' + (item.resumen_eu || item.content_eu || '') + '</div>' +
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

  // ===== PATRIMONIO DEFAULT DATA (fallback when localStorage is empty) =====
  var PATRIMONIO_DEFAULT = [
    {
      id: 1,
      title_es: 'Iglesia Andra Mari',
      title_eu: 'Andra Mari Eliza',
      subtitle_es: '"Una joya en el pueblo"',
      subtitle_eu: '"Herriko bitxi bat"',
      siglo_es: 'XVI',
      estilo_es: 'Gótico tardío',
      localizacion_es: 'Goikoa',
      ruta_es: 'Ruta 3',
      resumen_es: '<p>Edificio gótico del s. XVI considerado una de las iglesias más destacables de Bizkaia. Situada en el barrio de La Campa, fue el centro social del pueblo durante siglos.</p>',
      resumen_eu: '<p>XVI. mendeko eliza gotikoa, Bizkaiko eliza nabarmenetakotzat joa. La Campa auzoan kokatua, mendeetan zehar herriko gune soziala izan zen.</p>',
      content_es: '<p>Este edificio está considerado como una de las iglesias más destacables del gótico en la provincia de Bizkaia, siendo el edificio histórico mejor conservado de nuestro pueblo.</p><p>Está situado en el barrio de La Campa, en donde además está el antiguo ayuntamiento, escuelas y cementerio, puesto que este núcleo de poblacional fue el centro del pueblo hasta comienzos del s. XX, cuando en el barrio de Altzaga se inicie el desarrollo industrial.</p><p>El origen de nuestro pueblo está ligado al de la iglesia, de hecho la primera documentación al respecto de nuestro municipio habla de la anteiglesia de Santa María de Erandio. Por aquellos tiempos tardomedievales no había diferencias entre lo civil y lo religioso, de hecho en un primer momento la documentación municipal se archivaba en la propia iglesia. Además de las funciones eclesiásticas, alrededor del edificio se hacían reuniones, se informaba de bandos y se hacían llamamientos de la justicia. En definitiva era el centro social del pueblo, a donde se iba para relacionarse con el resto de vecinos y en donde se veía y se demostraba el poder la ostentación de las diferentes familias, de este modo las familias más poderosas del pueblo se sentaban adelante en las litúrgicas, y el resto del pueblo lo hacía en la parte de atrás.</p><p>La iglesia ya debía de existir alrededor de 1300, aunque el edificio actual es un templo gótico de finales de s. XV, de 1490 aproximadamente, aunque las reformas del crucero y la cabecera datan del s. XVII, finalizándose en 1678, de mano del cantero Juan de Setien.</p><p>La iglesia se ordena mediante tres naves escalonadas y cuatro tramos más el de crucero y la capilla mayor. En las bóvedas se pueden apreciar el sistema de nervios, típicos del gótico. El edificio tiene la que posiblemente sea la campana más antigua de toda Bizkaia, que data de alrededor de 1500, contemporánea a la propia pila bautismal, así como un campanario que tiene aspecto de torre militar y en algunos libros lo han llegado a confundir.</p><p>Las tres portadas de la Iglesia son también góticas, donde se aprecian las arquivoltas y las columnillas acodilladas con capiteles lisos, y la torre del campanario.</p><p>El sepulcro de Martin Ortiz de Martiartu y de su esposa está en un arcosolio apuntado vaciado en el muro de los pies. Este sepulcro tiene ciertos aspectos y estética anteriores a la construcción del templo, por lo que es probable que fueran trasladados al mismo de algún otro lugar.</p>',
      sources_es: ['BARRIO LOZA, JoseAngel: "Guía turística de monumentos y arte en Bizkaia. 13 rutas a recorrer en coche". Dirección General de Promoción Turística. Diputación Foral de Bizkaia, Bilbao, 2006', 'GONZÁLEZ CEMBELLÍN, Juan Manuel; CILLA LÓPEZ, Raquel; MUÑIZ PETRALANDA, Jesús: "Iglesia de Andra Mari de Erandio. Estudio histórico-artístico", EuskoIkaskuntza, Donostia, 2011', 'PEREZ DE LA PEÑA OLEAGA, GORKA: "Erandioko Arkitektuaren Gida / Guía de Arquitectura de Erandio", Grupo Publicitario Cruzial, Mortera, 2011', 'Historias de Erandio: www.historiasdeerandio.blogspot.com'],
      image: 'img/Iglesia Andra Mari.jpg',
      visible: true
    },
    {
      id: 2,
      title_es: 'Torre de Martiartu',
      title_eu: 'Martiartu Dorrea',
      subtitle_es: '"Esencia de la época feudal"',
      subtitle_eu: '"Garai feudalaren funtsa"',
      siglo_es: 'XVI',
      estilo_es: 'Renacimiento',
      localizacion_es: 'Goierri',
      ruta_es: 'Ruta 4',
      resumen_es: '<p>Torre del s. XVI situada en el barrio de Goierri. Fue residencia de la familia Martiartu y controlaba las rutas entre Plentzia y Bilbao. Edificio clave del Erandio preindustrial.</p>',
      resumen_eu: '<p>XVI. mendeko dorrea Goierri auzoan. Martiartu familiaren bizilekua izan zen eta Plentzia eta Bilboko bideak kontrolatzen zituen. Erandio industrial aurreko eraikin giltzarria.</p>',
      content_es: '<p>Junto con la Iglesia de Santa María, en el barrio de la Campa, la torre de Martiartu, situado en la ladera del monte Umbe, en el barrio de Goierri, son los edificios más significativos del Erandio preindustrial.</p><p>Las casas torres, las torres banderizas, forman parte de la esencia de la época feudal en Bizkaia, que tejerá durante varios siglos la historia del Pais Vasco. En el caso de la torre de Martiartu, que tiene un carácter tanto residencial como defensivo, desde su construcción, hasta su abandono, casi siempre estuvo habitada. La torre estaba en un lugar estratégico controlando las rutas entre Plentzia y Bilbao, así como algunas del interior.</p><p>Anteriormente al edificio construido en piedra, parece ser que hubo primeramente otro hecho de madera que pudo haber sido destruido en los enfrentamientos banderizos. Será Martín Ortiz de Martiartu, hijo de Diego Pérez de Martiartu, apodado "El Viejo", quien construya la primeriza torre de piedra a finales del s. XIV o principios del s. XV, puesto que sabemos que Martín Ortiz muere en 1415.</p><p>La construcción de esta nueva torre de piedra, de la que se conservan los muros correspondientes a las dos primeras plantas de la fachada sur y la mitad de los orientados a este y oeste, conllevaba consigo una cierta ventaja militar sobre otras familias, así como el ostentar cierto poder económico y social, lo que suponía un mayor peso político dentro del sistema feudal de la zona.</p><p>La torre se destruirá en 1472, ya que Ochoa Ortiz de Guecho y Martiartu había apoyado al Conde de Haro que, habiendo respaldado al legítimo monarca Enrique IV, pretendía hacer valer su poder sobre los linajes vizcaínos para que reconocieran a Juana "La Beltraneja". Los partidarios del Conde de Haro son derrotados por los partidarios de los Reyes Católicos y, como consecuencia, la torre de los Martiartu es destruida.</p><p>De este modo, durante varios años la torre estará abandonada, lo cual hizo que se pudiera haber producido saqueos y robo de material, hasta que en 1488, Diego Perez de Martiartu, hijo de Ochoa Ortiz, reclama su reconstrucción, pide "remedio con justicia de manera que las dichas torres le fuesen fechas o le fuesen pagadas [...]".</p><p>No sabemos si finalmente empezaría una nueva obra o no, puesto que la mayor parte de la actual torre de hoy en día, proviene del s. XVI (el levantamiento prácticamente de un cubo de sillería, integrando elementos renacentistas, como la crestería de remate, y tardomediaveles, como los vanos conopiales), pero sí que sabemos que Martin Ortiz de Martiartu, hijo de Diego Pérez, va a ser el encargado de reparar la torre finalmente, cuyo carácter militar se ve reforzado con muros más gruesos y vanos que dotan de menos luz. Por aquellas fechas posiblemente ya el linaje de los Martiartu compaginaría su residencia en la torre con la otra que tenía en Getxo, de la cual también eran señores.</p><p>Con el paso del tiempo, y con el cambio de intereses, negocios y vida social, las ciudades empezarán a coger cierta importancia dejando estas zonas como centros de producción agrícola para intereses de los señores, que irán disminuyendo. De este modo, la torre a principios del s. XIX es arrendadada. Finalmente Isidro Aretxabaleta y Mota, vende la ermita y la torre, en 1948, al Ayuntamiento de Bilbao, que llega a un acuerdo con la familia. Poco tiempo después el consistorio hará unas obras de restauración que finalizan en 1954.</p>',
      sources_es: ['DE IBARRA BERGÉ, JAVIER y DE GARMENDIA, PEDRO: "Torres de Bizkaia", Consejo Superior de Investigaciones Científicas, Instituto Diego de Velázquez, Madrid, 1946.', 'GARCIA DE SALAZAR, LOPE: "Las bienandanzas e fortunas", Diputación Foral de Bizkaia, Bilbao, 1955.', 'Toponimia de Erandio: www.toponimia.biz/erandio', 'Historias de Erandio: www.historiasdeerandio.blogspot.com'],
      image: 'img/Torre de Martiartu (patrimonio).jpg',
      visible: true
    },
    {
      id: 3,
      title_es: 'Lavadero de Tartanga',
      title_eu: 'Tartangako Garbitegia',
      subtitle_es: '"Icono de la condición proletaria e industrial del barrio de Altzaga"',
      subtitle_eu: '"Altzaga auzoko baldintza proletario eta industrialaren ikonoa"',
      siglo_es: 'XIX',
      estilo_es: 'Ecléctico',
      localizacion_es: 'Altzaga',
      ruta_es: 'Ruta 1',
      resumen_es: '<p>Lavadero público construido en 1893 por Casto de Zabala. Es el único lavadero de este tipo conservado en los municipios de la ría del Nervión, icono de la condición industrial de Altzaga.</p>',
      resumen_eu: '<p>Casto de Zabalaren eskutik 1893an eraikitako garbitegi publikoa. Nervión itsasadarraren udalerrietan mota honetako kontserbatutako garbitegi bakarra, Altzagako baldintza industrialaren ikonoa.</p>',
      content_es: '<p>Representa el cambio en las medidas higiénico-sanitarias en Erandio. La última epidemia de cólera que se vivió en la zona tuvo lugar a finales del siglo XIX. Había que cambiar las medidas higiénicas de la población y, por ello, el ayuntamiento construyó este lavadero de ropa, de la mano del maestro de obras Casto de Zabala, en 1893. Tiene como elemento destacado las guardamalletas que protegen su fachada principal, convirtiéndose en uno de los únicos lavaderos que conservan este elemento.</p><p>Lavar la ropa fue una de tantas medidas encaminadas a la mejora en los hábitos de salubridad de las y los habitantes, acción que era imposible dado el limitado suministro de aguas. Además, era una de las pocas fuentes en el barrio donde se podía coger agua potable, ya que el barrio con las continuas inundaciones que sufría con las pleamares hacía que el agua tuviera altas concentraciones de salinidad. El lavadero tendrá esta función hasta prácticamente la década de 1970.</p><p>Es uno de los iconos para entender la condición proletaria e industrial del barrio de Altzaga. Actualmente es el único lavadero de este tipo a lo largo de los municipios de la ría del Nervión, que se ha conservado prácticamente igual que cuando se construyó, y que surge en el contexto de la industrialización en la margen derecha de la ría.</p>',
      sources_es: ['PEREZ DE LA PEÑA OLEAGA, GORKA: "Erandioko Arkitektuaren Gida / Guía de Arquitectura de Erandio", Grupo Publicitario Cruzial, Mortera, 2011', 'Historias de Erandio: www.historiasdeerandio.blogspot.com'],
      image: 'img/Lavadero de Tartanga.jpg',
      visible: true
    },
    {
      id: 4,
      title_es: 'Grupo de Viviendas "La Esperanza" – Casas Baratas',
      title_eu: '"La Esperanza" Etxebizitza Multzoa – Etxe Merkeak',
      subtitle_es: '"Arquitectura Industrial"',
      subtitle_eu: '"Arkitektura Industriala"',
      siglo_es: '1926',
      estilo_es: 'Neovasco',
      localizacion_es: 'Altzaga',
      ruta_es: 'Ruta 1',
      resumen_es: '<p>Conjunto de viviendas obreras de 1926 diseñadas por Ángel Líbano en estilo neovasco. Ejemplo del modelo inglés de ciudades jardín y respuesta a la falta de vivienda obrera.</p>',
      resumen_eu: '<p>1926ko langile-etxebizitza multzoa, Ángel Libanok estilo neovascoan diseinatua. Lorategi hirien ingeles modeloaren adibidea eta langile etxebizitza faltaren erantzuna.</p>',
      content_es: '<p>Proyectadas en 1923 en régimen de cooperativa por un grupo de socios que trabajaban en la Sociedad Española de Construcciones Navales y diseñadas por el arquitecto municipal Ángel Líbano en estilo neovasco. Destacan sus entramados ficticios que recorren las fachadas principales, los zócalos de mampostería vista, el colorido, así como el acceso principal a modo de portalón. Este edificio de casa evidencia en lo urbanismo el modelo inglés de las ciudades jardín, así como el centroeuropeo de las "siendlung".</p><p>Conocidas popularmente como "casas baratas", son consecuencia de los problemas de hacinamiento y falta de vivienda obrera que se estaba produciendo en Erandio desde finales del siglo XIX. No es casualidad que se hicieran en un alto, para evitar las pleamares de la ría.</p>',
      sources_es: ['PEREZ DE LA PEÑA OLEAGA, GORKA: "Erandioko Arkitektuaren Gida / Guía de Arquitectura de Erandio", Grupo Publicitario Cruzial, Mortera, 2011', 'Historias de Erandio: www.historiasdeerandio.blogspot.com'],
      image: 'img/Casas Baratas.jpg',
      visible: true
    },
    {
      id: 5,
      title_es: 'Restos de Molinos Harineros de Agua',
      title_eu: 'Ur Errota Haien Hondarrak',
      subtitle_es: '"Unión entre la fuerza de la naturaleza y el ingenio humano"',
      subtitle_eu: '"Naturaren indarra eta giza asmamenaren arteko batasuna"',
      siglo_es: 'XVII',
      estilo_es: '',
      localizacion_es: 'Goierri y Asua',
      ruta_es: '',
      resumen_es: '<p>Erandio contó con entre 7 y 8 molinos de agua documentados entre los s. XVII y XVIII, principalmente en Goierri y Asua. Representan la unión entre la fuerza de la naturaleza y el ingenio humano.</p>',
      resumen_eu: '<p>Erandiok 7 eta 8 ur-errota dokumentatu zituen XVII eta XVIII. mendeen artean, batez ere Goierri eta Asuan. Naturaren indarra eta giza asmamenaren arteko batasuna adierazten dute.</p>',
      content_es: '<p>Desde que alcanzaran un notable esplendor en época romana, los molinos de agua fueron una de las principales fuentes de abastecimiento de energía hidráulica, para la producción ferrera y para la molienda de granos, durante toda la Edad Media, llegando muchos a funcionar hasta el siglo XX, en Bizkaia.</p><p>Aunque tenemos datos de molinos en Erandio desde el s.XVII, con toda seguridad existieron desde mucho tiempo antes. En la Edad Media, el monopolio de los molinos de agua estaba dominado principalmente por los señores de Asua y Martiartu, los dos linajes más importantes de la época en el pueblo, en el s. XVII seguirá siendo así, y cuando no siempre estaba en manos de un notable.</p><p>Las primeras informaciones que tenemos de los molinos en Erandio están relacionadas sobre diferentes arrendamientos, que en el s. XVIII oscilarán en torno a los 100 ducados anuales. De este modo, habrá entre 7 y 8 molinos documentados, entre la mitad del s XVII y finales del s. XVIII.</p><p>Actualmente donde sabemos que hubo algún molino de agua en Erandio suele haber un caserío, que a veces lleva el nombre del antiguo molino que recogen las fuentes. De los ocho molinos que sabemos que existieron en Erandio, 7 están localizados en el barrio de Gohierri, de los cuales 6 están en arroyos pertenecientes a la cuenca del Gobela, 1 a la cuenca del Udondo, y 1 en el barrio de Asúa, cuyas aguas nutrían el río Asua.</p><p>Respecto al molino de Asúa, se trata del Molino de Leura que aparece en las fuentes en 1582. En el s.XIX, el molino ocupaba una extensión aproximada de 753 m2, de los que la casa-molino ocupaba unos 350. El último molinero fue Vicente Gaztañaga, que desde su fallecimiento, en 1955, el molino dejó de funcionar.</p><p>En lo que confiere a los molinos de Gohierri, la mayoría se situaban en el arroyo Urederra (en algunos textos aparece como Azkaiturri o Ascaiturri), que desemboca a su vez en el arroyo Bolue. El que estaba situado más aguas arriba era el molino de Errotabarri, que aparece en la documentación en 1669. Siguiendo el curso del arroyo, el siguiente molino es el Aja-Errota (en algunas fuentes aparece como Asse Errota, Aixerrota o Aizerrota). Está desaparecido, aunque hay restos de su pared del lado noroeste, que debía tener unos 60 metros de grosor.</p><p>Posteriormente nos encontramos con el Goikoerrota (también llamado Goikorta, Goycoerotaeta, Goyco Errota o Goicoerrota). Funcionará hasta 1558 y sus últimos molineros serán Antonio Arguinchona y Pakitxe Abarrategui.</p><p>El cuarto molino aguas abajo del Urederra es el Bekoerrota (también llamado Bezkorta o Becoerrota), que tenía un calce que venía del Goikoerrota y que daba a parar a una antepara cilíndrica de 1,35 cm. Los últimos molineros fueron Bernardo Ormaechea y Martina Sagasti.</p><p>El quinto molino del Urederra es el Gobelaerrota (también conocido como Gollorta), un molino que aprovechaba las aguas, mediante un calce que venía del Bekoerrota y que discurría mediante un pequeño acueducto elevado de mampostería. En 1896 pertenecía al Marqués de Villarías. Funcionó hasta 1968.</p><p>El sexto y último molino del barrio de Gohierri, es el Bolue (llamado también Bolinchu, Bolintxu, Bolunchu, Botachu o Errotatxu), que hoy en día está desaparecido. Funcionó hasta 1966.</p>',
      sources_es: ['DIEZ SAIZ, ALBERTO: "Molinos de río en el Valle de Asua (Bizkaia)", Eusko Ikaskuntza, Bilbao, 1997', 'DIEZ SAIZ, ALBERTO: "Molinos de río en el Valle de Gobela (Bizkaia)", Eusko Ikaskuntza, Bilbao, 1993', 'Historias de Erandio: www.historiasdeerandio.blogspot.com'],
      image: 'img/Molinos de Agua 2.jpg',
      visible: true
    },
    {
      id: 6,
      title_es: 'Humedal de Astrabudua',
      title_eu: 'Astrabuduako Hezegunea',
      subtitle_es: '"Variedad en fauna y flora"',
      subtitle_eu: '"Fauna eta flora aniztasuna"',
      siglo_es: '',
      estilo_es: '',
      localizacion_es: 'Astrabudua',
      ruta_es: '',
      resumen_es: '<p>Espacio natural protegido en los límites de Astrabudua con Leioa. Cuenta con una enorme variedad de especies animales y vegetales, autóctonas e invasoras.</p>',
      resumen_eu: '<p>Astrabudua eta Leioaren mugan dagoen babestutako gune naturala. Animali eta landare espezie aniztasun handia du, bertakoak eta inbaditzaileak.</p>',
      content_es: '<p>Ubicado en los límites de Astrabudua con Leioa, el humedal de Astrabudua cuenta con una enorme variedad de especies animales y vegetales.</p><p>En este espacio presentaremos la amplia variedad de especies, identificando las autóctonas e invasoras, definiendo el estado de conservación de algunas de las especies actuales y recordaremos alguna de las especies actualmente desaparecidas del humedal.</p>',
      sources_es: [],
      image: 'img/Humedal de Astrabudua.jpg',
      visible: true
    }
  ];

  function getDefaultPatrimonio() {
    return PATRIMONIO_DEFAULT;
  }

  function findDetalleItem(cat, id) {
    var data = getData();
    var items = data[cat] || [];
    var item = items.find(function (i) { return i.id === id; });
    if (item) return item;
    // fallback to default data for patrimonio
    if (cat === 'patrimonio') {
      return PATRIMONIO_DEFAULT.find(function (i) { return i.id === id; });
    }
    return null;
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
      imgHtml = '<img class="detalle-image" src="' + images[0] + '" alt="' + escapeHtml(title) + '">';
    } else if (images.length > 1) {
      imgHtml = '<div class="carousel" data-carousel="' + item.id + '"><div class="carousel-track">';
      images.forEach(function (src) {
        imgHtml += '<img src="' + src + '" alt="' + escapeHtml(title) + '" loading="lazy">';
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
        sourcesHtml += '<li>' + s + '</li>';
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
      '<div class="detalle-body">' + resumen + (contentFull ? '<hr class="detalle-divider"><div class="detalle-content-full">' + contentFull + '</div>' : '') + '</div>' +
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
    var currentId = parseInt(params.get('id'), 10);
    var data = getData();
    var items = (data[cat] || []).filter(function (i) { return i.visible !== false && i.id !== currentId; });
    if (items.length === 0 && cat === 'patrimonio') {
      items = PATRIMONIO_DEFAULT.filter(function (i) { return i.id !== currentId; });
    }
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
        (item.image ? '<img src="' + item.image + '" alt="' + escapeHtml(title) + '" loading="lazy">' : '') +
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
  function init() {
    initLang();
    initNav();
    initTabs();
    initContactForm();
    initScrollReveal();
    initSearchIcon();

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

    // Listen for storage changes from backoffice
    window.addEventListener('storage', function (e) {
      if (e.key === STORAGE_KEY) {
        renderRutas(detallePage + 'rutas&id=');
        renderCards('patrimonio-cards', 'patrimonio', detallePage + 'patrimonio&id=');
        sections.forEach(function (s) {
          renderCards(s.id, s.cat, detallePage + s.cat + '&id=');
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

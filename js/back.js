(function () {
  'use strict';

  const STORAGE_KEY = 'erandio_turismo_content';
  const SESSION_KEY = 'erandio_back_session';

  const categories = [
    { id: 'rutas', label_es: 'Rutas y planes', label_eu: 'Ibilbideak eta planak' },
    { id: 'patrimonio', label_es: 'Patrimonio', label_eu: 'Ondarea' },
    { id: 'donde-comer', label_es: 'Dónde comer', label_eu: 'Non jan' },
    { id: 'donde-dormir', label_es: 'Dónde dormir', label_eu: 'Non lo egin' },
    { id: 'donde-comprar', label_es: 'Dónde comprar', label_eu: 'Non erosi' },
    { id: 'eventos', label_es: 'Eventos', label_eu: 'Ekitaldiak' },
    { id: 'fiestas', label_es: 'Fiestas locales', label_eu: 'Herriko jaiak' }
  ];

  // ===== DATA =====
  function getData() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || getDefaultData();
    } catch (e) {
      return getDefaultData();
    }
  }

  function getDefaultData() {
    var def = {};
    categories.forEach(function (c) { def[c.id] = []; });
    return def;
  }

  function saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  // ===== AUTH =====
  function isLoggedIn() {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  }

  function login(user, pass) {
    if (user === 'Admin' && pass === 'Erandio01') {
      sessionStorage.setItem(SESSION_KEY, 'true');
      return true;
    }
    return false;
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    showScreen('login-screen');
  }

  // ===== SCREENS =====
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
    var screen = document.getElementById(id);
    if (screen) screen.classList.add('active');
  }

  // ===== RICH TEXT EDITOR =====
  function initRichToolbar(editorId, toolbarId) {
    var toolbar = document.getElementById(toolbarId);
    if (!toolbar) return;

    var htmlId = editorId.replace('editor-', 'html-');
    var editor = document.getElementById(editorId);
    var htmlView = document.getElementById(htmlId);
    var imgInput = toolbar.querySelector('.editor-img-input');

    // Image upload
    if (imgInput) {
      imgInput.addEventListener('change', function () {
        var file = this.files[0];
        if (!file) return;
        if (!file.type.match('image.*')) { alert('Selecciona un archivo de imagen.'); return; }
        var reader = new FileReader();
        reader.onload = function (e) {
          editor.focus();
          document.execCommand('insertImage', false, e.target.result);
        };
        reader.readAsDataURL(file);
        this.value = '';
      });
    }

    toolbar.addEventListener('click', function (e) {
      var btn = e.target.closest('.editor-btn');
      if (!btn) return;
      e.preventDefault();

      var cmd = btn.dataset.cmd;
      var val = btn.dataset.value || null;

      if (cmd === 'toggleHtml') {
        if (htmlView.style.display === 'none') {
          htmlView.value = editor.innerHTML;
          editor.style.display = 'none';
          htmlView.style.display = 'block';
          btn.textContent = '👁 Visual';
        } else {
          editor.innerHTML = htmlView.value;
          htmlView.style.display = 'none';
          editor.style.display = 'block';
          btn.textContent = '<>/';
        }
        return;
      }

      if (cmd === 'insertImage') {
        if (imgInput) imgInput.click();
        return;
      }

      editor.focus();

      if (cmd === 'createLink') {
        var url = prompt('URL:');
        if (url) document.execCommand(cmd, false, url);
        return;
      }

      document.execCommand(cmd, false, val);
    });
  }

  function getEditorHtml(editorId) {
    var el = document.getElementById(editorId);
    var htmlView = document.getElementById(editorId.replace('editor-', 'html-'));
    if (htmlView && htmlView.style.display !== 'none') {
      return htmlView.value || '';
    }
    return el ? el.innerHTML : '';
  }

  function setEditorHtml(editorId, html) {
    var el = document.getElementById(editorId);
    if (el) el.innerHTML = html || '';
    var htmlView = document.getElementById(editorId.replace('editor-', 'html-'));
    if (htmlView) htmlView.value = html || '';
  }

  // ===== MODAL =====
  var currentEditId = null;
  var currentEditCategory = null;

  function openNewItemModal(category) {
    currentEditId = null;
    currentEditCategory = category;
    document.getElementById('modal-title-es').value = '';
    document.getElementById('modal-title-eu').value = '';
    document.getElementById('modal-mapa').value = '';
    document.getElementById('modal-mapa-data').value = '';
    document.getElementById('modal-mapa-preview').innerHTML = '';
    document.getElementById('modal-gpx-input').value = '';
    modalImages = [];
    setEditorHtml('editor-resumen-es', '');
    setEditorHtml('editor-resumen-eu', '');
    setEditorHtml('editor-es', '');
    setEditorHtml('editor-eu', '');
    document.getElementById('modal-image-preview').innerHTML = '';
    document.getElementById('modal-image-input').value = '';
    document.getElementById('modal-image-data').value = '';
    document.querySelector('#itemModal .modal-header h3').textContent =
      'Nuevo elemento - ' + categories.find(function (c) { return c.id === category; }).label_es;
    document.getElementById('itemModal').classList.add('open');
  }

  function openEditItemModal(category, id) {
    var data = getData();
    var items = data[category] || [];
    var item = items.find(function (i) { return i.id === id; });
    if (!item) return;

    currentEditId = id;
    currentEditCategory = category;
    document.getElementById('modal-title-es').value = item.title_es || '';
    document.getElementById('modal-title-eu').value = item.title_eu || '';
    document.getElementById('modal-mapa').value = item.mapa_embed || '';
    document.getElementById('modal-mapa-data').value = item.mapa_data || '';
    var mapaPreview = document.getElementById('modal-mapa-preview');
    if (item.mapa_embed) {
      mapaPreview.innerHTML = '<span style="color:#2e7d32">✓ Código de mapa incrustado</span>';
    } else if (item.mapa_data) {
      mapaPreview.innerHTML = '<span style="color:#2e7d32">✓ Archivo GPX cargado</span>';
    } else {
      mapaPreview.innerHTML = '';
    }
    document.getElementById('modal-gpx-input').value = '';
    setEditorHtml('editor-resumen-es', item.resumen_es || '');
    setEditorHtml('editor-resumen-eu', item.resumen_eu || '');
    setEditorHtml('editor-es', item.content_es || '');
    setEditorHtml('editor-eu', item.content_eu || '');
    // Load images (backward compat with single `image`)
    modalImages = item.images ? JSON.parse(JSON.stringify(item.images)) : (item.image ? [item.image] : []);
    renderGalleryPreview();
    document.getElementById('modal-image-input').value = '';
    document.querySelector('#itemModal .modal-header h3').textContent =
      'Editar - ' + categories.find(function (c) { return c.id === category; }).label_es;
    document.getElementById('itemModal').classList.add('open');
  }

  function closeModal() {
    document.getElementById('itemModal').classList.remove('open');
    currentEditId = null;
    currentEditCategory = null;
  }

  function saveModalItem() {
    var category = currentEditCategory;
    if (!category) return;

    var titleEs = document.getElementById('modal-title-es').value.trim();
    var titleEu = document.getElementById('modal-title-eu').value.trim();
    var resumenEs = getEditorHtml('editor-resumen-es').trim();
    var resumenEu = getEditorHtml('editor-resumen-eu').trim();
    var contentEs = getEditorHtml('editor-es').trim();
    var contentEu = getEditorHtml('editor-eu').trim();
    var images = modalImages.length > 0 ? modalImages : [];
    var mapaEmbed = document.getElementById('modal-mapa').value.trim();
    var mapaData = document.getElementById('modal-mapa-data').value;

    if (!titleEs) {
      alert('El título en castellano es obligatorio.');
      return;
    }

    var data = getData();
    if (!data[category]) data[category] = [];

    if (currentEditId) {
      var idx = data[category].findIndex(function (i) { return i.id === currentEditId; });
      if (idx !== -1) {
        data[category][idx].title_es = titleEs;
        data[category][idx].title_eu = titleEu;
        data[category][idx].resumen_es = resumenEs;
        data[category][idx].resumen_eu = resumenEu;
        data[category][idx].mapa_embed = mapaEmbed;
        data[category][idx].mapa_data = mapaData;
        data[category][idx].content_es = contentEs;
        data[category][idx].content_eu = contentEu;
        if (images.length) {
          data[category][idx].images = images;
          data[category][idx].image = images[0];
        }
        data[category][idx].updated = new Date().toISOString();
      }
    } else {
      data[category].push({
        id: Date.now(),
        title_es: titleEs,
        title_eu: titleEu,
        resumen_es: resumenEs,
        resumen_eu: resumenEu,
        mapa_embed: mapaEmbed,
        mapa_data: mapaData,
        content_es: contentEs,
        content_eu: contentEu,
        images: images,
        image: images.length ? images[0] : '',
        visible: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      });
    }

    saveData(data);
    closeModal();
    renderTable(category);
    updateStats();
  }

  // ===== IMAGE HANDLING (multi) =====
  var modalImages = [];

  function renderGalleryPreview() {
    var preview = document.getElementById('modal-image-preview');
    if (!preview) return;
    if (modalImages.length === 0) {
      preview.innerHTML = '';
      document.getElementById('modal-image-data').value = '';
      return;
    }
    var html = '';
    modalImages.forEach(function (src, i) {
      html += '<div class="thumb-wrap"><img src="' + src + '" alt="Img ' + (i+1) + '"><button class="thumb-del" data-idx="' + i + '" type="button">✕</button></div>';
    });
    preview.innerHTML = html;
    document.getElementById('modal-image-data').value = JSON.stringify(modalImages);
    // Delete handlers
    preview.querySelectorAll('.thumb-del').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var idx = parseInt(this.dataset.idx, 10);
        modalImages.splice(idx, 1);
        renderGalleryPreview();
      });
    });
  }

  function handleImageUpload(inputId, dataId, previewId) {
    var input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('change', function () {
      var files = Array.from(this.files);
      if (files.length === 0) return;

      var pending = files.length;
      files.forEach(function (file) {
        if (!file.type.match('image.*')) {
          alert('"' + file.name + '" no es un archivo de imagen.');
          pending--;
          if (pending === 0) renderGalleryPreview();
          return;
        }
        var reader = new FileReader();
        reader.onload = function (e) {
          modalImages.push(e.target.result);
          pending--;
          if (pending === 0) renderGalleryPreview();
        };
        reader.readAsDataURL(file);
      });
      this.value = '';
    });
  }

  // ===== GPX UPLOAD =====
  function handleGpxUpload() {
    var input = document.getElementById('modal-gpx-input');
    if (!input) return;

    input.addEventListener('change', function () {
      var file = this.files[0];
      if (!file) return;
      if (!file.name.match(/\.gpx$/i)) {
        alert('Selecciona un archivo .gpx.');
        return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        document.getElementById('modal-mapa-data').value = e.target.result;
        document.getElementById('modal-mapa-preview').innerHTML = '<span style="color:#2e7d32">✓ Archivo GPX cargado (' + file.name + ')</span>';
      };
      reader.readAsDataURL(file);
    });
  }

  // ===== DELETE ITEM =====
  function deleteItem(category, id) {
    if (!confirm('¿Estás seguro de eliminar este elemento?')) return;
    var data = getData();
    data[category] = (data[category] || []).filter(function (i) { return i.id !== id; });
    saveData(data);
    renderTable(category);
    updateStats();
  }

  // ===== DUPLICATE ITEM =====
  function duplicateItem(category, id) {
    var data = getData();
    var items = data[category] || [];
    var original = items.find(function (i) { return i.id === id; });
    if (!original) return;

    var copy = JSON.parse(JSON.stringify(original));
    copy.id = Date.now();
    copy.title_es = original.title_es + ' (copia)';
    copy.title_eu = original.title_eu ? original.title_eu + ' (kopia)' : '';
    copy.created = new Date().toISOString();
    copy.updated = new Date().toISOString();

    items.push(copy);
    saveData(data);
    renderTable(category);
    updateStats();
  }

  // ===== TOGGLE VISIBILITY =====
  function toggleVisibility(category, id) {
    var data = getData();
    var items = data[category] || [];
    var item = items.find(function (i) { return i.id === id; });
    if (!item) return;
    item.visible = item.visible === false ? true : false;
    item.updated = new Date().toISOString();
    saveData(data);
    renderTable(category);
    updateStats();
  }

  // ===== RENDER TABLE =====
  function renderTable(category) {
    var tbody = document.getElementById('table-' + category);
    if (!tbody) return;

    var data = getData();
    var items = data[category] || [];

    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-row">No hay elementos. Crea el primero.</td></tr>';
      return;
    }

    var catLabel = categories.find(function (c) { return c.id === category; }).label_es;
    var html = '';
    items.forEach(function (item) {
      var date = item.updated ? new Date(item.updated).toLocaleDateString() : '-';
      var visible = item.visible !== false;
      var eyeIcon = visible ? '👁️' : '🚫';
      var eyeTitle = visible ? 'Ocultar' : 'Mostrar';
      html += '<tr class="' + (visible ? '' : 'row-hidden') + '">' +
        '<td><strong>' + escapeHtml(item.title_es) + '</strong>' +
        (item.title_eu ? '<br><small>' + escapeHtml(item.title_eu) + '</small>' : '') +
        '</td>' +
        '<td>' + catLabel + '</td>' +
        '<td>' + date + '</td>' +
        '<td class="actions-cell">' +
        '<button class="btn-icon btn-visibility" onclick="backApp.toggleVisibility(\'' + category + '\',' + item.id + ')" title="' + eyeTitle + '">' + eyeIcon + '</button>' +
        '<button class="btn-icon btn-edit" onclick="backApp.editItem(\'' + category + '\',' + item.id + ')" title="Editar">✏️</button>' +
        '<button class="btn-icon btn-duplicate" onclick="backApp.duplicateItem(\'' + category + '\',' + item.id + ')" title="Duplicar">📋</button>' +
        '<button class="btn-icon btn-delete" onclick="backApp.deleteItem(\'' + category + '\',' + item.id + ')" title="Eliminar">🗑️</button>' +
        '</td>' +
        '</tr>';
    });
    tbody.innerHTML = html;
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ===== STATS =====
  function updateStats() {
    var data = getData();
    categories.forEach(function (c) {
      var count = (data[c.id] || []).length;
      var el = document.getElementById('stat-' + c.id);
      if (el) el.textContent = count;
    });
    var total = 0;
    categories.forEach(function (c) { total += (data[c.id] || []).length; });
    var el = document.getElementById('stat-total');
    if (el) el.textContent = total;
  }

  // ===== CATEGORY TABS IN BACK =====
  function initCategoryTabs() {
    var tabs = document.querySelectorAll('.cat-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var cat = this.dataset.cat;
        tabs.forEach(function (t) { t.classList.remove('active'); });
        this.classList.add('active');
        document.querySelectorAll('.cat-panel').forEach(function (p) { p.classList.remove('active'); });
        var panel = document.getElementById('panel-' + cat);
        if (panel) panel.classList.add('active');
        renderTable(cat);
      });
    });
  }

  // ===== SAMPLES =====
  function loadSampleData() {
    var data = getData();
    var hasContent = categories.some(function (c) { return (data[c.id] || []).length > 0; });
    if (hasContent) {
      if (!confirm('Ya hay contenido. ¿Sobrescribir con datos de muestra?')) return;
    }

    data = getDefaultData();

    data.patrimonio = [
      { id: 1, title_es: 'Iglesia Andra Mari', title_eu: 'Andra Mari Eliza', subtitle_es: '"Una joya en el pueblo"', subtitle_eu: '"Herriko bitxi bat"', siglo_es: 'XVI', estilo_es: 'Gótico tardío', localizacion_es: 'Goikoa', ruta_es: 'Ruta 3',
        resumen_es: '<p>Edificio gótico del s. XVI considerado una de las iglesias más destacables de Bizkaia. Situada en el barrio de La Campa, fue el centro social del pueblo durante siglos.</p>',
        resumen_eu: '<p>XVI. mendeko eliza gotikoa, Bizkaiko eliza nabarmenetakotzat joa. La Campa auzoan kokatua, mendeetan zehar herriko gune soziala izan zen.</p>',
        content_es: '<p>Este edificio está considerado como una de las iglesias más destacables del gótico en la provincia de Bizkaia, siendo el edificio histórico mejor conservado de nuestro pueblo.</p><p>Está situado en el barrio de La Campa, en donde además está el antiguo ayuntamiento, escuelas y cementerio, puesto que este núcleo de poblacional fue el centro del pueblo hasta comienzos del s. XX, cuando en el barrio de Altzaga se inicie el desarrollo industrial.</p><p>El origen de nuestro pueblo está ligado al de la iglesia, de hecho la primera documentación al respecto de nuestro municipio habla de la anteiglesia de Santa María de Erandio. Por aquellos tiempos tardomedievales no había diferencias entre lo civil y lo religioso, de hecho en un primer momento la documentación municipal se archivaba en la propia iglesia. Además de las funciones eclesiásticas, alrededor del edificio se hacían reuniones, se informaba de bandos y se hacían llamamientos de la justicia. En definitiva era el centro social del pueblo, a donde se iba para relacionarse con el resto de vecinos y en donde se veía y se demostraba el poder la ostentación de las diferentes familias, de este modo las familias más poderosas del pueblo se sentaban adelante en las litúrgicas, y el resto del pueblo lo hacía en la parte de atrás.</p><p>La iglesia ya debía de existir alrededor de 1300, aunque el edificio actual es un templo gótico de finales de s. XV, de 1490 aproximadamente, aunque las reformas del crucero y la cabecera datan del s. XVII, finalizándose en 1678, de mano del cantero Juan de Setien.</p><p>La iglesia se ordena mediante tres naves escalonadas y cuatro tramos más el de crucero y la capilla mayor. En las bóvedas se pueden apreciar el sistema de nervios, típicos del gótico. El edificio tiene la que posiblemente sea la campana más antigua de toda Bizkaia, que data de alrededor de 1500, contemporánea a la propia pila bautismal, así como un campanario que tiene aspecto de torre militar y en algunos libros lo han llegado a confundir.</p><p>Las tres portadas de la Iglesia son también góticas, donde se aprecian las arquivoltas y las columnillas acodilladas con capiteles lisos, y la torre del campanario.</p><p>El sepulcro de Martin Ortiz de Martiartu y de su esposa está en un arcosolio apuntado vaciado en el muro de los pies. Este sepulcro tiene ciertos aspectos y estética anteriores a la construcción del templo, por lo que es probable que fueran trasladados al mismo de algún otro lugar.</p>',
        content_eu: '<p>Edificio hau Bizkaia probintziako eliza gotiko nabarmenetako bat da, gure herriko eraikin historikorik ondoen kontserbatua.</p><p>La Campa auzoan dago, non udaletxe zaharra, eskolak eta hilerria ere badauden, biztanleria nukleo hau herriko erdigunea izan baitzen XX. mende hasiera arte, Altzaga auzoan garapen industriala hasi zen arte.</p><p>Gure herriaren jatorria elizarekin lotuta dago, gure udalaren lehen dokumentazioak Erandioko Santa Maria elizaurreaz hitz egiten baitu.</p>',
        images: ['img/Iglesia Andra Mari.jpg'], image: 'img/Iglesia Andra Mari.jpg', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() },
      { id: 2, title_es: 'Torre de Martiartu', title_eu: 'Martiartu Dorrea', subtitle_es: '"Esencia de la época feudal"', subtitle_eu: '"Garai feudalaren funtsa"', siglo_es: 'XVI', estilo_es: 'Renacimiento', localizacion_es: 'Goierri', ruta_es: 'Ruta 4',
        resumen_es: '<p>Torre del s. XVI situada en el barrio de Goierri. Fue residencia de la familia Martiartu y controlaba las rutas entre Plentzia y Bilbao. Edificio clave del Erandio preindustrial.</p>',
        resumen_eu: '<p>XVI. mendeko dorrea Goierri auzoan. Martiartu familiaren bizilekua izan zen eta Plentzia eta Bilboko bideak kontrolatzen zituen. Erandio industrial aurreko eraikin giltzarria.</p>',
        content_es: '<p>Junto con la Iglesia de Santa María, en el barrio de la Campa, la torre de Martiartu, situado en la ladera del monte Umbe, en el barrio de Goierri, son los edificios más significativos del Erandio preindustrial.</p><p>Las casas torres, las torres banderizas, forman parte de la esencia de la época feudal en Bizkaia, que tejerá durante varios siglos la historia del Pais Vasco. En el caso de la torre de Martiartu, que tiene un carácter tanto residencial como defensivo, desde su construcción, hasta su abandono, casi siempre estuvo habitada. La torre estaba en un lugar estratégico controlando las rutas entre Plentzia y Bilbao, así como algunas del interior.</p><p>Anteriormente al edificio construido en piedra, parece ser que hubo primeramente otro hecho de madera que pudo haber sido destruido en los enfrentamientos banderizos. Será Martín Ortiz de Martiartu, hijo de Diego Pérez de Martiartu, apodado "El Viejo", quien construya la primeriza torre de piedra a finales del s. XIV o principios del s. XV, puesto que sabemos que Martín Ortiz muere en 1415.</p><p>La construcción de esta nueva torre de piedra, de la que se conservan los muros correspondientes a las dos primeras plantas de la fachada sur y la mitad de los orientados a este y oeste, conllevaba consigo una cierta ventaja militar sobre otras familias, así como el ostentar cierto poder económico y social, lo que suponía un mayor peso político dentro del sistema feudal de la zona.</p><p>La torre se destruirá en 1472, ya que Ochoa Ortiz de Guecho y Martiartu había apoyado al Conde de Haro que, habiendo respaldado al legítimo monarca Enrique IV, pretendía hacer valer su poder sobre los linajes vizcaínos para que reconocieran a Juana "La Beltraneja". Los partidarios del Conde de Haro son derrotados por los partidarios de los Reyes Católicos y, como consecuencia, la torre de los Martiartu es destruida.</p><p>De este modo, durante varios años la torre estará abandonada, lo cual hizo que se pudiera haber producido saqueos y robo de material, hasta que en 1488, Diego Perez de Martiartu, hijo de Ochoa Ortiz, reclama su reconstrucción, pide "remedio con justicia de manera que las dichas torres le fuesen fechas o le fuesen pagadas [...]".</p><p>No sabemos si finalmente empezaría una nueva obra o no, puesto que la mayor parte de la actual torre de hoy en día, proviene del s. XVI (el levantamiento prácticamente de un cubo de sillería, integrando elementos renacentistas, como la crestería de remate, y tardomediaveles, como los vanos conopiales), pero sí que sabemos que Martin Ortiz de Martiartu, hijo de Diego Pérez, va a ser el encargado de reparar la torre finalmente, cuyo carácter militar se ve reforzado con muros más gruesos y vanos que dotan de menos luz.</p><p>Con el paso del tiempo, y con el cambio de intereses, negocios y vida social, las ciudades empezarán a coger cierta importancia dejando estas zonas como centros de producción agrícola para intereses de los señores, que irán disminuyendo. De este modo, la torre a principios del s. XIX es arrendadada. Finalmente Isidro Aretxabaleta y Mota, vende la ermita y la torre, en 1948, al Ayuntamiento de Bilbao, que llega a un acuerdo con la familia. Poco tiempo después el consistorio hará unas obras de restauración que finalizan en 1954.</p>',
        content_eu: '<p>Santa Maria elizarekin batera, La Campa auzoan, Martiartu dorrea, Umbe mendiaren magalean kokatua, Goierri auzoan, Erandio industrial aurreko eraikin esanguratsuenak dira.</p><p>Dorre etxeak, banderizoen dorreak, Bizkaian garai feudalaren funtsaren parte dira, Euskal Herriko historia ehuntzen dutenak mendeetan zehar.</p>',
        image: 'img/Torre de Martiartu (patrimonio).jpg', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() },
      { id: 3, title_es: 'Lavadero de Tartanga', title_eu: 'Tartangako Garbitegia', subtitle_es: '"Icono de la condición proletaria e industrial del barrio de Altzaga"', subtitle_eu: '"Altzaga auzoko baldintza proletario eta industrialaren ikonoa"', siglo_es: 'XIX', estilo_es: 'Ecléctico', localizacion_es: 'Altzaga', ruta_es: 'Ruta 1',
        resumen_es: '<p>Lavadero público construido en 1893 por Casto de Zabala. Es el único lavadero de este tipo conservado en los municipios de la ría del Nervión, icono de la condición industrial de Altzaga.</p>',
        resumen_eu: '<p>Casto de Zabalaren eskutik 1893an eraikitako garbitegi publikoa. Nervión itsasadarraren udalerrietan mota honetako kontserbatutako garbitegi bakarra, Altzagako baldintza industrialaren ikonoa.</p>',
        content_es: '<p>Representa el cambio en las medidas higiénico-sanitarias en Erandio. La última epidemia de cólera que se vivió en la zona tuvo lugar a finales del siglo XIX. Había que cambiar las medidas higiénicas de la población y, por ello, el ayuntamiento construyó este lavadero de ropa, de la mano del maestro de obras Casto de Zabala, en 1893. Tiene como elemento destacado las guardamalletas que protegen su fachada principal, convirtiéndose en uno de los únicos lavaderos que conservan este elemento.</p><p>Lavar la ropa fue una de tantas medidas encaminadas a la mejora en los hábitos de salubridad de las y los habitantes, acción que era imposible dado el limitado suministro de aguas. Además, era una de las pocas fuentes en el barrio donde se podía coger agua potable, ya que el barrio con las continuas inundaciones que sufría con las pleamares hacía que el agua tuviera altas concentraciones de salinidad. El lavadero tendrá esta función hasta prácticamente la década de 1970.</p><p>Es uno de los iconos para entender la condición proletaria e industrial del barrio de Altzaga. Actualmente es el único lavadero de este tipo a lo largo de los municipios de la ría del Nervión, que se ha conservado prácticamente igual que cuando se construyó, y que surge en el contexto de la industrialización en la margen derecha de la ría.</p>',
        content_eu: '<p>Erandion neurri higieniko-sanitarioen aldaketa adierazten du. Zonako azken kolera epidemia XIX. mende amaieran izan zen. Biztanleriaren neurri higienikoak aldatu behar ziren eta, horregatik, udalak arropa garbitegi hau eraiki zuen, Casto de Zabalaren eskutik, 1893an.</p>',
        image: 'img/Lavadero de Tartanga.jpg', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() },
      { id: 4, title_es: 'Grupo de Viviendas "La Esperanza" – Casas Baratas', title_eu: '"La Esperanza" Etxebizitza Multzoa – Etxe Merkeak', subtitle_es: '"Arquitectura Industrial"', subtitle_eu: '"Arkitektura Industriala"', siglo_es: '1926', estilo_es: 'Neovasco', localizacion_es: 'Altzaga', ruta_es: 'Ruta 1',
        resumen_es: '<p>Conjunto de viviendas obreras de 1926 diseñadas por Ángel Líbano en estilo neovasco. Ejemplo del modelo inglés de ciudades jardín y respuesta a la falta de vivienda obrera.</p>',
        resumen_eu: '<p>1926ko langile-etxebizitza multzoa, Ángel Libanok estilo neovascoan diseinatua. Lorategi hirien ingeles modeloaren adibidea eta langile etxebizitza faltaren erantzuna.</p>',
        content_es: '<p>Proyectadas en 1923 en régimen de cooperativa por un grupo de socios que trabajaban en la Sociedad Española de Construcciones Navales y diseñadas por el arquitecto municipal Ángel Líbano en estilo neovasco. Destacan sus entramados ficticios que recorren las fachadas principales, los zócalos de mampostería vista, el colorido, así como el acceso principal a modo de portalón. Este edificio de casa evidencia en lo urbanismo el modelo inglés de las ciudades jardín, así como el centroeuropeo de las "siendlung".</p><p>Conocidas popularmente como "casas baratas", son consecuencia de los problemas de hacinamiento y falta de vivienda obrera que se estaba produciendo en Erandio desde finales del siglo XIX. No es casualidad que se hicieran en un alto, para evitar las pleamares de la ría.</p>',
        content_eu: '<p>1923an projektatuak, kooperatiba erregimenean, Sociedad Española de Construcciones Navalesen lan egiten zuten bazkide talde batek eta Ángel Líbano arkitekto udalerrikoak diseinatuak estilo neovascoan.</p>',
        image: 'img/Casas Baratas.jpg', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() },
      { id: 5, title_es: 'Restos de Molinos Harineros de Agua', title_eu: 'Ur Errota Haien Hondarrak', subtitle_es: '"Unión entre la fuerza de la naturaleza y el ingenio humano"', subtitle_eu: '"Naturaren indarra eta giza asmamenaren arteko batasuna"', siglo_es: 'XVII', estilo_es: '', localizacion_es: 'Goierri y Asua', ruta_es: '',
        resumen_es: '<p>Erandio contó con entre 7 y 8 molinos de agua documentados entre los s. XVII y XVIII, principalmente en Goierri y Asua. Representan la unión entre la fuerza de la naturaleza y el ingenio humano.</p>',
        resumen_eu: '<p>Erandiok 7 eta 8 ur-errota dokumentatu zituen XVII eta XVIII. mendeen artean, batez ere Goierri eta Asuan. Naturaren indarra eta giza asmamenaren arteko batasuna adierazten dute.</p>',
        content_es: '<p>Desde que alcanzaran un notable esplendor en época romana, los molinos de agua fueron una de las principales fuentes de abastecimiento de energía hidráulica, para la producción ferrera y para la molienda de granos, durante toda la Edad Media, llegando muchos a funcionar hasta el siglo XX, en Bizkaia.</p><p>Aunque tenemos datos de molinos en Erandio desde el s.XVII, con toda seguridad existieron desde mucho tiempo antes. En la Edad Media, el monopolio de los molinos de agua estaba dominado principalmente por los señores de Asua y Martiartu, los dos linajes más importantes de la época en el pueblo.</p><p>Las primeras informaciones que tenemos de los molinos en Erandio están relacionadas sobre diferentes arrendamientos, que en el s. XVIII oscilarán en torno a los 100 ducados anuales. De este modo, habrá entre 7 y 8 molinos documentados, entre la mitad del s XVII y finales del s. XVIII.</p><p>Actualmente donde sabemos que hubo algún molino de agua en Erandio suele haber un caserío, que a veces lleva el nombre del antiguo molino que recogen las fuentes. De los ocho molinos que sabemos que existieron en Erandio, 7 están localizados en el barrio de Gohierri, de los cuales 6 están en arroyos pertenecientes a la cuenca del Gobela, 1 a la cuenca del Udondo, y 1 en el barrio de Asúa, cuyas aguas nutrían el río Asua.</p><p>Respecto al molino de Asúa, se trata del Molino de Leura que aparece en las fuentes en 1582. En el s.XIX, el molino ocupaba una extensión aproximada de 753 m2, de los que la casa-molino ocupaba unos 350. El último molinero fue Vicente Gaztañaga, que desde su fallecimiento, en 1955, el molino dejó de funcionar.</p><p>En lo que confiere a los molinos de Gohierri, la mayoría se situaban en el arroyo Urederra (en algunos textos aparece como Azkaiturri o Ascaiturri), que desemboca a su vez en el arroyo Bolue.</p>',
        content_eu: '<p>Erromatar garaian distira nabarmena lortu zutenetik, ur-errotak energia hidraulikoaren hornidura iturri nagusietako bat izan ziren, burdina ekoizpenerako eta aleak ehotzeko, Erdi Aro osoan, askok XX. mendera arte funtzionatu zutelarik Bizkaian.</p>',
        image: 'img/Molinos de Agua 2.jpg', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() },
      { id: 6, title_es: 'Humedal de Astrabudua', title_eu: 'Astrabuduako Hezegunea', subtitle_es: '"Variedad en fauna y flora"', subtitle_eu: '"Fauna eta flora aniztasuna"', siglo_es: '', estilo_es: '', localizacion_es: 'Astrabudua', ruta_es: '',
        resumen_es: '<p>Espacio natural protegido en los límites de Astrabudua con Leioa. Cuenta con una enorme variedad de especies animales y vegetales, autóctonas e invasoras.</p>',
        resumen_eu: '<p>Astrabudua eta Leioaren mugan dagoen babestutako gune naturala. Animali eta landare espezie aniztasun handia du, bertakoak eta inbaditzaileak.</p>',
        content_es: '<p>Ubicado en los límites de Astrabudua con Leioa, el humedal de Astrabudua cuenta con una enorme variedad de especies animales y vegetales.</p><p>En este espacio presentaremos la amplia variedad de especies, identificando las autóctonas e invasoras, definiendo el estado de conservación de algunas de las especies actuales y recordaremos alguna de las especies actualmente desaparecidas del humedal.</p>',
        content_eu: '<p>Astrabudua eta Leioaren mugan kokatua, Astrabuduako hezeguneak animalia eta landare espezie aniztasun handia du.</p>',
        image: 'img/Humedal de Astrabudua.jpg', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() }
    ];

    data.rutas = [
      { id: 101, title_es: 'Ruta del Nervión', title_eu: 'Nervión Ibilbidea', content_es: '<p>Recorrido por la ribera del Nervión, desde el puente de Erandio hasta la desembocadura. Ideal para pasear, correr o ir en bicicleta mientras disfrutas de las vistas al río y la ría.</p><p class="ruta-meta"><span>🚶 5 km</span><span>⏱ 1.5 h</span><span>🟢 Fácil</span></p>', content_eu: '<p>Nervión ibaiaren ertzeko ibilbidea, Erandioko zubitik itsasoraino. Paseatzeko, korrika egiteko edo bizikletaz ibiltzeko aproposa, ibaiaren eta itsasadarraren bistez gozatzen duzun bitartean.</p><p class="ruta-meta"><span>🚶 5 km</span><span>⏱ 1.5 h</span><span>🟢 Erraza</span></p>', image: 'img/Ruta 1.jpg', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() },
      { id: 102, title_es: 'Ruta de los Molinos', title_eu: 'Erroten Ibilbidea', content_es: '<p>Sendero que recorre los antiguos molinos de agua de Erandio, adentrándose en frondosos bosques y pequeños arroyos. Una ruta cargada de historia industrial y belleza natural.</p><p class="ruta-meta"><span>🚶 8 km</span><span>⏱ 2.5 h</span><span>🟡 Media</span></p>', content_eu: '<p>Erandioko ur-errota zaharrak zeharkatzen dituen bidea, baso oparo eta erreka txikietan barrena. Industria historia eta edertasun natural betetako ibilbidea.</p><p class="ruta-meta"><span>🚶 8 km</span><span>⏱ 2.5 h</span><span>🟡 Ertaina</span></p>', image: 'img/Ruta 2.jpg', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() },
      { id: 103, title_es: 'Ruta del Humedal de Astrabudua', title_eu: 'Astrabuduako Hezegunearen Ibilbidea', content_es: '<p>Recorrido circular alrededor del humedal de Astrabudua, un espacio protegido donde observar aves migratorias y disfrutar de la tranquilidad de la naturaleza.</p><p class="ruta-meta"><span>🚶 3 km</span><span>⏱ 1 h</span><span>🟢 Fácil</span></p>', content_eu: '<p>Astrabuduako hezegunearen inguruko ibilbide zirkularra, hegazti migratzaileak behatu eta naturaren lasaitasunez gozatzeko babestutako gunea.</p><p class="ruta-meta"><span>🚶 3 km</span><span>⏱ 1 h</span><span>🟢 Erraza</span></p>', image: 'img/Ruta 3.jpg', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() },
      { id: 104, title_es: 'Ruta de los Caseríos', title_eu: 'Baserrien Ibilbidea', content_es: '<p>Itinerario por los antiguos caseríos de Erandio, descubriendo la arquitectura rural vasca y las historias de sus habitantes. Perfecta para los amantes de la etnografía.</p><p class="ruta-meta"><span>🚶 6 km</span><span>⏱ 2 h</span><span>🟢 Fácil</span></p>', content_eu: '<p>Erandioko antzinako baserrietako ibilbidea, euskal baserri arkitektura eta bertako biztanleen istorioak ezagutzeko. Etnografiaren zaleentzat aproposa.</p><p class="ruta-meta"><span>🚶 6 km</span><span>⏱ 2 h</span><span>🟢 Erraza</span></p>', image: 'img/Ruta 4.jpg', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() },
      { id: 105, title_es: 'Ruta del Monte Fano', title_eu: 'Fano Mendiko Ibilbidea', content_es: '<p>Ascenso al monte Fano, con impresionantes vistas panorámicas de Erandio y la ría de Bilbao. Una ruta exigente pero gratificante para los amantes del senderismo.</p><p class="ruta-meta"><span>🚶 10 km</span><span>⏱ 3.5 h</span><span>🔴 Difícil</span></p>', content_eu: '<p>Fano mendirako igoera, Erandio eta Bilboko itsasadarraren bista panoramiko ikusgarriekin. Ibilbide zorrotza baina aberasgarria mendizaleentzat.</p><p class="ruta-meta"><span>🚶 10 km</span><span>⏱ 3.5 h</span><span>🔴 Zaila</span></p>', image: 'img/Ruta 5.jpeg', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() },
      { id: 106, title_es: 'Ruta Urbana: Erandio Centro', title_eu: 'Ibilbide Urbanoa: Erandio Erdialdea', content_es: '<p>Recorrido por el casco urbano de Erandio, visitando sus plazas, iglesias, edificios históricos y el mercado municipal. Ideal para conocer la vida local.</p><p class="ruta-meta"><span>🚶 4 km</span><span>⏱ 1.5 h</span><span>🟢 Fácil</span></p>', content_eu: '<p>Erandioko hiri-guneko ibilbidea, bere plazak, elizak, eraikin historikoak eta udal merkatua bisitatuz. Tokiko bizitza ezagutzeko aproposa.</p><p class="ruta-meta"><span>🚶 4 km</span><span>⏱ 1.5 h</span><span>🟢 Erraza</span></p>', image: 'img/Ruta 6.jpg', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() }
    ];

    data['donde-comer'] = [
      { id: 7, title_es: 'Bar Etxegorri', title_eu: 'Etxegorri Taberna', content_es: '<p>Bar tradicional con pintxos y cocina vasca. Especialidad en tortillas y raciones. Ambiente familiar y acogedor.</p>', content_eu: '<p>Taberna tradizionala pintxo eta euskal sukaldaritzarekin. Tortilla eta errazioetan espezializatua. Familia giro atsegina.</p>', image: 'img/Bar Etxegorri.jpg', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() },
      { id: 8, title_es: 'Palacio Torre de Arriaga', title_eu: 'Arriaga Dorre Jauregia', content_es: '<p>Restaurante de alta cocina en un palacio del siglo XVII. Cocina tradicional vasca con toques de autor.</p>', content_eu: '<p>Sukalde goi mailako jatetxea XVII. mendeko jauregi batean. Euskal sukaldaritza tradizionala egile ukituarekin.</p>', image: 'img/Palacio Torre de Arriaga.jpeg', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() },
      { id: 9, title_es: 'Club Euskadi Gastronomika', title_eu: 'Euskadi Gastronomika Kluba', content_es: '<p>Asociación gastronómica que promueve la cocina vasca. Organiza eventos, catas y cursos de cocina.</p>', content_eu: '<p>Euskal sukaldaritza sustatzen duen elkarte gastronomikoa. Ekitaldiak, dastaketak eta sukaldaritza ikastaroak antolatzen ditu.</p>', image: 'img/CLUB_EUSKADI_GASTRONOMIKA.jpg', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() }
    ];

    data['donde-dormir'] = [
      { id: 10, title_es: 'Bilbao Nature Aston Rentals', title_eu: 'Bilbao Nature Aston Rentals', content_es: '<p>Alojamiento rural con encanto, rodeado de naturaleza. Habitaciones amplias y confortables con vistas espectaculares.</p>', content_eu: '<p>Naturaz inguratutako landa-ostatu xarmagarria. Gela zabal eta erosoak, bista ikusgarriekin.</p>', image: 'img/Bilbao Nature Aston Rentals.jpg', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() },
      { id: 11, title_es: 'Apartamento Kuia', title_eu: 'Kuia Apartamentua', content_es: '<p>Apartamento turístico totalmente equipado en el centro de Erandio. Ideal para parejas o pequeños grupos.</p>', content_eu: '<p>Erandioko erdialdean guztiz ekipatutako turismo apartamentua. Bikote edo talde txikientzako aproposa.</p>', image: 'img/Apartamento Kuia.jpg', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() },
      { id: 12, title_es: 'Paratene', title_eu: 'Paratene', content_es: '<p>Casa rural con encanto, perfecta para desconectar. Dispone de jardín, piscina y barbacoa.</p>', content_eu: '<p>Nekazaritza etxe xarmagarria, deskonektatzeko aproposa. Lorategia, igerilekua eta barbakoa ditu.</p>', image: 'img/paratene.jpg', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() },
      { id: 13, title_es: 'Arribeiti Zarra', title_eu: 'Arribeiti Zarra', content_es: '<p>Antiguo caserío restaurado convertido en alojamiento rural. Ambiente tradicional y todas las comodidades modernas.</p>', content_eu: '<p>Zaharberritutako baserri ohia, landa-ostatu bihurtua. Giro tradizionala eta erosotasun moderno guztiak.</p>', image: 'img/Arribeiti Zarra.jpg', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() },
      { id: 14, title_es: 'Nebarrebak', title_eu: 'Nebarrebak', content_es: '<p>Acogedor alojamiento rural con impresionantes vistas al valle. Ideal para escapadas románticas.</p>', content_eu: '<p>Landako ostatu atsegina, haranaren bista ikusgarriekin. Ihesaldi erromantikoetarako aproposa.</p>', image: 'img/Nebarrebak.jpg', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() }
    ];

    data['donde-comprar'] = [
      { id: 15, title_es: 'Mercado Municipal', title_eu: 'Udal Merkatua', content_es: '<p>Mercado de abastos con productos frescos locales. Carnicería, pescadería, frutería y productos típicos vascos.</p>', content_eu: '<p>Produktu freskoen merkatu传统a. Harategia, arrandegia, frutategia eta ohiko euskal produktuak.</p>', image: '', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() },
      { id: 16, title_es: 'Comercio Local', title_eu: 'Tokiko Merkataritza', content_es: '<p>Variadas tiendas de proximidad en el centro de Erandio: moda, regalos, hogar y más.</p>', content_eu: '<p>Erandioko erdialdean hurbileko denda anitzak: moda, opariak, etxea eta gehiago.</p>', image: '', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() }
    ];

    data.eventos = [
      { id: 17, title_es: 'Erandio Folk', title_eu: 'Erandio Folk', content_es: '<p>Festival de música folk que reúne a artistas locales e internacionales. Conciertos, talleres y actividades para toda la familia.</p>', content_eu: '<p>Tokiko eta nazioarteko artistak biltzen dituen folk musika jaialdia. Kontzertuak, tailerrak eta familia osorako jarduerak.</p>', image: 'img/Erandio Folk.jpeg', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() },
      { id: 18, title_es: 'Putxeras', title_eu: 'Putxerak', content_es: '<p>Concurso de putxeras (pucheros) donde los participantes cocinan al aire libre. Tradición y gastronomía se dan la mano.</p>', content_eu: '<p>Putxera lehiaketa, parte-hartzaileek aire librean prestatzen dutena. Tradizioa eta gastronomia bat egiten dute.</p>', image: 'img/putxeras.jpeg', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() },
      { id: 19, title_es: 'Festival Intercultural Alasni', title_eu: 'Alasni Kulturarteko Jaialdia', content_es: '<p>Festival que celebra la diversidad cultural con música, danza, gastronomía y talleres de diferentes países.</p>', content_eu: '<p>Aniztasun kulturala ospatzen duen jaialdia, musika, dantza, gastronomia eta herrialde ezberdinetako tailerrekin.</p>', image: 'img/Festival Intercultural Alasni.jpg', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() },
      { id: 20, title_es: 'Erandio Magikoan', title_eu: 'Erandio Magikoan', content_es: '<p>Festival de magia que llena las calles de Erandio de ilusionismo, espectáculos y talleres para niños y adultos.</p>', content_eu: '<p>Magia jaialdiak Erandioko kaleak ilusionismoz, ikuskizunez eta haur eta helduentzako tailerrez betetzen ditu.</p>', image: 'img/Erandio Magikoan.jpg', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() },
      { id: 21, title_es: 'Musikalean', title_eu: 'Musikalean', content_es: '<p>Ciclo de conciertos al aire libre durante el verano. Música de diversos géneros en espacios emblemáticos de Erandio.</p>', content_eu: '<p>Udan aire libreko kontzertu zikloa. Hainbat generotako musika Erandioko leku enblematikoetan.</p>', image: 'img/musikalean.jpg', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() }
    ];

    data.fiestas = [
      { id: 22, title_es: 'Fiestas de Andra Mari', title_eu: 'Andra Mari Jaiak', content_es: '<p>Fiestas patronales en honor a Andra Mari (septiembre). Conciertos, ferias, deportes rurales y actividades para todos.</p>', content_eu: '<p>Andra Mariren omenezko jaiak (iraila). Kontzertuak, feriak, herri kirolak eta guztientzako jarduerak.</p>', image: '', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() },
      { id: 23, title_es: 'Fiestas de Goierri', title_eu: 'Goierriko Jaiak', content_es: '<p>Fiestas del barrio de Goierri con actividades tradicionales, verbenas, concursos y gastronomía local.</p>', content_eu: '<p>Goierri auzoko jaiak, ohiko jarduerekin, berbena, lehiaketa eta tokiko gastronomiarekin.</p>', image: '', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() },
      { id: 24, title_es: 'Fiestas de Astrabudua', title_eu: 'Astrabuduako Jaiak', content_es: '<p>Fiestas del barrio marinero de Astrabudua. Destacan la regata de traineras y la sardina asada.</p>', content_eu: '<p>Astrabuduako auzo arrantzalearen jaiak. Traineru estropada eta sardina erreak nabarmentzen dira.</p>', image: 'img/Astrabudua.jpg', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() },
      { id: 25, title_es: 'Fiestas de Lutxana', title_eu: 'Lutxanako Jaiak', content_es: '<p>Fiestas del barrio de Lutxana con actividades para todas las edades, conciertos y competiciones deportivas.</p>', content_eu: '<p>Lutxana auzoko jaiak, adin guztientzako jarduerekin, kontzertuekin eta kirol lehiaketekin.</p>', image: 'img/Lutxana.jpg', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() },
      { id: 26, title_es: 'Fiestas de Arriaga', title_eu: 'Arriagako Jaiak', content_es: '<p>Fiestas populares del barrio de Arriaga con comidas populares, juegos infantiles y actuaciones musicales.</p>', content_eu: '<p>Arriaga auzoko jai herrikoiak, herri bazkari, haur jolas eta musika emanaldiekin.</p>', image: 'img/Arriaga.jpg', visible: true, created: new Date().toISOString(), updated: new Date().toISOString() }
    ];

    // Copy full content to resumen fields and empty contenido completo for all items
    categories.forEach(function (c) {
      (data[c.id] || []).forEach(function (item) {
        item.resumen_es = item.content_es || '';
        item.resumen_eu = item.content_eu || '';
        item.content_es = '';
        item.content_eu = '';
      });
    });

    saveData(data);
    renderAllTables();
    updateStats();
    alert('Datos de muestra cargados correctamente.');
  }

  function renderAllTables() {
    categories.forEach(function (c) { renderTable(c.id); });
  }

  // ===== TABLES EXPORT =====
  // expose functions to global scope for inline onclick
  window.backApp = {
    openNewItem: function (cat) { openNewItemModal(cat); },
    editItem: function (cat, id) { openEditItemModal(cat, id); },
    deleteItem: function (cat, id) { deleteItem(cat, id); },
    duplicateItem: function (cat, id) { duplicateItem(cat, id); },
    toggleVisibility: function (cat, id) { toggleVisibility(cat, id); },
    saveModalItem: saveModalItem,
    closeModal: closeModal,
    logout: logout,
    loadSampleData: loadSampleData,
    login: function () {
      var user = document.getElementById('login-user').value;
      var pass = document.getElementById('login-pass').value;
      var error = document.getElementById('login-error');
      if (login(user, pass)) {
        showScreen('dashboard-screen');
        renderAllTables();
        updateStats();
      } else {
        error.textContent = 'Usuario o contraseña incorrectos.';
        error.style.display = 'block';
      }
    }
  };

  // ===== INIT =====
  function init() {
    // Check session
    if (isLoggedIn()) {
      showScreen('dashboard-screen');
    }

    // Init category tabs
    initCategoryTabs();

    // Init rich text toolbars
    initRichToolbar('editor-resumen-es', 'toolbar-resumen-es');
    initRichToolbar('editor-resumen-eu', 'toolbar-resumen-eu');
    initRichToolbar('editor-es', 'toolbar-es');
    initRichToolbar('editor-eu', 'toolbar-eu');

    // Init image upload
    handleImageUpload('modal-image-input', 'modal-image-data', 'modal-image-preview');

    // Init GPX upload
    handleGpxUpload();

    // Render tables
    renderAllTables();
    updateStats();

    // Modal close on overlay click
    document.getElementById('itemModal').addEventListener('click', function (e) {
      if (e.target === this) closeModal();
    });

    // Enter key on login
    document.getElementById('login-pass').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') window.backApp.login();
    });
    document.getElementById('login-user').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') document.getElementById('login-pass').focus();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

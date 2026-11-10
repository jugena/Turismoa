(function () {
  'use strict';

  const CONTENT_API = 'api/content.php';
  const UPLOAD_API = 'api/upload.php';
  const categories = [
    { id: 'rutas', label_es: 'Rutas y planes' },
    { id: 'patrimonio', label_es: 'Patrimonio' },
    { id: 'donde-comer', label_es: 'Dónde comer' },
    { id: 'donde-dormir', label_es: 'Dónde dormir' },
    { id: 'donde-comprar', label_es: 'Dónde comprar' },
    { id: 'eventos', label_es: 'Eventos' },
    { id: 'fiestas', label_es: 'Fiestas locales' }
  ];

  let content = getEmptyContent();
  let revision = '';
  let contentLoaded = false;
  let currentEditId = null;
  let currentEditCategory = null;
  let modalImages = [];
  const editors = {};

  function getEmptyContent() {
    const result = {};
    categories.forEach(function (category) { result[category.id] = []; });
    return result;
  }

  async function requestJson(url, options) {
    const response = await fetch(url, Object.assign({ credentials: 'same-origin', cache: 'no-store' }, options || {}));
    const payload = await response.json().catch(function () { return {}; });
    if (!response.ok || !payload.ok) {
      const error = new Error(payload.error || ('HTTP ' + response.status));
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function showNotice(message, isError) {
    let notice = document.getElementById('admin-global-notice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'admin-global-notice';
      notice.setAttribute('role', 'status');
      notice.setAttribute('aria-live', 'polite');
      document.body.appendChild(notice);
    }
    notice.className = 'admin-global-notice' + (isError ? ' is-error' : '');
    notice.textContent = message;
    notice.hidden = false;
    window.clearTimeout(showNotice.timeoutId);
    showNotice.timeoutId = window.setTimeout(function () { notice.hidden = true; }, 6000);
  }

  function friendlyError(error) {
    if (error.message === 'content_changed_reload') return 'El contenido ha cambiado en otra sesión. Recarga la página antes de volver a guardar.';
    if (error.message === 'authentication_required' || error.status === 401) {
      showScreen('login-screen');
      return 'La sesión ha caducado. Vuelve a identificarte.';
    }
    if (error.message === 'data_directory_not_writable') return 'El servidor no tiene permisos de escritura sobre la carpeta data.';
    if (error.message === 'content_not_loaded') return 'El contenido aún no está disponible. Recarga la página.';
    return 'No se ha podido completar la operación: ' + error.message;
  }

  async function loadContent() {
    try {
      const payload = await requestJson(CONTENT_API + '?collection=content&admin=1');
      content = Object.assign(getEmptyContent(), payload.data || {});
      revision = payload.revision || '';
      contentLoaded = true;
      renderAllTables();
      updateStats();
    } catch (error) {
      contentLoaded = false;
      showNotice('No se ha podido cargar el contenido JSON. Recarga la página antes de editar.', true);
      console.error(error);
    }
  }

  async function persistContent(nextContent) {
    if (!contentLoaded) throw new Error('content_not_loaded');
    const payload = await requestJson(CONTENT_API + '?collection=content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: nextContent, revision: revision })
    });
    content = Object.assign(getEmptyContent(), payload.data || {});
    revision = payload.revision || revision;
    renderAllTables();
    updateStats();
  }

  async function uploadFile(file, kind) {
    const body = new FormData();
    body.append('file', file);
    body.append('kind', kind);
    const response = await fetch(UPLOAD_API, { method: 'POST', credentials: 'same-origin', body: body });
    const payload = await response.json().catch(function () { return {}; });
    if (!response.ok || !payload.ok || !payload.path) {
      const error = new Error(payload.error || ('HTTP ' + response.status));
      error.status = response.status;
      throw error;
    }
    return payload.path;
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (screen) {
      screen.classList.toggle('active', screen.id === id);
    });
  }

  async function login() {
    const password = document.getElementById('login-pass').value;
    const errorElement = document.getElementById('login-error');
    errorElement.style.display = 'none';
    try {
      await requestJson(CONTENT_API + '?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password })
      });
      document.getElementById('login-pass').value = '';
      showScreen('dashboard-screen');
      await loadContent();
    } catch (error) {
      errorElement.textContent = 'Contraseña incorrecta.';
      errorElement.style.display = 'block';
    }
  }

  async function logout() {
    try {
      await requestJson(CONTENT_API + '?action=logout', { method: 'POST' });
    } catch (error) {
      console.error(error);
    }
    contentLoaded = false;
    showScreen('login-screen');
    document.getElementById('login-pass').focus();
  }

  function getToolbarOptions() {
    return [
      ['bold', 'italic', 'underline', 'strike'],
      [{ header: [1, 2, 3, false] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['blockquote'],
      [{ align: [] }],
      ['link', 'image', 'video'],
      ['clean']
    ];
  }

  function pickImageForEditor(quill) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.addEventListener('change', async function () {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        showNotice('Subiendo imagen…', false);
        const path = await uploadFile(file, 'image');
        const range = quill.getSelection(true);
        quill.insertEmbed(range.index, 'image', path, 'user');
        quill.setSelection(range.index + 1, 0, 'silent');
        showNotice('Imagen subida correctamente.', false);
      } catch (error) {
        showNotice(friendlyError(error), true);
      }
    });
    input.click();
  }

  function initEditors() {
    if (typeof Quill === 'undefined') {
      showNotice('No se ha podido cargar el editor de texto Quill.', true);
      return;
    }
    ['editor-resumen-es', 'editor-resumen-eu', 'editor-es', 'editor-eu'].forEach(function (id) {
      const element = document.getElementById(id);
      if (!element) return;
      editors[id] = new Quill(element, {
        theme: 'snow',
        modules: {
          toolbar: {
            container: getToolbarOptions(),
            handlers: { image: function () { pickImageForEditor(this.quill); } }
          }
        }
      });
    });
  }

  function getEditorHtml(id) {
    const editor = editors[id];
    if (!editor) return '';
    const html = editor.root.innerHTML.trim();
    return html === '<p><br></p>' ? '' : html;
  }

  function setEditorHtml(id, html) {
    const editor = editors[id];
    if (!editor) return;
    editor.setText('');
    if (html) editor.clipboard.dangerouslyPasteHTML(String(html));
  }

  function clearModal() {
    document.getElementById('modal-title-es').value = '';
    document.getElementById('modal-title-eu').value = '';
    document.getElementById('modal-mapa').value = '';
    document.getElementById('modal-mapa-data').value = '';
    document.getElementById('modal-mapa-preview').textContent = '';
    ['editor-resumen-es', 'editor-resumen-eu', 'editor-es', 'editor-eu'].forEach(function (id) { setEditorHtml(id, ''); });
    modalImages = [];
    renderImageGallery();
    const imageInput = document.getElementById('modal-image-input');
    const gpxInput = document.getElementById('modal-gpx-input');
    if (imageInput) imageInput.value = '';
    if (gpxInput) gpxInput.value = '';
  }

  function openNewItem(category) {
    currentEditCategory = category;
    currentEditId = null;
    clearModal();
    document.querySelector('#itemModal .modal-header h3').textContent = 'Nuevo elemento';
    document.getElementById('itemModal').classList.add('open');
  }

  function openEditItem(category, id) {
    const item = (content[category] || []).find(function (entry) { return String(entry.id) === String(id); });
    if (!item) return;
    currentEditCategory = category;
    currentEditId = item.id;
    clearModal();
    document.querySelector('#itemModal .modal-header h3').textContent = 'Editar elemento';
    document.getElementById('modal-title-es').value = item.title_es || '';
    document.getElementById('modal-title-eu').value = item.title_eu || '';
    document.getElementById('modal-mapa').value = item.mapa_embed || '';
    document.getElementById('modal-mapa-data').value = item.mapa_data || '';
    setEditorHtml('editor-resumen-es', item.resumen_es || '');
    setEditorHtml('editor-resumen-eu', item.resumen_eu || '');
    setEditorHtml('editor-es', item.content_es || '');
    setEditorHtml('editor-eu', item.content_eu || '');
    modalImages = Array.isArray(item.images) ? item.images.slice() : (item.image ? [item.image] : []);
    renderImageGallery();
    updateMapPreview(item.mapa_embed || '', item.mapa_data || '');
    document.getElementById('itemModal').classList.add('open');
  }

  function closeModal() {
    document.getElementById('itemModal').classList.remove('open');
    currentEditCategory = null;
    currentEditId = null;
  }

  function updateMapPreview(embed, dataPath) {
    const preview = document.getElementById('modal-mapa-preview');
    if (embed) {
      preview.textContent = '✓ Código de mapa incrustado';
      preview.style.color = '#2e7d32';
    } else if (dataPath) {
      preview.textContent = '✓ Archivo GPX cargado';
      preview.style.color = '#2e7d32';
    } else {
      preview.textContent = '';
    }
  }

  function renderImageGallery() {
    const preview = document.getElementById('modal-image-preview');
    const hidden = document.getElementById('modal-image-data');
    if (hidden) hidden.value = JSON.stringify(modalImages);
    if (!preview) return;
    preview.innerHTML = modalImages.map(function (src, index) {
      return '<div class="thumb-wrap"><img src="' + escapeHtml(src) + '" alt="Imagen ' + (index + 1) + '">' +
        '<button type="button" class="thumb-del" onclick="backApp.removeImage(' + index + ')" title="Eliminar">×</button></div>';
    }).join('');
  }

  function removeImage(index) {
    modalImages.splice(index, 1);
    renderImageGallery();
  }

  function initImageUpload() {
    const input = document.getElementById('modal-image-input');
    if (!input) return;
    input.addEventListener('change', async function () {
      const files = Array.from(input.files || []);
      if (!files.length) return;
      try {
        showNotice('Subiendo ' + files.length + (files.length === 1 ? ' imagen…' : ' imágenes…'), false);
        for (const file of files) {
          modalImages.push(await uploadFile(file, 'image'));
          renderImageGallery();
        }
        showNotice('Imágenes subidas correctamente.', false);
      } catch (error) {
        showNotice(friendlyError(error), true);
      } finally {
        input.value = '';
      }
    });
  }

  function initGpxUpload() {
    const input = document.getElementById('modal-gpx-input');
    if (!input) return;
    input.addEventListener('change', async function () {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        showNotice('Subiendo archivo GPX…', false);
        const path = await uploadFile(file, 'gpx');
        document.getElementById('modal-mapa-data').value = path;
        updateMapPreview(document.getElementById('modal-mapa').value.trim(), path);
        showNotice('Archivo GPX subido correctamente.', false);
      } catch (error) {
        showNotice(friendlyError(error), true);
      } finally {
        input.value = '';
      }
    });
  }

  async function saveModalItem() {
    const category = currentEditCategory;
    if (!category) return;
    const titleEs = document.getElementById('modal-title-es').value.trim();
    if (!titleEs) {
      showNotice('El título en castellano es obligatorio.', true);
      return;
    }

    const next = JSON.parse(JSON.stringify(content));
    const items = next[category] || [];
    const now = new Date().toISOString();
    let item;
    if (currentEditId !== null) {
      item = items.find(function (entry) { return String(entry.id) === String(currentEditId); });
      if (!item) return;
    } else {
      item = { id: Date.now(), created: now, visible: true };
      items.push(item);
      next[category] = items;
    }

    item.title_es = titleEs;
    item.title_eu = document.getElementById('modal-title-eu').value.trim();
    item.resumen_es = getEditorHtml('editor-resumen-es');
    item.resumen_eu = getEditorHtml('editor-resumen-eu');
    item.content_es = getEditorHtml('editor-es');
    item.content_eu = getEditorHtml('editor-eu');
    item.mapa_embed = document.getElementById('modal-mapa').value.trim();
    item.mapa_data = document.getElementById('modal-mapa-data').value;
    item.images = modalImages.slice();
    item.image = modalImages[0] || '';
    item.updated = now;

    try {
      await persistContent(next);
      closeModal();
      showNotice('Contenido guardado correctamente.', false);
    } catch (error) {
      showNotice(friendlyError(error), true);
    }
  }

  async function deleteItem(category, id) {
    if (!window.confirm('¿Estás seguro de eliminar este elemento?')) return;
    const next = JSON.parse(JSON.stringify(content));
    next[category] = (next[category] || []).filter(function (item) { return String(item.id) !== String(id); });
    try {
      await persistContent(next);
      showNotice('Elemento eliminado.', false);
    } catch (error) {
      showNotice(friendlyError(error), true);
    }
  }

  async function duplicateItem(category, id) {
    const original = (content[category] || []).find(function (item) { return String(item.id) === String(id); });
    if (!original) return;
    const next = JSON.parse(JSON.stringify(content));
    const copy = JSON.parse(JSON.stringify(original));
    const now = new Date().toISOString();
    copy.id = Date.now();
    copy.title_es = (copy.title_es || '') + ' (copia)';
    copy.title_eu = copy.title_eu ? copy.title_eu + ' (kopia)' : '';
    copy.created = now;
    copy.updated = now;
    next[category].push(copy);
    try {
      await persistContent(next);
      showNotice('Elemento duplicado.', false);
    } catch (error) {
      showNotice(friendlyError(error), true);
    }
  }

  async function toggleVisibility(category, id) {
    const next = JSON.parse(JSON.stringify(content));
    const item = (next[category] || []).find(function (entry) { return String(entry.id) === String(id); });
    if (!item) return;
    item.visible = item.visible === false;
    item.updated = new Date().toISOString();
    try {
      await persistContent(next);
      showNotice(item.visible ? 'Elemento visible.' : 'Elemento oculto.', false);
    } catch (error) {
      showNotice(friendlyError(error), true);
    }
  }

  function renderTable(category) {
    const tbody = document.getElementById('table-' + category);
    if (!tbody) return;
    const items = content[category] || [];
    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-row">No hay elementos. Crea el primero.</td></tr>';
      return;
    }
    const categoryData = categories.find(function (entry) { return entry.id === category; });
    tbody.innerHTML = items.map(function (item) {
      const parsedDate = item.updated ? new Date(item.updated) : null;
      const date = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toLocaleDateString('es-ES') : '-';
      const visible = item.visible !== false;
      return '<tr class="' + (visible ? '' : 'row-hidden') + '"><td><strong>' + escapeHtml(item.title_es) + '</strong>' +
        (item.title_eu ? '<br><small>' + escapeHtml(item.title_eu) + '</small>' : '') + '</td><td>' +
        escapeHtml(categoryData ? categoryData.label_es : category) + '</td><td>' + date + '</td><td class="actions-cell">' +
        actionButton('visibility', category, item.id, visible ? '👁️' : '🚫', visible ? 'Ocultar' : 'Mostrar', 'btn-visibility') +
        actionButton('edit', category, item.id, '✏️', 'Editar', 'btn-edit') +
        actionButton('duplicate', category, item.id, '📋', 'Duplicar', 'btn-duplicate') +
        actionButton('delete', category, item.id, '🗑️', 'Eliminar', 'btn-delete') + '</td></tr>';
    }).join('');
  }

  function actionButton(action, category, id, icon, title, className) {
    return '<button type="button" class="btn-icon ' + className + '" data-back-action="' + action + '" data-category="' +
      escapeHtml(category) + '" data-id="' + escapeHtml(String(id)) + '" title="' + title + '">' + icon + '</button>';
  }

  function renderAllTables() {
    categories.forEach(function (category) { renderTable(category.id); });
  }

  function updateStats() {
    let total = 0;
    categories.forEach(function (category) {
      const count = (content[category.id] || []).length;
      total += count;
      const element = document.getElementById('stat-' + category.id);
      if (element) element.textContent = String(count);
    });
    const totalElement = document.getElementById('stat-total');
    if (totalElement) totalElement.textContent = String(total);
  }

  function initCategoryTabs() {
    document.querySelectorAll('.cat-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.cat-tab').forEach(function (entry) { entry.classList.remove('active'); });
        document.querySelectorAll('.cat-panel').forEach(function (panel) { panel.classList.remove('active'); });
        tab.classList.add('active');
        const panel = document.getElementById('panel-' + tab.dataset.cat);
        if (panel) panel.classList.add('active');
      });
    });
  }

  function initTableActions() {
    document.addEventListener('click', function (event) {
      const button = event.target.closest('[data-back-action]');
      if (!button) return;
      const action = button.dataset.backAction;
      const category = button.dataset.category;
      const id = button.dataset.id;
      if (action === 'visibility') toggleVisibility(category, id);
      if (action === 'edit') openEditItem(category, id);
      if (action === 'duplicate') duplicateItem(category, id);
      if (action === 'delete') deleteItem(category, id);
    });
  }

  function openHtmlEditor(editorId) {
    const editor = editors[editorId];
    if (!editor) return;
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:4000;display:flex;align-items:center;justify-content:center;padding:20px';
    const box = document.createElement('div');
    box.style.cssText = 'background:white;width:min(900px,100%);height:min(720px,90vh);padding:24px;border-radius:10px;display:flex;flex-direction:column;gap:16px';
    const title = document.createElement('h3');
    title.textContent = 'Editor de código HTML';
    const textarea = document.createElement('textarea');
    textarea.value = editor.root.innerHTML;
    textarea.style.cssText = 'flex:1;width:100%;padding:16px;font:14px/1.55 Consolas,monospace;resize:none;border:1px solid #ccd2d8;border-radius:6px';
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;justify-content:flex-end;gap:10px';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn-secondary';
    cancel.textContent = 'Cancelar';
    const apply = document.createElement('button');
    apply.type = 'button';
    apply.className = 'btn-primary';
    apply.textContent = 'Aplicar cambios';
    cancel.addEventListener('click', function () { overlay.remove(); });
    apply.addEventListener('click', function () { setEditorHtml(editorId, textarea.value); overlay.remove(); });
    actions.append(cancel, apply);
    box.append(title, textarea, actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    textarea.focus();
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character];
    });
  }

  async function initAuthentication() {
    try {
      const payload = await requestJson(CONTENT_API + '?action=status');
      if (payload.authenticated) {
        showScreen('dashboard-screen');
        await loadContent();
      } else {
        showScreen('login-screen');
      }
    } catch (error) {
      showScreen('login-screen');
      showNotice('La API PHP no está disponible. Abre el proyecto mediante un servidor PHP.', true);
    }
  }

  window.backApp = {
    openNewItem: openNewItem,
    editItem: openEditItem,
    deleteItem: deleteItem,
    duplicateItem: duplicateItem,
    toggleVisibility: toggleVisibility,
    saveModalItem: saveModalItem,
    closeModal: closeModal,
    removeImage: removeImage,
    openHtmlEditor: openHtmlEditor,
    login: login,
    logout: logout
  };

  function init() {
    initEditors();
    initCategoryTabs();
    initTableActions();
    initImageUpload();
    initGpxUpload();
    initAuthentication();
    document.getElementById('itemModal').addEventListener('click', function (event) { if (event.target === this) closeModal(); });
    document.getElementById('login-pass').addEventListener('keydown', function (event) { if (event.key === 'Enter') login(); });
    document.getElementById('modal-mapa').addEventListener('input', function () {
      updateMapPreview(this.value.trim(), document.getElementById('modal-mapa-data').value);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

const PASSWORD_HASH = '899f536d3297cc5e1515773135c58dc8de51465ab8c492a23eb8b6f82e141e6d';
const state = { menu: null };
const $ = (selector) => document.querySelector(selector);

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const buffer = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function login(event) {
  event.preventDefault();
  const password = $('#admin-password').value;
  if (await sha256(password) !== PASSWORD_HASH) {
    $('#login-error').textContent = 'Senha incorreta. Tente novamente.';
    return;
  }
  sessionStorage.setItem('duda-doces-admin', 'authenticated');
  $('#login-error').textContent = '';
  await showAdmin();
}

async function showAdmin() {
  try {
    if (!state.menu) {
      const response = await fetch(`data/cardapio.json?v=${Date.now()}`);
      if (!response.ok) throw new Error('Não foi possível carregar data/cardapio.json.');
      state.menu = normalizeMenu(await response.json());
    }
    $('#login-view').classList.add('hidden');
    $('#admin-view').classList.remove('hidden');
    renderAll();
  } catch (error) {
    $('#login-error').textContent = error.message;
  }
}

function normalizeMenu(menu) {
  if (!menu || typeof menu !== 'object' || !menu.store || !Array.isArray(menu.products)) throw new Error('O arquivo JSON não possui o formato esperado.');
  return {
    store: {
      storeName: String(menu.store.storeName || 'Duda Doces'),
      whatsapp: String(menu.store.whatsapp || '5517991336927').replace(/\D/g, ''),
      description: String(menu.store.description || ''),
      footerMessage: String(menu.store.footerMessage || ''),
    },
    products: menu.products.map((product, index) => ({
      id: String(product.id || `produto-${index + 1}`),
      name: String(product.name || ''),
      category: String(product.category || 'Doces'),
      description: String(product.description || ''),
      price: Number(product.price) || 0,
      image: String(product.image || ''),
      available: product.available !== false,
    })),
  };
}

function renderAll() {
  document.querySelectorAll('[data-setting]').forEach(input => input.value = state.menu.store[input.dataset.setting] || '');
  renderProducts();
}

function renderProducts() {
  const list = $('#product-editor-list');
  list.innerHTML = '';
  state.menu.products.forEach((product, index) => {
    const node = $('#product-editor-template').content.firstElementChild.cloneNode(true);
    node.dataset.index = index;
    node.querySelector('[data-product-number]').textContent = index + 1;
    node.querySelectorAll('[data-field]').forEach(input => {
      const field = input.dataset.field;
      if (input.type === 'checkbox') input.checked = Boolean(product[field]);
      else input.value = product[field] ?? '';
    });
    list.appendChild(node);
  });
  const categories = [...new Set(state.menu.products.map(product => product.category).filter(Boolean))];
  $('#category-suggestions').innerHTML = categories.map(category => `<option value="${escapeHtml(category)}"></option>`).join('');
}

function updateProduct(input) {
  const editor = input.closest('.product-editor');
  const product = state.menu.products[Number(editor.dataset.index)];
  const field = input.dataset.field;
  product[field] = input.type === 'checkbox' ? input.checked : input.type === 'number' ? Number(input.value) : input.value;
}

function addProduct() {
  state.menu.products.push({
    id: `produto-${Date.now()}`,
    name: 'Novo doce', category: 'Doces', description: '', price: 0,
    image: 'assets/images/cupcake.png', available: true,
  });
  renderProducts();
  const last = $('#product-editor-list').lastElementChild;
  last.scrollIntoView({ behavior: 'smooth', block: 'center' });
  last.querySelector('[data-field="name"]').select();
}

function handleEditorAction(event) {
  const button = event.target.closest('button');
  if (!button) return;
  const editor = button.closest('.product-editor');
  const index = Number(editor.dataset.index);
  if (button.hasAttribute('data-remove')) {
    if (confirm(`Excluir “${state.menu.products[index].name}” do cardápio?`)) {
      state.menu.products.splice(index, 1); renderProducts();
    }
    return;
  }
  const direction = button.dataset.move;
  if (!direction) return;
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= state.menu.products.length) return;
  [state.menu.products[index], state.menu.products[target]] = [state.menu.products[target], state.menu.products[index]];
  renderProducts();
}

function validate() {
  syncSettings();
  if (!state.menu.store.storeName.trim()) return 'Informe o nome da loja.';
  if (state.menu.store.whatsapp.length < 12) return 'Informe o WhatsApp com código do país e DDD.';
  if (!state.menu.products.length) return 'Cadastre pelo menos um produto.';
  for (const [index, product] of state.menu.products.entries()) {
    if (!product.name.trim()) return `Informe o nome do produto ${index + 1}.`;
    if (!product.category.trim()) return `Informe a categoria de ${product.name}.`;
    if (!Number.isFinite(product.price) || product.price < 0) return `Corrija o preço de ${product.name}.`;
    product.id = uniqueSlug(product.name, index);
  }
  return '';
}

function uniqueSlug(name, ownIndex) {
  const base = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `produto-${ownIndex + 1}`;
  const ids = state.menu.products.slice(0, ownIndex).map(product => product.id);
  let value = base; let suffix = 2;
  while (ids.includes(value)) value = `${base}-${suffix++}`;
  return value;
}

function syncSettings() {
  document.querySelectorAll('[data-setting]').forEach(input => {
    const key = input.dataset.setting;
    state.menu.store[key] = key === 'whatsapp' ? input.value.replace(/\D/g, '') : input.value.trim();
  });
}

function exportJson() {
  const error = validate();
  if (error) { alert(error); return; }
  const blob = new Blob([`${JSON.stringify(state.menu, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = 'cardapio.json'; link.click();
  URL.revokeObjectURL(url);
  showToast('cardapio.json baixado! Agora envie para o GitHub.');
}

async function importJson(event) {
  const [file] = event.target.files;
  if (!file) return;
  try {
    state.menu = normalizeMenu(JSON.parse(await file.text()));
    renderAll(); showToast('JSON importado com sucesso.');
  } catch (error) {
    alert(`Não foi possível importar: ${error.message}`);
  } finally { event.target.value = ''; }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

let toastTimer;
function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

$('#login-form').addEventListener('submit', login);
$('#logout-button').addEventListener('click', () => { sessionStorage.removeItem('duda-doces-admin'); location.reload(); });
$('#add-product').addEventListener('click', addProduct);
$('#export-button').addEventListener('click', exportJson);
$('#import-file').addEventListener('change', importJson);
$('#product-editor-list').addEventListener('input', event => { if (event.target.matches('[data-field]')) updateProduct(event.target); });
$('#product-editor-list').addEventListener('change', event => { if (event.target.matches('[data-field]')) updateProduct(event.target); });
$('#product-editor-list').addEventListener('click', handleEditorAction);

if (sessionStorage.getItem('duda-doces-admin') === 'authenticated') showAdmin();

const state = { menu: null, cart: loadCart(), category: 'Todos' };
const $ = (selector) => document.querySelector(selector);
const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

async function loadMenu() {
  try {
    const response = await fetch(`data/cardapio.json?v=${Date.now()}`);
    if (!response.ok) throw new Error('Não foi possível carregar o cardápio.');
    state.menu = await response.json();
    renderStore();
    renderCategories();
    renderProducts();
    renderCart();
  } catch (error) {
    $('#product-grid').innerHTML = `<p class="form-error">${error.message} Atualize a página em instantes.</p>`;
  }
}

function renderStore() {
  const store = state.menu.store;
  document.title = `${store.storeName} — Doces Artesanais & Cardápio`;
  $('#brand-name').textContent = store.storeName;
  $('#footer-name').textContent = store.storeName;
  $('#hero-description').textContent = store.description;
  $('#footer-message').textContent = store.footerMessage;
}

function renderCategories() {
  const categories = ['Todos', ...new Set(state.menu.products.filter(p => p.available).map(p => p.category))];
  if (!categories.includes(state.category)) state.category = 'Todos';
  $('#category-tabs').innerHTML = categories.map(category =>
    `<button type="button" class="${category === state.category ? 'active' : ''}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`
  ).join('');
}

function renderProducts() {
  const products = state.menu.products.filter(product => product.available && (state.category === 'Todos' || product.category === state.category));
  $('#empty-state').classList.toggle('hidden', products.length > 0);
  $('#product-grid').innerHTML = products.map(product => `
    <article class="product-card">
      <img class="product-image" src="${safeImage(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">
      <div class="product-content">
        <span class="product-category">${escapeHtml(product.category)}</span>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.description || '')}</p>
        <div class="product-bottom">
          <span class="product-price">${money(Number(product.price))}</span>
          <button class="add-button" type="button" data-add="${escapeHtml(product.id)}">+ Adicionar</button>
        </div>
      </div>
    </article>`).join('');
}

function loadCart() {
  try { return JSON.parse(localStorage.getItem('duda-doces-cart')) || []; }
  catch { return []; }
}

function saveCart() {
  localStorage.setItem('duda-doces-cart', JSON.stringify(state.cart));
}

function addToCart(id) {
  const existing = state.cart.find(item => item.id === id);
  if (existing) existing.quantity += 1;
  else state.cart.push({ id, quantity: 1 });
  saveCart(); renderCart(); showToast('Doce adicionado à sacola!');
}

function changeQuantity(id, amount) {
  const item = state.cart.find(item => item.id === id);
  if (!item) return;
  item.quantity += amount;
  if (item.quantity <= 0) state.cart = state.cart.filter(entry => entry.id !== id);
  saveCart(); renderCart();
}

function cartDetails() {
  if (!state.menu) return [];
  return state.cart.map(item => ({ ...item, product: state.menu.products.find(product => product.id === item.id) }))
    .filter(item => item.product && item.product.available);
}

function renderCart() {
  const items = cartDetails();
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  $('#header-cart-count').textContent = quantity;
  $('#cart-empty').classList.toggle('hidden', items.length > 0);
  $('#checkout-area').classList.toggle('hidden', items.length === 0);
  $('#cart-total').textContent = money(total);
  $('#cart-items').innerHTML = items.map(item => `
    <div class="cart-item">
      <img src="${safeImage(item.product.image)}" alt="">
      <div><strong>${escapeHtml(item.product.name)}</strong><small>${money(Number(item.product.price))}</small></div>
      <div class="quantity">
        <button type="button" data-quantity="-1" data-id="${escapeHtml(item.id)}" aria-label="Diminuir">−</button>
        <b>${item.quantity}</b>
        <button type="button" data-quantity="1" data-id="${escapeHtml(item.id)}" aria-label="Aumentar">+</button>
      </div>
    </div>`).join('');
}

function openCart() {
  $('#cart-overlay').hidden = false;
  $('#cart-drawer').classList.add('open');
  $('#cart-drawer').setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  $('#cart-drawer').classList.remove('open');
  $('#cart-drawer').setAttribute('aria-hidden', 'true');
  $('#cart-overlay').hidden = true;
  document.body.style.overflow = '';
}

function checkout(event) {
  event.preventDefault();
  const items = cartDetails();
  if (!items.length) return;
  const data = Object.fromEntries(new FormData(event.currentTarget));
  if (data.deliveryType === 'Entrega' && !data.address.trim()) {
    alert('Informe o endereço para entrega.'); return;
  }
  const total = items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const lines = [
    `Olá! Quero fazer um pedido na *${state.menu.store.storeName}* 🍰`, '',
    '*Itens do pedido:*',
    ...items.map(item => `• ${item.quantity}x ${item.product.name} — ${money(Number(item.product.price) * item.quantity)}`),
    '', `*Total: ${money(total)}*`, '',
    `*Nome:* ${data.customerName}`,
    `*Celular:* ${data.customerPhone}`,
    `*Recebimento:* ${data.deliveryType}`,
    ...(data.deliveryType === 'Entrega' ? [`*Endereço:* ${data.address}`] : []),
    `*Pagamento:* ${data.payment}`,
    ...(data.notes.trim() ? [`*Observações:* ${data.notes.trim()}`] : []),
  ];
  const phone = String(state.menu.store.whatsapp).replace(/\D/g, '');
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
}

function safeImage(value) {
  const image = String(value || '');
  if (/^(https:\/\/|assets\/images\/|data:image\/)/i.test(image)) return escapeHtml(image);
  return 'assets/images/cupcake.png';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

let toastTimer;
function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

$('#category-tabs').addEventListener('click', event => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  state.category = button.dataset.category; renderCategories(); renderProducts();
});
$('#product-grid').addEventListener('click', event => {
  const button = event.target.closest('[data-add]'); if (button) addToCart(button.dataset.add);
});
$('#cart-items').addEventListener('click', event => {
  const button = event.target.closest('[data-quantity]');
  if (button) changeQuantity(button.dataset.id, Number(button.dataset.quantity));
});
$('#cart-shortcut').addEventListener('click', openCart);
$('#close-cart').addEventListener('click', closeCart);
$('#cart-overlay').addEventListener('click', closeCart);
$('#checkout-form').addEventListener('submit', checkout);
$('#delivery-type').addEventListener('change', event => $('#address-field').classList.toggle('hidden', event.target.value !== 'Entrega'));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeCart(); });

loadMenu();

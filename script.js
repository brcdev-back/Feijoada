/* =========================================
   FEIJOADA DA CASA — script.js
   ========================================= */

/* ---- PRODUTOS ---- */
const PRODUCTS = {
  individual: { name: 'Feijoada Individual', price: 18, icon: '' },
  dupla:      { name: 'Feijoada para Dois',  price: 30, icon: '' }
};

/* ---- ESTADO ---- */
let cart = {};
let orders = JSON.parse(localStorage.getItem('feijoada_orders') || '[]');
let currentFilter = 'all';

/* =========================================
   VIEWS
   ========================================= */
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

function showStore()    { showView('view-store'); }
function showAdmLogin() { showView('view-adm-login'); }
function showAdm()      { showView('view-adm'); renderAdm(); }

/* =========================================
   AUTENTICAÇÃO ADM
   ========================================= */
const ADM_USER = 'admin';
const ADM_PASS = '1234';

function doLogin() {
  const u   = document.getElementById('adm-user').value.trim();
  const p   = document.getElementById('adm-pass').value;
  const err = document.getElementById('login-err');

  if (u === ADM_USER && p === ADM_PASS) {
    err.style.display = 'none';
    showAdm();
  } else {
    err.style.display = 'block';
  }
}

function admLogout() {
  document.getElementById('adm-user').value = '';
  document.getElementById('adm-pass').value = '';
  showStore();
}

/* =========================================
   CARRINHO
   ========================================= */
function addToCart(key) {
  cart[key] = (cart[key] || 0) + 1;
  updateCartUI();
  openCart();
}

function changeQty(key, delta) {
  cart[key] = (cart[key] || 0) + delta;
  if (cart[key] <= 0) delete cart[key];
  updateCartUI();
}

function removeFromCart(key) {
  delete cart[key];
  updateCartUI();
}

function cartTotal() {
  return Object.entries(cart).reduce((s, [k, q]) => s + PRODUCTS[k].price * q, 0);
}

function cartCount() {
  return Object.values(cart).reduce((s, q) => s + q, 0);
}

function updateCartUI() {
  document.getElementById('cart-count').textContent = cartCount();
  document.getElementById('drawer-total').textContent = fmt(cartTotal());

  const body = document.getElementById('drawer-body');

  if (!Object.keys(cart).length) {
    body.innerHTML = `
      <div class="empty-cart">
        <div>🍲</div>
        Seu carrinho está vazio.<br>Adicione uma porção!
      </div>`;
    return;
  }

  body.innerHTML = Object.entries(cart).map(([k, q]) => `
    <div class="cart-item">
      <div class="ci-icon">${PRODUCTS[k].icon}</div>
      <div class="ci-info">
        <div class="ci-name">${PRODUCTS[k].name}</div>
        <div class="ci-price">${fmt(PRODUCTS[k].price * q)}</div>
      </div>
      <div class="ci-qty">
        <button class="qty-btn" onclick="changeQty('${k}', -1)">−</button>
        <span>${q}</span>
        <button class="qty-btn" onclick="changeQty('${k}', 1)">+</button>
      </div>
      <button class="remove-item" onclick="removeFromCart('${k}')">🗑</button>
    </div>
  `).join('');
}

function openCart() {
  document.getElementById('drawer').classList.add('open');
  document.getElementById('overlay').classList.add('open');
}

function closeCart() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
}

/* =========================================
   CHECKOUT
   ========================================= */
function openCheckout() {
  if (!Object.keys(cart).length) return;
  closeCart();
  renderCheckoutForm();
  document.getElementById('modal-overlay').classList.add('open');
}

function closeCheckout() {
  document.getElementById('modal-overlay').classList.remove('open');
}

function renderCheckoutForm() {
  const summary = Object.entries(cart).map(([k, q]) => `
    <div class="osm-line">
      <span>${PRODUCTS[k].name} x${q}</span>
      <span>${fmt(PRODUCTS[k].price * q)}</span>
    </div>
  `).join('');

  document.getElementById('modal-body').innerHTML = `
    <div class="order-summary-mini">
      <h4>Resumo do pedido</h4>
      ${summary}
      <div class="osm-total">
        <span>Total</span>
        <span>${fmt(cartTotal())}</span>
      </div>
    </div>

    <div class="form-group">
      <label>Seu Nome</label>
      <input id="f-name" type="text" placeholder="Ex: João Silva">
    </div>

    <div class="form-group">
      <label>Telefone / WhatsApp</label>
      <input id="f-phone" type="tel" placeholder="(81) 99999-9999">
    </div>

    <div class="form-group">
      <label>Forma de Retirada</label>
      <select id="f-tipo" onchange="toggleAddress()">
        <option value="retirada">Retirar no local</option>
        <option value="delivery">Delivery</option>
      </select>
    </div>

    <div class="form-group" id="f-end-group" style="display:none">
      <label>Endereço</label>
      <input id="f-address" type="text" placeholder="Rua, número, bairro">
    </div>

    <div class="form-group">
      <label>Observações (opcional)</label>
      <textarea id="f-obs" placeholder="Sem pimenta, mais farofa..."></textarea>
    </div>

    <button class="confirm-btn" onclick="confirmOrder()">Confirmar Pedido</button>
  `;
}

function toggleAddress() {
  const tipo = document.getElementById('f-tipo').value;
  document.getElementById('f-end-group').style.display = tipo === 'delivery' ? 'block' : 'none';
}

function confirmOrder() {
  const name  = document.getElementById('f-name').value.trim();
  const phone = document.getElementById('f-phone').value.trim();

  if (!name || !phone) {
    alert('Preencha nome e telefone.');
    return;
  }

  const code = 'FEI' + Date.now().toString().slice(-5);

  const order = {
    id:      code,
    name,
    phone,
    tipo:    document.getElementById('f-tipo').value,
    address: document.getElementById('f-address') ? document.getElementById('f-address').value : '',
    obs:     document.getElementById('f-obs').value,
    items:   JSON.parse(JSON.stringify(cart)),
    total:   cartTotal(),
    status:  'pending',
    date:    new Date().toLocaleString('pt-BR')
  };

  orders.push(order);
  saveOrders();

  cart = {};
  updateCartUI();
  renderSuccess(code, order.total);
}

function renderSuccess(code, total) {
  document.getElementById('modal-body').innerHTML = `
    <div class="success-screen">
      <div class="success-icon"></div>
      <h2>Pedido Confirmado!</h2>
      <p>Seu pedido foi recebido com sucesso.<br>Guarde o código abaixo:</p>
      <div class="order-code">${code}</div>
      <p style="margin-bottom:1.5rem">
        Total: <strong style="color:var(--clay)">${fmt(total)}</strong>
      </p>
      <button class="back-btn" onclick="closeCheckout()">← Voltar ao cardápio</button>
    </div>
  `;
}

/* =========================================
   PAINEL ADM
   ========================================= */
function saveOrders() {
  localStorage.setItem('feijoada_orders', JSON.stringify(orders));
}

function renderAdm() {
  const filtered = currentFilter === 'all'
    ? orders
    : orders.filter(o => o.status === currentFilter);

  const pending   = orders.filter(o => o.status === 'pending').length;
  const preparing = orders.filter(o => o.status === 'preparing').length;
  const revenue   = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((s, o) => s + o.total, 0);

  document.getElementById('stat-total').textContent     = orders.length;
  document.getElementById('stat-pending').textContent   = pending;
  document.getElementById('stat-preparing').textContent = preparing;
  document.getElementById('stat-revenue').textContent   = fmt(revenue);

  const container = document.getElementById('adm-table-container');

  if (!filtered.length) {
    container.innerHTML = `
      <div class="no-orders">
        <div class="empty-table-icon"></div>
        <p>Nenhum pedido encontrado.</p>
      </div>`;
    return;
  }

  const statusMap = {
    pending:   '<span class="status-badge status-pending">Pendente</span>',
    preparing: '<span class="status-badge status-preparing">Em Preparo</span>',
    done:      '<span class="status-badge status-done">Pronto</span>',
    cancelled: '<span class="status-badge status-cancelled">Cancelado</span>'
  };

  const rows = [...filtered].reverse().map(o => {
    const itens = Object.entries(o.items)
      .map(([k, q]) => `${PRODUCTS[k]?.name || k} x${q}`)
      .join(', ');

    let actions = '';
    if (o.status === 'pending') {
      actions = `
        <button class="action-btn btn-prepare" onclick="setStatus('${o.id}','preparing')">Em Preparo</button>
        <button class="action-btn btn-cancel"  onclick="setStatus('${o.id}','cancelled')">Cancelar</button>`;
    }
    if (o.status === 'preparing') {
      actions = `
        <button class="action-btn btn-done"   onclick="setStatus('${o.id}','done')">Pronto</button>
        <button class="action-btn btn-cancel" onclick="setStatus('${o.id}','cancelled')">Cancelar</button>`;
    }

    return `
      <tr>
        <td><strong>${o.id}</strong><br><small style="color:var(--text-light)">${o.date}</small></td>
        <td><strong>${o.name}</strong><br><small>${o.phone}</small></td>
        <td>${itens}</td>
        <td><strong style="color:var(--clay)">${fmt(o.total)}</strong></td>
        <td>${statusMap[o.status] || o.status}</td>
        <td>${actions}</td>
      </tr>`;
  }).join('');

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Código / Data</th>
          <th>Cliente</th>
          <th>Itens</th>
          <th>Total</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function setStatus(id, status) {
  const o = orders.find(x => x.id === id);
  if (o) {
    o.status = status;
    saveOrders();
    renderAdm();
  }
}

function filterOrders(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAdm();
}

/* =========================================
   UTILITÁRIOS
   ========================================= */
function fmt(v) {
  return 'R$' + v.toFixed(2).replace('.', ',');
}

/* =========================================
   INICIALIZAÇÃO
   ========================================= */
updateCartUI();

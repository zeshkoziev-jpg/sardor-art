(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  window.esc = esc;

  const DICT = {
    uz: { profile: 'Profil', cart: 'Savat', logout: 'Chiqish', seller: 'Savdogar', sold: 'Sotilganlar', home: 'Bosh sahifa' },
    ru: { profile: 'Профиль', cart: 'Корзина', logout: 'Выйти', seller: 'Продавец', sold: 'Продано', home: 'Главная' },
    en: { profile: 'Profile', cart: 'Cart', logout: 'Logout', seller: 'Seller', sold: 'Sold', home: 'Home' }
  };
  function getLang() { return localStorage.getItem('lang') || 'uz'; }
  function t(key) { return (DICT[getLang()] && DICT[getLang()][key]) || key; }
  window.t = t;
  window.getLang = getLang;

  async function api(url, opts = {}) {
    const opt = {
      method: opts.method || 'GET',
      credentials: 'same-origin',
      headers: Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {})
    };
    if (opts.body !== undefined) opt.body = JSON.stringify(opts.body);
    const r = await fetch(url, opt);
    let j = null;
    try { j = await r.json(); } catch {}
    if (!r.ok) {
      const err = new Error((j && j.error) || 'HTTP_' + r.status);
      err.status = r.status; err.data = j; throw err;
    }
    return j;
  }
  window.api = api;

  let AUTH = { user: null };
  async function refreshAuth() {
    try { const j = await api('/api/auth/me'); AUTH.user = j.user || null; }
    catch { AUTH.user = null; }
    return AUTH.user;
  }
  window.getAuth = () => AUTH.user;
  window.refreshAuth = refreshAuth;

  const CART_KEY = 'sardor_cart';
  function getCart() {
    try {
      const arr = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(arr) ? arr.filter(x => x && x.id) : [];
    } catch { return []; }
  }
  function setCart(arr) { localStorage.setItem(CART_KEY, JSON.stringify(arr)); updateCartBadge(); }
  function addToCart(item) {
    const cart = getCart();
    const found = cart.find((x) => x.id === item.id);
    if (found) found.qty = Math.min(99, Number(found.qty) + Number(item.qty || 1));
    else cart.push({
      id: String(item.id),
      name: String(item.name || ''),
      price: Number(item.price || 0),
      image: String(item.image || ''),
      qty: Math.max(1, Number(item.qty) || 1)
    });
    setCart(cart);
  }
  function cartCount() { return getCart().reduce((s, x) => s + Number(x.qty || 0), 0); }
  window.getCart = getCart;
  window.addToCart = addToCart;
  window.cartCount = cartCount;

  function fmtMoney(n) {
    try { return Number(n).toLocaleString('ru-RU') + ' so\'m'; } catch { return n + ' so\'m'; }
  }
  window.fmtMoney = fmtMoney;

  function updateCartBadge() {
    const b = document.querySelector('#cart-link .badge');
    if (!b) return;
    const c = cartCount();
    b.textContent = c > 0 ? String(c) : '';
    b.classList.toggle('hidden', c === 0);
  }

  async function buildHeader() {
    const host = document.getElementById('site-header');
    if (!host) return;
    const user = AUTH.user;
    let right;
    if (user) {
      const sellerLink = user.role === 'seller'
        ? `<a href="/seller" data-i18n="seller">${esc(t('seller'))}</a>
           <a href="/sold" data-i18n="sold">${esc(t('sold'))}</a>` : '';
      right = `
        <a href="/" data-i18n="home">${esc(t('home'))}</a>
        ${sellerLink}
        <a href="/profile" data-i18n="profile">${esc(t('profile'))}</a>
        <a href="/cart" id="cart-link" data-i18n="cart">${esc(t('cart'))}<span class="badge hidden"></span></a>
        <button id="logout-btn" data-i18n="logout">${esc(t('logout'))}</button>
      `;
    } else {
      right = `
        <a href="/" data-i18n="home">${esc(t('home'))}</a>
        <a href="/login" data-i18n="profile">${esc(t('profile'))}</a>
        <a href="/cart" id="cart-link" data-i18n="cart">${esc(t('cart'))}<span class="badge hidden"></span></a>
      `;
    }
    host.innerHTML = `
      <div class="site-header">
        <a class="brand" href="/">SARDOR ART</a>
        <nav class="nav">${right}</nav>
      </div>
    `;
    updateCartBadge();

    const lo = document.getElementById('logout-btn');
    if (lo) {
      lo.addEventListener('click', async () => {
        try { await api('/api/auth/logout', { method: 'POST', body: {} }); } catch {}
        AUTH.user = null; window.location.href = '/';
      });
    }
  }
  window.buildHeader = buildHeader;

  function buildFooter() {
    const host = document.getElementById('site-footer');
    if (!host) return;
    const phoneSafe = '+998 90 000 00 00';
    host.innerHTML = `
      <footer class="site-footer">
        <div class="footer-inner">
          <div class="muted">SARDOR ART &copy; ${new Date().getFullYear()} &nbsp;|&nbsp;
            <a href="tel:${esc(phoneSafe)}">${esc(phoneSafe)}</a>
          </div>
          <div class="pay-icons" aria-label="Payment methods">
            <span class="humo">HUMO</span>
            <span class="uzcard">UZCARD</span>
            <span class="visa">VISA</span>
            <span class="mastercard">MASTERCARD</span>
          </div>
        </div>
      </footer>
    `;
  }
  window.buildFooter = buildFooter;

  async function boot() {
    await refreshAuth();
    await buildHeader();
    buildFooter();

    const page = document.body.getAttribute('data-page');
    if (page === 'index' && typeof window.initIndex === 'function') window.initIndex();
    if (page === 'product' && typeof window.initProduct === 'function') window.initProduct();
    if (page === 'cart' && typeof window.initCart === 'function') window.initCart();
    if (page === 'checkout' && typeof window.initCheckout === 'function') window.initCheckout();
    if (page === 'profile' && typeof window.initProfile === 'function') window.initProfile();
    if (page === 'login' && typeof window.initLogin === 'function') window.initLogin();
    if (page === 'seller' && typeof window.initSeller === 'function') window.initSeller();
    if (page === 'sold' && typeof window.initSold === 'function') window.initSold();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
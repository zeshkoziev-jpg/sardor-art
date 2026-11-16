//test
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  window.esc = esc;

  const DICT = {
    uz: {
      profile: 'Profil', cart: 'Savat', logout: 'Chiqish', seller: 'Savdogar', sold: 'Sotilganlar',
      home: 'Bosh sahifa', catalog_title: 'Asarlar', catalog_empty: 'Hech narsa topilmadi.',
      buy: 'Sotib olish', add_to_cart: 'Savatga qo\'shish', added: 'Savatga qo\'shildi', price: 'Narx', back: 'Orqaga',
      cart_title: 'Savat', cart_empty: 'Savat bo\'sh.', remove: 'O\'chirish', total: 'Jami', checkout: 'Buyurtma berish',
      checkout_title: 'Buyurtmani rasmiylashtirish', name: 'Ism', phone: 'Telefon', address: 'Manzil',
      get_location: 'Joylashuvni aniqlash', location_ok: 'Joylashuv olindi', location_err: 'Joylashuvni olib bo\'lmadi',
      submit_order: 'Buyurtmani tasdiqlash', order_ok: 'Buyurtma qabul qilindi!', profile_title: 'Profil',
      choose_role: 'Rolni tanlang', customer: 'Mijoz', seller_role: 'Savdogar', role_saved: 'Rol saqlandi',
      login_title: 'Kirish', seller_title: 'Savdogar paneli', product_name: 'Asar nomi', image: 'Rasm',
      create: 'Yaratish', make_public: 'Ommaga taqdim etish', my_works: 'Mening asarlarim', no_works: 'Hozircha asarlaringiz yo\'q.',
      delete: 'O\'chirish', sold_title: 'Sotilganlar', no_sold: 'Hozircha sotilmagan.', buyer: 'Mijoz', map: 'Xarita',
      required: 'To\'ldiring', invalid_phone: 'Telefon formati +998XXXXXXXXX', loading: 'Yuklanmoqda...',
      login_needed: 'Avval tizimga kiring', access_denied: 'Ruxsat yo\'q', error_generic: 'Xatolik yuz berdi',
      confirm_delete: 'O\'chirishni tasdiqlaysizmi?', image_required: 'Rasm tanlang', total_sold: 'Jami sotuv', map_open: 'Xaritada ochish'
    },
    ru: {
      profile: 'Профиль', cart: 'Корзина', logout: 'Выйти', seller: 'Продавец', sold: 'Продано',
      home: 'Главная', catalog_title: 'Работы', catalog_empty: 'Ничего не найдено.',
      buy: 'Купить', add_to_cart: 'В корзину', added: 'Добавлено в корзину', price: 'Цена', back: 'Назад',
      cart_title: 'Корзина', cart_empty: 'Корзина пуста.', remove: 'Удалить', total: 'Итого', checkout: 'Оформить',
      checkout_title: 'Оформление заказа', name: 'Имя', phone: 'Телефон', address: 'Адрес',
      get_location: 'Определить местоположение', location_ok: 'Местоположение получено', location_err: 'Не удалось получить местоположение',
      submit_order: 'Подтвердить заказ', order_ok: 'Заказ принят!', profile_title: 'Профиль',
      choose_role: 'Выберите роль', customer: 'Клиент', seller_role: 'Продавец', role_saved: 'Роль сохранена',
      login_title: 'Вход', seller_title: 'Панель продавца', product_name: 'Название', image: 'Изображение',
      create: 'Создать', make_public: 'Опубликовать', my_works: 'Мои работы', no_works: 'У вас пока нет работ.',
      delete: 'Удалить', sold_title: 'Продажи', no_sold: 'Пока нет продаж.', buyer: 'Клиент', map: 'Карта',
      required: 'Заполните', invalid_phone: 'Формат +998XXXXXXXXX', loading: 'Загрузка...',
      login_needed: 'Сначала войдите', access_denied: 'Нет доступа', error_generic: 'Произошла ошибка',
      confirm_delete: 'Подтвердить удаление?', image_required: 'Выберите изображение', total_sold: 'Всего продаж', map_open: 'Открыть на карте'
    },
    en: {
      profile: 'Profile', cart: 'Cart', logout: 'Logout', seller: 'Seller', sold: 'Sold',
      home: 'Home', catalog_title: 'Works', catalog_empty: 'Nothing found.',
      buy: 'Buy', add_to_cart: 'Add to cart', added: 'Added to cart', price: 'Price', back: 'Back',
      cart_title: 'Cart', cart_empty: 'Cart is empty.', remove: 'Remove', total: 'Total', checkout: 'Checkout',
      checkout_title: 'Checkout', name: 'Name', phone: 'Phone', address: 'Address',
      get_location: 'Detect location', location_ok: 'Location captured', location_err: 'Could not get location',
      submit_order: 'Place order', order_ok: 'Order placed!', profile_title: 'Profile',
      choose_role: 'Choose role', customer: 'Customer', seller_role: 'Seller', role_saved: 'Role saved',
      login_title: 'Login', seller_title: 'Seller panel', product_name: 'Product name', image: 'Image',
      create: 'Create', make_public: 'Publish', my_works: 'My works', no_works: 'You have no works yet.',
      delete: 'Delete', sold_title: 'Sold', no_sold: 'No sales yet.', buyer: 'Buyer', map: 'Map',
      required: 'Fill in', invalid_phone: 'Format +998XXXXXXXXX', loading: 'Loading...',
      login_needed: 'Please log in first', access_denied: 'Access denied', error_generic: 'Something went wrong',
      confirm_delete: 'Confirm deletion?', image_required: 'Pick an image', total_sold: 'Total sales', map_open: 'Open in map'
    }
  };

  function getLang() { let l = localStorage.getItem('lang'); return (l && DICT[l]) ? l : 'uz'; }
  function setLang(l) { if (!DICT[l]) return; localStorage.setItem('lang', l); applyTranslations(); document.dispatchEvent(new CustomEvent('langchange')); }
  function t(key) { return (DICT[getLang()] && DICT[getLang()][key]) || key; }
  window.t = t; window.getLang = getLang; window.setLang = setLang;

  function applyTranslations() {
    document.documentElement.lang = getLang();
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder'))); });
  }
  window.applyTranslations = applyTranslations;

  async function api(url, opts = {}) {
    const opt =` { method: opts.method  'GET', credentials: 'same-origin', headers: Object.assign({ 'Content-Type': 'application/json' }, opts.headers  {}) }`;
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

  function toast(msg, type) {
    let el = document.querySelector('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.remove('error', 'ok'); if (type) el.classList.add(type);
    el.classList.add('show');
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2400);
  }
  window.toast = toast;

  let AUTH = { user: null };
  async function refreshAuth() {
    try { const j = await api('/api/auth/me'); AUTH.user = j.user || null; } catch { AUTH.user = null; }
    return AUTH.user;
  }
  window.getAuth = () => AUTH.user;
  window.refreshAuth = refreshAuth;

  const CART_KEY = 'sardor_cart';
  function getCart() { try { const arr = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); return Array.isArray(arr) ? arr.filter(x => x && x.id) : []; } catch { return []; } }
  function setCart(arr) { localStorage.setItem(CART_KEY, JSON.stringify(arr)); updateCartBadge(); }
  function addToCart(item) {
    const cart = getCart();
    const found = cart.find((x) => x.id === item.id);
    if (found) found.qty = Math.min(99, Number(found.qty) + Number(item.qty || 1));
    else cart.push(`{ id: String(item.id), name: String(item.name  ''), price: Number(item.price  0), image: String(item.image  ''), qty: Math.max(1, Number(item.qty)  1) }`);
    setCart(cart);
  }
  function cartCount() { return getCart().reduce((s, x) => s + Number(x.qty || 0), 0); }
  window.getCart = getCart; window.setCart = setCart; window.addToCart = addToCart; window.cartCount = cartCount;

  function fmtMoney(n) { try { return Number(n).toLocaleString('ru-RU') + ' so\'m'; } catch { return n + ' so\'m'; } }
  window.fmtMoney = fmtMoney;
  function updateCartBadge() {
    const b = document.querySelector('#cart-link .badge');
    if (!b) return;
    const c = cartCount(); b.textContent = c > 0 ? String(c) : ''; b.classList.toggle('hidden', c === 0);
  }

  async function buildHeader() {
    const host = document.getElementById('site-header');
    if (!host) return;
    const user = AUTH.user;
    let right;
    if (user) {
      const sellerLink = user.role === 'seller' ? `<a href="/seller" data-i18n="seller">${esc(t('seller'))}</a><a href="/sold" data-i18n="sold">${esc(t('sold'))}</a>` : '';
      right = `<a href="/" data-i18n="home">${esc(t('home'))}</a>${sellerLink}<a href="/profile" data-i18n="profile">${esc(t('profile'))}</a><a href="/cart" id="cart-link" data-i18n="cart">${esc(t('cart'))}<span class="badge hidden"></span></a><button id="logout-btn" data-i18n="logout">${esc(t('logout'))}</button>`;
    } else {
      right = `<a href="/" data-i18n="home">${esc(t('home'))}</a><a href="/login" data-i18n="profile">${esc(t('profile'))}</a><a href="/cart" id="cart-link" data-i18n="cart">${esc(t('cart'))}<span class="badge hidden"></span></a>`;
    }
    host.innerHTML = <div class="site-header"><a class="brand" href="/">SARDOR ART</a><nav class="nav">${right}</nav></div>;
    updateCartBadge();
    const lo = document.getElementById('logout-btn');
    if (lo) lo.addEventListener('click', async () => { try { await api('/api/auth/logout', { method: 'POST', body: {} }); } catch {} AUTH.user = null; window.location.href = '/'; });
  }
  window.buildHeader = buildHeader;

  function buildFooter() {
    const host = document.getElementById('site-footer');
    if (!host) return;
    const phoneSafe = '+998 90 000 00 00';
    host.innerHTML = <footer class="site-footer"><div class="footer-inner"><div class="muted">SARDOR ART &copy; ${new Date().getFullYear()} | <a href="tel:${esc(phoneSafe)}">${esc(phoneSafe)}</a></div><div class="pay-icons"><span class="humo">HUMO</span><span class="uzcard">UZCARD</span><span class="visa">VISA</span><span class="mastercard">MASTERCARD</span></div></div></footer>;
  }
  window.buildFooter = buildFooter;

  async function boot() {
    await refreshAuth();
    await buildHeader();
    buildFooter();
    applyTranslations();
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
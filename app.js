/* SARDOR ART — vanilla front-end yadro
 * - Header/Footer inyeksiyasi
 * - Tarjimalar (uz/ru/en)
 * - API yordamchilari
 * - Savat (localStorage)
 * - Esc (XSS himoya)
 */
(function () {
  'use strict';

  /* ---------- esc ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  window.esc = esc;

  /* ---------- i18n ---------- */
  const DICT = {
    uz: {
      profile: 'Profil',
      cart: 'Savat',
      logout: 'Chiqish',
      seller: 'Savdogar',
      sold: 'Sotilganlar',
      home: 'Bosh sahifa',
      catalog_title: 'Asarlar',
      catalog_empty: 'Hozircha asarlar yo\'q.',
      buy: 'Sotib olish',
      add_to_cart: 'Savatga qo\'shish',
      added: 'Savatga qo\'shildi',
      price: 'Narx',
      back: 'Orqaga',
      cart_title: 'Savat',
      cart_empty: 'Savat bo\'sh.',
      remove: 'O\'chirish',
      total: 'Jami',
      checkout: 'Buyurtma berish',
      checkout_title: 'Buyurtmani rasmiylashtirish',
      name: 'Ism',
      phone: 'Telefon',
      address: 'Manzil',
      get_location: 'Joylashuvni aniqlash',
      location_ok: 'Joylashuv olindi',
      location_err: 'Joylashuvni olib bo\'lmadi',
      submit_order: 'Buyurtmani tasdiqlash',
      order_ok: 'Buyurtma qabul qilindi!',
      profile_title: 'Profil',
      choose_role: 'Rolni tanlang',
      customer: 'Mijoz',
      seller_role: 'Savdogar',
      role_saved: 'Rol saqlandi',
      login_title: 'Kirish',
      phone_label: 'Telefon raqam',
      send_code: 'Kod yuborish',
      code_label: 'SMS kod (6 xona)',
      verify: 'Tasdiqlash',
      resend_in: 'Qayta yuborish',
      login_ok: 'Muvaffaqiyatli kirdingiz',
      seller_title: 'Savdogar paneli',
      product_name: 'Asar nomi',
      image: 'Rasm',
      create: 'Yaratish',
      make_public: 'Ommaga taqdim etish',
      my_works: 'Mening asarlarim',
      no_works: 'Hozircha asarlaringiz yo\'q.',
      delete: 'O\'chirish',
      sold_title: 'Sotilganlar',
      no_sold: 'Hozircha sotilmagan.',
      buyer: 'Mijoz',
      map: 'Xarita',
      required: 'To\'ldiring',
      invalid_phone: 'Telefon formati +998XXXXXXXXX',
      loading: 'Yuklanmoqda...',
      login_needed: 'Avval tizimga kiring',
      access_denied: 'Ruxsat yo\'q',
      error_generic: 'Xatolik yuz berdi',
      out_of_stock: 'Mavjud emas',
      qty: 'Soni',
      map_open: 'Xaritada ochish',
      confirm_delete: 'O\'chirishni tasdiqlaysizmi?',
      too_many: 'Juda ko\'p urinish. Kuting.',
      wrong_code: 'Kod xato',
      code_expired: 'Kod muddati tugagan',
      sms_sent: 'SMS yuborildi',
      image_required: 'Rasm tanlang',
      tg_optional: 'Telegram (ixtiyoriy)',
      total_works: 'Jami asarlar',
      total_sold: 'Jami sotuv'
    },
    ru: {
      profile: 'Профиль',
      cart: 'Корзина',
      logout: 'Выйти',
      seller: 'Продавец',
      sold: 'Продано',
      home: 'Главная',
      catalog_title: 'Работы',
      catalog_empty: 'Пока нет работ.',
      buy: 'Купить',
      add_to_cart: 'В корзину',
      added: 'Добавлено в корзину',
      price: 'Цена',
      back: 'Назад',
      cart_title: 'Корзина',
      cart_empty: 'Корзина пуста.',
      remove: 'Удалить',
      total: 'Итого',
      checkout: 'Оформить',
      checkout_title: 'Оформление заказа',
      name: 'Имя',
      phone: 'Телефон',
      address: 'Адрес',
      get_location: 'Определить местоположение',
      location_ok: 'Местоположение получено',
      location_err: 'Не удалось получить местоположение',
      submit_order: 'Подтвердить заказ',
      order_ok: 'Заказ принят!',
      profile_title: 'Профиль',
      choose_role: 'Выберите роль',
      customer: 'Клиент',
      seller_role: 'Продавец',
      role_saved: 'Роль сохранена',
      login_title: 'Вход',
      phone_label: 'Телефон',
      send_code: 'Отправить код',
      code_label: 'SMS код (6 цифр)',
      verify: 'Подтвердить',
      resend_in: 'Повторно',
      login_ok: 'Успешный вход',
      seller_title: 'Панель продавца',
      product_name: 'Название',
      image: 'Изображение',
      create: 'Создать',
      make_public: 'Опубликовать',
      my_works: 'Мои работы',
      no_works: 'У вас пока нет работ.',
      delete: 'Удалить',
      sold_title: 'Продажи',
      no_sold: 'Пока нет продаж.',
      buyer: 'Клиент',
      map: 'Карта',
      required: 'Заполните',
      invalid_phone: 'Формат +998XXXXXXXXX',
      loading: 'Загрузка...',
      login_needed: 'Сначала войдите',
      access_denied: 'Нет доступа',
      error_generic: 'Произошла ошибка',
      out_of_stock: 'Нет в наличии',
      qty: 'Кол-во',
      map_open: 'Открыть на карте',
      confirm_delete: 'Подтвердить удаление?',
      too_many: 'Слишком много попыток. Подождите.',
      wrong_code: 'Неверный код',
      code_expired: 'Код истёк',
      sms_sent: 'SMS отправлен',
      image_required: 'Выберите изображение',
      tg_optional: 'Telegram (опционально)',
      total_works: 'Всего работ',
      total_sold: 'Всего продаж'
    },
    en: {
      profile: 'Profile',
      cart: 'Cart',
      logout: 'Logout',
      seller: 'Seller',
      sold: 'Sold',
      home: 'Home',
      catalog_title: 'Works',
      catalog_empty: 'No works yet.',
      buy: 'Buy',
      add_to_cart: 'Add to cart',
      added: 'Added to cart',
      price: 'Price',
      back: 'Back',
      cart_title: 'Cart',
      cart_empty: 'Cart is empty.',
      remove: 'Remove',
      total: 'Total',
      checkout: 'Checkout',
      checkout_title: 'Checkout',
      name: 'Name',
      phone: 'Phone',
      address: 'Address',
      get_location: 'Detect location',
      location_ok: 'Location captured',
      location_err: 'Could not get location',
      submit_order: 'Place order',
      order_ok: 'Order placed!',
      profile_title: 'Profile',
      choose_role: 'Choose role',
      customer: 'Customer',
      seller_role: 'Seller',
      role_saved: 'Role saved',
      login_title: 'Login',
      phone_label: 'Phone number',
      send_code: 'Send code',
      code_label: 'SMS code (6 digits)',
      verify: 'Verify',
      resend_in: 'Resend',
      login_ok: 'Logged in',
      seller_title: 'Seller panel',
      product_name: 'Product name',
      image: 'Image',
      create: 'Create',
      make_public: 'Publish',
      my_works: 'My works',
      no_works: 'You have no works yet.',
      delete: 'Delete',
      sold_title: 'Sold',
      no_sold: 'No sales yet.',
      buyer: 'Buyer',
      map: 'Map',
      required: 'Fill in',
      invalid_phone: 'Format +998XXXXXXXXX',
      loading: 'Loading...',
      login_needed: 'Please log in first',
      access_denied: 'Access denied',
      error_generic: 'Something went wrong',
      out_of_stock: 'Out of stock',
      qty: 'Qty',
      map_open: 'Open in map',
      confirm_delete: 'Confirm deletion?',
      too_many: 'Too many attempts. Wait.',
      wrong_code: 'Wrong code',
      code_expired: 'Code expired',
      sms_sent: 'SMS sent',
      image_required: 'Pick an image',
      tg_optional: 'Telegram (optional)',
      total_works: 'Total works',
      total_sold: 'Total sales'
    }
  };

  function getLang() {
    let l = null;
    try { l = localStorage.getItem('lang'); } catch {}
    if (!l || !DICT[l]) l = 'uz';
    return l;
  }
  function setLang(l) {
    if (!DICT[l]) return;
    try { localStorage.setItem('lang', l); } catch {}
    applyTranslations();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: l } }));
  }
  function t(key) {
    const l = getLang();
    return (DICT[l] && DICT[l][key]) || key;
  }
  window.t = t;
  window.getLang = getLang;
  window.setLang = setLang;
  function applyTranslations() {
    document.documentElement.lang = getLang();
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) el.setAttribute('placeholder', t(key));
    });
  }
  window.applyTranslations = applyTranslations;

  /* ---------- API ---------- */
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
      err.status = r.status;
      err.data = j;
      throw err;
    }
    return j;
  }
  window.api = api;

  /* ---------- Toast ---------- */
  function toast(msg, type) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.remove('error', 'ok');
    if (type) el.classList.add(type);
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2400);
  }
  window.toast = toast;

  /* ---------- Auth state ---------- */
  let AUTH = { user: null };

  async function refreshAuth() {
    try {
      const j = await api('/api/auth/me');
      AUTH.user = j.user || null;
    } catch {
      AUTH.user = null;
    }
    return AUTH.user;
  }
  window.getAuth = () => AUTH.user;
  window.refreshAuth = refreshAuth;

  /* ---------- Cart ---------- */
  const CART_KEY = 'sardor_cart';
  function getCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return [];
      return arr.filter((x) => x && typeof x.id === 'string' && Number.isFinite(Number(x.qty)) && Number(x.qty) > 0);
    } catch { return []; }
  }
  function setCart(arr) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(arr)); } catch {}
    updateCartBadge();
    document.dispatchEvent(new CustomEvent('cartchange'));
  }
  function addToCart(item) {
    const cart = getCart();
    const found = cart.find((x) => x.id === item.id);
    if (found) found.qty = Math.min(99, Number(found.qty) + Number(item.qty || 1));
    else cart.push({
      id: String(item.id),
      name: String(item.name || ''),
      price: Number(item.price || 0),
      image: String(item.image || ''),
      qty: Math.max(1, Math.min(99, Number(item.qty) || 1))
    });
    setCart(cart);
  }
  function removeFromCart(id) {
    setCart(getCart().filter((x) => x.id !== id));
  }
  function setQty(id, qty) {
    const cart = getCart();
    const f = cart.find((x) => x.id === id);
    if (!f) return;
    f.qty = Math.max(1, Math.min(99, Math.floor(Number(qty) || 1)));
    setCart(cart);
  }
  function cartCount() {
    return getCart().reduce((s, x) => s + Number(x.qty || 0), 0);
  }
  function cartTotal() {
    return getCart().reduce((s, x) => s + Number(x.price || 0) * Number(x.qty || 0), 0);
  }
  function clearCart() { setCart([]); }
  Object.assign(window, {
    getCart, setCart, addToCart, removeFromCart, setQty, cartCount, cartTotal, clearCart
  });

  function fmtMoney(n) {
    try { return Number(n).toLocaleString('ru-RU') + ' so\'m'; }
    catch { return n + ' so\'m'; }
  }
  window.fmtMoney = fmtMoney;

  /* ---------- Header ---------- */
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
        ? `<a href="/seller" data-i18n="seller">${esc(t('seller'))}</a><a href="/sold" data-i18n="sold">${esc(t('sold'))}</a>`
        : '';
      right = <a href="/" data-i18n="home">${esc(t('home'))}</a>
       `${sellerLink}<a href="/profile" data-i18n="profile">${esc(t('profile'))}</a><a href="/cart" id="cart-link" data-i18n="cart">${esc(t('cart'))}<span class="badge hidden"></span></a><button id="logout-btn" data-i18n="logout">${esc(t('logout'))}</button>`;
    } else {
      right = `
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
        AUTH.user = null;
        window.location.href = '/';
      });
    }
  }
  window.buildHeader = buildHeader;

  /* ---------- Footer ---------- */
  function buildFooter() {
    const host = document.getElementById('site-footer');
    if (!host) return;
    const phone = '%PHONE%';
    const phoneSafe = phone && phone !== '%PHONE%' ? phone : '+998 90 000 00 00';
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
          <div class="lang-switch" role="group" aria-label="Language">
            <button data-lang="uz">UZ</button>
            <button data-lang="ru">RU</button>
            <button data-lang="en">EN</button>
          </div>
        </div>
      </footer>
    `;
    const cur = getLang();
    host.querySelectorAll('.lang-switch button').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-lang') === cur);
      b.addEventListener('click', () => {
        setLang(b.getAttribute('data-lang'));
        host.querySelectorAll('.lang-switch button').forEach((x) => {
          x.classList.toggle('active', x.getAttribute('data-lang') === getLang());
        });
      });
    });
  }
  window.buildFooter = buildFooter;

  /* ---------- Init ---------- */
  async function boot() {
    await refreshAuth();
    await buildHeader();
    buildFooter();
    applyTranslations();
    document.addEventListener('langchange', async () => {
      await buildHeader();
      applyTranslations();
    });
    document.addEventListener('cartchange', updateCartBadge);

    // page-specific init
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
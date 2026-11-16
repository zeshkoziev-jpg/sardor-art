'use strict';

require('dotenv').config();
require('dotenv').config({ path: '/etc/secrets/.env' });

const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data.json');
const UPLOADS_DIR = path.join(ROOT, 'uploads');

const PHONE_RE = /^\+998\d{9}$/;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_IMAGE_BASE64 = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/* ---------- data.json ---------- */
const DEFAULT_DATA = {
  sessions: {},
  users: {},
  products: [],
  orders: [],
  smsCodes: {},
  telegramAuth: {},
  rateLimit: {}
};

let DATA = null;
let WRITE_QUEUE = Promise.resolve();

async function loadData() {
  try {
    const raw = await fsp.readFile(DATA_FILE, 'utf8');
    DATA = { ...DEFAULT_DATA, ...JSON.parse(raw) };
  } catch (e) {
    DATA = structuredClone(DEFAULT_DATA);
    await saveData();
  }
}

function saveData() {
  WRITE_QUEUE = WRITE_QUEUE.then(async () => {
    const tmp = DATA_FILE + '.' + crypto.randomBytes(6).toString('hex') + '.tmp';
    const body = JSON.stringify(DATA, null, 2);
    await fsp.writeFile(tmp, body, 'utf8');
    await fsp.rename(tmp, DATA_FILE);
  }).catch((e) => console.error('saveData error:', e));
  return WRITE_QUEUE;
}

/* ---------- helpers ---------- */
function newToken() { return crypto.randomBytes(32).toString('hex'); }

function getSession(req) {
  const token = req.cookies && req.cookies.sid;
  if (!token) return null;
  const s = DATA.sessions[token];
  if (!s) return null;
  if (Date.now() - s.createdAt > 30 * 24 * 60 * 60 * 1000) {
    delete DATA.sessions[token];
    saveData();
    return null;
  }
  return { token, ...s };
}

function setSessionCookie(res, token) {
  res.cookie('sid', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/'
  });
}

function validatePhone(p) { return typeof p === 'string' && PHONE_RE.test(p); }
function validateName(n) { return typeof n === 'string' && n.trim().length >= 2 && n.trim().length <= 80; }
function validatePrice(p) { const n = Number(p); return Number.isFinite(n) && n > 0 && n <= 1000000000 && Math.floor(n) === n; }
function validateLatLng(lat, lng) { const la = Number(lat), ln = Number(lng); return Number.isFinite(la) && Number.isFinite(ln) && la >= -90 && la <= 90 && ln >= -180 && ln <= 180; }

/* ---------- Express ---------- */
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
  const csp = [
    "default-src 'self'",
    "img-src 'self' data: blob: https://*.google.com https://*.gstatic.com",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline'",
    "connect-src 'self'",
    "frame-src https://www.google.com",
    "font-src 'self' data:",
  ].join('; ');
  res.setHeader('Content-Security-Policy', csp);
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());

app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));
app.use(express.static(ROOT, { index: false }));

/* ---------- AUTH & TELEGRAM ---------- */
app.get('/api/auth/me', (req, res) => {
  const s = getSession(req);
  if (!s) return res.json({ ok: true, user: null });
  res.json({ ok: true, user: { phone: s.phone, role: s.role } });
});

app.post('/api/auth/logout', (req, res) => {
  const s = getSession(req);
  if (s) { delete DATA.sessions[s.token]; saveData(); }
  res.clearCookie('sid', { path: '/' });
  res.json({ ok: true });
});

app.post('/api/auth/telegram/init', (req, res) => {
  const token = crypto.randomBytes(16).toString('hex');
  for (const [k, v] of Object.entries(DATA.telegramAuth)) {
    if (Date.now() - v.createdAt > 15 * 60 * 1000) delete DATA.telegramAuth[k];
  }
  DATA.telegramAuth[token] = { status: 'pending', createdAt: Date.now() };
  saveData();
  const botName = process.env.TELEGRAM_BOT_NAME || 'SardorArtBot';
  res.json({ ok: true, token, url: `https://t.me/${botName}?start=${token}` });
});

app.get('/api/auth/telegram/check', (req, res) => {
  const token = req.query.token;
  const auth = DATA.telegramAuth[token];
  if (auth && auth.status === 'confirmed') {
    const phone = auth.phone;
    if (!DATA.users[phone]) DATA.users[phone] = { phone, role: 'customer', createdAt: Date.now() };
    const sessionToken = newToken();
    DATA.sessions[sessionToken] = { phone, role: DATA.users[phone].role, createdAt: Date.now() };
    delete DATA.telegramAuth[token];
    saveData();
    setSessionCookie(res, sessionToken);
    return res.json({ ok: true, role: DATA.users[phone].role });
  }
  res.json({ ok: false, status: auth ? auth.status : 'not_found' });
});

app.post('/api/telegram/webhook', async (req, res) => {
  try {
    res.sendStatus(200);
    const { message } = req.body || {};
    if (!message || !message.text) return;
    let text = message.text.trim();
    const chatId = message.chat.id;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const baseUrl = process.env.BASE_URL || 'https://sardor-art.onrender.com';

    const sendTgMsg = async (msgText, markup = null) => {
      const body = { chat_id: chatId, text: msgText, parse_mode: 'HTML' };
      if (markup) body.reply_markup = markup;
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    };

    let activeToken = null;
    for (const [token, data] of Object.entries(DATA.telegramAuth)) {
      if (data.chatId === chatId && data.status !== 'confirmed') {
        activeToken = token;
        break;
      }
    }

    if (text.startsWith('/start ')) {
      const token = text.split(' ')[1];
      if (DATA.telegramAuth[token]) {
        DATA.telegramAuth[token].chatId = chatId;
        DATA.telegramAuth[token].status = 'waiting_phone';
        await saveData();
        await sendTgMsg("Assalomu alaykum! SARDOR ART saytiga kirish uchun iltimos, <b>telefon raqamingizni</b> yuboring.\n(Masalan: +998901234567)");
      } else {
        await sendTgMsg("Xatolik: Havola eskirgan. Iltimos, saytga qaytib, qaytadan urinib ko'ring.");
      }
      return;
    }

    if (!activeToken) return;
    const authData = DATA.telegramAuth[activeToken];

    if (authData.status === 'waiting_phone') {
      const cleanPhone = text.replace(/[^\d+]/g, '');
      if (!validatePhone(cleanPhone)) {
        await sendTgMsg("Iltimos, telefon raqamni to'g'ri formatda kiriting.\n(Masalan: +998901234567)");
        return;
      }
      const code = String(Math.floor(100000 + Math.random() * 900000));
      authData.phone = cleanPhone;
      authData.code = code;
      authData.status = 'waiting_code';
      await saveData();
      await sendTgMsg(`Rahmat! Tizimga kirish uchun tasdiqlash kodi:\n\n👉 <b>${code}</b>\n\nIltimos, shu kodni menga qaytarib yuboring.`);
      return;
    }

    if (authData.status === 'waiting_code') {
      if (text !== authData.code) {
        await sendTgMsg("Kod xato. Iltimos qaytadan urinib ko'ring.");
        return;
      }
      const phone = authData.phone;
      const firstName = message.chat.first_name || 'Mijoz';
      if (!DATA.users[phone]) {
        DATA.users[phone] = { phone, role: 'customer', name: firstName, createdAt: Date.now() };
      }
      authData.status = 'confirmed';
      await saveData();
      await sendTgMsg("✅ Muvaffaqiyatli ro'yxatdan o'tdingiz!\nEndi quyidagi tugma orqali saytga qaytishingiz mumkin.", {
        inline_keyboard: [[{ text: "🌐 Saytga qaytish", url: `${baseUrl}/profile` }]]
      });
      return;
    }
  } catch (err) {
    console.error("Webhook xatosi:", err);
  }
});

/* ---------- PROFILE & PRODUCTS (QIDIRUV VA JANRLAR BILAN) ---------- */
app.post('/api/profile/role', (req, res) => {
  const s = getSession(req);
  if (!s) return res.status(401).json({ ok: false, error: 'UNAUTH' });
  const { role } = req.body || {};
  if (!['customer', 'seller'].includes(role)) return res.status(400).json({ ok: false, error: 'INVALID_ROLE' });
  DATA.users[s.phone].role = role;
  DATA.sessions[s.token].role = role;
  saveData();
  res.json({ ok: true, role });
});

// Qidiruv va Janr bo'yicha filterlash
app.get('/api/products', (req, res) => {
  let list = DATA.products.filter((p) => p.public);

  const { q, genre } = req.query;
  if (q) list = list.filter((p) => p.name.toLowerCase().includes(String(q).toLowerCase()));
  if (genre && genre !== 'Barchasi') list = list.filter((p) => p.genre === genre);

  list.sort((a, b) => b.createdAt - a.createdAt);
  res.json({
    ok: true,
    products: list.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      image: p.image,
      genre: p.genre || 'Boshqa',
      paymentType: p.paymentType || '100% oldindan'
    }))
  });
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
  if (req.path.endsWith('.js') || req.path.endsWith('.css')) {
    return res.status(404).send('File not found');
  }
  res.status(404).sendFile(path.join(ROOT, 'index.html'));
});
  res.json({
    ok: true,
    product: {
      id: p.id,
      name: p.name,
      price: p.price,
      image: p.image,
      sellerName: p.sellerName,
      createdAt: p.createdAt,
      genre: p.genre || 'Boshqa',
      paymentType: p.paymentType || '100% oldindan'
    }
  });

/* ---------- SELLER ---------- */
app.get('/api/seller/products', (req, res) => {
  const s = getSession(req);
  if (!s || s.role !== 'seller') return res.status(403).json({ ok: false });
  const list = DATA.products.filter((p) => p.sellerPhone === s.phone).sort((a, b) => b.createdAt - a.createdAt);
  res.json({ ok: true, products: list });
});

app.post('/api/seller/products', async (req, res) => {
  const s = getSession(req);
  if (!s || s.role !== 'seller') return res.status(403).json({ ok: false });
  const { name, price, imageBase64, imageType, isPublic, genre, paymentType } = req.body || {};

  if (!validateName(name) || !validatePrice(price)) return res.status(400).json({ ok: false });
  if (
    typeof imageBase64 !== 'string' ||
    imageBase64.length === 0 ||
    imageBase64.length > MAX_IMAGE_BASE64 ||
    !ALLOWED_IMAGE_TYPES.has(imageType)
  ) {
    return res.status(400).json({ ok: false, error: 'INVALID_IMAGE' });
  }

  const id = crypto.randomBytes(10).toString('hex');
  const ext = imageType === 'image/png' ? 'png' : imageType === 'image/webp' ? 'webp' : 'jpg';
  const filename = `${id}.${ext}`;

  await fsp.mkdir(UPLOADS_DIR, { recursive: true });
  await fsp.writeFile(path.join(UPLOADS_DIR, filename), Buffer.from(imageBase64, 'base64'));

  const product = {
    id,
    name: name.trim(),
    price: Number(price),
    image: '/uploads/' + filename,
    sellerPhone: s.phone,
    sellerName: 'Savdogar ' + s.phone.slice(-4),
    public: !!isPublic,
    createdAt: Date.now(),
    genre: genre || 'Boshqa',
    paymentType: paymentType || '100% oldindan'
  };
  DATA.products.push(product);
  await saveData();
  res.json({ ok: true, product });
});

app.delete('/api/seller/products/:id', async (req, res) => {
  const s = getSession(req);
  if (!s || s.role !== 'seller') return res.status(403).json({ ok: false });
  const idx = DATA.products.findIndex((p) => p.id === req.params.id && p.sellerPhone === s.phone);
  if (idx === -1) return res.status(404).json({ ok: false });
  DATA.products.splice(idx, 1);
  await saveData();
  res.json({ ok: true });
});

app.patch('/api/seller/products/:id/public', async (req, res) => {
  const s = getSession(req);
  if (!s || s.role !== 'seller') return res.status(403).json({ ok: false });
  const p = DATA.products.find((x) => x.id === req.params.id && x.sellerPhone === s.phone);
  if (!p) return res.status(404).json({ ok: false });
  p.public = !!req.body?.isPublic;
  await saveData();
  res.json({ ok: true, product: { id: p.id, public: p.public } });
});

/* ---------- ORDERS ---------- */
app.post('/api/orders', async (req, res) => {
  const s = getSession(req);
  if (!s || s.role !== 'customer') return res.status(403).json({ ok: false });
  const { items, buyerName, lat, lng, address } = req.body || {};
  if (!Array.isArray(items) || !validateName(buyerName) || !validateLatLng(lat, lng)) {
    return res.status(400).json({ ok: false });
  }

  const results = [];
  for (const it of items) {
    const p = DATA.products.find((x) => x.id === it.productId);
    if (p && p.public) {
      const order = {
        id: crypto.randomBytes(10).toString('hex'),
        productId: p.id,
        productName: p.name,
        price: p.price,
        qty: Number(it.qty) || 1,
        buyerPhone: s.phone,
        buyerName: buyerName.trim(),
        lat: Number(lat),
        lng: Number(lng),
        address,
        sellerPhone: p.sellerPhone,
        createdAt: Date.now()
      };
      DATA.orders.push(order);
      results.push(order);
    }
  }
  if (results.length === 0) return res.status(400).json({ ok: false });
  await saveData();
  res.json({ ok: true, orders: results });
});

app.get('/api/seller/sold', (req, res) => {
  const s = getSession(req);
  if (!s || s.role !== 'seller') return res.status(403).json({ ok: false });
  const list = DATA.orders.filter((o) => o.sellerPhone === s.phone).sort((a, b) => b.createdAt - a.createdAt);
  res.json({ ok: true, sold: list });
});

/* ---------- HTML routing ---------- */
const PAGES = {
  '/': 'index.html',
  '/product': 'product.html',
  '/cart': 'cart.html',
  '/profile': 'profile.html',
  '/login': 'login.html',
  '/checkout': 'checkout.html',
  '/seller': 'seller.html',
  '/sold': 'sold.html'
};
for (const [route, file] of Object.entries(PAGES)) {
  app.get(route, (req, res) => res.sendFile(path.join(ROOT, file)));
}

app.use((req, res) => { res.status(404).send('404'); });

/* ---------- start ---------- */
(async () => {
  await fsp.mkdir(UPLOADS_DIR, { recursive: true });
  await loadData();
  app.listen(PORT, () => {
    console.log(`SARDOR ART: http://localhost:${PORT}`);
  });
})();
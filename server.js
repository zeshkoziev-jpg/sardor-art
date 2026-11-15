'use strict';

require('dotenv').config();

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
const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB base64dan oldin
const MAX_IMAGE_BASE64 = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/* ---------- data.json (atomik yozish) ---------- */
const DEFAULT_DATA = {
  sessions: {},     // token -> { phone, role, createdAt }
  users: {},        // phone -> { phone, role, createdAt }
  products: [],     // { id, name, price, image, sellerPhone, sellerName, public, createdAt }
  orders: [],       // { id, productId, productName, price, buyerPhone, buyerName, lat, lng, address, sellerPhone, createdAt }
  smsCodes: {},     // phone -> { code, expiresAt, attempts, sentAt }
  rateLimit: {}     // ip -> { count, resetAt } (fallback, memory ham ishlaydi)
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
  // navbatga qo'yamiz: ketma-ket atomik yozish
  WRITE_QUEUE = WRITE_QUEUE.then(async () => {
    const tmp = DATA_FILE + '.' + crypto.randomBytes(6).toString('hex') + '.tmp';
    const body = JSON.stringify(DATA, null, 2);
    await fsp.writeFile(tmp, body, 'utf8');
    await fsp.rename(tmp, DATA_FILE);
  }).catch((e) => {
    console.error('saveData error:', e);
  });
  return WRITE_QUEUE;
}

/* ---------- helpers ---------- */
function escServer(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function newToken() {
  return crypto.randomBytes(32).toString('hex');
}

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

function clearSessionCookie(res) {
  res.clearCookie('sid', { path: '/' });
}

/* ---------- IP rate-limit (fixed window) ---------- */
const RATE_BUCKETS = new Map();
function rateLimit({ windowMs = 60_000, max = 60, key = null } = {}) {
  return (req, res, next) => {
    next(); // Cheklovlar vaqtincha o'chirilgan
  };
}
/* ---------- validatsiya ---------- */
function validatePhone(p) {
  return typeof p === 'string' && PHONE_RE.test(p);
  }
function validateName(n) {
  return typeof n === 'string' && n.trim().length >= 2 && n.trim().length <= 80;
}
function validatePrice(p) {
  const n = Number(p);
  return Number.isFinite(n) && n > 0 && n <= 1_000_000_000 && Math.floor(n) === n;
}
function validateLatLng(lat, lng) {
  const la = Number(lat), ln = Number(lng);
  return Number.isFinite(la) && Number.isFinite(ln) && la >= -90 && la <= 90 && ln >= -180 && ln <= 180;
}

/* ---------- Eskiz.uz SMS ---------- */
let ESKIZ_TOKEN = null;
let ESKIZ_TOKEN_EXP = 0;

async function eskizLogin() {
  const email = process.env.ESKIZ_EMAIL;
  const password = process.env.ESKIZ_PASSWORD;
  if (!email || !password) return null;
  const body = new URLSearchParams({ email, password });
  const r = await fetch('https://notify.eskiz.uz/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!r.ok) throw new Error('Eskiz login failed: ' + r.status);
  const j = await r.json();
  ESKIZ_TOKEN = j?.data?.token || null;
  ESKIZ_TOKEN_EXP = Date.now() + 23 * 60 * 60 * 1000;
  return ESKIZ_TOKEN;
}

async function sendSms(phone, message) {
  if (!process.env.ESKIZ_EMAIL || !process.env.ESKIZ_PASSWORD) {
    console.log([SMS-DEV] , '${phone}' , '${message}');
    return { dev: true };
  }
  async function sendSms(phone, message) {
  // Hozircha faqat konsolga chiqaradi (test rejimi)
  console.log(`\n[SMS-DEV] ${phone}:${message}\n`);
  return { dev: true };
}
  let r = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Bearer ' + ESKIZ_TOKEN
    },
    body
  });
  if (r.status === 401) {
    await eskizLogin();
    r = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Bearer ' + ESKIZ_TOKEN
      },
      body
    });
  }
  if (!r.ok) throw new Error('Eskiz send failed: ' + r.status);
  return r.json();
}

/* ---------- Telegram ---------- */
async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return { skipped: true };
  const r = await fetch('https://api.telegram.org/bot${token}/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: 'HTML' })
  });
  return r.json().catch(() => ({}));
}

/* ---------- Express ---------- */
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

// xavfsizlik sarlavhalari
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  const csp = [
    "default-src 'self'",
    "img-src 'self' data: blob: https://*.google.com https://*.gstatic.com https://*.googleapis.com",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline'",
    "connect-src 'self'",
    "frame-src https://www.google.com https://maps.google.com",
    "font-src 'self' data:",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; ');
  res.setHeader('Content-Security-Policy', csp);
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());

// static
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d', fallthrough: false }));
app.use(express.static(ROOT, {
  index: false,
  extensions: ['html'],
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store');
    }
  }
}));
// API endpointlar
/* ---------- AUTH ---------- */
app.post('/api/auth/request-code', rateLimit({ windowMs: 60_000, max: 10 }), async (req, res) => {
  try {
    const { phone } = req.body || {};
    if (!validatePhone(phone)) return res.status(400).json({ ok: false, error: 'INVALID_PHONE' });

    const now = Date.now();
    const prev = DATA.smsCodes[phone];
    if (prev && now - prev.sentAt < 60_000) {
      return res.status(429).json({
        ok: false,
        error: 'TOO_SOON',
        retryAfter: Math.ceil((60_000 - (now - prev.sentAt)) / 1000)
      });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    DATA.smsCodes[phone] = {
      code,
      expiresAt: now + 10 * 60 * 1000,
      attempts: 0,
      sentAt: now
    };
    await saveData();

    console.log('\n==============================');
    console.log('SIZNING KODINGIZ: ' + code);
    console.log('==============================\n');
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'SERVER' });
  }
});

app.post('/api/auth/verify', rateLimit({ windowMs: 60_000, max: 20 }), async (req, res) => {
  try {
    const { phone, code } = req.body || {};
    if (!validatePhone(phone)) return res.status(400).json({ ok: false, error: 'INVALID_PHONE' });
    if (!/^\d{6}$/.test(String(code || ''))) return res.status(400).json({ ok: false, error: 'INVALID_CODE' });

    const rec = DATA.smsCodes[phone];
    if (!rec) return res.status(400).json({ ok: false, error: 'NO_CODE' });
    if (Date.now() > rec.expiresAt) {
      delete DATA.smsCodes[phone];
      await saveData();
      return res.status(400).json({ ok: false, error: 'CODE_EXPIRED' });
    }
    if (rec.attempts >= 5) {
      return res.status(429).json({ ok: false, error: 'TOO_MANY_ATTEMPTS' });
    }
    if (rec.code !== String(code)) {
      rec.attempts++;
      await saveData();
      return res.status(400).json({ ok: false, error: 'WRONG_CODE', left: 5 - rec.attempts });
    }

    // muvaffaqiyatli
    delete DATA.smsCodes[phone];
    if (!DATA.users[phone]) {
      DATA.users[phone] = { phone, role: 'customer', createdAt: Date.now() };
    }
    const token = newToken();
    DATA.sessions[token] = { phone, role: DATA.users[phone].role, createdAt: Date.now() };
    await saveData();
    setSessionCookie(res, token);
    return res.json({ ok: true, role: DATA.users[phone].role, phone });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'SERVER' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const s = getSession(req);
  if (s) {
    delete DATA.sessions[s.token];
    saveData();
  }
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  const s = getSession(req);
  if (!s) return res.json({ ok: true, user: null });
  res.json({
    ok: true,
    user: { phone: s.phone, role: s.role }
  });
});

/* ---------- ROL TANLASH (mijoz/savdogar) ---------- */
app.post('/api/profile/role', (req, res) => {
  const s = getSession(req);
  if (!s) return res.status(401).json({ ok: false, error: 'UNAUTH' });
  const { role } = req.body || {};
  if (!['customer', 'seller'].includes(role)) {
    return res.status(400).json({ ok: false, error: 'INVALID_ROLE' });
  }
  DATA.users[s.phone].role = role;
  DATA.sessions[s.token].role = role;
  saveData();
  res.json({ ok: true, role });
});

/* ---------- PRODUCTS ---------- */
app.get('/api/products', (req, res) => {
  const list = DATA.products
    .filter((p) => p.public)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((p) => ({ id: p.id, name: p.name, price: p.price, image: p.image }));
  res.json({ ok: true, products: list });
});
app.get('/api/products/:id', (req, res) => {
  const p = DATA.products.find((x) => x.id === req.params.id);
  if (!p || !p.public) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
  res.json({
    ok: true,
    product: {
      id: p.id, name: p.name, price: p.price, image: p.image,
      sellerName: p.sellerName, createdAt: p.createdAt
    }
  });
});

/* ---------- SELLER: o'z mahsulotlari ---------- */
app.get('/api/seller/products', (req, res) => {
  const s = getSession(req);
  if (!s) return res.status(401).json({ ok: false, error: 'UNAUTH' });
  if (s.role !== 'seller') return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
  const list = DATA.products
    .filter((p) => p.sellerPhone === s.phone)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((p) => ({ id: p.id, name: p.name, price: p.price, image: p.image, public: p.public, createdAt: p.createdAt }));
  res.json({ ok: true, products: list });
});

app.post('/api/seller/products', rateLimit({ windowMs: 60_000, max: 20 }), async (req, res) => {
  try {
    const s = getSession(req);
    if (!s) return res.status(401).json({ ok: false, error: 'UNAUTH' });
    if (s.role !== 'seller') return res.status(403).json({ ok: false, error: 'FORBIDDEN' });

    const { name, price, imageBase64, imageType, isPublic } = req.body || {};
    if (!validateName(name)) return res.status(400).json({ ok: false, error: 'INVALID_NAME' });
    if (!validatePrice(price)) return res.status(400).json({ ok: false, error: 'INVALID_PRICE' });
    if (!ALLOWED_IMAGE_TYPES.has(imageType)) return res.status(400).json({ ok: false, error: 'INVALID_IMAGE_TYPE' });
    if (typeof imageBase64 !== 'string' , imageBase64.length < 100 , imageBase64.length > MAX_IMAGE_BASE64) {
      return res.status(400).json({ ok: false, error: 'INVALID_IMAGE_SIZE' });
    }
    // base64 ni tekshiramiz
    let buf;
    try {
      buf = Buffer.from(imageBase64, 'base64');
    } catch {
      return res.status(400).json({ ok: false, error: 'INVALID_IMAGE' });
    }
    if (buf.length > MAX_IMAGE_BYTES) return res.status(400).json({ ok: false, error: 'IMAGE_TOO_LARGE' });

    // magic-byte tekshiruv
    const head = buf.subarray(0, 12);
    let okType = false;
    if (head[0] === 0xFF && head[1] === 0xD8) okType = true; // jpeg
    else if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4E && head[3] === 0x47) okType = true; // png
    else if (head.subarray(0, 4).toString() === 'RIFF' && head.subarray(8, 12).toString() === 'WEBP') okType = true;
    if (!okType) return res.status(400).json({ ok: false, error: 'IMAGE_MAGIC_MISMATCH' });

    await fsp.mkdir(UPLOADS_DIR, { recursive: true });

    const ext = imageType === 'image/png' ? 'png' : imageType === 'image/webp' ? 'webp' : 'jpg';
    const id = crypto.randomBytes(10).toString('hex');
    const filename =' ${id}.${ext}';
    const filePath = path.join(UPLOADS_DIR, filename);
    await fsp.writeFile(filePath, buf);

    const sellerName = 'Savdogar ' + s.phone.slice(-4);
    const product = {
      id,
      name: String(name).trim(),
      price: Number(price),
      image: '/uploads/' + filename,
      sellerPhone: s.phone,
      sellerName,
      public: !!isPublic,
      createdAt: Date.now()
    };
    DATA.products.push(product);
    await saveData();
    res.json({ ok: true, product });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'SERVER' });
  }
});

app.delete('/api/seller/products/:id', async (req, res) => {
  const s = getSession(req);
  if (!s) return res.status(401).json({ ok: false, error: 'UNAUTH' });
  if (s.role !== 'seller') return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
  const idx = DATA.products.findIndex((p) => p.id === req.params.id && p.sellerPhone === s.phone);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
  const [removed] = DATA.products.splice(idx, 1);
  await saveData();
  // rasmni o'chirish (ixtiyoriy)
  if (removed.image && removed.image.startsWith('/uploads/')) {
    const fp = path.join(UPLOADS_DIR, path.basename(removed.image));
    fsp.unlink(fp).catch(() => {});
  }
  res.json({ ok: true });
});

app.patch('/api/seller/products/:id/public', async (req, res) => {
  const s = getSession(req);
  if (!s) return res.status(401).json({ ok: false, error: 'UNAUTH' });
  if (s.role !== 'seller') return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
  const p = DATA.products.find((x) => x.id === req.params.id && x.sellerPhone === s.phone);
  if (!p) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
  p.public = !!req.body?.isPublic;
  await saveData();
  res.json({ ok: true, product: { id: p.id, public: p.public } });
});

/* ---------- CHECKOUT ---------- */
app.post('/api/orders', rateLimit({ windowMs: 60_000, max: 15 }), async (req, res) => {
  try {
    const s = getSession(req);
    if (!s) return res.status(401).json({ ok: false, error: 'UNAUTH' });
    if (s.role !== 'customer') return res.status(403).json({ ok: false, error: 'FORBIDDEN' });

    const { items, buyerName, lat, lng, address } = req.body || {};
    // items: [{ productId, qty }]
    if (!Array.isArray(items) , items.length === 0 , items.length > 50) {
      return res.status(400).json({ ok: false, error: 'INVALID_ITEMS' });
    }
    if (!validateName(buyerName)) return res.status(400).json({ ok: false, error: 'INVALID_NAME' });
    if (!validateLatLng(lat, lng)) return res.status(400).json({ ok: false, error: 'INVALID_LOCATION' });
    if (typeof address !== 'string' || address.trim().length > 300) {
      return res.status(400).json({ ok: false, error: 'INVALID_ADDRESS' });
    }

    const results = [];
    const bySeller = new Map();

    for (const it of items) {
      const pid = it && it.productId;
      const qty = Math.max(1, Math.min(99, Math.floor(Number(it.qty) || 1)));
      const p = DATA.products.find((x) => x.id === pid);
      if (!p || !p.public) continue;
      const order = {
        id: crypto.randomBytes(10).toString('hex'),
        productId: p.id,
        productName: p.name,
        price: p.price,
        qty,
        buyerPhone: s.phone,
        buyerName: String(buyerName).trim(),
        lat: Number(lat),
        lng: Number(lng),
        address: String(address).trim(),
        sellerPhone: p.sellerPhone,
        createdAt: Date.now()
      };
      DATA.orders.push(order);
      results.push(order);
      const key = p.sellerPhone;
      if (!bySeller.has(key)) bySeller.set(key, []);
      bySeller.get(key).push(order);
    }

    if (results.length === 0) return res.status(400).json({ ok: false, error: 'NO_VALID_ITEMS' });
    await saveData();

    // bildirishnomalar
    const mapUrl = 'https://www.google.com/maps?q=${lat},${lng};'
    for (const [sellerPhone, orders] of bySeller) {
     const lines = orders.map((o) => `— ${o.productName} x${o.qty} = ${o.price * o.qty} so'm).join('\n'`);
     const msg = `SARDOR ART: yangi buyurtma!\n${lines}\nMijoz: ${buyerName}\nTel: ${s.phone}\nManzil: ${address}\nXarita: ${mapUrl}`;
     sendSms(sellerPhone, msg).catch((e) => console.error('seller sms:', e.message));
      sendTelegram(
        (`🎨 Yangi buyurtma\n${escServer(lines)}\n👤 ${escServer(buyerName)}\n📞 ${escServer(s.phone)}\n📍 ${escServer(address)}\n🗺 ${mapUrl}`)
      ).catch((e) => console.error('tg', e.message));
    }

    res.json({ ok: true, orders: results.map((o) => ({ id: o.id, productName: o.productName, qty: o.qty })) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'SERVER' });
  }
});
/* ---------- SELLER: sotilganlar ---------- */
app.get('/api/seller/sold', (req, res) => {
  const s = getSession(req);
  if (!s) return res.status(401).json({ ok: false, error: 'UNAUTH' });
  if (s.role !== 'seller') return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
  const list = DATA.orders
    .filter((o) => o.sellerPhone === s.phone)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((o) => ({
      id: o.id,
      productName: o.productName,
      qty: o.qty,
      price: o.price,
      buyerName: o.buyerName,
      buyerPhone: o.buyerPhone,
      address: o.address,
      lat: o.lat,
      lat: o.lat,
      lng: o.lng,
      createdAt: o.createdAt
    }));
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

// 404
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
  res.status(404).sendFile(path.join(ROOT, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Unhandled:', err);
  if (req.path.startsWith('/api/')) return res.status(500).json({ ok: false, error: 'SERVER' });
  res.status(500).send('Server error');
});

/* ---------- start ---------- */
(async () => {
  await fsp.mkdir(UPLOADS_DIR, { recursive: true });
  await loadData();
  app.listen(PORT, () => {
    console.log(`SARDOR ART: http://localhost:${PORT}`);
  });
})();
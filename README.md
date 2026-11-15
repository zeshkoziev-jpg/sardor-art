# SARDOR ART

Node.js (Express) + vanilla HTML/CSS/JS asosidagi san'at asarlari onlayn do'koni.

## Imkoniyatlar

- Bosh sahifa — barcha ommaviy asarlar kartochkalari
- Mahsulot sahifasi — alohida sahifa, savatga qo'shish
- Savat — miqdorni o'zgartirish (+/−), o'chirish, jami narx (localStorage)
- Checkout — ism, telefon, joylashuv (Google Maps embed)
- Kirish — telefon (+998XXXXXXXXX) → SMS kod (Eskiz.uz) → sessiya 30 kun
  - 6 xonali kod, 10 daqiqa amal qiladi, 5 urinish, 60 soniya cooldown
- Mijoz / Savdogar roli (profil sahifasida almashtiriladi)
- Savdogar — rasm yuklash (canvas 900px), nom, narx, ommaga taqdim etish, o'chirish
- Sotilganlar — mijoz ismi, telefoni, Google Maps manzili
  - Sotilganda savdogarga SMS + (ixtiyoriy) Telegram xabar
- Footer — telefon, Humo/Uzcard/Visa/MasterCard, til (UZ/RU/EN)
- Xavfsizlik — esc() orqali XSS himoya, server validatsiya, IP rate-limit, CSP, atomik data.json

## O'rnatish

cp .env.example .env
# .env faylini to'ldiring
npm install
npm start
Brauzer: http://localhost:3000

## .env

| Kalit | Tavsif |
|---|---|
| PORT | Server porti |
| PHONE | Footer'da ko'rinadigan telefon |
| SESSION_SECRET | Zaxira uchun (hozir cookie httpOnly) |
| ESKIZ_EMAIL / ESKIZ_PASSWORD | Eskiz.uz hisobi (bo'lmasa — kod konsolga chiqadi, dev rejim) |
| TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID | Ixtiyoriy — yangi buyurtmada xabar |
| BASE_URL | Sayt manzili |

## Tuzilma

.
├─ server.js          # Express server + barcha API
├─ data.json          # atomik yoziladi (tmp + rename)
├─ uploads/           # yuklangan rasmlar (avtomatik yaratiladi)
├─ app.js             # header/footer/i18n/esc/api/cart
├─ style.css
├─ index.html / product.html / cart.html / checkout.html
├─ profile.html / login.html / seller.html / sold.html
└─ .env
## Xavfsizlik

- esc() — foydalanuvchi matni hamma joyda escape qilinadi
- Server validatsiyasi: telefon +998XXXXXXXXX, narx (1..1e9), rasm (JPEG/PNG/WEBP, ≤6 MB, magic-byte tekshiruv), lat/lng chegaralar
- IP bo'yicha rate-limit (auth, mahsulot, buyurtma)
- CSP: script-src 'self', frame-src faqat Google Maps
- X-Content-Type-Options, X-Frame-Options: DENY, Referrer-Policy, Permissions-Policy
- Sessiya cookie: httpOnly, sameSite=lax, 30 kun
- data.json atomik yozish (tmp + rename) va write-queue

## Dev rejim (SMS'siz)

Agar ESKIZ_EMAIL/ESKIZ_PASSWORD berilmagan bo'lsa, kod server konsoliga chiqadi:

[SMS-DEV] +998901234567: SARDOR ART tasdiqlash kodi: 123456...
## Litsenziya

MIT
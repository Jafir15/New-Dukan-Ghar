# دکان گھر (Dukan Ghar) - Project Documentation & Architecture 🚀

خوش آمدید! دکان گھر (Dukan Ghar) ایک پریمیم، جدید اور انتہائی محفوظ ای کامرس اور روزمرہ کی ضروریات فراہم کرنے والی ویب ایپلی کیشن ہے۔

---

## 🛠️ 1. Core Technology Stack (ٹیکنالوجی اسٹیک)

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 18** & **TypeScript** | Component-based UI، تیز رفتار کارکردگی اور ٹائپ سیفٹی |
| **Build Tool** | **Vite** | تیز رفتار ماڈیول بنڈلنگ اور لائیو ہاٹ ری لوڈنگ |
| **Styling (CSS)** | **Tailwind CSS v4** | خوبصورت، ریسپانسیو اور پریمیم یو آئی |
| **Backend & Database** | **Google Firebase (Firestore)** | لائیو ریئل ٹائم ڈیٹا بیس |
| **Authentication** | **Firebase Auth** | محفوظ اکاؤنٹ سسٹم (Email/Google) |
| **Routing** | **Wouter** | ہلکی اور تیز ترین کلائنٹ سائیڈ نیویگیشن |
| **Icons** | **Lucide React** | پریمیم پکسل پرفیکٹ ویکٹر آئیکنز |
| **Image Upload** | **Cloudinary** | کلاؤڈ بیسڈ تصویر اپ لوڈنگ سسٹم |

---

## 📁 2. Codebase Directory Structure (فائل سٹرکچر)

```text
dukan-ghar/
├── src/
│   ├── components/
│   │   ├── ui/                # Shadcn UI components (Button, Input, Dialog, etc.)
│   │   ├── layout.tsx         # Header, Footer with dynamic WhatsApp/Email links
│   │   ├── logo.tsx           # پریمیم برانڈڈ ویکٹر SVG لوگو
│   │   └── cart-context.tsx   # کارٹ گلوبل سٹیٹ مینجمنٹ
│   ├── hooks/
│   │   └── useFirebaseData.ts # تمام Firebase CRUD hooks
│   │                          # (useOrders, useBookings, useUserCustomRequests, etc.)
│   ├── lib/
│   │   ├── audio.ts           # Web Audio API notification chime (zero dependency)
│   │   ├── auth.tsx           # Firebase Auth context provider
│   │   ├── cloudinary.ts      # Image upload to Cloudinary
│   │   ├── firebase.ts        # Firebase initialization
│   │   └── session.ts         # Guest sessionId (localStorage-based UUID)
│   ├── pages/
│   │   ├── admin.tsx          # ایڈمن ڈیش بورڈ (Orders, Bookings, Slips, Settings)
│   │   ├── cart.tsx           # شاپنگ کارٹ + آرڈر پلیسمنٹ
│   │   ├── category.tsx       # پروڈکٹ کیٹگری براؤزر
│   │   ├── custom-order.tsx   # خصوصی آرڈر (Custom Slip) پورٹل
│   │   ├── home.tsx           # ہوم پیج (Slider, Promo Boxes, Trust Badges)
│   │   ├── login.tsx          # محفوظ ایڈمن لاگ ان (24h lockout)
│   │   ├── orders.tsx         # یوزر آرڈر ہسٹری (userId-based isolation)
│   │   ├── products.tsx       # تمام مصنوعات لسٹ
│   │   └── transport.tsx      # گاڑی بکنگ پورٹل (userId-based isolation)
│   ├── types.ts               # TypeScript interfaces
│   ├── App.tsx                # مرکزی راؤٹر
│   └── index.css              # گلوبل اسٹائلز اور کلر تھیمز
├── DOCUMENTATION.md           # یہ فائل
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🔐 3. Data Isolation & Security Architecture (ڈیٹا تحفظ نظام)

### مسئلہ (پرانا نظام)
پرانا نظام `sessionId` (browser localStorage UUID) سے ڈیٹا فلٹر کرتا تھا۔ اگر ایک ڈیوائس پر کوئی اور آرڈر دے، پھر نیا اکاؤنٹ بنایا جائے، تو وہی `sessionId` ملتی اور دوسرے کا ڈیٹا نظر آتا۔

### حل (موجودہ نظام)

```
ڈیٹا محفوظ کرتے وقت:
  sessionId: localStorage UUID  ← ہمیشہ محفوظ (backward compat)
  userId: Firebase Auth UID     ← ✅ NEW - منفرد فی اکاؤنٹ

ڈیٹا فلٹر کرتے وقت:
  if (user logged in):
    → صرف userId === user.uid ← سخت اور محفوظ
  else (guest):
    → sessionId === localStorage UUID
```

### متاثرہ فائلیں
| فائل | تبدیلی |
|------|--------|
| `types.ts` | `Order`, `Booking`, `CustomRequest` میں `userId?: string \| null` شامل |
| `cart.tsx` | `userId: user?.uid \| null` آرڈر کے ساتھ محفوظ |
| `transport.tsx` | `userId: user?.uid \| null` بکنگ کے ساتھ محفوظ |
| `custom-order.tsx` | `userId: user?.uid \| null` خصوصی آرڈر کے ساتھ محفوظ |
| `orders.tsx` | logged-in → `userId === uid` فلٹر (sessionId fallback نہیں) |
| `transport.tsx` | logged-in → `userId === uid` فلٹر |
| `useFirebaseData.ts` | `useUserCustomRequests(userId, sessionId)` strict filter |

---

## 🔒 4. Admin Security (ایڈمن سیکیورٹی)

### 24 گھنٹے لاک آؤٹ سسٹم
- **5 غلط کوششیں** → 24 گھنٹے کا لاک آؤٹ
- لاک آؤٹ `localStorage` میں محفوظ → پیج ری لوڈ، ٹیب بند کرنے سے bypass نہیں
- Live countdown timer UI
- 24 گھنٹے بعد خودبخود unlock

### Dynamic Admin PIN
- Admin PIN Firebase Firestore میں محفوظ
- Admin Settings ٹیب سے تبدیل کیا جا سکتا ہے
- Eye toggle (show/hide) button

---

## 🌟 5. Premium Features (خصوصی فیچرز)

### 📊 Half-Unit Quantities (0.5 Steps)
- `kg`, `liter`, `dozen` → 0.5 کے اسٹیپ (0.5, 1.0, 1.5, 2.0...)
- `piece`, `gram` وغیرہ → 1 کے اسٹیپ

### 📄 Interactive Editable PDF Invoice
- `openEditablePDF()` function — کوئی external library نہیں
- تمام fields براہ راست browser میں edit کی جا سکتی ہیں
- Save to PDF بٹن

### 🏷️ Payment Stamps on Bills
- **Online Payment** → سرخ `PAID` مہر (8° rotation)
- **COD** → ٹیل `C.O.D` مہر (8° rotation)

### 🎵 Real-Time Audio Notification
- Web Audio API synth — کوئی audio file نہیں
- Double-chime tone جب نیا آرڈر/بکنگ آئے

### 🔴 Red Status Badges (User Side)
- تمام status badges → سرخ باکس، سفید لکھائی
- `custom-order.tsx`, `orders.tsx`, `transport.tsx`

### 📜 Custom Order Slips
- یوزر تفصیل لکھ کر یا فوٹو اپ لوڈ کر کے خصوصی آرڈر دے سکتا ہے
- Admin → Quick status dropdown + full edit panel
- Delete → Custom confirmation dialog (browser default نہیں)

### ⚡ Real-Time Promo Boxes
- `staleTime: 0` → فوری admin-to-user reflection
- Dynamic title, subtitle, link, image per box

### 🔗 Dynamic Footer
- Phone → WhatsApp `wa.me` link
- Email → `mailto:` link
- Admin Settings سے تبدیل → User side فوری update

---

## ⚡ 6. Setup & Run (چلانے کا طریقہ)

```bash
# Dependencies install کریں
npm install

# Development server (http://localhost:5001)
npm run dev

# Production build
npm run build
```

---

## 📊 7. Firebase Collections Structure

| Collection | Description | Key Fields |
|:-----------|:------------|:-----------|
| `orders` | تمام آرڈرز | `userId`, `sessionId`, `status`, `trackingNumber` |
| `bookings` | گاڑی بکنگز | `userId`, `sessionId`, `status`, `vehicleId` |
| `custom_requests` | خصوصی آرڈر | `userId`, `sessionId`, `status`, `imageUrl` |
| `products` | مصنوعات | `name`, `nameUrdu`, `price`, `unit`, `stock` |
| `vehicles` | گاڑیاں | `name`, `nameUrdu`, `type`, `baseRent` |
| `sliders` | ہوم پیج سلائیڈر | `imageUrl`, `linkUrl`, `active` |
| `promo_boxes` | پروموشنل باکسز | `title`, `subtitle`, `imageUrl`, `linkUrl` |
| `app_settings` | ایپ سیٹنگز | `adminPin`, `supportPhone`, `supportEmail` |
| `payment_methods` | ادائیگی طریقے | `bankName`, `accountNumber`, `active` |
| `users` | یوزر پروفائلز | `uid`, `name`, `phone`, `balance`, `role` |

---

## 🏗️ 8. Build Stats

```bash
vite v8.0.11 building for production...
✓ 1934 modules transformed
dist/public/index.html          1.00 kB
dist/public/assets/index.css  ~152 kB (gzip: ~24 kB)
dist/public/assets/index.js  ~1030 kB (gzip: ~294 kB)
✓ Built successfully — 0 errors
```

دکان گھر ایپلی کیشن مکمل طور پر لائیو، پالش، سیکیور اور استعمال کے لیے تیار ہے! 🚀🎉

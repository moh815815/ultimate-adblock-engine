# محرك حجب الإعلانات العربي
## Arabic Privacy-Focused Ad-Blocker Engine

نظام خلفي متعدد المستأجرين لبناء إضافات حجب الإعلانات وحماية الخصوصية، مبني على **Next.js + Prisma + PostgreSQL**.

---

## 🏗️ البنية المعمارية

```
src/
├── app/api/
│   ├── tenants/route.ts          ← إدارة المستأجرين
│   ├── blocklists/route.ts       ← قوائم الحجب (CRUD)
│   ├── sync/route.ts             ← محرك المزامنة التلقائية
│   ├── rules/route.ts            ← تصدير قواعد DNR المُجمَّعة
│   ├── performance/route.ts      ← مقاييس أداء التجميع
│   └── deflection-logs/route.ts  ← سجلات انحراف الطلبات
├── lib/
│   ├── prisma.ts                 ← عميل DB + أدوات المصادقة
│   └── rule-compiler.ts         ← محرك تجميع EasyList → DNR
└── types/
    └── arabic-types.ts           ← التعريفات والأنواع العربية
```

---

## 🚀 التشغيل السريع

```bash
# 1. تثبيت الاعتماديات
npm install

# 2. إعداد متغيرات البيئة
cp .env.example .env
# عدّل DATABASE_URL و ADMIN_SECRET_KEY

# 3. نشر المخطط في قاعدة البيانات
npm run db:push

# 4. تشغيل الخادم
npm run dev
```

---

## 📡 مسارات API

### المصادقة
جميع المسارات (ما عدا إنشاء المستأجر) تتطلب:
```
Authorization: Bearer <مفتاح_API>
# أو
X-API-Key: <مفتاح_API>
```

---

### 1. المستأجرون `/api/tenants`

#### إنشاء مستأجر جديد
```http
POST /api/tenants
X-Admin-Key: your-admin-key

{
  "الاسم": "شركة التقنية العربية",
  "الخطة": "احترافي"
}
```

**الاستجابة:**
```json
{
  "الحالة": "نجاح",
  "البيانات": {
    "المعرف": "clx...",
    "مفتاح_API": "adb_a1b2c3...",
    "تحذير": "احفظ مفتاح API هذا بأمان — لن يُعرض مجدداً",
    "حدود_الخطة": {
      "قوائم_حجب": 25,
      "حجم_دفعة_السجلات": 1000
    }
  },
  "وقت_المعالجة_بالميلي_ثانية": 42
}
```

#### جلب معلومات المستأجر الحالي
```http
GET /api/tenants
Authorization: Bearer adb_...
```

---

### 2. قوائم الحجب `/api/blocklists`

#### جلب القوائم
```http
GET /api/blocklists?صفحة=1&حجم=20&الحالة=نشطة
Authorization: Bearer adb_...
```

#### إنشاء قائمة حجب
```http
POST /api/blocklists
Authorization: Bearer adb_...

{
  "الاسم": "EasyList العربية",
  "رابط_المصدر": "https://easylist-downloads.adblockplus.org/easylistArabic.txt",
  "النوع": "EasyListArabic",
  "تكرار_المزامنة_ثانية": 3600
}
```

أنواع القوائم المدعومة:
- `EasyList` — القائمة الرئيسية العامة
- `EasyPrivacy` — قائمة الخصوصية والتتبع
- `EasyListArabic` — القائمة العربية
- `uBlockOrigin` — قائمة uBlock Origin
- `AdGuard` — قائمة AdGuard
- `مخصصة` — قائمة مخصصة من أي مصدر

---

### 3. المزامنة `/api/sync`

#### تشغيل المزامنة
```http
POST /api/sync
Authorization: Bearer adb_...

{
  "معرفات_القوائم": ["clx1...", "clx2..."],
  "إجبار_إعادة_التجميع": false
}
```

**الاستجابة:**
```json
{
  "البيانات": {
    "ملخص_المزامنة": {
      "إجمالي_القوائم": 3,
      "ناجحة": 3,
      "فاشلة": 0,
      "إجمالي_قواعد_مضافة": 1247,
      "إجمالي_وقت_تجميع_مللي": 892
    },
    "تفاصيل_القوائم": [
      {
        "اسم_القائمة": "EasyList العربية",
        "حالة_المزامنة": "مكتملة",
        "تفاصيل_التغييرات": {
          "قواعد_مضافة": 412,
          "قواعد_محذوفة": 8,
          "الإجمالي_قبل": 5234,
          "الإجمالي_بعد": 5638
        },
        "مقاييس_الأداء": {
          "وقت_التنزيل_مللي": 234,
          "وقت_التجميع_مللي": 312
        }
      }
    ]
  }
}
```

---

### 4. تصدير القواعد `/api/rules`

#### تصدير قواعد DNR للإضافة
```http
GET /api/rules?صيغة=dnr&حد=30000
Authorization: Bearer adb_...
```

**مثال مخرج DNR (Declarative Net Request MV3):**
```json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "||ads.example.com^",
      "isUrlFilterCaseSensitive": false
    }
  }
]
```

صيغ التصدير:
- `json` — بيانات غنية مع معلومات المصدر
- `dnr` — JSON نقي للاستخدام المباشر في الإضافة
- `stats` — إحصائيات القواعد فقط

---

### 5. مقاييس الأداء `/api/performance`

#### تقرير الأداء التاريخي
```http
GET /api/performance?أيام=7
Authorization: Bearer adb_...
```

#### اختبار أداء مباشر (Benchmark)
```http
POST /api/performance
Authorization: Bearer adb_...

{
  "عدد_التكرارات": 5
}
```

**الاستجابة:**
```json
{
  "البيانات": {
    "تقرير_الأداء": {
      "إحصائيات_الوقت": {
        "إجمالي_وقت_التجميع_مللي": 45.2,
        "متوسط_وقت_قاعدة_مكرو": 2.8,
        "أسرع_قاعدة_مكرو": 0.3,
        "أبطأ_قاعدة_مكرو": 87.4,
        "انحراف_معياري_مكرو": 5.1
      },
      "إحصائيات_القواعد": {
        "إجمالي_القواعد_المُعالجة": 15420,
        "قواعد_شبكة_ناجحة": 12847,
        "قواعد_تجميل_ناجحة": 2341,
        "قواعد_مرفوضة": 232,
        "نسبة_نجاح_التجميع": 98.49
      },
      "تصنيف_الأداء": "ممتاز"
    }
  }
}
```

---

### 6. سجلات الانحراف `/api/deflection-logs`

#### تسجيل انحرافات من الإضافة
```http
POST /api/deflection-logs
Authorization: Bearer adb_...

{
  "الطلبات": [
    {
      "الطلب_الأصلي": "https://ads.example.com/banner.js",
      "النطاق": "ads.example.com",
      "نوع_الطلب": "script",
      "الإجراء": "blocked",
      "فئة_التهديد": "إعلانات",
      "وقت_المعالجة_مكرو": 3,
      "وفر_النطاق_ترددي_بايت": 45280
    }
  ]
}
```

#### جلب إحصائيات الانحراف
```http
GET /api/deflection-logs?وضع=إحصائيات&ساعات=24
Authorization: Bearer adb_...
```

**الاستجابة:**
```json
{
  "البيانات": {
    "إجماليات": {
      "إجمالي_الطلبات": 48271,
      "طلبات_محجوبة": 12483,
      "معدل_الحجب_بالمئة": 25.86
    },
    "توفير_الموارد": {
      "إجمالي_النطاق_الترددي_المحفوظ_MB": 284.7,
      "تتبعات_موقوفة": 3847
    },
    "تصنيف_التهديدات": {
      "إعلانات": 8234,
      "تتبع_المستخدم": 3127,
      "بصمات_رقمية": 892
    },
    "أكثر_النطاقات_محجوبة": [
      { "النطاق": "doubleclick.net", "العدد": 1847 },
      { "النطاق": "googlesyndication.com", "العدد": 1234 }
    ]
  }
}
```

---

## 🔐 خطط الاشتراك

| الميزة | مجاني | احترافي | مؤسسي |
|--------|-------|---------|-------|
| قوائم حجب | 3 | 25 | 1000 |
| حجم دفعة السجلات | 100 | 1,000 | 10,000 |
| تكرار المزامنة | 1 ساعة | 15 دقيقة | 5 دقائق |

---

## 🧩 تكامل الإضافة (Extension Integration)

```javascript
// manifest.json (MV3)
{
  "declarative_net_request": {
    "rule_resources": [{
      "id": "arabic_adblock_rules",
      "enabled": true,
      "path": "rules/dnr_rules.json"
    }]
  }
}

// background.js — مزامنة دورية
async function syncRules() {
  const response = await fetch('https://your-api.com/api/rules?صيغة=dnr', {
    headers: { 'Authorization': 'Bearer ' + API_KEY }
  });
  const rules = await response.json();
  
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingRules.map(r => r.id),
    addRules: rules
  });
}
```

---

## ⚡ تصنيف الأداء

| التصنيف | متوسط وقت القاعدة | نسبة النجاح |
|---------|------------------|-------------|
| ممتاز   | < 10 مكرو ثانية  | ≥ 95%       |
| جيد     | < 50 مكرو ثانية  | ≥ 85%       |
| متوسط   | < 200 مكرو ثانية | ≥ 70%       |
| ضعيف    | ≥ 200 مكرو ثانية | < 70%       |

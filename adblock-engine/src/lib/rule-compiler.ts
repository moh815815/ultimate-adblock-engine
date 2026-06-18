// ======================================================
// محرك تجميع القواعد - EasyList Parser & DNR Compiler
// Rule Compilation Engine with Performance Metrics
// ======================================================

export interface قاعدة_DNR_مُجمَّعة {
  id: number;
  priority: number;
  action: {
    type: "block" | "redirect" | "allow" | "modifyHeaders" | "upgradeScheme";
    redirect?: { url: string };
    requestHeaders?: Array<{ header: string; operation: string; value?: string }>;
  };
  condition: {
    urlFilter?: string;
    regexFilter?: string;
    domains?: string[];
    excludedDomains?: string[];
    resourceTypes?: string[];
    initiatorDomains?: string[];
    excludedInitiatorDomains?: string[];
    isUrlFilterCaseSensitive?: boolean;
  };
}

export interface نتيجة_تجميع_قاعدة {
  نجحت: boolean;
  dnr?: قاعدة_DNR_مُجمَّعة;
  نوع_القاعدة: string;
  وقت_التجميع_مكرو: number;
  خطأ?: string;
}

export interface نتيجة_تجميع_كاملة {
  قواعد_DNR: قاعدة_DNR_مُجمَّعة[];
  إحصائيات: {
    إجمالي_الأسطر: number;
    قواعد_شبكة: number;
    قواعد_تجميل: number;
    قواعد_استثناء: number;
    قواعد_مرفوضة: number;
    تعليقات_ومسافات: number;
    وقت_التجميع_الكلي_مللي: number;
    متوسط_وقت_قاعدة_مكرو: number;
    أسرع_قاعدة_مكرو: number;
    أبطأ_قاعدة_مكرو: number;
    انحراف_معياري_مكرو: number;
  };
  تحذيرات: string[];
}

// أنواع موارد الشبكة المدعومة
const أنواع_الموارد_المدعومة = [
  "main_frame", "sub_frame", "stylesheet", "script",
  "image", "font", "object", "xmlhttprequest",
  "ping", "media", "websocket", "other",
];

// خريطة تحويل خيارات EasyList إلى DNR
const خريطة_الخيارات: Record<string, string> = {
  "script": "script",
  "image": "image",
  "stylesheet": "stylesheet",
  "object": "object",
  "xmlhttprequest": "xmlhttprequest",
  "subdocument": "sub_frame",
  "ping": "ping",
  "websocket": "websocket",
  "font": "font",
  "media": "media",
  "other": "other",
  "document": "main_frame",
};

// ======================================================
// تجميع قاعدة EasyList واحدة إلى DNR
// ======================================================
export function تجميع_قاعدة_واحدة(
  سطر_القاعدة: string,
  رقم_المعرف: number
): نتيجة_تجميع_قاعدة {
  const بداية = performance.now();

  // تنظيف السطر
  const سطر = سطر_القاعدة.trim();

  // تخطي الفارغ والتعليقات
  if (!سطر || سطر.startsWith("!") || سطر.startsWith("[")) {
    return { نجحت: false, نوع_القاعدة: "تعليق_أو_مسافة", وقت_التجميع_مكرو: 0 };
  }

  try {
    // --- قواعد التجميل (##، #@#) ---
    if (سطر.includes("##") || سطر.includes("#@#") || سطر.includes("#?#")) {
      const نوع = سطر.includes("#@#") ? "استثناء_تجميلي" : "حجب_تجميلي";
      return {
        نجحت: true,
        نوع_القاعدة: نوع,
        وقت_التجميع_مكرو: (performance.now() - بداية) * 1000,
        // تُعامَل لاحقاً عبر content scripts - لا تُدعم مباشرة في DNR
      };
    }

    // --- قواعد الاستثناء (@@) ---
    const هي_استثناء = سطر.startsWith("@@");
    let النمط = هي_استثناء ? سطر.slice(2) : سطر;

    // --- تحليل الخيارات ($options) ---
    let أنواع_الموارد: string[] = [];
    let نطاقات_مسموحة: string[] = [];
    let نطاقات_محجوبة: string[] = [];
    let إعادة_التوجيه: string | null = null;

    if (النمط.includes("$")) {
      const فاصل = النمط.lastIndexOf("$");
      const خيارات_نص = النمط.slice(فاصل + 1);
      النمط = النمط.slice(0, فاصل);

      const خيارات = خيارات_نص.split(",");
      for (const خيار of خيارات) {
        const خيار_نظيف = خيار.trim();

        if (خيار_نظيف.startsWith("domain=")) {
          const نطاقات = خيار_نظيف.slice(7).split("|");
          for (const نطاق of نطاقات) {
            if (نطاق.startsWith("~")) {
              نطاقات_محجوبة.push(نطاق.slice(1));
            } else {
              نطاقات_مسموحة.push(نطاق);
            }
          }
        } else if (خيار_نظيف.startsWith("redirect=")) {
          إعادة_التوجيه = خيار_نظيف.slice(9);
        } else if (!خيار_نظيف.startsWith("~") && خريطة_الخيارات[خيار_نظيف]) {
          أنواع_الموارد.push(خريطة_الخيارات[خيار_نظيف]);
        } else if (خيار_نظيف.startsWith("~")) {
          // نوع مستبعد - نتجاهله حالياً
        }
      }
    }

    // --- تحويل نمط EasyList إلى urlFilter ---
    let فلتر_URL = تحويل_نمط_إلى_urlFilter(النمط);

    // بناء قاعدة DNR
    const قاعدة: قاعدة_DNR_مُجمَّعة = {
      id: رقم_المعرف,
      priority: هي_استثناء ? 2 : 1,
      action: {
        type: هي_استثناء ? "allow" : (إعادة_التوجيه ? "redirect" : "block"),
        ...(إعادة_التوجيه && {
          redirect: { url: `chrome-extension://[EXTENSION_ID]/redirects/${إعادة_التوجيه}.js` }
        }),
      },
      condition: {
        urlFilter: فلتر_URL,
        ...(أنواع_الموارد.length > 0 && { resourceTypes: أنواع_الموارد as never[] }),
        ...(نطاقات_مسموحة.length > 0 && { initiatorDomains: نطاقات_مسموحة }),
        ...(نطاقات_محجوبة.length > 0 && { excludedInitiatorDomains: نطاقات_محجوبة }),
        isUrlFilterCaseSensitive: false,
      },
    };

    return {
      نجحت: true,
      dnr: قاعدة,
      نوع_القاعدة: هي_استثناء ? "استثناء" : "حجب_شبكة",
      وقت_التجميع_مكرو: (performance.now() - بداية) * 1000,
    };
  } catch (خطأ) {
    return {
      نجحت: false,
      نوع_القاعدة: "مرفوضة",
      وقت_التجميع_مكرو: (performance.now() - بداية) * 1000,
      خطأ: String(خطأ),
    };
  }
}

// ======================================================
// تحويل نمط EasyList إلى urlFilter لـ DNR
// ======================================================
function تحويل_نمط_إلى_urlFilter(نمط: string): string {
  // نمط مطابقة النطاق الكامل
  if (نمط.startsWith("||") && نمط.endsWith("^")) {
    const نطاق = نمط.slice(2, -1);
    return `||${نطاق}^`;
  }

  // نمط النطاق مع مسار
  if (نمط.startsWith("||")) {
    return نمط;
  }

  // نمط البداية
  if (نمط.startsWith("|")) {
    return نمط.replace(/^\|/, "|");
  }

  // نمط regex خام
  if (نمط.startsWith("/") && نمط.endsWith("/")) {
    return نمط;
  }

  return نمط;
}

// ======================================================
// تجميع قائمة حجب كاملة مع قياس الأداء
// ======================================================
export function تجميع_قائمة_حجب_كاملة(
  محتوى_القائمة: string
): نتيجة_تجميع_كاملة {
  const بداية_كاملة = Date.now();
  const أسطر = محتوى_القائمة.split("\n");

  let قواعد_DNR: قاعدة_DNR_مُجمَّعة[] = [];
  let عداد_الشبكة = 0;
  let عداد_التجميل = 0;
  let عداد_الاستثناء = 0;
  let عداد_المرفوض = 0;
  let عداد_التعليقات = 0;
  let أوقات_التجميع: number[] = [];
  let تحذيرات: string[] = [];

  let معرف_DNR = 1;

  for (const سطر of أسطر) {
    const نتيجة = تجميع_قاعدة_واحدة(سطر, معرف_DNR);

    if (نتيجة.نوع_القاعدة === "تعليق_أو_مسافة") {
      عداد_التعليقات++;
      continue;
    }

    if (نتيجة.وقت_التجميع_مكرو > 0) {
      أوقات_التجميع.push(نتيجة.وقت_التجميع_مكرو);
    }

    if (!نتيجة.نجحت) {
      عداد_المرفوض++;
      if (نتيجة.خطأ && عداد_المرفوض <= 10) {
        تحذيرات.push(`سطر ${معرف_DNR}: ${نتيجة.خطأ} — "${سطر.slice(0, 60)}"`);
      }
      continue;
    }

    switch (نتيجة.نوع_القاعدة) {
      case "حجب_شبكة":
        عداد_الشبكة++;
        break;
      case "استثناء":
        عداد_الاستثناء++;
        break;
      case "حجب_تجميلي":
      case "استثناء_تجميلي":
        عداد_التجميل++;
        break;
    }

    if (نتيجة.dnr) {
      قواعد_DNR.push(نتيجة.dnr);
      معرف_DNR++;
    }
  }

  // حساب إحصائيات الأداء
  const وقت_كلي = Date.now() - بداية_كاملة;
  const متوسط = أوقات_التجميع.length > 0
    ? أوقات_التجميع.reduce((أ, ب) => أ + ب, 0) / أوقات_التجميع.length
    : 0;
  const أسرع = أوقات_التجميع.length > 0 ? Math.min(...أوقات_التجميع) : 0;
  const أبطأ = أوقات_التجميع.length > 0 ? Math.max(...أوقات_التجميع) : 0;
  const انحراف = حساب_الانحراف_المعياري(أوقات_التجميع, متوسط);

  return {
    قواعد_DNR,
    إحصائيات: {
      إجمالي_الأسطر: أسطر.length,
      قواعد_شبكة: عداد_الشبكة,
      قواعد_تجميل: عداد_التجميل,
      قواعد_استثناء: عداد_الاستثناء,
      قواعد_مرفوضة: عداد_المرفوض,
      تعليقات_ومسافات: عداد_التعليقات,
      وقت_التجميع_الكلي_مللي: وقت_كلي,
      متوسط_وقت_قاعدة_مكرو: Math.round(متوسط * 100) / 100,
      أسرع_قاعدة_مكرو: Math.round(أسرع * 100) / 100,
      أبطأ_قاعدة_مكرو: Math.round(أبطأ * 100) / 100,
      انحراف_معياري_مكرو: Math.round(انحراف * 100) / 100,
    },
    تحذيرات,
  };
}

function حساب_الانحراف_المعياري(قيم: number[], متوسط: number): number {
  if (قيم.length === 0) return 0;
  const تباين = قيم.reduce((مجموع, قيمة) => مجموع + Math.pow(قيمة - متوسط, 2), 0) / قيم.length;
  return Math.sqrt(تباين);
}

// ======================================================
// تصنيف أداء التجميع
// ======================================================
export function تصنيف_أداء_التجميع(
  متوسط_وقت_مكرو: number,
  نسبة_نجاح: number
): "ممتاز" | "جيد" | "متوسط" | "ضعيف" {
  if (متوسط_وقت_مكرو < 10 && نسبة_نجاح >= 95) return "ممتاز";
  if (متوسط_وقت_مكرو < 50 && نسبة_نجاح >= 85) return "جيد";
  if (متوسط_وقت_مكرو < 200 && نسبة_نجاح >= 70) return "متوسط";
  return "ضعيف";
}

// ======================================================
// نموذج محاكاة تنزيل قائمة EasyList (للتطوير)
// ======================================================
export function محاكاة_قائمة_EasyList_مصغرة(): string {
  return `! EasyList - https://easylist.to/
! Version: 202406131200
! Last modified: 13 Jun 2026
!
||ads.example.com^
||tracker.analytics.com^
||doubleclick.net^$third-party
||googlesyndication.com^
@@||googlesyndication.com/pagead/show_ads.js
||ad.example.net^$script,image
||tracking.pixel.com^$image,third-party
!-- Arabic ad networks --
||adnow.com^
||propellerads.com^
||adsrv.eacdn.com^
example.com##.advertisement
example.com##.ad-banner
example.com##div[id^="ad-"]
@@||example.com/safe-resource.js$domain=trusted.com
||cdn.ad-delivery.net^$third-party,script
||static.ads-twitter.com^
||facebook.com/tr?*$third-party
||mc.yandex.ru/metrika/*
||pixel.quantserve.com^`;
}

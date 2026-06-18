// ======================================================
// مسار الفحص الصحي وتوثيق API
// Route: /api/health
// ======================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  const بداية = Date.now();

  try {
    // فحص الاتصال بقاعدة البيانات
    await prisma.$queryRaw`SELECT 1`;
    const زمن_DB = Date.now() - بداية;

    return NextResponse.json({
      الحالة: "نجاح",
      الخدمة: "محرك حجب الإعلانات العربي",
      الإصدار: "1.0.0",
      الصحة: {
        الخادم: "✅ يعمل",
        قاعدة_البيانات: `✅ متصلة (${زمن_DB}ms)`,
        المحرك: "✅ جاهز",
      },
      مسارات_API: {
        "POST /api/tenants": "إنشاء مستأجر جديد (يتطلب X-Admin-Key)",
        "GET /api/tenants": "معلومات المستأجر الحالي",
        "GET /api/blocklists": "جلب قوائم الحجب",
        "POST /api/blocklists": "إنشاء قائمة حجب",
        "POST /api/sync": "تشغيل المزامنة",
        "GET /api/sync": "سجلات المزامنة",
        "GET /api/rules": "تصدير قواعد DNR",
        "GET /api/performance": "تقرير الأداء",
        "POST /api/performance": "اختبار الأداء المباشر",
        "POST /api/deflection-logs": "تسجيل انحرافات شبكية",
        "GET /api/deflection-logs": "جلب سجلات الانحراف",
      },
      المصادقة: "Bearer Token أو X-API-Key header",
      الطابع_الزمني: new Date().toISOString(),
      وقت_الاستجابة_مللي: Date.now() - بداية,
    });
  } catch (خطأ) {
    return NextResponse.json(
      {
        الحالة: "خطأ",
        الخدمة: "محرك حجب الإعلانات العربي",
        الصحة: {
          الخادم: "✅ يعمل",
          قاعدة_البيانات: "❌ غير متصلة",
          الخطأ: String(خطأ),
        },
        الطابع_الزمني: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

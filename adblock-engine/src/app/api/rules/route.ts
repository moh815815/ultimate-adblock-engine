// ======================================================
// مسار API: تصدير قواعد DNR المُجمَّعة
// Route: /api/rules
// Compiled Declarative Net Request Rules Export
// ======================================================
import { NextRequest, NextResponse } from "next/server";
import {
  prisma,
  التحقق_من_المستأجر,
  بناء_استجابة,
  بناء_استجابة_خطأ,
  استخراج_مفتاح_API,
} from "@/lib/prisma";

// ======================================================
// GET /api/rules — تصدير القواعد المُجمَّعة بصيغة DNR
// ======================================================
export async function GET(request: NextRequest) {
  const بداية = Date.now();

  try {
    const { خطأ, رمز, مستأجر } = await التحقق_من_المستأجر(
      استخراج_مفتاح_API(request)
    );
    if (خطأ || !مستأجر) {
      return NextResponse.json(بناء_استجابة_خطأ(خطأ!, رمز, بداية), { status: رمز });
    }

    const { searchParams } = new URL(request.url);
    const صيغة = searchParams.get("صيغة") ?? "json"; // json | dnr | stats
    const معرف_القائمة = searchParams.get("معرف_القائمة");
    const الحد_الأقصى = Math.min(parseInt(searchParams.get("حد") ?? "5000"), 30000);

    const شروط = {
      القائمة: {
        معرف_المستأجر: مستأجر.معرف,
        الحالة: "نشطة" as never,
        ...(معرف_القائمة && { معرف: معرف_القائمة }),
      },
      نشطة: true,
      مُجمَّعة: true,
    };

    if (صيغة === "stats") {
      // إحصائيات القواعد فقط
      const [إجمالي, حسب_النوع, أداء_التجميع] = await prisma.$transaction([
        prisma.قاعدة_تصفية.count({ where: شروط }),
        prisma.قاعدة_تصفية.groupBy({
          by: ["نوع_القاعدة"],
          where: شروط,
          _count: { معرف: true },
          _sum: { عدد_التطابقات: true },
          _avg: { وقت_التجميع_مللي: true },
        }),
        prisma.قاعدة_تصفية.aggregate({
          where: شروط,
          _avg: { وقت_التجميع_مللي: true },
          _sum: { عدد_التطابقات: true },
        }),
      ]);

      return NextResponse.json(
        بناء_استجابة(
          {
            إجمالي_القواعد_النشطة: إجمالي,
            توزيع_حسب_النوع: حسب_النوع.map((ن) => ({
              نوع_القاعدة: ن.نوع_القاعدة,
              العدد: ن._count.معرف,
              إجمالي_التطابقات: Number(ن._sum.عدد_التطابقات ?? 0),
              متوسط_وقت_التجميع_مللي: Math.round((ن._avg.وقت_التجميع_مللي ?? 0) * 100) / 100,
            })),
            أداء_كلي: {
              متوسط_وقت_التجميع_مللي:
                Math.round((أداء_التجميع._avg.وقت_التجميع_مللي ?? 0) * 100) / 100,
              إجمالي_التطابقات_الكلي: Number(أداء_التجميع._sum.عدد_التطابقات ?? 0),
            },
          },
          "إحصائيات القواعد المُجمَّعة",
          200,
          بداية
        ),
        { status: 200 }
      );
    }

    // جلب القواعد المُجمَّعة
    const قواعد = await prisma.قاعدة_تصفية.findMany({
      where: شروط,
      select: {
        معرف: true,
        النمط: true,
        نوع_القاعدة: true,
        رمز_DNR_المُجمَّع: true,
        وقت_التجميع_مللي: true,
        عدد_التطابقات: true,
        القائمة: { select: { الاسم: true, النوع: true } },
      },
      orderBy: [
        { نوع_القاعدة: "asc" },
        { عدد_التطابقات: "desc" },
      ],
      take: الحد_الأقصى,
    });

    if (صيغة === "dnr") {
      // تصدير DNR JSON نقي للإضافة
      const قواعد_DNR = قواعد
        .map((ق) => {
          try {
            return JSON.parse(ق.رمز_DNR_المُجمَّع ?? "null");
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      return NextResponse.json(قواعد_DNR, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Rules-Count": String(قواعد_DNR.length),
          "X-Generated-By": "Arabic-AdBlock-Engine",
          "X-Processing-Time-Ms": String(Date.now() - بداية),
        },
      });
    }

    // صيغة JSON الغنية الافتراضية
    const بيانات_المنسقة = {
      معلومات_التصدير: {
        إصدار_البروتوكول: "DNR-MV3-1.0",
        المُولِّد: "محرك حجب الإعلانات العربي",
        تاريخ_التوليد: new Date().toISOString(),
        إجمالي_القواعد: قواعد.length,
        حد_التصدير: الحد_الأقصى,
        المستأجر: مستأجر.الاسم,
      },
      توزيع_القواعد: {
        حجب_شبكة: قواعد.filter((ق) => ق.نوع_القاعدة === "حجب_شبكة").length,
        استثناءات: قواعد.filter((ق) => ق.نوع_القاعدة === "استثناء").length,
        إعادة_توجيه: قواعد.filter((ق) => ق.نوع_القاعدة === "إعادة_توجيه").length,
        تجميل: قواعد.filter((ق) => ق.نوع_القاعدة === "حجب_عنصر_صفحة").length,
      },
      القواعد: قواعد.map((ق) => ({
        المعرف: ق.معرف,
        النمط: ق.النمط,
        نوع_القاعدة: ق.نوع_القاعدة,
        المصدر: ق.القائمة.الاسم,
        نوع_القائمة: ق.القائمة.النوع,
        مُجمَّلة: {
          وقت_التجميع_مللي: ق.وقت_التجميع_مللي,
          عدد_التطابقات: Number(ق.عدد_التطابقات),
          بيانات_DNR: ق.رمز_DNR_المُجمَّع
            ? JSON.parse(ق.رمز_DNR_المُجمَّع)
            : null,
        },
      })),
    };

    return NextResponse.json(
      بناء_استجابة(
        بيانات_المنسقة,
        `تم تصدير ${قواعد.length} قاعدة مُجمَّعة`,
        200,
        بداية
      ),
      { status: 200 }
    );
  } catch (خطأ) {
    console.error("[قواعد:GET]", خطأ);
    return NextResponse.json(
      بناء_استجابة_خطأ("خطأ في تصدير القواعد", 500, بداية, String(خطأ)),
      { status: 500 }
    );
  }
}

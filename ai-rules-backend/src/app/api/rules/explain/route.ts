// ======================================================
// مسار API: شرح القواعد الموجودة بالعربية
// Route: POST /api/rules/explain
// يحول قاعدة EasyList تقنية → شرح عربي مبسط
// ======================================================
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `أنت خبير شرح قواعد حجب الإعلانات. مهمتك تحليل قواعد EasyList وشرحها بالعربية بشكل واضح ومبسط.

أجب دائماً بـ JSON نقي فقط بدون أي نص أو markdown إضافي.

صيغة الإخراج:
{
  "الشرح_الموجز": "جملة واحدة واضحة تصف ما تفعله القاعدة",
  "الشرح_التفصيلي": "شرح شامل لكيفية عمل القاعدة",
  "تحليل_الأجزاء": [
    { "الجزء": "||", "المعنى": "يطابق بداية النطاق أو URL" },
    { "الجزء": "example.com", "المعنى": "النطاق المستهدف" },
    { "الجزء": "^", "المعنى": "فاصل الحد - ينهي المطابقة" },
    { "الجزء": "$script", "المعنى": "يُطبّق على ملفات JavaScript فقط" }
  ],
  "ماذا_تحجب": ["قائمة بما تحجبه القاعدة"],
  "ماذا_لا_تحجب": ["قائمة بما لا تحجبه"],
  "نوع_التهديد": "إعلانات|تتبع|تعدين|بصمات|تصيد|أخرى",
  "مستوى_الخطورة": "منخفض|متوسط|عالٍ|حرج",
  "أمثلة_URLs_محجوبة": ["https://ads.example.com/banner.js"],
  "أمثلة_URLs_مسموحة": ["https://cdn.example.com/app.js"],
  "توصيات": ["نصيحة للتحسين إن وجدت"],
  "هل_القاعدة_آمنة": true,
  "مخاطر_الحجب_الخاطئ": "وصف أي خطر من حجب غير مقصود"
}`;

export async function POST(request: NextRequest) {
  const بداية = Date.now();

  try {
    const { القاعدة, قواعد_متعددة } = await request.json();

    const قوائم_القواعد: string[] = قواعد_متعددة ?? (القاعدة ? [القاعدة] : []);

    if (قوائم_القواعد.length === 0) {
      return NextResponse.json({
        خطأ: 'مطلوب "القاعدة" أو "قواعد_متعددة"',
        رمز: 400,
      }, { status: 400 });
    }

    // شرح كل قاعدة بشكل مستقل
    const نتائج = await Promise.all(
      قوائم_القواعد.slice(0, 10).map(async (قاعدة) => {
        const استجابة = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 1000,
            system: SYSTEM_PROMPT,
            messages: [{
              role: "user",
              content: `اشرح لي هذه القاعدة بالتفصيل:\n\n${قاعدة}`,
            }],
          }),
        });

        const بيانات = await استجابة.json();
        const نص = بيانات.content
          .map((c: { type: string; text?: string }) => c.type === "text" ? c.text : "")
          .join("")
          .replace(/```json|```/g, "")
          .trim();

        return {
          القاعدة_الأصلية: قاعدة,
          ...(JSON.parse(نص)),
        };
      })
    );

    return NextResponse.json({
      الحالة: "نجاح",
      البيانات: {
        الشروحات: نتائج,
        إحصائيات: {
          عدد_القواعد_المشروحة: نتائج.length,
          وقت_المعالجة_مللي: Date.now() - بداية,
        },
      },
      الطابع_الزمني: new Date().toISOString(),
    });

  } catch (خطأ) {
    return NextResponse.json({
      الحالة: "خطأ",
      الرسالة: String(خطأ),
      رمز: 500,
    }, { status: 500 });
  }
}

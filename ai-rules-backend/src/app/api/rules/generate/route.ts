// ======================================================
// مسار API: توليد القواعد بالذكاء الاصطناعي
// Route: POST /api/rules/generate
// يحول وصف عربي طبيعي → قواعد EasyList/DNR جاهزة
// ======================================================
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `أنت محرك توليد قواعد حجب إعلانات متخصص. مهمتك تحويل الأوصاف العربية الطبيعية إلى قواعد حجب دقيقة بصيغة EasyList وDeclarative Net Request (DNR) لإضافات المتصفح.

قواعد الإجابة:
- أجب دائماً بـ JSON نقي فقط بدون أي نص إضافي أو markdown
- اتبع صيغة EasyList بدقة تامة
- اشرح كل جزء من القاعدة بالعربية
- اكتشف التعارضات المحتملة
- صنّف نوع التهديد المستهدف

صيغة الإخراج المطلوبة:
{
  "القواعد_المولّدة": [
    {
      "الوصف": "وصف عربي للقاعدة",
      "صيغة_EasyList": "||example.com^$script,third-party",
      "قاعدة_DNR": {
        "id": 1,
        "priority": 1,
        "action": { "type": "block" },
        "condition": {
          "urlFilter": "||example.com^",
          "resourceTypes": ["script"],
          "domainType": "thirdParty"
        }
      },
      "شرح_الأجزاء": {
        "النمط": "شرح النمط",
        "الخيارات": "شرح كل خيار $",
        "النطاقات": "شرح domain= إن وجد"
      },
      "نوع_التهديد": "إعلانات|تتبع|تعدين|تصيد|بصمات",
      "مستوى_الثقة": 0.95,
      "تحذيرات": []
    }
  ],
  "ملخص": "وصف موجز لما تفعله القواعد مجتمعة",
  "توصيات_إضافية": ["نصيحة 1", "نصيحة 2"],
  "تعارضات_محتملة": []
}`;

export async function POST(request: NextRequest) {
  const بداية = Date.now();

  try {
    const { الوصف, السياق, قواعد_موجودة } = await request.json();

    if (!الوصف?.trim()) {
      return NextResponse.json({
        خطأ: "حقل الوصف مطلوب",
        رمز: 400,
      }, { status: 400 });
    }

    const رسالة_المستخدم = `
اطلب مني توليد قواعد حجب للوصف التالي:

"""
${الوصف}
"""

${السياق ? `سياق إضافي: ${السياق}` : ""}
${قواعد_موجودة?.length ? `القواعد الموجودة مسبقاً (لتجنب التعارض):\n${قواعد_موجودة.join("\n")}` : ""}

ولّد قواعد EasyList وDNR دقيقة وشاملة لهذا الطلب.`.trim();

    const استجابة_AI = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: رسالة_المستخدم }],
      }),
    });

    if (!استجابة_AI.ok) {
      throw new Error(`فشل طلب AI: ${استجابة_AI.status}`);
    }

    const بيانات_AI = await استجابة_AI.json();
    const نص_الاستجابة = بيانات_AI.content
      .map((c: { type: string; text?: string }) => c.type === "text" ? c.text : "")
      .join("")
      .replace(/```json|```/g, "")
      .trim();

    let النتيجة;
    try {
      النتيجة = JSON.parse(نص_الاستجابة);
    } catch {
      throw new Error("فشل تحليل استجابة AI كـ JSON");
    }

    return NextResponse.json({
      الحالة: "نجاح",
      البيانات: {
        الوصف_الأصلي: الوصف,
        ...النتيجة,
        إحصائيات_التوليد: {
          عدد_القواعد_المولّدة: النتيجة.القواعد_المولّدة?.length ?? 0,
          وقت_التوليد_مللي: Date.now() - بداية,
          نموذج_AI: "claude-sonnet-4-6",
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

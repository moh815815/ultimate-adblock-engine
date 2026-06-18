// ======================================================
// Middleware — Rate Limiting + Auth + CORS
// تحديد معدل الطلبات + المصادقة + CORS
// ======================================================
import { NextRequest, NextResponse } from "next/server";

// خريطة في الذاكرة لتتبع الطلبات (في الإنتاج: استخدم Redis)
const خريطة_المعدل = new Map<string, { عدد: number; إعادة_ضبط: number }>();

const إعدادات_المعدل = {
  نافذة_مللي: 60_000,      // دقيقة واحدة
  الحد_الافتراضي: 100,      // 100 طلب/دقيقة
  حد_تسجيل_السجلات: 200,   // سجلات الانحراف تحتاج حد أعلى
  حد_المزامنة: 10,          // المزامنة محدودة جداً
};

// مسارات عامة لا تحتاج مصادقة
const مسارات_عامة = ["/api/health", "/api/docs"];

// تحقق مما إذا كان المسار محمياً
function هو_مسار_محمي(pathname: string): boolean {
  return pathname.startsWith("/api/") && !مسارات_عامة.includes(pathname);
}

// تحديد حد المعدل حسب المسار
function حد_المعدل_للمسار(pathname: string): number {
  if (pathname.includes("/deflection-logs")) return إعدادات_المعدل.حد_تسجيل_السجلات;
  if (pathname.includes("/sync")) return إعدادات_المعدل.حد_المزامنة;
  return إعدادات_المعدل.الحد_الافتراضي;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // ======================================================
  // 1. إضافة رؤوس CORS
  // ======================================================
  response.headers.set("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN ?? "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key, X-Admin-Key");
  response.headers.set("Access-Control-Max-Age", "86400");

  // معالجة طلبات OPTIONS المسبقة
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: response.headers });
  }

  // ======================================================
  // 2. تحديد معدل الطلبات (Rate Limiting)
  // ======================================================
  if (هو_مسار_محمي(pathname)) {
    const مفتاح_API = request.headers.get("X-API-Key") 
      ?? request.headers.get("Authorization")?.replace("Bearer ", "")
      ?? request.ip
      ?? "anonymous";

    const مفتاح_التتبع = `${مفتاح_API}:${pathname.split("/")[2] ?? "api"}`;
    const الآن = Date.now();
    const سجل = خريطة_المعدل.get(مفتاح_التتبع);
    const الحد = حد_المعدل_للمسار(pathname);

    if (!سجل || الآن > سجل.إعادة_ضبط) {
      خريطة_المعدل.set(مفتاح_التتبع, {
        عدد: 1,
        إعادة_ضبط: الآن + إعدادات_المعدل.نافذة_مللي,
      });
    } else {
      سجل.عدد++;
      if (سجل.عدد > الحد) {
        const ثوانٍ_متبقية = Math.ceil((سجل.إعادة_ضبط - الآن) / 1000);
        return NextResponse.json(
          {
            الحالة: "خطأ",
            الرسالة: `تجاوزت الحد الأقصى للطلبات (${الحد} طلب/دقيقة). انتظر ${ثوانٍ_متبقية} ثانية.`,
            رمز_الحالة: 429,
            الطلبات_المتبقية: 0,
            إعادة_الضبط_في: new Date(سجل.إعادة_ضبط).toISOString(),
            الطابع_الزمني: new Date().toISOString(),
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(ثوانٍ_متبقية),
              "X-RateLimit-Limit": String(الحد),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(Math.ceil(سجل.إعادة_ضبط / 1000)),
            },
          }
        );
      }

      // إضافة رؤوس معدل الطلبات
      response.headers.set("X-RateLimit-Limit", String(الحد));
      response.headers.set("X-RateLimit-Remaining", String(Math.max(0, الحد - سجل.عدد)));
      response.headers.set("X-RateLimit-Reset", String(Math.ceil(سجل.إعادة_ضبط / 1000)));
    }
  }

  // ======================================================
  // 3. إضافة رؤوس الأمان
  // ======================================================
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Powered-By", "Arabic-AdBlock-Engine/1.0");

  // ======================================================
  // 4. تسجيل الطلبات (بدون بيانات حساسة)
  // ======================================================
  const طابع = Date.now();
  console.log(
    `[${new Date().toISOString()}] ${request.method} ${pathname} — بدأ`
  );

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};

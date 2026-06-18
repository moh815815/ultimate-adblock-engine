// ======================================================
// عميل قاعدة البيانات - Prisma Singleton
// ======================================================
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// ======================================================
// أدوات المصادقة - التحقق من مفتاح API
// ======================================================
export async function التحقق_من_المستأجر(مفتاح_API: string | null) {
  if (!مفتاح_API) {
    return { خطأ: "مفتاح API مفقود", رمز: 401, مستأجر: null };
  }

  const مستأجر = await prisma.مستأجر.findUnique({
    where: { المفتاح_السري: مفتاح_API, نشط: true },
  });

  if (!مستأجر) {
    return { خطأ: "مفتاح API غير صالح أو المستأجر غير نشط", رمز: 403, مستأجر: null };
  }

  return { خطأ: null, رمز: 200, مستأجر };
}

// ======================================================
// بناء استجابة API موحدة بالعربية
// ======================================================
export function بناء_استجابة<T>(
  البيانات: T,
  الرسالة: string,
  رمز_الحالة: number,
  وقت_البدء: number
) {
  return {
    الحالة: رمز_الحالة >= 200 && رمز_الحالة < 300 ? "نجاح" : "خطأ",
    البيانات,
    الرسالة,
    رمز_الحالة,
    وقت_المعالجة_بالميلي_ثانية: Date.now() - وقت_البدء,
    الطابع_الزمني: new Date().toISOString(),
  };
}

export function بناء_استجابة_خطأ(
  الرسالة: string,
  رمز_الحالة: number,
  وقت_البدء: number,
  تفاصيل?: unknown
) {
  return {
    الحالة: "خطأ",
    البيانات: null,
    الرسالة,
    تفاصيل_الخطأ: تفاصيل ?? null,
    رمز_الحالة,
    وقت_المعالجة_بالميلي_ثانية: Date.now() - وقت_البدء,
    الطابع_الزمني: new Date().toISOString(),
  };
}

// ======================================================
// استخراج رأس المصادقة
// ======================================================
export function استخراج_مفتاح_API(request: Request): string | null {
  const authorization = request.headers.get("Authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7);
  }
  return request.headers.get("X-API-Key");
}

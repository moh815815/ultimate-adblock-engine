/** @type {import('next').NextConfig} */
const nextConfig = {
  // تمكين Arabic/RTL support
  i18n: {
    locales: ["ar", "en"],
    defaultLocale: "ar",
  },

  // إعدادات الأمان
  headers: async () => [
    {
      source: "/api/:path*",
      headers: [
        { key: "X-DNS-Prefetch-Control", value: "off" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      ],
    },
  ],

  // تحسين الأداء
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },

  // تسجيل مفصّل في التطوير
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === "development",
    },
  },
};

module.exports = nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  experimental: {
    // Браузер 15 секунд помнит уже открытую вкладку. Переключение
    // «Чаты → Контакты → обратно» становится мгновенным, без похода на сервер.
    // Больше ставить нельзя: список чатов успеет устареть.
    staleTimes: { dynamic: 15, static: 180 },
  },
};

export default nextConfig;

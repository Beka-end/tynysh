import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaSetup } from "@/components/Pwa";

export const metadata: Metadata = {
  title: "Tynysh — мессенджер, где есть кому выслушать",
  description:
    "Чаты, группы и поддержка. Дос — помощник, а не врач. Если тяжело прямо сейчас — 150.",
  manifest: "/manifest.webmanifest",
  applicationName: "Tynysh",
  icons: {
    icon: [
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Tynysh",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#5B4BDB",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@500;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <PwaSetup />
      </body>
    </html>
  );
}

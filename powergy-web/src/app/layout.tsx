import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "POWERGY | Estaciones de energía, plantas eléctricas y paneles solares",
  description:
    "Catálogo POWERGY: estaciones de energía portátiles, plantas eléctricas y paneles solares. Compra directa y sin registro por WhatsApp.",
  keywords: [
    "POWERGY",
    "estaciones de energía",
    "plantas eléctricas",
    "paneles solares",
    "generadores",
    "EcoFlow",
    "Bluetti",
    "Jackery",
  ],
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geistSans.variable} antialiased bg-white text-neutral-900`}>
        {children}
      </body>
    </html>
  );
}

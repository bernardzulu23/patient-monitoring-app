import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const jakarta = localFont({
  src: [
    {
      path: "./fonts/plus-jakarta-sans-latin-400.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/plus-jakarta-sans-latin-500.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/plus-jakarta-sans-latin-600.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/plus-jakarta-sans-latin-700.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-jakarta",
  display: "swap",
});

const newsreader = localFont({
  src: [
    {
      path: "./fonts/newsreader-latin-400.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/newsreader-latin-600.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/newsreader-latin-700.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Patient Monitoring System",
  description:
    "Offline-first hospital patient vital-signs monitoring for rural wards",
  applicationName: "Patient Monitor",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Patient Monitor",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f4c5c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans text-ink">{children}</body>
    </html>
  );
}

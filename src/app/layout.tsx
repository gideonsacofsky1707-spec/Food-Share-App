import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Outfit } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { NavHeader } from "@/components/nav-header";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import "./globals.css";

// Body copy - clean, highly legible, the modern default for app UI.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Headings/wordmark - a geometric sans with more character than the body
// font, applied globally to every h1-h6 (see globals.css).
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FoodShare",
  description: "Give away surplus food to neighbors nearby — free, peer-to-peer.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    title: "FoodShare",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ea580c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        <NextTopLoader height={3} color="#ea580c" showSpinner={false} />
        <ServiceWorkerRegistration />
        <NavHeader />
        {children}
        <footer className="border-t border-zinc-200 px-6 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          Food shared at your own risk. Not a marketplace — no payments, ever.
        </footer>
      </body>
    </html>
  );
}

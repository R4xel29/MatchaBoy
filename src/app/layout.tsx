import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { PermissionPrompt } from "@/components/ui/PermissionPrompt";
import { SplashProvider } from "@/components/providers/SplashProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Arus — Arum Seduh",
  description:
    "Nikmati seduhan terbaik dari Arus. Premium drinks & pastries delivered to your door.",
  keywords: ["arum seduh", "arus", "coffee", "matcha", "delivery", "Jakarta"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Arus",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#D4A574",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${inter.variable} antialiased`}
      >
        <AuthProvider>
          <ToastProvider>
            <SplashProvider>
              {children}
              <PermissionPrompt />
            </SplashProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

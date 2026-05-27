import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Outfit } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { PermissionPrompt } from "@/components/ui/PermissionPrompt";
import { SplashProvider } from "@/components/providers/SplashProvider";
import { prisma } from "@/lib/prisma";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  let shareImage = "/brand/og-preview.png";
  try {
    const settings = await prisma.loyaltySettings.findFirst({
      select: { referralShareImage: true },
    });
    if (settings?.referralShareImage) {
      shareImage = settings.referralShareImage;
    }
  } catch (e) {
    console.error("Error fetching loyalty settings for OG image:", e);
  }

  let appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    if (process.env.VERCEL_URL) {
      appUrl = `https://${process.env.VERCEL_URL}`;
    } else {
      appUrl = "http://localhost:3000";
    }
  }

  return {
    metadataBase: new URL(appUrl),
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
    openGraph: {
      title: "Arus — Arum Seduh",
      description: "Nikmati seduhan terbaik dari Arus. Dapatkan voucher diskon khusus dengan mendaftar lewat link referral ini!",
      images: [
        {
          url: shareImage,
          width: 1200,
          height: 630,
          alt: "Arus Arum Seduh",
        }
      ],
      type: "website",
      siteName: "Arus",
    },
    twitter: {
      card: "summary_large_image",
      title: "Arus — Arum Seduh",
      description: "Nikmati seduhan terbaik dari Arus. Premium drinks & pastries delivered to your door.",
      images: [shareImage],
    }
  };
}

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
        className={`${inter.variable} ${playfair.variable} ${outfit.variable} antialiased`}
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

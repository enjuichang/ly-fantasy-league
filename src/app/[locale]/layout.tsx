import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { locales } from '@/i18n';
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fantasy Legislative Yuan",
  description: "Draft your team of Taiwanese legislators, track their performance, and compete with friends based on real legislative data from Taiwan's Legislative Yuan.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" }
    ],
    apple: [
      { url: "/icon.svg", type: "image/svg+xml" }
    ]
  },
  openGraph: {
    title: "Fantasy Legislative Yuan",
    description: "Draft your team of Taiwanese legislators and compete based on real legislative data",
    type: "website",
    locale: "en_US",
    siteName: "Fantasy Legislative Yuan"
  },
  twitter: {
    card: "summary_large_image",
    title: "Fantasy Legislative Yuan",
    description: "Draft your team of Taiwanese legislators and compete based on real legislative data"
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#094D92" },
    { media: "(prefers-color-scheme: dark)", color: "#95E06C" }
  ]
};
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Validate locale
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // Get messages for the locale
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

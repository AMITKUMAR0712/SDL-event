import "./globals.css";

import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";

import { SessionProvider } from "@/components/shared/session-provider";
import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";
import { SmoothScrollProvider } from "@/components/shared/smooth-scroll-provider";
import { WhatsAppFloatButton } from "@/components/shared/whatsapp-float-button";
import { env } from "@/lib/env";
import { getHeaderSearchOptions } from "@/server/repositories/catalog";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    template: "%s | GlowMakeOver",
    default: "GlowMakeOver — Beauty Parlour & Banquet Bookings Near You",
  },
  description:
    "Find and book trusted beauty parlours and banquets for weddings & parties near you, anywhere in India.",
  ...(env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: env.GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { cities, categories } = await getHeaderSearchOptions();

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Nearly every vendor/banquet/hero photo is served from here —
            opening the connection early shaves the DNS+TLS handshake off
            the very first image request instead of the browser only
            discovering the hostname once it parses the first <img>. */}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <SiteHeader cities={cities} categories={categories} />
          <SmoothScrollProvider>{children}</SmoothScrollProvider>
        </SessionProvider>
        <SiteFooter />
        <WhatsAppFloatButton />
      </body>
    </html>
  );
}

import "./globals.css";

import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";

import { SessionProvider } from "@/components/shared/session-provider";
import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";
import { SmoothScrollProvider } from "@/components/shared/smooth-scroll-provider";
import { env } from "@/lib/env";

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
    template: "%s | MakeGlowOver",
    default: "MakeGlowOver — Beauty & Banquet Bookings Near You",
  },
  description:
    "Find and book trusted beauty vendors and wedding banquet venues near you, anywhere in India.",
  ...(env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: env.GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <SiteHeader />
          <SmoothScrollProvider>{children}</SmoothScrollProvider>
        </SessionProvider>
        <SiteFooter />
      </body>
    </html>
  );
}

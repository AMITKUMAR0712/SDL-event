import "./globals.css";

import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";

import { SmoothScrollProvider } from "@/components/shared/smooth-scroll-provider";

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
  title: {
    template: "%s | MakeGlowOver",
    default: "MakeGlowOver — Beauty & Banquet Bookings Near You",
  },
  description:
    "Find and book trusted beauty vendors and wedding banquet venues near you, anywhere in India.",
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
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}

import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { isPathAuthorized } from "@/lib/access-control";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getActiveSubscriptionSummary, getVendorAndBanquetIds } from "@/server/repositories/user";
import { authenticateWithPassword, verifyPhoneOtpLogin } from "@/server/services/auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      vendorId?: string;
      banquetId?: string;
      subscriptionTier?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
  }
}

const googleProvider =
  env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET
    ? [Google({ clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET })]
    : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  // Credentials requires JWT sessions — the adapter is still used for Google
  // account linking and user storage, just not for session persistence.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    ...googleProvider,
    Credentials({
      id: "credentials",
      name: "Email and password",
      credentials: {
        email: { label: "Email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email : undefined;
        const password =
          typeof credentials?.password === "string" ? credentials.password : undefined;
        if (!email || !password) return null;

        const result = await authenticateWithPassword(email, password);
        if (!result.ok) return null;

        return {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
        };
      },
    }),
    Credentials({
      id: "phone-otp",
      name: "Phone OTP",
      credentials: {
        phone: { label: "Phone" },
        code: { label: "OTP code" },
      },
      async authorize(credentials) {
        const phone = typeof credentials?.phone === "string" ? credentials.phone : undefined;
        const code = typeof credentials?.code === "string" ? credentials.code : undefined;
        if (!phone || !code) return null;

        const result = await verifyPhoneOtpLogin(phone, code);
        if (!result.ok) return null;

        return { id: result.user.id, name: result.user.name, role: result.user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = user.role;
      }

      // Refresh vendor/banquet/subscription linkage on sign-in and whenever
      // the app explicitly asks for it (unstable_update({}) with trigger
      // "update") — e.g. right after a subscription changes.
      if (user || trigger === "update") {
        const userId = user?.id ?? token.sub;
        if (userId) {
          const [ids, subscription] = await Promise.all([
            getVendorAndBanquetIds(userId),
            getActiveSubscriptionSummary(userId),
          ]);
          token.vendorId = ids?.vendorProfile?.id;
          token.banquetId = ids?.banquetProfile?.id;
          token.subscriptionTier = subscription?.plan.code;
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.role = (token.role as string | undefined) ?? "CUSTOMER";
      session.user.vendorId = token.vendorId as string | undefined;
      session.user.banquetId = token.banquetId as string | undefined;
      session.user.subscriptionTier = token.subscriptionTier as string | undefined;
      return session;
    },
    authorized({ request, auth: session }) {
      const { pathname } = request.nextUrl;
      return isPathAuthorized(pathname, session?.user.role);
    },
  },
});

// Next.js 16 renamed `middleware.ts` to `proxy.ts` (same request/response
// contract, nodejs-only runtime). next-auth@5's `auth` HOC predates that
// rename and documents itself in terms of `export { auth as middleware }`,
// but the underlying function signature is unchanged, so re-exporting it as
// `proxy` here is the same supported pattern under the new name.
export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: ["/admin/:path*", "/vendor/:path*", "/banquet/:path*", "/account/:path*"],
};

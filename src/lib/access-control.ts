/**
 * Pure route-guarding rules, deliberately dependency-free (no next-auth, no
 * Next.js imports) so this can be unit tested directly — see
 * tests/unit/authz.test.ts — without dragging in next-auth's `next/server`
 * dependency, which Vitest's Node environment can't resolve the way Next's
 * own bundler does.
 */

const ROLE_PREFIX_GUARDS: { prefix: string; roles: string[] }[] = [
  { prefix: "/admin", roles: ["ADMIN", "SUPPORT"] },
  { prefix: "/vendor", roles: ["VENDOR"] },
  { prefix: "/banquet", roles: ["BANQUET_OWNER"] },
  { prefix: "/account", roles: ["CUSTOMER", "VENDOR", "BANQUET_OWNER", "ADMIN", "SUPPORT"] },
];

export function isPathAuthorized(pathname: string, role: string | undefined): boolean {
  const guard = ROLE_PREFIX_GUARDS.find(
    (g) => pathname === g.prefix || pathname.startsWith(`${g.prefix}/`),
  );
  if (!guard) return true; // not a guarded prefix — public
  if (!role) return false; // guarded prefix, no session
  return guard.roles.includes(role);
}

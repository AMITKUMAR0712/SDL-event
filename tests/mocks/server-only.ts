// Stands in for the real `server-only` package under Vitest. The real
// package throws unconditionally outside a webpack build that understands
// Next.js's "react-server" export condition — Vite/Vitest doesn't, so every
// test importing anything that imports "server-only" (e.g. razorpay.ts)
// would otherwise fail regardless of which function it actually needs.
export {};

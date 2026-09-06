import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  // `src/lib/env.ts` validates `process.env` the same way `next dev`/`build`
  // would populate it (from `.env`). Vitest doesn't load `.env` on its own,
  // so any test importing `env.ts` would otherwise fail with "missing
  // NEXT_PUBLIC_APP_URL/DATABASE_URL/AUTH_SECRET" even in a correctly
  // configured local setup.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

  return {
    plugins: [tsconfigPaths(), react()],
    test: {
      environment: "jsdom",
      include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.{ts,tsx}"],
      setupFiles: ["./tests/unit/setup.ts"],
      coverage: {
        provider: "v8",
        reporter: ["text", "html"],
      },
    },
  };
});

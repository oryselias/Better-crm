import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  {
    // BUG-015: python_scripts/.venv contained 18K+ Playwright files causing false lint errors
    ignores: [
      ".next/**", ".qmd/**", ".tools/**", ".obsidian/**",
      "node_modules/**", "python_scripts/**", "public/sw.js", "*.js",
      // Deno Edge Functions — different runtime, not part of the Next.js build
      "supabase/functions/**",
      // WhatsApp / AI — v2 features, intentionally unused in v1
      "lib/whatsapp/**", "lib/ai/**", "lib/ai.ts", "proxy.ts",
    ],
  },
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
];

export default config;

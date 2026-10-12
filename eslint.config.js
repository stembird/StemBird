import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "src/integrations/supabase/types.ts"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      "no-empty": "off",
      "no-restricted-syntax": [
        "error",
        {
          "selector": "MemberExpression[object.object.name='process'][object.property.name='env'][property.name='NEXT_PUBLIC_SUPABASE_URL'][optional=false]",
          "message": "Use getSupabaseUrl() from @/lib/supabaseEnv instead of process.env.NEXT_PUBLIC_SUPABASE_URL (except in supabaseEnv.ts)."
        }
      ],
    },
  },
  {
    files: ["src/lib/supabaseEnv.ts", "src/lib/supabaseEnv.test.ts", "scripts/check-supabase-clients.mts"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
);

import base from "./eslint.config.base.mjs";

const baseArr = Array.isArray(base) ? base : [base];

// Assign array to a variable to avoid import/no-anonymous-default-export
const eslintConfig = [
  ...baseArr,

  // L-05: ESLint build'de aktif — `any` ve `unused-vars` suppressed (gradual fix)
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },

  // Keep generated artifacts out of lint scope
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "public/contracts/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;

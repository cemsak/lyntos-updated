import base from "./eslint.config.base.mjs";

const baseArr = Array.isArray(base) ? base : [base];

// Assign array to a variable to avoid import/no-anonymous-default-export
const eslintConfig = [
  ...baseArr,

  // Lyntos: lint stabilization — do not block refactor on `any`
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
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

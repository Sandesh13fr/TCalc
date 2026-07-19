import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**", "dist-ci/**", "dist-vsix/**"],
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    rules: {
      "no-constant-condition": "error",
      "no-debugger": "error",
      "no-duplicate-imports": "error",
      "no-unreachable": "error",
    },
  },
];

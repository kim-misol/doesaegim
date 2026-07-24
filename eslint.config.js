import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import prettier from "eslint-config-prettier";

export default [
  { ignores: ["dist", "coverage", "node_modules"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    settings: { react: { version: "detect" } },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // 이 프로젝트는 prop-types 패키지를 쓰지 않음(순수 JS, 런타임 타입검사 없음)
      "react/prop-types": "off",
    },
  },
  {
    files: ["**/__tests__/**/*.{js,jsx}", "**/*.test.{js,jsx}"],
    languageOptions: { globals: { ...globals.vitest } },
  },
  prettier,
];

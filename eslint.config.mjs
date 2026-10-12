import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";
import globals from "globals";
import svelte from "eslint-plugin-svelte";
import svelteConfig from "./svelte.config.mjs";

// Style inferred from the user-provided TypeScript example.
// Line wrapping and trailing commas are intentionally left to the author.
const styleRules = {
    "@stylistic/indent": ["error", 4, { SwitchCase: 1 }],
    "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
    "@stylistic/semi": ["error", "always"],
    "@stylistic/arrow-parens": ["error", "as-needed"],
    "@stylistic/space-before-function-paren": ["error", {
        named: "always",
        anonymous: "never",
        asyncArrow: "always",
    }],
    "@stylistic/brace-style": ["error", "1tbs", { allowSingleLine: false }],
    "@stylistic/comma-spacing": ["error", { before: false, after: true }],
    "@stylistic/key-spacing": ["error", { beforeColon: false, afterColon: true }],
    "@stylistic/keyword-spacing": ["error", { before: true, after: true }],
    "@stylistic/space-infix-ops": "error",
    "@stylistic/space-before-blocks": ["error", "always"],
    "@stylistic/object-curly-spacing": ["error", "always"],
    "@stylistic/array-bracket-spacing": ["error", "never"],
    "@stylistic/no-trailing-spaces": "error",
    "@stylistic/eol-last": ["error", "always"],
    "@stylistic/no-multiple-empty-lines": ["error", { max: 1, maxBOF: 0, maxEOF: 0 }],
    "@stylistic/padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: ["function", "class"] },
        { blankLine: "always", prev: ["function", "class"], next: "*" },
    ],
};

export default defineConfig(
    { ignores: ["dist/**", "test-results/**", "node_modules/**"] },
    {
        files: ["**/*.ts"],
        extends: [js.configs.recommended, tseslint.configs.recommended],
        plugins: { "@stylistic": stylistic },
        rules: {
            ...styleRules,
            curly: ["error", "all"],
            "@stylistic/type-annotation-spacing": "error",
            "@typescript-eslint/no-unused-expressions": ["error", { allowShortCircuit: true }],
        },
    },
    {
        files: ["src/**/*.ts"],
        languageOptions: { globals: { ...globals.browser, chrome: "readonly" } },
    },
    {
        files: ["tests/**/*.ts"],
        languageOptions: { globals: globals.node },
    },
    {
        files: ["**/*.mjs"],
        extends: [js.configs.recommended],
        plugins: { "@stylistic": stylistic },
        languageOptions: { globals: globals.node },
        rules: { ...styleRules, curly: ["error", "all"] },
    },
    {
        files: ["tests/ui.smoke.mjs"],
        languageOptions: { globals: { ...globals.browser, ...globals.node, chrome: "readonly" } },
    },
    {
        files: ["**/*.svelte"],
        extends: [js.configs.recommended, tseslint.configs.recommended, svelte.configs.recommended],
        plugins: { "@stylistic": stylistic },
        languageOptions: {
            globals: { ...globals.browser, chrome: "readonly" },
            parserOptions: { parser: tseslint.parser, svelteConfig },
        },
        rules: {
            ...styleRules,
            // The Svelte rule understands both markup and TypeScript script indentation.
            "@stylistic/indent": "off",
            "svelte/indent": ["error", { indent: 4, indentScript: true }],
            "svelte/html-quotes": ["error", { prefer: "double" }],
            "svelte/html-closing-bracket-spacing": "error",
            curly: ["error", "all"],
            "@stylistic/type-annotation-spacing": "error",
            "@typescript-eslint/no-unused-expressions": ["error", { allowShortCircuit: true }],
        },
    },
);

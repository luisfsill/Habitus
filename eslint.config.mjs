// Fast lint tier (no type information). Type-aware rules live in
// eslint.typed.config.mjs and run through `npm run lint:typed`.
//
// Quality gates copied from vibe-coding-toolkit templates/eslint at revision
// 790a895304e0c08b70a5b215c9d334f1c86b816c. The eslint-rules/*.cjs files are
// byte-for-byte copies; `npm run lint:rules` re-runs their self-check.
//
// Layers in this project:
//   src/domain     pure logic (schedule, time, history) -- imports nothing app-side
//   src/services   side effects (AsyncStorage, expo-notifications)
//   src/state      React context wiring domain + services
//   src/app        Expo Router screens (presentation)
//   src/components presentational building blocks
import { defineConfig, globalIgnores } from "eslint/config";
import expoConfig from "eslint-config-expo/flat.js";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import { importX } from "eslint-plugin-import-x";
import { configs as tsConfigs } from "typescript-eslint";

import quality from "./eslint-rules/index.cjs";

const testFiles = [
  "**/*{.,-}{test,spec}.{js,jsx,ts,tsx,mjs,cjs,mts,cts}",
  "**/{__tests__,__mocks__,fixtures,mocks}/**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}",
];

// typescript-eslint strict re-registers the @typescript-eslint plugin that
// eslint-config-expo already provides; keep only its rules to avoid a
// "cannot redefine plugin" clash.
const tsStrictRules = Object.assign(
  {},
  ...tsConfigs.strict.map((block) => block.rules ?? {}),
);

export default defineConfig([
  expoConfig,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      ...tsStrictRules,
      // The TypeScript compiler already checks these; eslint-plugin-import
      // misreads TS enums re-exported through `export *` (expo-notifications).
      // See https://typescript-eslint.io/troubleshooting/typed-linting/performance#eslint-plugin-import
      "import/namespace": "off",
      "import/named": "off",
      "import/default": "off",
      "import/no-named-as-default-member": "off",
    },
  },
  {
    plugins: { "import-x": importX },
    settings: {
      "import-x/resolver-next": [createTypeScriptImportResolver()],
    },
    rules: {
      "import-x/no-duplicates": "error",
      "import-x/no-restricted-paths": [
        "error",
        {
          zones: [
            // Domain stays pure: no UI, no storage, no notifications.
            {
              target: "./src/domain/**/*",
              from: ["./src/app/**/*", "./src/components/**/*", "./src/services/**/*", "./src/state/**/*"],
            },
            // Components are presentational; side effects go through state.
            { target: "./src/components/**/*", from: ["./src/services/**/*", "./src/app/**/*"] },
            // Services never reach back into the UI.
            {
              target: "./src/services/**/*",
              from: ["./src/app/**/*", "./src/components/**/*", "./src/state/**/*"],
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}"],
    plugins: { quality },
    rules: {
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-var": "error",
      "prefer-const": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      complexity: ["warn", 12],
      "max-depth": ["warn", 4],
      "max-statements": ["warn", 20],
      "max-params": ["warn", 4],
      "max-lines-per-function": [
        "warn",
        { max: 150, skipBlankLines: true, skipComments: true },
      ],
      "max-nested-callbacks": ["warn", 3],
      "quality/max-lines": ["error", { max: 350 }],
      "quality/no-direct-console": ["error", { logger: "src/services/log.ts" }],
      // AsyncStorage is this app's data store; screens and components reach
      // it only through src/services/storage.ts.
      "quality/no-direct-data-access": [
        "error",
        {
          modules: ["@react-native-async-storage/async-storage"],
          bindings: ["default"],
          layers: ["/src/app/", "/src/components/", "/src/state/"],
        },
      ],
    },
  },
  {
    // The log adapter itself. MUST come after the block that enables the rule.
    files: ["src/services/log.ts"],
    rules: {
      "quality/no-direct-console": "off",
    },
  },
  {
    files: testFiles,
    plugins: { quality },
    rules: {
      "quality/max-lines": ["warn", { max: 350, includeTests: true }],
    },
  },
  {
    files: testFiles,
    rules: {
      "max-statements": "off",
      "max-lines-per-function": "off",
      "max-nested-callbacks": "off",
      "import-x/no-restricted-paths": "off",
    },
  },
  {
    files: ["eslint-rules/**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { module: "readonly", require: "readonly" },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  globalIgnores([
    ".claude/**",
    ".agents/**",
    ".codex/**",
    ".expo/**",
    "node_modules/**",
    "dist/**",
    "web-build/**",
    "coverage/**",
    "android/**",
    "ios/**",
    "**/*.tsbuildinfo",
    "package-lock.json",
    "expo-env.d.ts",
    // Deno code that runs on Supabase, not in the app.
    "supabase/functions/**",
  ]),
]);

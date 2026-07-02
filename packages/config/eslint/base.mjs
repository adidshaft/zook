import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactNativeA11y from "eslint-plugin-react-native-a11y";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.expo/**",
      "**/playwright-report/**",
      "**/next-env.d.ts",
      "**/expo-env.d.ts"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    ignores: [
      "node_modules/**",
      ".next/**",
      "dist/**",
      "build/**",
      "coverage/**",
      ".expo/**",
      "playwright-report/**"
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module"
    },
    plugins: {
      "react-hooks": reactHooks
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }
      ],
      "no-undef": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "no-restricted-syntax": [
        "error",
        {
          "selector": "Property[key.type='Identifier'][key.name='boxShadow']",
          "message": "Use shared cross-platform shadow helpers instead of boxShadow in React Native styles."
        }
      ]
    }
  },
  {
    files: [
      "apps/mobile/app/**/*.{ts,tsx}",
      "apps/mobile/src/features/**/*.{ts,tsx}",
      "apps/mobile/src/components/**/*.{ts,tsx}"
    ],
    plugins: {
      "react-native-a11y": reactNativeA11y
    },
    rules: {
      "react-native-a11y/has-accessibility-props": [
        "warn",
        {
          "touchables": ["Pressable", "TouchableOpacity"]
        }
      ],
      "react-native-a11y/has-valid-accessibility-descriptors": [
        "error",
        {
          "touchables": ["Pressable", "TouchableOpacity"]
        }
      ],
      "no-restricted-syntax": [
        "warn",
        {
          "selector": "Property[key.type='Identifier'][key.name='fontSize'][value.type='Literal']",
          "message": "Use mobile typography tokens instead of inline fontSize literals."
        }
      ]
    }
  }
];

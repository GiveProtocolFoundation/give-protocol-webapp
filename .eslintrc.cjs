module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
    jest: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:react/jsx-runtime",
    "plugin:jest/recommended",
  ],
  ignorePatterns: [
    "dist",
    ".eslintrc.cjs",
    "node_modules",
    "hardhat.config.cjs",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ["react-refresh", "jest", "@typescript-eslint"],
  rules: {
    "react-refresh/only-export-components": [
      "warn",
      { allowConstantExport: true },
    ],
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        ignoreRestSiblings: true,
      },
    ],
  },
  overrides: [
    {
      // Test-utils mock files are plain-JS stubs — prop-types validation is irrelevant.
      files: ["src/test-utils/**/*.js"],
      rules: {
        "react/prop-types": "off",
      },
    },
    {
      // Cypress e2e specs — declare Cypress globals and disable Jest-specific rules.
      files: ["cypress/**/*.ts", "cypress/**/*.js"],
      globals: {
        cy: "readonly",
        Cypress: "readonly",
        describe: "readonly",
        it: "readonly",
        before: "readonly",
        beforeEach: "readonly",
        after: "readonly",
        afterEach: "readonly",
        expect: "readonly",
        assert: "readonly",
        context: "readonly",
      },
      rules: {
        "jest/valid-expect": "off",
        "jest/expect-expect": "off",
        "jest/no-standalone-expect": "off",
        "@typescript-eslint/no-explicit-any": "off",
      },
    },
  ],
  settings: {
    react: {
      version: "detect",
    },
  },
};

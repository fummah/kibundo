// .eslintrc.cjs
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  // Base + React + useful regex rules
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:regexp/recommended",
  ],
  plugins: ["react", "regexp"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: "detect" },
  },
  ignorePatterns: [
    "node_modules/",
    "dist/",
    "build/",
    ".vite/",
    "coverage/",
  ],

  rules: {
    // --- Route hardcoding guard ---
    // Disallow ANY string literal that starts with "/student/..."
    // This catches: navigate("/student/reading"), <Link to="/student/..."/>, etc.
    "no-restricted-syntax": [
      "error",
      {
        selector: 'Literal[value=/^\\/student\\//]',
        message:
          'Do not hardcode student routes. Import from "@/routes/studentPaths" (e.g., ROUTES.READING_PRACTICE).',
      },
    ],

    // React lint sane defaults
    "react/prop-types": "off", // if you’re not using PropTypes
    "react/react-in-jsx-scope": "off", // not needed with new JSX transform

    // Optional: keep regex plugin strict but practical
    "regexp/no-unused-capturing-group": "warn",
    "regexp/no-dupe-characters-character-class": "warn",
  },

  overrides: [
    // Allow hardcoded paths ONLY in the central routes file
    {
      files: ["src/routes/studentPaths.js"],
      rules: {
        "no-restricted-syntax": "off",
      },
    },
    // Example: relax rules in config files or scripts if needed
    {
      files: ["*.config.*", "scripts/**/*.*"],
      env: { node: true },
    },
  ],
};

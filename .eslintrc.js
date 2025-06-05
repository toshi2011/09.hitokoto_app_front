// apps/frontend/.eslintrc.js
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",   // React を使う場合
  ],
  settings: {
    react: { version: "detect" },
  },
  rules: {
    // 独自ルールをここに追加
  },
};

import shared from "@acurexpress/config/prettier";

/** @type {import("prettier").Config} */
const config = {
  ...shared,
  plugins: ["prettier-plugin-tailwindcss"],
  // Class sorting reads the web app's Tailwind theme (which imports the shared tokens).
  tailwindStylesheet: "./apps/web/src/styles/globals.css",
};

export default config;

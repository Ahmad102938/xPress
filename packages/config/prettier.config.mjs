/**
 * Shared Prettier options. The root prettier.config.mjs adds the Tailwind plugin, which needs a
 * path to the app stylesheet.
 * @type {import("prettier").Config}
 */
const config = {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 100,
};

export default config;

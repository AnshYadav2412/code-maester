"use strict";

const prettier = require("prettier");

// Default prettier config — matches most JS style guides
const DEFAULT_CONFIG = {
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  useTabs: false,
  trailingComma: "es5",
  bracketSpacing: true,
  arrowParens: "always",
  printWidth: 80,
  endOfLine: "lf",
};

/**
 * Format JavaScript or TypeScript code using Prettier.
 *
 * @param {string} code     - raw source code
 * @param {string} language - 'javascript' | 'typescript'
 * @param {object} options  - optional prettier config overrides
 * @returns {Promise<{ formatted: string, error: string|null }>}
 */
async function format(code, language = "javascript", options = {}) {
  try {
    const config = {
      ...DEFAULT_CONFIG,
      ...options,
      parser: language === "typescript" ? "typescript" : "babel",
    };

    const formatted = await prettier.format(code, config);

    return { formatted, error: null };
  } catch (err) {
    // Prettier failed (likely syntax error in input) — return original
    return {
      formatted: code,
      error: `Prettier could not format this code: ${err.message}`,
    };
  }
}

module.exports = { format };

"use strict";

let prettier;
try {
  prettier = require("prettier");
} catch {
  prettier = null;
}

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
 * Falls back to basic indentation fix if Prettier is unavailable.
 *
 * @param {string} code     - raw source code
 * @param {string} language - 'javascript' | 'typescript'
 * @param {object} options  - optional prettier config overrides
 * @returns {Promise<{ formatted: string, error: string|null }>}
 */
async function format(code, language = "javascript", options = {}) {
  // ── Prettier available ────────────────────────────────────────────────────
  if (prettier) {
    try {
      const config = {
        ...DEFAULT_CONFIG,
        ...options,
        parser: language === "typescript" ? "typescript" : "babel",
      };

      // Prettier v3 uses formatSync or async format
      let formatted;
      if (typeof prettier.format === "function") {
        formatted = await prettier.format(code, config);
      } else {
        formatted = prettier.format(code, config);
      }

      return { formatted, error: null };
    } catch (err) {
      // Prettier failed (likely syntax error in input) — return original
      return {
        formatted: code,
        error: `Prettier could not format this code: ${err.message}`,
      };
    }
  }

  // ── Fallback: basic normalisation ─────────────────────────────────────────
  return {
    formatted: basicJsFormat(code),
    error: "Prettier not available — applied basic formatting only.",
  };
}

/**
 * Basic JS formatter fallback — normalises indentation and spacing.
 * Does NOT change program logic.
 * @param {string} code
 * @returns {string}
 */
function basicJsFormat(code) {
  const lines = code.split("\n");
  let depth = 0;
  const indent = "  "; // 2 spaces

  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";

      // Decrease depth for closing braces before indenting
      const closes = (trimmed.match(/^[}\])]/) || []).length;
      depth = Math.max(0, depth - closes);

      const indented = indent.repeat(depth) + trimmed;

      // Increase depth for opening braces after indenting
      const opens = (trimmed.match(/[{[(]/g) || []).length;
      const closesSameLine = (trimmed.match(/[}\])]/g) || []).length;
      depth += Math.max(0, opens - closesSameLine);

      return indented;
    })
    .join("\n");
}

module.exports = { format };

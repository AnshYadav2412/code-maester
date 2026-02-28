"use strict";

const jsFormatter = require("./js-formatter");
const pyFormatter = require("./py-formatter");
const { generateDiff, getLineDiff, diffStats } = require("./diff");

/**
 * Routes code to the correct formatter based on language.
 * Returns formatted code, unified diff, and line-by-line diff.
 *
 * @param {string} code     - raw source code
 * @param {string} language - detected language
 * @param {object} options  - optional formatter config
 * @returns {Promise<{
 *   formatted:  string,    // auto-formatted version of the source
 *   diff:       string,    // unified diff — original vs formatted
 *   lineDiff:   Array,     // line-by-line diff for UI rendering
 *   stats:      object,    // { added, removed, unchanged }
 *   tool:       string,    // which formatter was used
 *   error:      string|null
 * }>}
 */
async function run(code, language, options = {}) {
  let formatted = code;
  let tool = "none";
  let error = null;

  // ── Route to correct formatter ────────────────────────────────────────────
  try {
    if (language === "javascript" || language === "typescript") {
      const result = await jsFormatter.format(code, language, options);
      formatted = result.formatted;
      error = result.error;
      tool = error ? "prettier-fallback" : "prettier";
    } else if (language === "python") {
      const result = await pyFormatter.format(code, options);
      formatted = result.formatted;
      error = result.error;
      tool = result.tool;
    } else {
      // Unsupported language — return code unchanged
      error = `Formatter not available for language: ${language}`;
    }
  } catch (err) {
    // Formatter crashed — return original code, don't fail the whole analysis
    formatted = code;
    error = `Formatter threw an unexpected error: ${err.message}`;
  }

  // ── Generate diffs ────────────────────────────────────────────────────────
  const filename = options.filePath
    ? require("path").basename(options.filePath)
    : `code.${languageToExtension(language)}`;

  const diff = generateDiff(code, formatted, filename);
  const lineDiff = getLineDiff(code, formatted);
  const stats = diffStats(code, formatted);

  return {
    formatted,
    diff,
    lineDiff,
    stats,
    tool,
    error,
  };
}

/**
 * Maps language name to file extension for diff headers.
 * @param {string} language
 * @returns {string}
 */
function languageToExtension(language) {
  const map = {
    javascript: "js",
    typescript: "ts",
    python: "py",
    java: "java",
    c: "c",
    cpp: "cpp",
  };
  return map[language] || "txt";
}

module.exports = { run };

"use strict";

const prettier = require("prettier");
const { generateDiff, getLineDiff, diffStats } = require("./diff");

// Default prettier config
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
 * Map language to Prettier parser
 * @param {string} language
 * @returns {string|null}
 */
function getParser(language) {
  const parserMap = {
    javascript: "babel",
    typescript: "typescript",
    jsx: "babel",
    tsx: "typescript",
    json: "json",
    css: "css",
    scss: "scss",
    less: "less",
    html: "html",
    markdown: "markdown",
    yaml: "yaml",
    graphql: "graphql",
    java: "java", // requires prettier-plugin-java
  };
  return parserMap[language] || null;
}

/**
 * Format Java code using prettier-plugin-java
 * @param {string} code
 * @param {object} options
 * @returns {Promise<{formatted: string, tool: string, error: string|null}>}
 */
async function formatJava(code, options = {}) {
  try {
    const config = {
      ...DEFAULT_CONFIG,
      ...options,
      parser: "java",
      plugins: ["prettier-plugin-java"], // Use string instead of require
      tabWidth: 4, // Java convention
    };

    const formatted = await prettier.format(code, config);
    return { formatted, tool: "prettier-java", error: null };
  } catch (err) {
    return {
      formatted: code,
      tool: "prettier-java-error",
      error: `Java formatting failed: ${err.message}`,
    };
  }
}

/**
 * Format C/C++ code using clang-format
 * @param {string} code
 * @param {string} language - 'c' or 'cpp'
 * @param {object} options
 * @returns {Promise<{formatted: string, tool: string, error: string|null}>}
 */
async function formatCpp(code, language, options = {}) {
  try {
    const clangFormat = require("clang-format");
    const { spawnSync } = require("child_process");

    // Get clang-format binary path
    const clangFormatPath = clangFormat.getNativeBinary();

    // Default clang-format style
    const style = options.clangStyle || "Google";

    // Run clang-format
    const result = spawnSync(
      clangFormatPath,
      [`--style=${style}`, `--assume-filename=file.${language === "cpp" ? "cpp" : "c"}`],
      {
        input: code,
        encoding: "utf-8",
        timeout: 10000,
      }
    );

    if (result.status === 0 && result.stdout) {
      return {
        formatted: result.stdout,
        tool: "clang-format",
        error: null,
      };
    }

    return {
      formatted: code,
      tool: "clang-format-error",
      error: result.stderr || "clang-format failed",
    };
  } catch (err) {
    return {
      formatted: code,
      tool: "clang-format-error",
      error: `C/C++ formatting failed: ${err.message}`,
    };
  }
}

/**
 * Routes code to the appropriate formatter based on language.
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

  // ── Route to appropriate formatter ────────────────────────────────────────
  if (language === "java") {
    const result = await formatJava(code, options.formatOptions);
    formatted = result.formatted;
    tool = result.tool;
    error = result.error;
  } else if (language === "c" || language === "cpp") {
    const result = await formatCpp(code, language, options.formatOptions);
    formatted = result.formatted;
    tool = result.tool;
    error = result.error;
  } else {
    // Try Prettier for other languages
    const parser = getParser(language);

    if (parser) {
      try {
        const config = {
          ...DEFAULT_CONFIG,
          ...(options.formatOptions || {}),
          parser,
        };

        formatted = await prettier.format(code, config);
        tool = "prettier";
        error = null;
      } catch (err) {
        // Prettier failed (likely syntax error in input) — return original
        formatted = code;
        error = `Prettier could not format this code: ${err.message}`;
        tool = "prettier-error";
      }
    } else {
      // Unsupported language — return code unchanged
      error = `Formatter not available for language: ${language}. Supported: JavaScript, TypeScript, JSON, CSS, HTML, Markdown, YAML, GraphQL, Java, C, C++.`;
    }
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
    jsx: "jsx",
    tsx: "tsx",
    python: "py",
    java: "java",
    c: "c",
    cpp: "cpp",
    json: "json",
    css: "css",
    html: "html",
    markdown: "md",
    yaml: "yml",
  };
  return map[language] || "txt";
}

module.exports = { run };

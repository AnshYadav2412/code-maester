"use strict";

/**
 * Detects naming convention violations.
 *
 * Rules enforced:
 *   - Variables and functions should be camelCase
 *   - Classes should be PascalCase
 *   - Constants (const + all caps) should be UPPER_SNAKE_CASE
 *   - No single-letter variables outside of loop counters
 */

const RULES = [
  {
    // Variables and let/const that aren't UPPER_SNAKE should be camelCase
    pattern: /(?:let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/,
    rule: "camel-case-variable",
    check: (name) => !isCamelCase(name) && !isUpperSnake(name),
    message: (name) =>
      `Variable '${name}' should use camelCase naming convention.`,
    suggestion: (name) => `Rename '${name}' to '${toCamelCase(name)}'`,
    severity: "warning",
  },
  {
    // Functions should be camelCase (PascalCase is for classes only)
    pattern: /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/,
    rule: "camel-case-function",
    check: (name) => !isCamelCase(name),
    message: (name) =>
      `Function '${name}' should use camelCase naming convention (PascalCase is reserved for classes).`,
    suggestion: (name) => `Rename '${name}' to '${toCamelCase(name)}'`,
    severity: "warning",
  },
  {
    // Classes should be PascalCase
    pattern: /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/,
    rule: "pascal-case-class",
    check: (name) => !isPascalCase(name),
    message: (name) =>
      `Class '${name}' should use PascalCase naming convention.`,
    suggestion: (name) => `Rename '${name}' to '${toPascalCase(name)}'`,
    severity: "warning",
  },
  {
    // Single letter variables outside loops
    pattern: /(?:const|let|var)\s+([a-zA-Z])\s*=/,
    rule: "no-single-letter-var",
    check: (name) => !["i", "j", "k", "x", "y", "z", "e", "n"].includes(name),
    message: (name) => `Single-letter variable '${name}' is not descriptive.`,
    suggestion: (name) => `Use a descriptive name instead of '${name}'.`,
    severity: "info",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isCamelCase(name) {
  return /^[a-z][a-zA-Z0-9]*$/.test(name);
}

function isPascalCase(name) {
  return /^[A-Z][a-zA-Z0-9]*$/.test(name);
}

function isUpperSnake(name) {
  return /^[A-Z][A-Z0-9_]*$/.test(name);
}

function toCamelCase(name) {
  return name
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
}

function toPascalCase(name) {
  const camel = toCamelCase(name);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

// ─── Detector ─────────────────────────────────────────────────────────────────

/**
 * @param {string} code
 * @returns {Array} issues
 */
function detect(code) {
  const issues = [];
  const lines = code.split("\n");

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;

    for (const {
      pattern,
      rule,
      check,
      message,
      suggestion,
      severity,
    } of RULES) {
      const match = line.match(pattern);
      if (!match) continue;

      const name = match[1];
      if (check(name)) {
        issues.push({
          type: "lint",
          severity,
          rule,
          line: i + 1,
          column: line.indexOf(name) + 1,
          message: message(name),
          suggestion: suggestion(name),
        });
      }
    }
  });

  return issues;
}

module.exports = { detect };

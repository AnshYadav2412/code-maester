"use strict";

/**
 * Detects common off-by-one error patterns in loops.
 *
 * Patterns caught:
 *   - for (i = 0; i <= arr.length; i++)   ← should be
 *   - for (i = 1; i < arr.length; i++)    ← starts at 1, skips index 0
 *   - arr[arr.length]                     ← always undefined
 *   - while (i <= arr.length)             ← should be
 */

const PATTERNS = [
  {
    pattern: /for\s*\(.*;\s*\w+\s*<=\s*(\w+)\.length\s*;/,
    message: (m) =>
      `Off-by-one: loop condition uses '<= ${m[1]}.length' which will access index ${m[1]}.length (undefined). Use '< ${m[1]}.length'.`,
    suggestion: (m) => `Change '<= ${m[1]}.length' to '< ${m[1]}.length'`,
    severity: "error",
    rule: "off-by-one-lte-length",
  },
  {
    pattern: /for\s*\(\s*(?:let|var|const)?\s*\w+\s*=\s*1\s*;.*\.length/,
    message: () =>
      `Off-by-one: loop starts at index 1, skipping index 0. This is intentional only for 1-based arrays.`,
    suggestion: () => `If iterating all elements, start the loop counter at 0.`,
    severity: "warning",
    rule: "off-by-one-starts-at-1",
  },
  {
    pattern: /(\w+)\[(\w+)\.length\]/,
    message: (m) =>
      `Off-by-one: '${m[1]}[${m[2]}.length]' is always undefined. Last index is '${m[2]}.length - 1'.`,
    suggestion: (m) =>
      `Change to '${m[1]}[${m[2]}.length - 1]' to access the last element.`,
    severity: "error",
    rule: "off-by-one-direct-length-access",
  },
  {
    pattern: /while\s*\(.*\w+\s*<=\s*(\w+)\.length/,
    message: (m) =>
      `Off-by-one: while loop uses '<= ${m[1]}.length', will attempt access past the last index.`,
    suggestion: (m) => `Change '<= ${m[1]}.length' to '< ${m[1]}.length'`,
    severity: "error",
    rule: "off-by-one-while-lte-length",
  },
];

/**
 * @param {string} code
 * @returns {Array} issues
 */
function detect(code) {
  const issues = [];
  const lines = code.split("\n");

  lines.forEach((line, i) => {
    for (const { pattern, message, suggestion, severity, rule } of PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        issues.push({
          type: "bug",
          severity,
          rule,
          line: i + 1,
          column: line.search(pattern) + 1,
          message: message(match),
          suggestion: suggestion(match),
        });
      }
    }
  });

  return issues;
}

module.exports = { detect };

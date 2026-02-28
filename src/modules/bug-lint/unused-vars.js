"use strict";

/**
 * Detects variables that are declared but never used.
 * Works by scanning for declarations then checking if
 * the variable name appears anywhere else in the code.
 */

// Matches: const x, let x, var x
const DECLARATION_PATTERN =
  /^\s*(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/;

/**
 * @param {string} code
 * @returns {Array} issues
 */
function detect(code) {
  const issues = [];
  const lines = code.split("\n");
  const declared = []; // { name, line, column }

  // Pass 1 — collect all declared variable names
  lines.forEach((line, i) => {
    const match = line.match(DECLARATION_PATTERN);
    if (match) {
      declared.push({
        name: match[1],
        line: i + 1,
        column: line.indexOf(match[1]) + 1,
      });
    }
  });

  // Pass 2 — for each declared variable check if it appears
  // anywhere in the code OTHER than its own declaration line
  declared.forEach(({ name, line, column }) => {
    // Build a whole-word regex for this variable name
    const usagePattern = new RegExp(`\\b${name}\\b`, "g");
    const allMatches = [...code.matchAll(usagePattern)];

    // Count how many times it appears — declaration counts as 1
    // If only 1 occurrence exists it was never used
    if (allMatches.length <= 1) {
      issues.push({
        type: "lint",
        severity: "warning",
        rule: "unused-variable",
        line,
        column,
        message: `Variable '${name}' is declared but never used.`,
        suggestion: `Remove the declaration of '${name}' or use it somewhere in the code.`,
      });
    }
  });

  return issues;
}

module.exports = { detect };

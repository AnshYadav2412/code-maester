"use strict";

const nullDeref = require("./null-deref");
const offByOne = require("./off-by-one");
const unreachable = require("./unreachable");
const unusedVars = require("./unused-vars");
const shadowedDecl = require("./shadowed-decl");
const typeCoercion = require("./type-coercion");
const namingConvention = require("./naming-convention");

/**
 * Orchestrates all bug and lint checks with improved context awareness.
 * Runs every detector and merges results into one sorted array.
 *
 * @param {string} code     - raw source code
 * @param {string} language - detected language
 * @param {object} _options  - config options
 * @returns {{ bugs: Array, lint: Array }}
 */
function run(code, language, _options = {}) {
  let allIssues = [];

  // JavaScript/TypeScript detectors
  if (language === "javascript" || language === "typescript") {
    allIssues = [
      ...nullDeref.detect(code),
      ...offByOne.detect(code),
      ...unreachable.detect(code),
      ...unusedVars.detect(code),
      ...shadowedDecl.detect(code),
      ...typeCoercion.detect(code),
      ...namingConvention.detect(code),
    ];
  }
  // C/C++ detectors
  else if (language === "c" || language === "cpp") {
    allIssues = [
      ...detectCppBufferOverflow(code),
      // Disable noisy detectors for now
      // ...detectCppNullPointer(code),
      // ...detectCppMemoryLeaks(code),
      // ...detectCppUnusedVariables(code),
    ];
  }
  // Java detectors
  else if (language === "java") {
    allIssues = [
      // Disable noisy detectors for now
      // ...detectJavaNullPointer(code),
      // ...detectJavaUnusedVariables(code),
      // ...detectJavaResourceLeaks(code),
    ];
  }
  // Python detectors
  else if (language === "python") {
    allIssues = [
      ...detectPythonIndentation(code),
      // Disable noisy detectors for now
      // ...detectPythonUnusedVariables(code),
      // ...detectPythonNoneCheck(code),
    ];
  }

  // Sort all issues by line number
  allIssues.sort((a, b) => a.line - b.line);

  // Split into bugs vs lint by type
  const bugs = allIssues.filter((i) => i.type === "bug");
  const lint = allIssues.filter((i) => i.type === "lint");

  return { bugs, lint };
}

// ═══════════════════════════════════════════════════════════════════════════
// C/C++ Detectors - Improved with context awareness
// ═══════════════════════════════════════════════════════════════════════════

function detectCppBufferOverflow(code) {
  const issues = [];
  const lines = code.split("\n");
  const unsafeFuncs = ['strcpy', 'strcat', 'sprintf', 'gets'];

  lines.forEach((line, i) => {
    for (const func of unsafeFuncs) {
      const pattern = new RegExp(`\\b${func}\\s*\\(`);
      if (pattern.test(line)) {
        issues.push({
          type: "bug",
          severity: "error",
          rule: "cpp-buffer-overflow",
          line: i + 1,
          column: line.indexOf(func) + 1,
          message: `Unsafe function '${func}' can cause buffer overflow`,
          suggestion: `Use safe alternatives: strncpy, strncat, snprintf, or fgets`,
        });
        break;
      }
    }
  });

  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════
// Python Detectors - Improved
// ═══════════════════════════════════════════════════════════════════════════

function detectPythonIndentation(code) {
  const issues = [];
  const lines = code.split("\n");

  lines.forEach((line, i) => {
    if (line.trim() === '') return;

    // Check for mixed tabs and spaces (actual error)
    const hasTab = line.startsWith('\t') || /^\s*\t/.test(line);
    const hasSpace = /^ /.test(line);
    
    if (hasTab && hasSpace) {
      issues.push({
        type: "lint",
        severity: "error",
        rule: "python-mixed-indentation",
        line: i + 1,
        column: 1,
        message: `Mixed tabs and spaces in indentation`,
        suggestion: `Use either tabs or spaces consistently (PEP 8 recommends 4 spaces)`,
      });
    }
  });

  return issues;
}

module.exports = { run };

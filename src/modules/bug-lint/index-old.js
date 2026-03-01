"use strict";

const nullDeref = require("./null-deref");
const offByOne = require("./off-by-one");
const unreachable = require("./unreachable");
const unusedVars = require("./unused-vars");
const shadowedDecl = require("./shadowed-decl");
const typeCoercion = require("./type-coercion");
const namingConvention = require("./naming-convention");

/**
 * Orchestrates all bug and lint checks.
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
      ...detectCppNullPointer(code),
      ...detectCppMemoryLeaks(code),
      ...detectCppBufferOverflow(code),
      ...detectCppUnusedVariables(code),
    ];
  }
  // Java detectors
  else if (language === "java") {
    allIssues = [
      ...detectJavaNullPointer(code),
      ...detectJavaUnusedVariables(code),
      ...detectJavaResourceLeaks(code),
    ];
  }
  // Python detectors
  else if (language === "python") {
    allIssues = [
      ...detectPythonUnusedVariables(code),
      ...detectPythonNoneCheck(code),
      ...detectPythonIndentation(code),
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
// C/C++ Detectors
// ═══════════════════════════════════════════════════════════════════════════

function detectCppNullPointer(code) {
  const issues = [];
  const lines = code.split("\n");

  lines.forEach((line, i) => {
    // Detect pointer dereference without null check
    if (/\*\w+/.test(line) && !/if\s*\(.*!=\s*NULL/.test(line)) {
      const match = line.match(/\*(\w+)/);
      if (match) {
        issues.push({
          type: "bug",
          severity: "error",
          rule: "cpp-null-pointer",
          line: i + 1,
          column: line.indexOf(match[0]) + 1,
          message: `Potential null pointer dereference: '${match[1]}' may be NULL`,
          suggestion: `Add null check: if (${match[1]} != NULL) { ... }`,
        });
      }
    }
  });

  return issues;
}

function detectCppMemoryLeaks(code) {
  const issues = [];
  const lines = code.split("\n");
  const allocated = new Set();

  lines.forEach((line, i) => {
    // Track new allocations
    const newMatch = line.match(/(\w+)\s*=\s*new\s+/);
    if (newMatch) {
      allocated.add(newMatch[1]);
    }

    // Track delete calls
    const deleteMatch = line.match(/delete\s+(\w+)/);
    if (deleteMatch) {
      allocated.delete(deleteMatch[1]);
    }
  });

  // Report variables that were allocated but never deleted
  allocated.forEach((varName) => {
    issues.push({
      type: "bug",
      severity: "warning",
      rule: "cpp-memory-leak",
      line: 1,
      column: 1,
      message: `Potential memory leak: '${varName}' allocated with 'new' but never deleted`,
      suggestion: `Add 'delete ${varName};' or use smart pointers (std::unique_ptr, std::shared_ptr)`,
    });
  });

  return issues;
}

function detectCppBufferOverflow(code) {
  const issues = [];
  const lines = code.split("\n");

  lines.forEach((line, i) => {
    // Detect unsafe functions
    const unsafeFuncs = ['strcpy', 'strcat', 'sprintf', 'gets'];
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

function detectCppUnusedVariables(code) {
  const issues = [];
  const lines = code.split("\n");
  const declared = [];

  lines.forEach((line, i) => {
    // Match C++ variable declarations: int x, char* y, etc.
    const match = line.match(/^\s*(?:int|char|float|double|bool|long|short|void)\s+\*?(\w+)\s*[=;]/);
    if (match) {
      declared.push({ name: match[1], line: i + 1, column: line.indexOf(match[1]) + 1 });
    }
  });

  declared.forEach(({ name, line, column }) => {
    const usagePattern = new RegExp(`\\b${name}\\b`, "g");
    const allMatches = [...code.matchAll(usagePattern)];

    if (allMatches.length <= 1) {
      issues.push({
        type: "lint",
        severity: "warning",
        rule: "cpp-unused-variable",
        line,
        column,
        message: `Variable '${name}' is declared but never used`,
        suggestion: `Remove the declaration of '${name}' or use it in the code`,
      });
    }
  });

  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════
// Java Detectors
// ═══════════════════════════════════════════════════════════════════════════

function detectJavaNullPointer(code) {
  const issues = [];
  const lines = code.split("\n");

  lines.forEach((line, i) => {
    // Detect method calls without null checks
    if (/\w+\.\w+\(/.test(line) && !/if\s*\(.*!=\s*null/.test(line)) {
      const match = line.match(/(\w+)\.\w+\(/);
      if (match && !['System', 'Math', 'String'].includes(match[1])) {
        issues.push({
          type: "bug",
          severity: "warning",
          rule: "java-null-pointer",
          line: i + 1,
          column: line.indexOf(match[0]) + 1,
          message: `Potential NullPointerException: '${match[1]}' may be null`,
          suggestion: `Add null check: if (${match[1]} != null) { ... }`,
        });
      }
    }
  });

  return issues;
}

function detectJavaUnusedVariables(code) {
  const issues = [];
  const lines = code.split("\n");
  const declared = [];

  lines.forEach((line, i) => {
    // Match Java variable declarations
    const match = line.match(/^\s*(?:int|String|boolean|double|float|long|char|byte|short)\s+(\w+)\s*[=;]/);
    if (match) {
      declared.push({ name: match[1], line: i + 1, column: line.indexOf(match[1]) + 1 });
    }
  });

  declared.forEach(({ name, line, column }) => {
    const usagePattern = new RegExp(`\\b${name}\\b`, "g");
    const allMatches = [...code.matchAll(usagePattern)];

    if (allMatches.length <= 1) {
      issues.push({
        type: "lint",
        severity: "warning",
        rule: "java-unused-variable",
        line,
        column,
        message: `Variable '${name}' is declared but never used`,
        suggestion: `Remove the declaration of '${name}' or use it in the code`,
      });
    }
  });

  return issues;
}

function detectJavaResourceLeaks(code) {
  const issues = [];
  const lines = code.split("\n");
  const opened = new Set();

  lines.forEach((line, i) => {
    // Track resource openings
    if (/new\s+(FileInputStream|FileOutputStream|BufferedReader|Scanner)\s*\(/.test(line)) {
      const match = line.match(/(\w+)\s*=\s*new\s+(?:FileInputStream|FileOutputStream|BufferedReader|Scanner)/);
      if (match) {
        opened.add(match[1]);
      }
    }

    // Track close() calls
    if (/\.close\(\)/.test(line)) {
      const match = line.match(/(\w+)\.close\(\)/);
      if (match) {
        opened.delete(match[1]);
      }
    }
  });

  opened.forEach((varName) => {
    issues.push({
      type: "bug",
      severity: "warning",
      rule: "java-resource-leak",
      line: 1,
      column: 1,
      message: `Potential resource leak: '${varName}' opened but never closed`,
      suggestion: `Use try-with-resources or call ${varName}.close() in a finally block`,
    });
  });

  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════
// Python Detectors
// ═══════════════════════════════════════════════════════════════════════════

function detectPythonUnusedVariables(code) {
  const issues = [];
  const lines = code.split("\n");
  const declared = [];

  lines.forEach((line, i) => {
    // Match Python variable assignments
    const match = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=/);
    if (match && !match[1].startsWith('_')) {
      declared.push({ name: match[1], line: i + 1, column: line.indexOf(match[1]) + 1 });
    }
  });

  declared.forEach(({ name, line, column }) => {
    const usagePattern = new RegExp(`\\b${name}\\b`, "g");
    const allMatches = [...code.matchAll(usagePattern)];

    if (allMatches.length <= 1) {
      issues.push({
        type: "lint",
        severity: "warning",
        rule: "python-unused-variable",
        line,
        column,
        message: `Variable '${name}' is assigned but never used`,
        suggestion: `Remove '${name}' or use it in the code, or prefix with '_' if intentionally unused`,
      });
    }
  });

  return issues;
}

function detectPythonNoneCheck(code) {
  const issues = [];
  const lines = code.split("\n");

  lines.forEach((line, i) => {
    // Detect attribute access without None check
    if (/\w+\.\w+/.test(line) && !/if\s+\w+\s+is\s+not\s+None/.test(line)) {
      const match = line.match(/(\w+)\.\w+/);
      if (match && !['self', 'cls', 'os', 'sys', 'math'].includes(match[1])) {
        issues.push({
          type: "bug",
          severity: "warning",
          rule: "python-none-check",
          line: i + 1,
          column: line.indexOf(match[0]) + 1,
          message: `Potential AttributeError: '${match[1]}' may be None`,
          suggestion: `Add None check: if ${match[1]} is not None: ...`,
        });
      }
    }
  });

  return issues;
}

function detectPythonIndentation(code) {
  const issues = [];
  const lines = code.split("\n");
  let expectedIndent = 0;

  lines.forEach((line, i) => {
    if (line.trim() === '') return;

    const indent = line.match(/^\s*/)[0].length;
    const trimmed = line.trim();

    // Check for mixed tabs and spaces
    if (/^\s*\t/.test(line) && /^\s* /.test(line)) {
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

    // Lines ending with : should increase indent
    if (trimmed.endsWith(':')) {
      expectedIndent = indent + 4;
    }
  });

  return issues;
}

module.exports = { run };

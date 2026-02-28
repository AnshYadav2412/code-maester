"use strict";

/**
 * JavaScript / TypeScript complexity + redundancy analyser.
 *
 * Cyclomatic complexity per function is approximated as:
 *   CC = 1 + (number of branching keywords inside the function body)
 *
 * Branching keywords counted: if, else if, for, while, do, case, catch,
 *   ternary (?), logical-and (&&), logical-or (||), nullish coalescing (??)
 */

const BRANCH_RE =
  /\b(if|else\s+if|for|while|do|case|catch)\b|(\?\?|&&|\|\||\?[^?:])/g;

// ─── Function extraction ──────────────────────────────────────────────────────

/**
 * Walk the source character-by-character to extract top-level and nested
 * function bodies with their start/end line numbers.
 */
function extractFunctions(code) {
  const lines = code.split("\n");
  const functions = [];

  // Regex to find function declarations / expressions / arrow functions
  const funcHeaderRE =
    /(?:(?:async\s+)?function\s*\*?\s*(\w+)\s*\(|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(.*?\)\s*=>|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?function)/g;

  let match;
  while ((match = funcHeaderRE.exec(code)) !== null) {
    const name = match[1] || match[2] || match[3] || "<anonymous>";
    const headerPos = match.index;
    const startLine = lineOf(code, headerPos, lines);

    // Find the opening brace after the header
    const braceStart = code.indexOf("{", headerPos);
    if (braceStart === -1) continue;

    // Walk braces to find matching close
    let depth = 1;
    let i = braceStart + 1;
    while (i < code.length && depth > 0) {
      if (code[i] === "{") depth++;
      else if (code[i] === "}") depth--;
      i++;
    }
    const braceEnd = i - 1;
    const endLine = lineOf(code, braceEnd, lines);
    const body = code.slice(braceStart + 1, braceEnd);

    functions.push({ name, startLine, endLine, body, headerPos });
  }

  return functions;
}

function lineOf(code, pos, lines) {
  let cur = 0;
  for (let i = 0; i < lines.length; i++) {
    cur += lines[i].length + 1; // +1 for \n
    if (cur > pos) return i + 1;
  }
  return lines.length;
}

// ─── Cyclomatic complexity ────────────────────────────────────────────────────

function cyclomaticComplexity(body) {
  // Strip comments and strings to avoid false positives
  const clean = body
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, "``");

  const matches = clean.match(BRANCH_RE) || [];
  return 1 + matches.length;
}

// ─── Nesting depth ───────────────────────────────────────────────────────────

function maxNestingDepth(body) {
  let depth = 0;
  let max = 0;
  for (const ch of body) {
    if (ch === "{") {
      depth++;
      if (depth > max) max = depth;
    } else if (ch === "}") depth--;
  }
  return max;
}

// ─── Duplicate block detection ───────────────────────────────────────────────

/**
 * Splits code into non-blank lines, builds a sliding window hash of
 * `windowSize` lines, and reports duplicated windows.
 */
function findDuplicateBlocks(code, minLines) {
  const lines = code
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("//"));

  const windowSize = minLines;
  const seen = new Map(); // hash -> first occurrence line index
  const duplicates = [];

  for (let i = 0; i <= lines.length - windowSize; i++) {
    const block = lines.slice(i, i + windowSize).join("\n");
    if (seen.has(block)) {
      duplicates.push({
        type: "duplicate_block",
        severity: "warning",
        line: i + 1,
        message: `Duplicate code block (${windowSize} lines) — first seen near line ${seen.get(block) + 1}`,
        suggestion: "Extract repeated logic into a shared function.",
      });
    } else {
      seen.set(block, i);
    }
  }

  return duplicates;
}

// ─── Dead / unreachable code ──────────────────────────────────────────────────

function findDeadCode(code) {
  const lines = code.split("\n");
  const issues = [];

  // Pattern 1: statements after return/throw/break/continue on same indent level
  const termRE = /^(\s*)(return|throw|break|continue)\b/;
  for (let i = 0; i < lines.length - 1; i++) {
    const m = termRE.exec(lines[i]);
    if (!m) continue;
    const indent = m[1];
    const next = lines[i + 1];
    // If next non-blank line has same indent and is not a closing brace/else
    if (
      next.trim().length > 0 &&
      !next.trim().startsWith("}") &&
      !next.trim().startsWith("//") &&
      !next.trim().startsWith("case ") &&
      !next.trim().startsWith("default:") &&
      !next.trim().startsWith("else") &&
      next.startsWith(indent) &&
      !next.startsWith(indent + " ".repeat(4)) // not deeper indent
    ) {
      issues.push({
        type: "dead_code",
        severity: "warning",
        line: i + 2,
        column: 1,
        message: `Unreachable code after \`${m[2]}\` statement.`,
        suggestion: "Remove or refactor unreachable statements.",
      });
    }
  }

  // Pattern 2: `if (true)` / `if (false)` literals
  const alwaysRE = /\bif\s*\(\s*(true|false)\s*\)/g;
  let match;
  while ((match = alwaysRE.exec(code)) !== null) {
    const line = code.slice(0, match.index).split("\n").length;
    issues.push({
      type: "dead_code",
      severity: "info",
      line,
      column: match.index - code.lastIndexOf("\n", match.index),
      message: `Condition \`if (${match[1]})\` is always ${match[1] === "true" ? "true" : "false"}.`,
      suggestion: "Remove the constant condition branch.",
    });
  }

  return issues;
}

// ─── Main export ──────────────────────────────────────────────────────────────

function analyzeJS(code, cfg) {
  const functions = extractFunctions(code);
  const funcReports = [];
  const redundancy = [];

  let totalCC = 0;
  let globalMaxDepth = 0;

  for (const fn of functions) {
    const cc = cyclomaticComplexity(fn.body);
    const depth = maxNestingDepth(fn.body);
    const lineCount = fn.endLine - fn.startLine + 1;

    totalCC += cc;
    if (depth > globalMaxDepth) globalMaxDepth = depth;

    const fnReport = {
      name: fn.name,
      startLine: fn.startLine,
      endLine: fn.endLine,
      cyclomaticComplexity: cc,
      maxNestingDepth: depth,
      lineCount,
      issues: [],
    };

    if (cc > cfg.maxCyclomatic) {
      fnReport.issues.push({
        type: "high_complexity",
        severity: "error",
        line: fn.startLine,
        column: 1,
        message: `Function \`${fn.name}\` has cyclomatic complexity ${cc} (threshold: ${cfg.maxCyclomatic}).`,
        suggestion:
          "Break this function into smaller, single-responsibility functions.",
      });
    }

    if (depth > cfg.maxNestingDepth) {
      fnReport.issues.push({
        type: "deep_nesting",
        severity: "warning",
        line: fn.startLine,
        column: 1,
        message: `Function \`${fn.name}\` has nesting depth ${depth} (threshold: ${cfg.maxNestingDepth}).`,
        suggestion:
          "Use early returns, guard clauses, or extract inner blocks into helper functions.",
      });
    }

    if (lineCount > cfg.maxFunctionLines) {
      fnReport.issues.push({
        type: "long_function",
        severity: "warning",
        line: fn.startLine,
        column: 1,
        message: `Function \`${fn.name}\` is ${lineCount} lines long (threshold: ${cfg.maxFunctionLines}).`,
        suggestion: "Split into smaller helper functions.",
      });
    }

    funcReports.push(fnReport);
  }

  // Duplicate blocks across the whole file
  redundancy.push(...findDuplicateBlocks(code, cfg.minDuplicateLines));

  // Dead code across the whole file
  redundancy.push(...findDeadCode(code));

  return {
    complexity: {
      functions: funcReports,
      maxDepth: globalMaxDepth,
      averageCyclomatic:
        funcReports.length > 0
          ? parseFloat((totalCC / funcReports.length).toFixed(2))
          : 0,
      totalFunctions: funcReports.length,
    },
    redundancy,
  };
}

module.exports = { analyzeJS };

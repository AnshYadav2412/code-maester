"use strict";

/**
 * Python complexity + redundancy analyser (regex/line-based, no AST).
 *
 * Cyclomatic complexity: 1 + count of (if, elif, for, while, except, case, and, or, ternary `if`)
 * Nesting depth: tracked via indentation (Python uses 4-space / 1-tab = 1 level)
 */

const BRANCH_RE = /\b(if|elif|for|while|except|case)\b|\b(and|or)\b/g;

// ─── Function extraction ──────────────────────────────────────────────────────

function extractFunctions(lines) {
  const functions = [];
  const defRE = /^(\s*)(?:async\s+)?def\s+(\w+)\s*\(/;

  for (let i = 0; i < lines.length; i++) {
    const m = defRE.exec(lines[i]);
    if (!m) continue;

    const baseIndent = m[1].length;
    const name = m[2];
    const startLine = i + 1;

    // Collect body: lines that are blank OR indented more than baseIndent
    let endLine = startLine;
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j];
      if (l.trim() === "") { endLine = j + 1; continue; }
      const indent = l.match(/^(\s*)/)[1].length;
      if (indent > baseIndent) {
        endLine = j + 1;
      } else {
        break;
      }
    }

    const body = lines.slice(i + 1, endLine).join("\n");
    functions.push({ name, startLine, endLine, body });
  }

  return functions;
}

// ─── Cyclomatic complexity ────────────────────────────────────────────────────

function cyclomaticComplexity(body) {
  const clean = body
    .replace(/#[^\n]*/g, "")
    .replace(/"""[\s\S]*?"""/g, '""')
    .replace(/'''[\s\S]*?'''/g, "''");
  return 1 + (clean.match(BRANCH_RE) || []).length;
}

// ─── Nesting depth ───────────────────────────────────────────────────────────

function maxNestingDepth(body, baseIndent = 0) {
  let max = 0;
  for (const line of body.split("\n")) {
    if (line.trim() === "") continue;
    const indent = line.match(/^(\s*)/)[1].length;
    const depth = Math.floor((indent - baseIndent) / 4);
    if (depth > max) max = depth;
  }
  return max;
}

// ─── Duplicate blocks ─────────────────────────────────────────────────────────

function findDuplicateBlocks(lines, minLines) {
  const clean = lines.map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  const seen = new Map();
  const issues = [];

  for (let i = 0; i <= clean.length - minLines; i++) {
    const block = clean.slice(i, i + minLines).join("\n");
    if (seen.has(block)) {
      issues.push({
        type: "duplicate_block",
        severity: "warning",
        line: i + 1,
        message: `Duplicate code block (${minLines} lines) — first seen near line ${seen.get(block) + 1}.`,
        suggestion: "Extract repeated logic into a shared function.",
      });
    } else {
      seen.set(block, i);
    }
  }
  return issues;
}

// ─── Dead code ────────────────────────────────────────────────────────────────

function findDeadCode(lines) {
  const issues = [];
  const termRE = /^(\s*)(return|raise|break|continue)\b/;

  for (let i = 0; i < lines.length - 1; i++) {
    const m = termRE.exec(lines[i]);
    if (!m) continue;
    const indent = m[1].length;
    const next = lines[i + 1];
    if (next.trim() === "" || next.trim().startsWith("#")) continue;
    const nextIndent = next.match(/^(\s*)/)[1].length;
    if (nextIndent === indent) {
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

  return issues;
}

// ─── Main export ──────────────────────────────────────────────────────────────

function analyzePython(code, cfg) {
  const lines = code.split("\n");
  const functions = extractFunctions(lines);
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
        suggestion: "Break into smaller, single-responsibility functions.",
      });
    }
    if (depth > cfg.maxNestingDepth) {
      fnReport.issues.push({
        type: "deep_nesting",
        severity: "warning",
        line: fn.startLine,
        column: 1,
        message: `Function \`${fn.name}\` nesting depth ${depth} exceeds threshold ${cfg.maxNestingDepth}.`,
        suggestion: "Use early returns or extract inner blocks into helpers.",
      });
    }
    if (lineCount > cfg.maxFunctionLines) {
      fnReport.issues.push({
        type: "long_function",
        severity: "warning",
        line: fn.startLine,
        column: 1,
        message: `Function \`${fn.name}\` is ${lineCount} lines long (threshold: ${cfg.maxFunctionLines}).`,
        suggestion: "Split into smaller helpers.",
      });
    }

    funcReports.push(fnReport);
  }

  redundancy.push(...findDuplicateBlocks(lines, cfg.minDuplicateLines));
  redundancy.push(...findDeadCode(lines));

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

module.exports = { analyzePython };

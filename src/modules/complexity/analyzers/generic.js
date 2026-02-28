"use strict";

/**
 * Generic complexity analyser for Java, C, C++ (brace-delimited languages).
 * Uses the same brace-walking approach as the JS analyser.
 */

const BRANCH_RE =
  /\b(if|else\s+if|for|while|do|switch|case|catch)\b|(\?\?|&&|\|\|)/g;

function lineOf(code, pos) {
  return code.slice(0, pos).split("\n").length;
}

function extractFunctions(code, language) {
  const functions = [];
  let re;

  if (language === "java") {
    // public/private/protected ... returnType name(
    re =
      /(?:(?:public|private|protected|static|final|abstract|synchronized)\s+)*[\w<>[\]]+\s+(\w+)\s*\([^)]*\)\s*(?:throws\s+[\w,\s]+)?\s*\{/g;
  } else {
    // C/C++: returnType name(params) {
    re = /[\w*]+\s+(\w+)\s*\([^)]*\)\s*\{/g;
  }

  let match;
  while ((match = re.exec(code)) !== null) {
    const name = match[1];
    // Skip common non-function matches
    if (["if", "for", "while", "switch", "catch"].includes(name)) continue;

    const braceStart = match.index + match[0].length - 1;
    const startLine = lineOf(code, match.index);

    let depth = 1;
    let i = braceStart + 1;
    while (i < code.length && depth > 0) {
      if (code[i] === "{") depth++;
      else if (code[i] === "}") depth--;
      i++;
    }
    const braceEnd = i - 1;
    const endLine = lineOf(code, braceEnd);
    const body = code.slice(braceStart + 1, braceEnd);

    functions.push({ name, startLine, endLine, body });
  }

  return functions;
}

function cyclomaticComplexity(body) {
  const clean = body
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""');
  return 1 + (clean.match(BRANCH_RE) || []).length;
}

function maxNestingDepth(body) {
  let depth = 0,
    max = 0;
  for (const ch of body) {
    if (ch === "{") {
      depth++;
      if (depth > max) max = depth;
    } else if (ch === "}") depth--;
  }
  return max;
}

function findDuplicateBlocks(code, minLines) {
  const lines = code
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("//") && !l.startsWith("*"));
  const seen = new Map();
  const issues = [];

  for (let i = 0; i <= lines.length - minLines; i++) {
    const block = lines.slice(i, i + minLines).join("\n");
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

function findDeadCode(code) {
  const lines = code.split("\n");
  const issues = [];
  const termRE = /^(\s*)(return|throw|break|continue)\b/;

  for (let i = 0; i < lines.length - 1; i++) {
    const m = termRE.exec(lines[i]);
    if (!m) continue;
    const indent = m[1].length;
    const next = lines[i + 1];
    if (!next || next.trim() === "" || next.trim().startsWith("//")) continue;
    const nextIndent = next.match(/^(\s*)/)[1].length;
    const nextTrim = next.trim();
    if (
      nextIndent === indent &&
      !nextTrim.startsWith("}") &&
      !nextTrim.startsWith("case ") &&
      !nextTrim.startsWith("default:")
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
  return issues;
}

function analyzeGeneric(code, cfg, language = "unknown") {
  const functions = extractFunctions(code, language);
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
        suggestion: "Decompose into smaller single-responsibility functions.",
      });
    }
    if (depth > cfg.maxNestingDepth) {
      fnReport.issues.push({
        type: "deep_nesting",
        severity: "warning",
        line: fn.startLine,
        column: 1,
        message: `Nesting depth ${depth} in \`${fn.name}\` exceeds threshold ${cfg.maxNestingDepth}.`,
        suggestion: "Flatten with early returns or extract inner blocks.",
      });
    }
    if (lineCount > cfg.maxFunctionLines) {
      fnReport.issues.push({
        type: "long_function",
        severity: "warning",
        line: fn.startLine,
        column: 1,
        message: `Function \`${fn.name}\` is ${lineCount} lines (threshold: ${cfg.maxFunctionLines}).`,
        suggestion: "Split into smaller helpers.",
      });
    }

    funcReports.push(fnReport);
  }

  redundancy.push(...findDuplicateBlocks(code, cfg.minDuplicateLines));
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

module.exports = { analyzeGeneric };

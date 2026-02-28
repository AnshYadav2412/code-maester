"use strict";

/**
 * complexity/index.js
 * ───────────────────
 * Runs complexity + redundancy checks on source code.
 *
 * Returns:
 *   complexity : { functions: [...], maxDepth, averageCyclomatic }
 *   redundancy : [ ...issues ]
 */

const { analyzeJS } = require("./analyzers/javascript");
const { analyzePython } = require("./analyzers/python");
const { analyzeGeneric } = require("./analyzers/generic");

/**
 * @param {string} code
 * @param {string} language  - "javascript" | "python" | "java" | "c" | "cpp"
 * @param {object} thresholds
 * @returns {{ complexity: object, redundancy: object[] }}
 */
function runComplexityChecks(code, language, thresholds = {}) {
  const cfg = {
    maxCyclomatic: thresholds.maxCyclomatic ?? 10,
    maxNestingDepth: thresholds.maxNestingDepth ?? 3,
    maxFunctionLines: thresholds.maxFunctionLines ?? 50,
    minDuplicateLines: thresholds.minDuplicateLines ?? 6,
  };

  switch (language) {
    case "javascript":
    case "typescript":
      return analyzeJS(code, cfg);
    case "python":
      return analyzePython(code, cfg);
    default:
      return analyzeGeneric(code, cfg);
  }
}

module.exports = { runComplexityChecks };

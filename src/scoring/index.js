"use strict";

const { getGrade, getGradeLabel, getGradeColour } = require("./grades");

// ─── Default Weights ──────────────────────────────────────────────────────────
// These must always sum to exactly 1.0
// Can be overridden via reviewer.config({ weights: { ... } })

const DEFAULT_WEIGHTS = {
  bug: 0.3,
  security: 0.3,
  complexity: 0.2,
  redundancy: 0.1,
  lint: 0.1,
};

// ─── Penalty Calculators ──────────────────────────────────────────────────────
// Each function receives the relevant section of the report
// and returns a penalty value between 0 and 100.

/**
 * Bug penalty — weighted by severity.
 * error = 10pts, warning = 5pts, info = 1pt
 * Uses logarithmic scaling for better distribution
 *
 * @param {Array} bugs
 * @returns {number} 0-100
 */
function calcBugPenalty(bugs) {
  if (!bugs || bugs.length === 0) return 0;

  const raw = bugs.reduce((total, bug) => {
    switch (bug.severity) {
      case "error":
        return total + 10;
      case "warning":
        return total + 5;
      case "info":
        return total + 1;
      default:
        return total + 5;
    }
  }, 0);

  // Apply logarithmic scaling to prevent single issues from dominating
  // and to better differentiate between 1 and many issues
  if (raw === 0) return 0;
  
  // Formula: penalty = 100 * (1 - e^(-raw/50))
  // This gives: 1 error = ~18%, 5 errors = ~63%, 10 errors = ~86%
  const scaled = 100 * (1 - Math.exp(-raw / 50));
  
  return Math.min(100, Math.round(scaled));
}

/**
 * Security penalty — weighted heavily by severity.
 * critical = 25pts, high = 15pts, medium = 8pts, low = 3pts
 * Uses logarithmic scaling for better distribution
 *
 * @param {Array} security
 * @returns {number} 0-100
 */
function calcSecurityPenalty(security) {
  if (!security || security.length === 0) return 0;

  const raw = security.reduce((total, issue) => {
    switch (issue.severity) {
      case "critical":
        return total + 25;
      case "high":
        return total + 15;
      case "medium":
        return total + 8;
      case "low":
        return total + 3;
      default:
        return total + 8;
    }
  }, 0);

  // Apply logarithmic scaling
  // Formula: penalty = 100 * (1 - e^(-raw/40))
  // This gives: 1 critical = ~47%, 2 critical = ~71%, 3 critical = ~85%
  if (raw === 0) return 0;
  
  const scaled = 100 * (1 - Math.exp(-raw / 40));
  
  return Math.min(100, Math.round(scaled));
}

/**
 * Complexity penalty — based on function complexity scores
 * and nesting violations. Uses logarithmic scaling.
 *
 * @param {object} complexity - { functions: [], nestingViolations: [], longFunctions: [] }
 * @returns {number} 0-100
 */
function calcComplexityPenalty(complexity) {
  if (!complexity || !complexity.functions) return 0;

  let penalty = 0;

  complexity.functions.forEach((fn) => {
    if (!fn.issues) return;
    fn.issues.forEach((issue) => {
      switch (issue.type) {
        case "high_complexity":
          penalty += 5;
          break;
        case "deep_nesting":
          penalty += 5;
          break;
        case "long_function":
          penalty += 5;
          break;
        default:
          penalty += 3;
      }
    });
  });

  // Apply logarithmic scaling
  if (penalty === 0) return 0;
  
  const scaled = 100 * (1 - Math.exp(-penalty / 30));
  
  return Math.min(100, Math.round(scaled));
}

/**
 * Redundancy penalty — duplicate blocks and dead code.
 * Uses logarithmic scaling.
 *
 * @param {Array} redundancy
 * @returns {number} 0-100
 */
function calcRedundancyPenalty(redundancy) {
  if (!redundancy || redundancy.length === 0) return 0;

  const raw = redundancy.reduce((total, issue) => {
    switch (issue.type) {
      case "duplicate_block":
        return total + 8;
      case "dead_code":
        return total + 5;
      default:
        return total + 5;
    }
  }, 0);

  // Apply logarithmic scaling
  if (raw === 0) return 0;
  
  const scaled = 100 * (1 - Math.exp(-raw / 35));
  
  return Math.min(100, Math.round(scaled));
}

/**
 * Lint penalty — style and convention violations.
 * warning = 3pts, info = 1pt
 * Uses logarithmic scaling.
 *
 * @param {Array} lint
 * @returns {number} 0-100
 */
function calcLintPenalty(lint) {
  if (!lint || lint.length === 0) return 0;

  const raw = lint.reduce((total, issue) => {
    switch (issue.severity) {
      case "error":
        return total + 5;
      case "warning":
        return total + 3;
      case "info":
        return total + 1;
      default:
        return total + 3;
    }
  }, 0);

  // Apply logarithmic scaling (less aggressive for lint)
  if (raw === 0) return 0;
  
  const scaled = 100 * (1 - Math.exp(-raw / 60));
  
  return Math.min(100, Math.round(scaled));
}

// ─── Main Scoring Function ────────────────────────────────────────────────────

/**
 * Computes the overall quality score using the weighted penalty formula:
 *
 *   Score = 100 - (wBug·Pbug + wSec·Psec + wCplx·Pcplx + wRed·Pred + wLint·Plint)
 *
 * @param {object} report  - full analysis report
 * @param {object} weights - weight overrides (must sum to 1)
 * @returns {{
 *   score:      number,   // 0-100
 *   grade:      string,   // letter grade
 *   gradeLabel: string,   // human readable label
 *   gradeColour:string,   // hex colour for UI
 *   penalties:  object,   // breakdown of each penalty
 *   weights:    object,   // weights used
 * }}
 */
function calculateScore(report, weights = {}) {
  const w = { ...DEFAULT_WEIGHTS, ...weights };

  // Validate weights sum to 1
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) > 0.0001) {
    throw new Error(`Scoring weights must sum to 1. Got ${sum.toFixed(4)}`);
  }

  // Calculate each category penalty (0-100 each)
  const penalties = {
    bug: calcBugPenalty(report.bugs),
    security: calcSecurityPenalty(report.security),
    complexity: calcComplexityPenalty(report.complexity),
    redundancy: calcRedundancyPenalty(report.redundancy),
    lint: calcLintPenalty(report.lint),
  };

  // Apply weighted formula
  const totalPenalty =
    w.bug * penalties.bug +
    w.security * penalties.security +
    w.complexity * penalties.complexity +
    w.redundancy * penalties.redundancy +
    w.lint * penalties.lint;

  // Clamp final score to 0-100
  const score = Math.max(0, Math.min(100, Math.round(100 - totalPenalty)));

  const grade = getGrade(score);
  const gradeLabel = getGradeLabel(grade);
  const gradeColour = getGradeColour(grade);

  return {
    score,
    grade,
    gradeLabel,
    gradeColour,
    penalties,
    weights: w,
  };
}

/**
 * Computes the delta between two score results.
 * Used by reviewer.diff() to show improvement or regression.
 *
 * @param {object} oldResult - calculateScore() result for old code
 * @param {object} newResult - calculateScore() result for new code
 * @returns {object} delta report
 */
function calculateDelta(oldResult, newResult) {
  return {
    scoreDelta: newResult.score - oldResult.score,
    gradeDelta: `${oldResult.grade} → ${newResult.grade}`,
    improved: newResult.score > oldResult.score,
    regressed: newResult.score < oldResult.score,
    penaltyDeltas: {
      bug: newResult.penalties.bug - oldResult.penalties.bug,
      security: newResult.penalties.security - oldResult.penalties.security,
      complexity:
        newResult.penalties.complexity - oldResult.penalties.complexity,
      redundancy:
        newResult.penalties.redundancy - oldResult.penalties.redundancy,
      lint: newResult.penalties.lint - oldResult.penalties.lint,
    },
  };
}

module.exports = { calculateScore, calculateDelta, DEFAULT_WEIGHTS };

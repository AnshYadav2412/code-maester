"use strict";
/**
 * index.js — Public API entry point for code-maester
 * 
 * Implements: analyze, analyzeFile, diff, config, use, version, help, supportedLanguages
 */

const fs = require("fs").promises;
const path = require("path");
const globalConfig = require("./config");
const { detect } = require("./detect");
const JavaScriptAnalyzer = require("./analyzers/javascript");
const TypeScriptAnalyzer = require("./analyzers/typescript");
const PythonAnalyzer = require("./analyzers/python");
const CAnalyzer = require("./analyzers/c");
const JavaAnalyzer = require("./analyzers/java");
const { runComplexityChecks } = require("./modules/complexity");
const securityModule = require("./modules/security");
const formatterModule = require("./modules/formatter");
const crossFileModule = require("./modules/cross-file");
const { calculateScore, calculateDelta } = require("./scoring");

// ─── Plugin Registry ──────────────────────────────────────────────────────────

const plugins = [];

// Analyzer router — maps language name to its analyzer class
const ANALYZERS = {
  javascript: JavaScriptAnalyzer,
  typescript: TypeScriptAnalyzer,
  python: PythonAnalyzer,
  java: JavaAnalyzer,
  c: CAnalyzer,
  cpp: CAnalyzer,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a canonical key for an issue so two issues with the same
 * rule + message are considered "the same" across diff versions.
 */
function issueKey(issue) {
  return `${issue.rule || issue.type}::${issue.message}`;
}

/**
 * Convert all issue hints/suggestions into a flat suggestions[] array
 * for the top-level report field.
 */
function buildSuggestions(bugs, lint, security) {
  const seen = new Set();
  const suggestions = [];

  for (const issue of [...bugs, ...lint, ...security]) {
    const text = issue.suggestion || issue.hint || issue.remediation;
    if (!text) continue;
    const key = `${issue.rule || issue.type}::${text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push({
      rule: issue.rule || issue.type || "general",
      severity: issue.severity,
      line: issue.line,
      message: issue.message,
      suggestion: text,
    });
  }

  return suggestions;
}

/**
 * Run all registered plugins and collect extra issues.
 */
function runPlugins(code, language, ast = null) {
  const extra = { bugs: [], lint: [] };
  for (const plugin of plugins) {
    try {
      // Plugins may target specific languages; skip if they don't match
      if (plugin.language && plugin.language !== language && plugin.language !== "*") continue;
      const results = plugin.run(code, ast) || [];
      for (const issue of results) {
        if (issue.type === "bug") extra.bugs.push(issue);
        else extra.lint.push(issue);
      }
    } catch (err) {
      console.warn(`[code-maester] Plugin '${plugin.name}' threw: ${err.message}`);
    }
  }
  return extra;
}

// ─── Core API ─────────────────────────────────────────────────────────────────

/**
 * Analyse a raw code string
 * @param {string} code - the source code to analyse
 * @param {object} options - optional overrides (language, weights, etc.)
 * @returns {Promise<object>} structured report
 */
async function analyze(code, options = {}) {
  // 1. Detect language
  const detection = detect(code, options);

  // 2. Run language-specific bug + lint checks
  const AnalyzerClass = ANALYZERS[detection.language];
  let bugs = [], lint = [], security = [];

  if (AnalyzerClass) {
    const analyzer = new AnalyzerClass(globalConfig);
    const result = await analyzer.analyze(code, options);
    bugs = result.bugs;
    lint = result.lint;
  }

  // 3. Run registered plugins and merge their results
  const pluginResults = runPlugins(code, detection.language);
  bugs = [...bugs, ...pluginResults.bugs];
  lint = [...lint, ...pluginResults.lint];

  // 4. Run security checks
  security = await securityModule.run(code, detection.language, options);

  // 5. Run complexity + redundancy checks
  const { complexity, redundancy } = runComplexityChecks(
    code,
    detection.language,
    {
      maxCyclomatic: globalConfig.thresholds.complexityLimit || 10,
      maxNestingDepth: globalConfig.thresholds.nestingLimit || 3,
      maxFunctionLines: globalConfig.thresholds.functionLengthLimit || 50,
      minDuplicateLines: 6,
    },
  );

  // 6. Run formatter + generate diff
  const formatResult = await formatterModule.run(code, detection.language, options);

  // 7. Calculate score + grade
  const scoreResult = calculateScore(
    { bugs, lint, security, complexity, redundancy },
    globalConfig.weights,
  );

  // 8. Build suggestions from all issue hints
  const suggestions = buildSuggestions(bugs, lint, security);

  return {
    language: detection.language,
    confidence: detection.confidence,
    method: detection.method,
    supported: detection.supported,
    allScores: detection.allScores,
    score: scoreResult.score,
    grade: scoreResult.grade,
    gradeLabel: scoreResult.gradeLabel,
    gradeColour: scoreResult.gradeColour,
    penalties: scoreResult.penalties,
    weights: scoreResult.weights,
    bugs,
    lint,
    security,
    complexity,
    redundancy,
    suggestions,
    formatted: formatResult.formatted,
    diff: formatResult.diff,
    formatStats: formatResult.stats,
    formatTool: formatResult.tool,
  };
}

/**
 * Analyse a file on disk
 * @param {string} filePath - path to the file
 * @param {object} options - optional overrides
 * @returns {Promise<object>} structured report
 */
async function analyzeFile(filePath, options = {}) {
  const absolutePath = path.resolve(filePath);
  const code = await fs.readFile(absolutePath, "utf-8");
  return analyze(code, { ...options, filePath: absolutePath });
}

/**
 * Analyse multiple files for cross-file issues
 * @param {Array<string>} filePaths - array of file paths
 * @param {object} options - optional overrides
 * @returns {Promise<object>} project-level report with structural issues
 */
async function analyzeProject(filePaths, options = {}) {
  // Read all files
  const files = await Promise.all(
    filePaths.map(async (filePath) => {
      const absolutePath = path.resolve(filePath);
      const code = await fs.readFile(absolutePath, "utf-8");
      const detection = detect(code, { filePath: absolutePath });
      return {
        path: absolutePath,
        code,
        language: detection.language,
      };
    })
  );

  // Run cross-file analysis
  const { structural } = await crossFileModule.analyzeProject(files, options);

  // Optionally run individual file analysis for each file
  const fileReports = options.includeFileReports
    ? await Promise.all(
        filePaths.map((filePath) => analyzeFile(filePath, options))
      )
    : [];

  return {
    projectAnalysis: {
      filesAnalyzed: files.length,
      structural,
      summary: {
        unusedExports: structural.filter((i) => i.rule === "unused-export").length,
        circularDependencies: structural.filter((i) => i.rule === "circular-dependency").length,
        totalIssues: structural.length,
      },
    },
    fileReports: options.includeFileReports ? fileReports : undefined,
  };
}

/**
 * Diff two versions of code and return a quality delta.
 * Classifies every issue as introduced / resolved / unchanged.
 *
 * @param {string} oldCode
 * @param {string} newCode
 * @param {object} options
 * @returns {Promise<object>} delta report
 */
async function diff(oldCode, newCode, options = {}) {
  const [oldReport, newReport] = await Promise.all([
    analyze(oldCode, options),
    analyze(newCode, options),
  ]);

  // Build key sets for comparison
  const allOldIssues = [...oldReport.bugs, ...oldReport.lint, ...oldReport.security];
  const allNewIssues = [...newReport.bugs, ...newReport.lint, ...newReport.security];

  const oldKeys = new Map(allOldIssues.map((i) => [issueKey(i), i]));
  const newKeys = new Map(allNewIssues.map((i) => [issueKey(i), i]));

  const issuesIntroduced = allNewIssues.filter((i) => !oldKeys.has(issueKey(i)));
  const issuesResolved = allOldIssues.filter((i) => !newKeys.has(issueKey(i)));
  const issuesUnchanged = allOldIssues.filter((i) => newKeys.has(issueKey(i)));

  const delta = calculateDelta(
    { score: oldReport.score, grade: oldReport.grade, penalties: oldReport.penalties },
    { score: newReport.score, grade: newReport.grade, penalties: newReport.penalties },
  );

  return {
    scoreDelta: delta.scoreDelta,
    gradeDelta: delta.gradeDelta,
    improved: delta.improved,
    regressed: delta.regressed,
    penaltyDeltas: delta.penaltyDeltas,
    oldScore: oldReport.score,
    newScore: newReport.score,
    issuesIntroduced,
    issuesResolved,
    issuesUnchanged,
    oldReport,
    newReport,
  };
}

// ─── Config ───────────────────────────────────────────────────────────────────

/**
 * Set global defaults — weights must sum to 1
 * @param {object} options
 */
function config(options = {}) {
  if (options.weights) {
    const sum = Object.values(options.weights).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 0.0001) {
      throw new Error(
        `Weights must sum to 1. Got ${sum.toFixed(4)}. ` +
        `Adjust your weights: ${JSON.stringify(options.weights)}`,
      );
    }
    globalConfig.weights = { ...globalConfig.weights, ...options.weights };
  }

  if (options.thresholds) {
    globalConfig.thresholds = { ...globalConfig.thresholds, ...options.thresholds };
  }

  if (options.ai) {
    globalConfig.ai = { ...globalConfig.ai, ...options.ai };
  }
}

// ─── Plugin System ────────────────────────────────────────────────────────────

/**
 * Register a custom rule plugin.
 * @param {object} plugin — must have { name, run(code, ast?): issue[] }
 *                          and optionally { language: "javascript" | "*" }
 */
function use(plugin) {
  if (!plugin.name || typeof plugin.run !== "function") {
    throw new Error("Plugin must have a `name` (string) and a `run(code, ast)` function.");
  }
  plugins.push(plugin);
  console.log(`[code-maester] Plugin registered: ${plugin.name}`);
}

// ─── Info Utilities ───────────────────────────────────────────────────────────

function version() {
  return require("../package.json").version;
}

function help() {
  const usage = `
  code-maester — Automated Code Quality Analyser
  ─────────────────────────────────────────────

  API:
    analyze(code, options?)         Analyse a raw code string
    analyzeFile(filePath, options?) Analyse a file on disk
    analyzeProject(filePaths, opts) Analyse multiple files for cross-file issues
    diff(oldCode, newCode)          Compare two versions of code
    config(options)                 Set global config + scoring weights
    use(plugin)                     Register a custom rule plugin
    version()                       Return package version
    supportedLanguages()            List supported languages

  Default Weights (must sum to 1):
    bug:        0.30
    security:   0.30
    complexity: 0.20
    redundancy: 0.10
    lint:       0.10

  Scoring Formula:
    Score = 100 - (wBug·Pbug + wSec·Psec + wCplx·Pcplx + wRed·Pred + wLint·Plint)
  `;
  console.log(usage);
  return usage;
}

function supportedLanguages() {
  return ["javascript", "typescript", "python", "java", "c", "cpp"];
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  analyze,
  analyzeFile,
  analyzeProject,
  diff,
  config,
  use,
  version,
  help,
  supportedLanguages,
};

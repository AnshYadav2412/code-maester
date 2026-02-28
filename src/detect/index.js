"use strict";

const path = require("path");
const EXTENSION_MAP = require("./extensions");
const HEURISTICS = require("./heuristics");

// ─── Constants ────────────────────────────────────────────────────────────────

// Minimum confidence % to trust a heuristic result
const CONFIDENCE_THRESHOLD = 30;

// Languages the package actually supports analysis for
const SUPPORTED_LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "java",
  "c",
  "cpp",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Score each language by running all heuristic rules against the code.
 * Returns a map of { language -> totalWeight }
 *
 * @param {string} code
 * @returns {object}
 */
function scoreByHeuristics(code) {
  const scores = {};

  for (const rule of HEURISTICS) {
    if (rule.pattern.test(code)) {
      scores[rule.language] = (scores[rule.language] || 0) + rule.weight;
    }
  }

  return scores;
}

/**
 * Convert raw heuristic scores into confidence percentages.
 * Each language gets: (its score / total score of all languages) * 100
 *
 * @param {object} scores - { language -> rawScore }
 * @returns {object} - { language -> confidencePercent }
 */
function toConfidencePercents(scores) {
  const total = Object.values(scores).reduce((a, b) => a + b, 0);

  if (total === 0) return {};

  const result = {};
  for (const [lang, score] of Object.entries(scores)) {
    result[lang] = Math.round((score / total) * 100);
  }
  return result;
}

/**
 * Pick the language with the highest score from a confidence map.
 *
 * @param {object} confidences - { language -> percent }
 * @returns {{ language: string, confidence: number } | null}
 */
function topLanguage(confidences) {
  const entries = Object.entries(confidences);
  if (entries.length === 0) return null;

  const [language, confidence] = entries.reduce((best, curr) =>
    curr[1] > best[1] ? curr : best,
  );

  return { language, confidence };
}

// ─── Main Detector ────────────────────────────────────────────────────────────

/**
 * Detect the programming language of a code string.
 *
 * Strategy:
 *   1. If filePath is provided, check the file extension first (fast + reliable)
 *   2. If extension is inconclusive, fall back to heuristic scoring
 *   3. If nothing matches above threshold, return 'unknown'
 *
 * @param {string} code       - raw source code
 * @param {object} options    - { filePath?: string }
 * @returns {{
 *   language:   string,   // detected language name
 *   confidence: number,   // 0-100 confidence score
 *   method:     string,   // 'extension' | 'heuristic' | 'unknown'
 *   supported:  boolean,  // whether the package can analyse this language
 *   allScores:  object,   // confidence % for every language considered
 * }}
 */
function detect(code, options = {}) {
  // ── Step 1: Try extension detection ───────────────────────────────────────
  if (options.filePath) {
    const ext = path.extname(options.filePath).toLowerCase().replace(".", "");
    const fromExt = EXTENSION_MAP[ext];

    if (fromExt) {
      // Extension matched — still run heuristics for allScores info
      // but trust the extension as the primary signal
      const scores = scoreByHeuristics(code);
      const allScores = toConfidencePercents(scores);

      return {
        language: fromExt,
        confidence: 99, // extension is almost always correct
        method: "extension",
        supported: SUPPORTED_LANGUAGES.includes(fromExt),
        allScores,
      };
    }
  }

  // ── Step 2: Heuristic scoring ─────────────────────────────────────────────
  const scores = scoreByHeuristics(code);
  const allScores = toConfidencePercents(scores);
  const top = topLanguage(allScores);

  if (top && top.confidence >= CONFIDENCE_THRESHOLD) {
    return {
      language: top.language,
      confidence: top.confidence,
      method: "heuristic",
      supported: SUPPORTED_LANGUAGES.includes(top.language),
      allScores,
    };
  }

  // ── Step 3: Give up gracefully ────────────────────────────────────────────
  return {
    language: "unknown",
    confidence: 0,
    method: "unknown",
    supported: false,
    allScores: allScores || {},
  };
}

module.exports = { detect };

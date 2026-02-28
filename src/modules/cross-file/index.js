"use strict";

/**
 * Cross-File Analysis Module
 * 
 * Detects:
 * - Unused exports across the entire project
 * - Circular dependencies between modules
 */

const unusedExports = require("./unused-exports");
const circularDeps = require("./circular-deps");

/**
 * Run cross-file analysis on multiple files
 * 
 * @param {Array<{path: string, code: string}>} files - Array of file objects
 * @param {object} options - Configuration options
 * @returns {Promise<{structural: Array}>} Issues found
 */
async function analyzeProject(files, options = {}) {
  const structural = [];

  // Detect unused exports
  const unusedExportIssues = await unusedExports.detect(files, options);
  structural.push(...unusedExportIssues);

  // Detect circular dependencies
  const circularDepIssues = await circularDeps.detect(files, options);
  structural.push(...circularDepIssues);

  // Sort by severity and file path
  structural.sort((a, b) => {
    const severityOrder = { critical: 0, error: 1, warning: 2 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return (a.file || "").localeCompare(b.file || "");
  });

  return { structural };
}

module.exports = {
  analyzeProject,
};

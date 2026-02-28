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
  const allIssues = [
    ...nullDeref.detect(code),
    ...offByOne.detect(code),
    ...unreachable.detect(code),
    ...unusedVars.detect(code),
    ...shadowedDecl.detect(code),
    ...typeCoercion.detect(code),
    ...namingConvention.detect(code),
  ];

  // Sort all issues by line number
  allIssues.sort((a, b) => a.line - b.line);

  // Split into bugs vs lint by type
  const bugs = allIssues.filter((i) => i.type === "bug");
  const lint = allIssues.filter((i) => i.type === "lint");

  return { bugs, lint };
}

module.exports = { run };

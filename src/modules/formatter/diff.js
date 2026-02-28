"use strict";

const Diff = require("diff");

/**
 * Generates a unified diff between original and formatted code.
 * @param {string} original  - original source code
 * @param {string} formatted - formatted source code
 * @param {string} filename  - filename to show in diff header
 * @returns {string} unified diff string
 */
function generateDiff(original, formatted, filename = "file") {
  if (original === formatted) return "";

  const patch = Diff.createPatch(
    filename, // file name shown in diff header
    original, // original
    formatted, // new
    "original", // old header label
    "formatted", // new header label
  );

  return patch;
}

/**
 * Returns a structured line-by-line diff for UI rendering.
 * Each entry has: { type: 'added'|'removed'|'unchanged', value: string }
 * @param {string} original
 * @param {string} formatted
 * @returns {Array}
 */
function getLineDiff(original, formatted) {
  const changes = Diff.diffLines(original, formatted);

  const result = [];
  changes.forEach((change) => {
    const lines = change.value.split("\n").filter(
      (_, i, arr) =>
        // Remove trailing empty string from split
        !(i === arr.length - 1 && arr[i] === ""),
    );

    lines.forEach((line) => {
      result.push({
        type: change.added ? "added" : change.removed ? "removed" : "unchanged",
        value: line,
      });
    });
  });

  return result;
}

/**
 * Counts how many lines were added, removed, or unchanged.
 * @param {string} original
 * @param {string} formatted
 * @returns {{ added: number, removed: number, unchanged: number }}
 */
function diffStats(original, formatted) {
  const changes = Diff.diffLines(original, formatted);
  let added = 0,
    removed = 0,
    unchanged = 0;

  changes.forEach((change) => {
    const count = change.count || 0;
    if (change.added) added += count;
    else if (change.removed) removed += count;
    else unchanged += count;
  });

  return { added, removed, unchanged };
}

module.exports = { generateDiff, getLineDiff, diffStats };

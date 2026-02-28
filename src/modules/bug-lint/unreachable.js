"use strict";

/**
 * Detects unreachable code — statements that appear after
 * a return, throw, break, or continue in the same block.
 */

const TERMINATORS = /^\s*(return|throw|break|continue)\b/;
const BLANK_OR_COMMENT = /^\s*(\/\/.*|\/\*.*|#.*)?$/;

/**
 * @param {string} code
 * @returns {Array} issues
 */
function detect(code) {
  const issues = [];
  const lines = code.split("\n");

  let terminated = false;
  let terminatorLine = -1;

  lines.forEach((line, i) => {
    // ── Check BEFORE updating depth ──────────────────────────────────────
    if (terminated) {
      // Closing brace means we left the block — reset, don't flag
      if (/^\s*\}/.test(line)) {
        terminated = false;
      } else if (!BLANK_OR_COMMENT.test(line)) {
        // This is real unreachable code — flag it
        issues.push({
          type: "bug",
          severity: "warning",
          rule: "unreachable-code",
          line: i + 1,
          column: line.search(/\S/) + 1,
          message: `Unreachable code after '${lines[terminatorLine].trim()}' on line ${terminatorLine + 1}`,
          suggestion: `Remove this statement or move it before the return on line ${terminatorLine + 1}`,
        });
        terminated = false; // Only flag first unreachable line per block
      }
    }

    // ── Check for terminators ─────────────────────────────────────────────
    if (!terminated && TERMINATORS.test(line)) {
      terminated = true;
      terminatorLine = i;
    }
  });

  return issues;
}

module.exports = { detect };

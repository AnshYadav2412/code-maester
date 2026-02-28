"use strict";

/**
 * Detects variable shadowing — when an inner scope declares
 * a variable with the same name as an outer scope variable.
 *
 * e.g.
 *   const x = 1;
 *   function foo() {
 *     const x = 2;  ← shadows outer x
 *   }
 */

const DECLARATION_PATTERN = /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;

/**
 * @param {string} code
 * @returns {Array} issues
 */
function detect(code) {
  const issues = [];
  const lines = code.split("\n");

  // Track declarations per scope depth
  // scopeStack[0] = outermost, scopeStack[n] = current
  const scopeStack = [new Map()]; // Map<name, lineNumber>
  let depth = 0;

  lines.forEach((line, i) => {
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;

    // Process close braces — pop scopes
    for (let c = 0; c < closeBraces; c++) {
      if (depth > 0) {
        scopeStack.pop();
        depth--;
      }
    }

    // Process open braces — push new scope
    for (let o = 0; o < openBraces; o++) {
      depth++;
      scopeStack.push(new Map());
    }

    // Find all declarations on this line
    let match;
    DECLARATION_PATTERN.lastIndex = 0;
    while ((match = DECLARATION_PATTERN.exec(line)) !== null) {
      const name = match[1];
      const column = match.index + 1;

      // Check if name exists in ANY outer scope
      for (let s = 0; s < scopeStack.length - 1; s++) {
        if (scopeStack[s].has(name)) {
          issues.push({
            type: "bug",
            severity: "warning",
            rule: "shadowed-declaration",
            line: i + 1,
            column,
            message: `'${name}' shadows a variable declared in an outer scope (line ${scopeStack[s].get(name)}).`,
            suggestion: `Rename '${name}' to avoid shadowing the outer variable, or remove the outer declaration if it's unused.`,
          });
          break;
        }
      }

      // Register in current scope
      const currentScope = scopeStack[scopeStack.length - 1];
      currentScope.set(name, i + 1);
    }
  });

  return issues;
}

module.exports = { detect };

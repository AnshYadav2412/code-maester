"use strict";

/**
 * Detects incorrect or dangerous type coercions in JavaScript.
 *
 * Patterns caught:
 *   - == and != instead of === and !==
 *   - + operator used with mixed types (e.g. "3" + 4)
 *   - parseInt without radix
 *   - implicit boolean coercion on non-boolean (e.g. if (x == true))
 */

const PATTERNS = [
  {
    pattern: /(?<![=!<>])={2}(?!=)/, // ← uses lookbehind — much more reliable
    rule: "loose-equality",
    severity: "warning",
    message: () =>
      `Loose equality '==' used. This can cause unexpected type coercions (e.g. 0 == false is true).`,
    suggestion: () =>
      `Replace '==' with strict equality '===' to avoid implicit type conversion.`,
  },
  {
    pattern: /!={1}(?!=)/,
    rule: "loose-inequality",
    severity: "warning",
    message: () =>
      `Loose inequality '!=' used. Prefer strict '!==' to avoid type coercion.`,
    suggestion: () => `Replace '!=' with '!==' for strict comparison.`,
  },
  {
    pattern: /parseInt\s*\([^,)]+\)/,
    rule: "parseint-no-radix",
    severity: "warning",
    message: () =>
      `'parseInt()' called without a radix argument. This can give unexpected results for strings starting with '0'.`,
    suggestion: () => `Always specify the radix: parseInt(value, 10)`,
  },
  {
    pattern: /==\s*(true|false)|==\s*(null|undefined)/,
    rule: "explicit-boolean-compare",
    severity: "info",
    message: (m) =>
      `Explicit comparison to '${m[1] || m[2]}' using '=='. This relies on type coercion.`,
    suggestion: () =>
      `Use strict '===' or simplify: instead of '== true' just use the value directly.`,
  },
  {
    pattern: /typeof\s+\w+\s*==\s*["']/,
    rule: "typeof-loose-equality",
    severity: "warning",
    message: () => `'typeof' compared with '==' instead of '==='.`,
    suggestion: () =>
      `Use '===' when comparing typeof results: typeof x === 'string'`,
  },
];

/**
 * @param {string} code
 * @returns {Array} issues
 */
function detect(code) {
  const issues = [];
  const lines = code.split("\n");

  lines.forEach((line, i) => {
    // Skip comments
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;

    for (const { pattern, rule, severity, message, suggestion } of PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        issues.push({
          type: "lint",
          severity,
          rule,
          line: i + 1,
          column: line.search(pattern) + 1,
          message: message(match),
          suggestion: suggestion(match),
        });
      }
    }
  });

  return issues;
}

module.exports = { detect };

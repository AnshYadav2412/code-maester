"use strict";

/**
 * Detects SQL injection vulnerabilities.
 * Flags string concatenation or template literals used
 * to build SQL queries with user-controlled input.
 */

const PATTERNS = [
  {
    // Direct string concatenation in SQL query
    pattern: /(?:query|execute|exec|run)\s*\(\s*["'`][^"'`]*["'`]\s*\+/i,
    rule: "sql-injection-concat",
    severity: "critical",
    message: () =>
      `SQL query built with string concatenation — user input can break out of the query.`,
    suggestion: () =>
      `Use parameterised queries or prepared statements instead of string concatenation.`,
  },
  {
    // Template literal in SQL query
    pattern: /(?:query|execute|exec|run)\s*\(\s*`[^`]*\$\{/i,
    rule: "sql-injection-template",
    severity: "critical",
    message: () =>
      `SQL query uses template literal interpolation — any interpolated variable is a potential injection point.`,
    suggestion: () =>
      `Replace interpolated values with query parameters (e.g. WHERE id = ? or WHERE id = $1).`,
  },
  {
    // Raw SQL string with WHERE clause + concatenation
    pattern:
      /["'`]\s*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)[^"'`]*["'`]\s*\+/i,
    rule: "sql-injection-raw-concat",
    severity: "critical",
    message: () =>
      `Raw SQL string concatenated with a variable — classic injection pattern.`,
    suggestion: () =>
      `Use an ORM or parameterised query library (e.g. knex, sequelize, pg with $1 placeholders).`,
  },
  {
    // Dynamic WHERE using user request fields
    pattern:
      /(?:WHERE|where)\s+\w+\s*=\s*["'`]\s*\+\s*(?:req\.|request\.|params\.|body\.|query\.)/,
    rule: "sql-injection-request-param",
    severity: "critical",
    message: () =>
      `SQL WHERE clause directly uses a request parameter — this is a textbook injection vector.`,
    suggestion: () =>
      `Never interpolate req.params, req.body, or req.query directly into SQL. Use prepared statements.`,
  },
];

function detect(code) {
  const issues = [];
  const lines = code.split("\n");

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;

    for (const { pattern, rule, severity, message, suggestion } of PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        issues.push({
          type: "security",
          severity,
          rule,
          line: i + 1,
          column: line.search(pattern) + 1,
          message: message(match),
          suggestion: suggestion(match),
          remediation:
            "Use parameterised queries. Never build SQL from user-supplied strings.",
        });
      }
    }
  });

  return issues;
}

module.exports = { detect };

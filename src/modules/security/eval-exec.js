"use strict";

/**
 * Detects unsafe use of eval(), Function(), exec(), and similar
 * dynamic code execution patterns.
 */

const PATTERNS = [
  {
    pattern: /\beval\s*\(/,
    rule: "unsafe-eval",
    severity: "high",
    message: () =>
      `'eval()' executes arbitrary code and is a major security risk.`,
    suggestion: () =>
      `Remove eval(). If you need dynamic behaviour, use a safer alternative like JSON.parse() or a state machine.`,
  },
  {
    pattern: /new\s+Function\s*\(/,
    rule: "unsafe-function-constructor",
    severity: "high",
    message: () =>
      `'new Function()' is equivalent to eval() and executes dynamic code.`,
    suggestion: () =>
      `Avoid new Function(). Define functions statically or use a plugin/strategy pattern instead.`,
  },
  {
    // Node.js child_process exec with variable
    pattern: /(?:exec|execSync)\s*\(\s*(?!["'`][^"'`]*["'`]\s*[,)])/,
    rule: "unsafe-exec-dynamic",
    severity: "critical",
    message: () =>
      `'exec()' or 'execSync()' called with a dynamic argument — command injection risk if user input is involved.`,
    suggestion: () =>
      `Use execFile() or spawn() with an argument array instead of a shell string. Never interpolate user input into shell commands.`,
  },
  {
    // Python-style exec in JS template
    pattern: /child_process\.exec\s*\(\s*`[^`]*\$\{/,
    rule: "unsafe-exec-template",
    severity: "critical",
    message: () =>
      `Shell command built with template literal interpolation — command injection is trivially possible.`,
    suggestion: () =>
      `Use spawn() with a fixed command and a separate args array. Never build shell strings dynamically.`,
  },
  {
    pattern: /setTimeout\s*\(\s*["'`]/,
    rule: "settimeout-string",
    severity: "warning",
    message: () =>
      `Passing a string to setTimeout() invokes eval() internally.`,
    suggestion: () =>
      `Pass a function reference to setTimeout instead: setTimeout(() => { ... }, delay)`,
  },
  {
    pattern: /setInterval\s*\(\s*["'`]/,
    rule: "setinterval-string",
    severity: "warning",
    message: () =>
      `Passing a string to setInterval() invokes eval() internally.`,
    suggestion: () =>
      `Pass a function reference to setInterval instead: setInterval(() => { ... }, delay)`,
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
            "Avoid all dynamic code execution. Use static, well-defined functions and data structures.",
        });
      }
    }
  });

  return issues;
}

module.exports = { detect };

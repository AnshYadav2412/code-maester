"use strict";

/**
 * Detects Cross-Site Scripting (XSS) vulnerabilities.
 * Flags places where unsanitised user input is injected
 * into the DOM or rendered into HTML.
 */

const PATTERNS = [
  {
    pattern: /\.innerHTML\s*=\s*(?!["'`]<)/,
    rule: "xss-inner-html",
    severity: "high",
    message: () =>
      `Assigning to 'innerHTML' with a dynamic value can execute injected scripts.`,
    suggestion: () =>
      `Use 'textContent' for plain text, or sanitise HTML with DOMPurify before assigning to innerHTML.`,
  },
  {
    pattern: /\.outerHTML\s*=\s*/,
    rule: "xss-outer-html",
    severity: "high",
    message: () =>
      `Assigning to 'outerHTML' with a dynamic value is an XSS risk.`,
    suggestion: () =>
      `Avoid outerHTML with dynamic content. Use DOM methods like createElement and appendChild instead.`,
  },
  {
    pattern: /document\.write\s*\(/,
    rule: "xss-document-write",
    severity: "high",
    message: () =>
      `'document.write()' can inject arbitrary HTML and scripts into the page.`,
    suggestion: () =>
      `Remove document.write(). Use DOM manipulation methods (createElement, appendChild) instead.`,
  },
  {
    pattern:
      /eval\s*\(\s*(?:req\.|request\.|params\.|body\.|query\.|location\.|window\.location)/,
    rule: "xss-eval-user-input",
    severity: "critical",
    message: () =>
      `'eval()' called with what appears to be user-controlled input — arbitrary code execution risk.`,
    suggestion: () =>
      `Never pass user input to eval(). Redesign the logic to avoid eval entirely.`,
  },
  {
    pattern: /\$\s*\(\s*["'`][^"'`]*["'`]\s*\)\.html\s*\(/,
    rule: "xss-jquery-html",
    severity: "high",
    message: () =>
      `jQuery .html() with dynamic content can inject scripts if the value contains user input.`,
    suggestion: () =>
      `Use jQuery .text() for plain text content, or sanitise input before passing to .html().`,
  },
  {
    pattern: /res\.send\s*\(\s*req\.|res\.write\s*\(\s*req\./,
    rule: "xss-reflected",
    severity: "high",
    message: () =>
      `Request parameter sent directly to response — reflected XSS if content-type is text/html.`,
    suggestion: () =>
      `Sanitise all user input before sending it in a response. Use a library like 'he' or 'xss'.`,
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
            "Sanitise all user-controlled data before rendering it in the browser or sending it in responses.",
        });
      }
    }
  });

  return issues;
}

module.exports = { detect };

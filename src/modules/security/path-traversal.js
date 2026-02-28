"use strict";

/**
 * Detects path traversal vulnerabilities where user-controlled
 * input is used to construct file system paths.
 */

const PATTERNS = [
  {
    pattern:
      /(?:readFile|readFileSync|writeFile|writeFileSync|appendFile|unlink|rmdir|mkdir)\s*\(\s*(?:req\.|request\.|params\.|body\.|query\.)/,
    rule: "path-traversal-fs-req",
    severity: "critical",
    message: () =>
      `File system operation uses a request parameter directly as the path — directory traversal is possible (e.g. ../../etc/passwd).`,
    suggestion: () =>
      `Sanitise the path with path.basename() and validate it against an allowed directory whitelist.`,
  },
  {
    pattern:
      /path\.(?:join|resolve)\s*\([^)]*(?:req\.|params\.|body\.|query\.)/,
    rule: "path-traversal-join-req",
    severity: "high",
    message: () =>
      `path.join() or path.resolve() uses a request parameter — a '../' sequence can escape the intended directory.`,
    suggestion: () =>
      `After joining, verify the resolved path starts with your intended base directory using path.resolve() and startsWith().`,
  },
  {
    pattern: /res\.sendFile\s*\(\s*(?:req\.|params\.|body\.|query\.)/,
    rule: "path-traversal-sendfile",
    severity: "critical",
    message: () =>
      `res.sendFile() with a user-controlled path can serve arbitrary files from the server.`,
    suggestion: () =>
      `Whitelist allowed filenames explicitly. Never pass user input directly to sendFile().`,
  },
  {
    // Joining __dirname with user input
    pattern:
      /path\.join\s*\(\s*__(?:dirname|filename)\s*,\s*(?:req\.|params\.|body\.|query\.)/,
    rule: "path-traversal-dirname-req",
    severity: "high",
    message: () =>
      `Joining __dirname with a request parameter — path traversal sequences can escape the app directory.`,
    suggestion: () =>
      `Use path.normalize() then check the result starts with the expected base: if (!fullPath.startsWith(baseDir)) throw new Error('Invalid path')`,
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
            "Always resolve and validate file paths against an allowed base directory before performing any file operation.",
        });
      }
    }
  });

  return issues;
}

module.exports = { detect };

"use strict";

const sqlInjection = require("./sql-injection");
const xss = require("./xss");
const hardcodedSecrets = require("./hardcoded-secrets");
const evalExec = require("./eval-exec");
const pathTraversal = require("./path-traversal");
const depVuln = require("./dep-vuln");
const { checkPackage } = require("./osv-client");
const path = require("path");

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

// ─── Inline import extraction ─────────────────────────────────────────────────

// Match: require('pkg'), require("pkg"), import ... from 'pkg', import 'pkg'
const REQUIRE_RE = /require\s*\(\s*['"]([^'"/][^'"]*)['"]\s*\)/g;
const IMPORT_RE = /(?:import\s+(?:[\w*{},\s]+\s+from\s+)?['"])([^'"/][^'"]*)(?:['"])/g;

/**
 * Extract all third-party package names from a code snippet.
 * Filters out relative paths and Node built-ins.
 */
const NODE_BUILTINS = new Set([
  "fs", "path", "os", "http", "https", "url", "crypto", "stream", "events", "util",
  "child_process", "cluster", "net", "dns", "readline", "buffer", "timers", "assert",
  "zlib", "querystring", "string_decoder", "vm", "module", "process", "console",
]);

function extractImportedPackages(code) {
  const found = new Map(); // name → first occurrence line

  for (const re of [REQUIRE_RE, IMPORT_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(code)) !== null) {
      let pkg = m[1].trim();
      // Scoped packages: @org/name → keep as-is; strip sub-paths: lodash/fp → lodash
      if (!pkg.startsWith("@")) pkg = pkg.split("/")[0];
      if (NODE_BUILTINS.has(pkg)) continue;
      if (pkg.startsWith(".")) continue;
      if (!found.has(pkg)) {
        const lineNum = code.slice(0, m.index).split("\n").length;
        found.set(pkg, lineNum);
      }
    }
  }

  return found; // Map<pkgName, lineNum>
}

/**
 * Detect inline imported packages that may have known vulnerabilities.
 * Uses "latest" as a safe-to-check version when no package.json is present.
 */
async function checkInlineImports(code) {
  const packages = extractImportedPackages(code);
  if (packages.size === 0) return [];

  const issues = [];
  const entries = [...packages.entries()];

  // Check in batches of 5 to avoid hammering OSV
  const CONCURRENCY = 5;
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(([name, lineNum]) =>
        checkPackage(name, "latest").then((vulns) => ({ name, lineNum, vulns })),
      ),
    );

    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      const { name, lineNum, vulns } = result.value;
      for (const vuln of vulns) {
        issues.push({
          type: "security",
          severity: vuln.severity,
          rule: "vulnerable-dependency",
          line: lineNum,
          column: 1,
          file: "snippet",
          message: `Imported package '${name}' has a known vulnerability: ${vuln.summary}`,
          suggestion: vuln.remediation,
          remediation: vuln.remediation,
          vulnId: vuln.id,
          source: vuln.source,
        });
      }
    }
  }

  return issues;
}

// ─── Main entry ───────────────────────────────────────────────────────────────

/**
 * Orchestrates all security checks.
 *
 * @param {string} code        — raw source code
 * @param {string} language    — detected language
 * @param {object} options     — { filePath?, projectRoot? }
 * @returns {Promise<Array>}   — all security issues sorted by severity
 */
async function run(code, language, options = {}) {
  // 1. Static pattern checks  (sync)
  const staticIssues = [
    ...sqlInjection.detect(code),
    ...xss.detect(code),
    ...hardcodedSecrets.detect(code),
    ...evalExec.detect(code),
    ...pathTraversal.detect(code),
  ];

  // 2. Dependency vulnerability checks (async, two paths)
  let depIssues = [];

  const projectRoot =
    options.projectRoot ||
    (options.filePath ? path.dirname(options.filePath) : null);

  if (projectRoot) {
    // Path A: analyzeFile() — check the project's package.json
    try {
      depIssues = await depVuln.detect(projectRoot);
    } catch (err) {
      console.warn("[security] Dependency check failed:", err.message);
    }
  } else {
    // Path B: analyze() with a raw snippet — extract inline imports
    try {
      depIssues = await checkInlineImports(code);
    } catch (err) {
      console.warn("[security] Inline import check failed:", err.message);
    }
  }

  const allIssues = [...staticIssues, ...depIssues];

  // Sort: critical → high → medium → low → line
  allIssues.sort((a, b) => {
    const sevA = SEVERITY_ORDER[a.severity] ?? 4;
    const sevB = SEVERITY_ORDER[b.severity] ?? 4;
    if (sevA !== sevB) return sevA - sevB;
    return (a.line || 0) - (b.line || 0);
  });

  return allIssues;
}

module.exports = { run };

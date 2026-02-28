"use strict";

const path = require("path");
const fs = require("fs");
const { checkPackage } = require("./osv-client");

/**
 * Reads package.json from the project being analysed,
 * checks every dependency against OSV, and returns findings.
 *
 * @param {string} projectRoot - root directory of the scanned project
 * @returns {Promise<Array>} security issues for vulnerable deps
 */
async function detect(projectRoot) {
  const pkgPath = path.join(projectRoot, "package.json");

  // No package.json — nothing to check
  if (!fs.existsSync(pkgPath)) return [];

  let pkgJson;
  try {
    pkgJson = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  } catch {
    return [];
  }

  const deps = {
    ...pkgJson.dependencies,
    ...pkgJson.devDependencies,
  };

  if (!deps || Object.keys(deps).length === 0) return [];

  const issues = [];
  const entries = Object.entries(deps);

  // Check all deps concurrently but limit concurrency to avoid rate-limits
  const CONCURRENCY = 5;
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);

    const results = await Promise.allSettled(
      batch.map(([name, versionRange]) => {
        // Strip semver range prefix (^, ~, >=) to get a plain version
        const version = versionRange.replace(/^[\^~>=<]+/, "").trim();
        return checkPackage(name, version).then((vulns) => ({
          name,
          version,
          vulns,
        }));
      }),
    );

    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      const { name, version, vulns } = result.value;

      for (const vuln of vulns) {
        issues.push({
          type: "security",
          severity: vuln.severity,
          rule: "vulnerable-dependency",
          line: 0,
          column: 0,
          message: `Dependency '${name}@${version}' has a known vulnerability: ${vuln.summary}`,
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

module.exports = { detect };

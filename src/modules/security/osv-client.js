"use strict";

const https = require("https");
const path = require("path");
const fs = require("fs");

const OSV_API_URL = "https://api.osv.dev/v1/query";
const SNAPSHOT_PATH = path.join(__dirname, "osv-snapshot.json");
const REQUEST_TIMEOUT_MS = 6000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 800;

// In-memory cache to avoid hammering the API
const cache = new Map();

// ─── helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Query the live OSV API for a single package.
 * Respects 429 Retry-After header and performs up to MAX_RETRIES retries.
 */
function queryOSV(name, version, attempt = 0) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      version,
      package: { name, ecosystem: "npm" },
    });

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(OSV_API_URL, options, (res) => {
      // ── Rate-limit handling ──────────────────────────────────────────────
      if (res.statusCode === 429) {
        const retryAfter = parseInt(res.headers["retry-after"] || "1", 10);
        const delay = (retryAfter * 1000) || RETRY_DELAY_MS;

        if (attempt < MAX_RETRIES) {
          console.warn(
            `[security] OSV rate-limited (429). Retrying in ${delay}ms ` +
            `(attempt ${attempt + 1}/${MAX_RETRIES})`,
          );
          res.resume(); // drain the response body
          sleep(delay)
            .then(() => queryOSV(name, version, attempt + 1))
            .then(resolve)
            .catch(reject);
        } else {
          res.resume();
          reject(new Error(`OSV rate limit exceeded after ${MAX_RETRIES} retries`));
        }
        return;
      }

      // ── Server errors — retry ────────────────────────────────────────────
      if (res.statusCode >= 500 && attempt < MAX_RETRIES) {
        console.warn(
          `[security] OSV server error (${res.statusCode}). Retrying in ${RETRY_DELAY_MS}ms…`,
        );
        res.resume();
        sleep(RETRY_DELAY_MS)
          .then(() => queryOSV(name, version, attempt + 1))
          .then(resolve)
          .catch(reject);
        return;
      }

      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.vulns || []);
        } catch {
          resolve([]);
        }
      });
    });

    req.on("error", (err) => {
      if (attempt < MAX_RETRIES) {
        console.warn(`[security] OSV request error: ${err.message}. Retrying…`);
        sleep(RETRY_DELAY_MS)
          .then(() => queryOSV(name, version, attempt + 1))
          .then(resolve)
          .catch(reject);
      } else {
        reject(err);
      }
    });

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy();
      reject(new Error("OSV API request timed out"));
    });

    req.write(body);
    req.end();
  });
}

// ─── snapshot ────────────────────────────────────────────────────────────────

function loadSnapshot() {
  try {
    const raw = fs.readFileSync(SNAPSHOT_PATH, "utf-8");
    const data = JSON.parse(raw);
    return data.vulnerabilities || [];
  } catch {
    return [];
  }
}

function compareVersions(a, b) {
  const partsA = (a || "0").replace(/[^0-9.]/g, "").split(".").map(Number);
  const partsB = (b || "0").replace(/[^0-9.]/g, "").split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (partsA[i] || 0) - (partsB[i] || 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}

function checkSnapshot(name, version) {
  const snapshot = loadSnapshot();
  return snapshot.filter((vuln) => {
    if (vuln.package !== name) return false;
    return vuln.vulnerableVersions.some((range) => {
      if (range.startsWith("<")) return compareVersions(version, range.slice(1)) < 0;
      return version === range;
    });
  });
}

// ─── main entry ──────────────────────────────────────────────────────────────

/**
 * Check a package against live OSV with retry/rate-limit handling
 * and offline snapshot fallback.
 */
async function checkPackage(name, version) {
  const cacheKey = `${name}@${version}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  let vulns = [];

  try {
    const liveResults = await queryOSV(name, version);
    vulns = liveResults.map((v) => ({
      id: v.id,
      summary: v.summary || v.details || "No summary available",
      severity: mapSeverity(v.database_specific?.severity || v.severity),
      remediation: `See https://osv.dev/vulnerability/${v.id} for fix guidance`,
      source: "osv-live",
    }));
  } catch (err) {
    console.warn(
      `[security] OSV API unavailable (${err.message}), using offline snapshot`,
    );
    const snapshotResults = checkSnapshot(name, version);
    vulns = snapshotResults.map((v) => ({
      id: v.id,
      summary: v.summary,
      severity: v.severity,
      remediation: v.remediation,
      source: "osv-snapshot",
    }));
  }

  cache.set(cacheKey, vulns);
  return vulns;
}

function mapSeverity(raw) {
  const s = (raw || "").toLowerCase();
  if (s.includes("critical")) return "critical";
  if (s.includes("high")) return "high";
  if (s.includes("moderate") || s.includes("medium")) return "medium";
  return "low";
}

module.exports = { checkPackage, checkSnapshot, compareVersions };

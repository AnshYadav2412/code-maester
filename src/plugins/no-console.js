"use strict";
/**
 * plugins/no-console.js
 * ─────────────────────
 * Example plugin for code-check.
 *
 * Detects `console.log`, `console.warn`, `console.error`, and `console.debug`
 * calls left in production code and reports them as lint warnings.
 *
 * Usage:
 *   const reviewer = require('code-check');
 *   const noConsole = require('code-check/src/plugins/no-console');
 *   reviewer.use(noConsole);
 *
 * Options: (pass via plugin.options before registering)
 *   allowedMethods: ["error"]   — array of console methods to allow (default: none)
 */

const CONSOLE_RE = /\bconsole\.(log|warn|error|debug|info|trace|table|dir)\s*\(/g;

const SEVERITY_MAP = {
    error: "info",    // console.error is least harmful — may be intentional
    warn: "warning",
    log: "warning",
    debug: "error",   // debug left in is most egregious
    info: "info",
    trace: "warning",
    table: "info",
    dir: "info",
};

const noConsolePlugin = {
    name: "no-console",
    language: "*",    // applies to all languages
    options: {
        allowedMethods: [], // e.g. ["error"] to skip console.error
    },

    run(code) {
        const issues = [];
        let match;

        CONSOLE_RE.lastIndex = 0;

        while ((match = CONSOLE_RE.exec(code)) !== null) {
            const method = match[1];

            // Skip allowed methods
            if (noConsolePlugin.options.allowedMethods.includes(method)) {
                CONSOLE_RE.lastIndex = match.index + 1;
                continue;
            }

            const lineNum = code.slice(0, match.index).split("\n").length;
            const col = match.index - code.lastIndexOf("\n", match.index);

            issues.push({
                type: "lint",
                rule: "no-console",
                severity: SEVERITY_MAP[method] || "warning",
                line: lineNum,
                column: col,
                file: "snippet",
                message: `Unexpected \`console.${method}()\` — remove before production.`,
                suggestion: "Remove console statements or replace with a proper logger (e.g. winston, pino).",
            });

            CONSOLE_RE.lastIndex = match.index + 1;
        }

        return issues;
    },
};

module.exports = noConsolePlugin;

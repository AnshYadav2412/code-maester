#!/usr/bin/env node
"use strict";

/**
 * code-maester CLI
 * --------------
 * Usage:
 *   code-maester <file|glob>                      — one-shot analysis
 *   code-maester <file|glob> --watch              — watch mode (live reload)
 *   code-maester <file|glob> --watch --server URL — custom backend WS URL
 *
 * Watch mode:
 *   1. Watches the given file/glob with chokidar
 *   2. On every save → runs analyzeFile() locally
 *   3. Pushes results to backend via WS (type: "cli:result")
 *   4. Backend rebroadcasts to all connected browser tabs as "watch:result"
 */

const path = require("path");
const codeCheck = require("../src/index.js");

/**
 * Require an optional CLI dependency. Prints a helpful install message if missing.
 */
function requireOptional(pkg) {
    try {
        return require(pkg);
    } catch {
        err(`Optional dependency '${pkg}' is not installed.`);
        err(`Run: ${c("cyan", `npm install ${pkg}`)} to use this feature.`);
        process.exit(1);
    }
}

// ── ANSI colour helpers ────────────────────────────────────────────────────────
const C = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    orange: "\x1b[38;5;208m",
    purple: "\x1b[35m",
};

function c(color, text) { return `${C[color]}${text}${C.reset}`; }
function bold(text) { return `${C.bold}${text}${C.reset}`; }
function dim(text) { return `${C.dim}${text}${C.reset}`; }

function gradeColour(grade) {
    if (grade === "A+") return "green";
    if (grade === "A") return "green";
    if (grade === "B") return "cyan";
    if (grade === "C") return "yellow";
    if (grade === "D") return "orange";
    return "red";
}

function ts() {
    return dim(`[${new Date().toLocaleTimeString()}]`);
}

function log(msg) { process.stdout.write(`${ts()} ${msg}\n`); }
function err(msg) { process.stderr.write(`${ts()} ${c("red", "✖")} ${msg}\n`); }
function ok(msg) { process.stdout.write(`${ts()} ${c("green", "✔")} ${msg}\n`); }
function info(msg) { process.stdout.write(`${ts()} ${c("cyan", "ℹ")} ${msg}\n`); }

// ── Argument parsing ───────────────────────────────────────────────────────────

function parseArgs(argv) {
    const args = argv.slice(2);
    const opts = {
        pattern: null,
        watch: false,
        server: "ws://localhost:3001/ws",
        help: false,
        version: false,
        json: false,
        project: false,
        patterns: [],
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === "--watch" || arg === "-w") {
            opts.watch = true;
        } else if (arg === "--server" || arg === "-s") {
            opts.server = args[++i];
        } else if (arg === "--json") {
            opts.json = true;
        } else if (arg === "--project" || arg === "-p") {
            opts.project = true;
        } else if (arg === "--version" || arg === "-v") {
            opts.version = true;
        } else if (arg === "--help" || arg === "-h") {
            opts.help = true;
        } else if (!arg.startsWith("-")) {
            if (!opts.pattern) opts.pattern = arg;
            opts.patterns.push(arg);
        }
    }

    return opts;
}

// ── Report printer (one-shot) ─────────────────────────────────────────────────

function printReport(report, filePath) {
    const grade = report.grade || "?";
    const score = typeof report.score === "number" ? report.score.toFixed(1) : "?";
    const gc = gradeColour(grade);

    const divider = c("dim", "─".repeat(60));

    console.log(`\n${divider}`);
    console.log(`  ${bold("code-maester")} ${dim("—")} ${c("cyan", path.basename(filePath || "code"))}`);
    console.log(divider);

    // Score + grade
    console.log(
        `  Score : ${bold(c(gc, score))}  Grade : ${bold(c(gc, grade))}  ` +
        `Language : ${c("blue", report.language || "?")}`,
    );
    console.log(divider);

    // Issue counts
    const bugCount = (report.bugs || []).length;
    const secCount = (report.security || []).length;
    const lintCount = (report.lint || []).length;
    const cplxCount = report.complexity?.functions?.length || 0;

    console.log(
        `  Bugs: ${c(bugCount ? "red" : "green", bugCount)}  ` +
        `Security: ${c(secCount ? "purple" : "green", secCount)}  ` +
        `Lint: ${c(lintCount ? "yellow" : "green", lintCount)}  ` +
        `Complexity: ${c(cplxCount ? "orange" : "green", cplxCount)}`,
    );

    // Issues detail
    function printIssues(label, issues, color) {
        if (!issues || issues.length === 0) return;
        console.log(`\n  ${bold(c(color, label + ":"))} (${issues.length})`);
        issues.slice(0, 10).forEach((issue) => {
            const loc = issue.line ? ` ${dim("L" + issue.line)}` : "";
            const rule = issue.rule ? ` ${dim("[" + issue.rule + "]")}` : "";
            console.log(`    ${c(color, "•")} ${issue.message}${loc}${rule}`);
            if (issue.suggestion) {
                console.log(`      ${dim("→")} ${dim(issue.suggestion)}`);
            }
        });
        if (issues.length > 10) {
            console.log(`    ${dim(`… and ${issues.length - 10} more`)}`);
        }
    }

    printIssues("Bugs", report.bugs, "red");
    printIssues("Security", report.security, "purple");
    printIssues("Lint", report.lint, "yellow");
    
    // Complexity is an object with functions array, extract issues from it
    const complexityIssues = [];
    if (report.complexity?.functions) {
        report.complexity.functions.forEach(fn => {
            if (fn.issues && fn.issues.length > 0) {
                complexityIssues.push(...fn.issues);
            }
        });
    }
    printIssues("Complexity", complexityIssues, "orange");

    // Suggestions
    if (report.suggestions && report.suggestions.length > 0) {
        console.log(`\n  ${bold(c("cyan", "Suggestions:"))} (${report.suggestions.length})`);
        report.suggestions.slice(0, 5).forEach((s) => {
            console.log(`    ${c("cyan", "💡")} ${s.suggestion}`);
        });
    }

    console.log(`\n${divider}\n`);
}

// ── WebSocket push helper ─────────────────────────────────────────────────────

class BackendWS {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.ready = false;
        this._queue = [];
    }

    connect() {
        return new Promise((resolve) => {
            const WebSocket = requireOptional("ws");
            info(`Connecting to backend ${c("cyan", this.url)} …`);
            this.ws = new WebSocket(this.url);

            this.ws.on("open", () => {
                this.ready = true;
                ok(`Connected to backend WebSocket`);
                // flush queued messages
                this._queue.forEach((m) => this.ws.send(m));
                this._queue = [];
                resolve();
            });

            this.ws.on("message", (raw) => {
                try {
                    const msg = JSON.parse(raw.toString());
                    if (msg.type === "connected") {
                        info(`Backend assigned client ID: ${c("dim", msg.id)}`);
                    }
                } catch {/* ignore */ }
            });

            this.ws.on("error", (e) => {
                err(`Backend WS error: ${e.message}`);
                this.ready = false;
            });

            this.ws.on("close", () => {
                this.ready = false;
                info("Disconnected from backend WebSocket");
            });

            // If connection fails within 3s, resolve anyway (offline mode)
            setTimeout(resolve, 3000);
        });
    }

    send(payload) {
        const raw = JSON.stringify(payload);
        if (this.ws && this.ws.readyState === 1 /* WebSocket.OPEN */) {
            this.ws.send(raw);
        } else {
            this._queue.push(raw);
        }
    }

    close() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

// ── One-shot analysis ─────────────────────────────────────────────────────────

async function runOnce(pattern, opts) {
    info(`Analysing ${c("cyan", pattern)} …`);
    try {
        const report = await codeCheck.analyzeFile(pattern);
        if (opts.json) {
            console.log(JSON.stringify(report, null, 2));
        } else {
            printReport(report, pattern);
        }
        const exitCode = (report.bugs || []).length > 0 || (report.security || []).length > 0 ? 1 : 0;
        process.exit(exitCode);
    } catch (e) {
        err(`Analysis failed: ${e.message}`);
        process.exit(1);
    }
}

// ── Project analysis ──────────────────────────────────────────────────────────

async function runProject(patterns, opts) {
    const { glob } = requireOptional("glob");
    const fs = require("fs").promises;

    if (!opts.json) {
        info(`Running project-level analysis…`);
    }

    // Expand all patterns to file paths
    let allFiles = [];
    for (const pattern of patterns) {
        const files = await glob(pattern, { nodir: true });
        allFiles = allFiles.concat(files);
    }

    // Remove duplicates
    allFiles = [...new Set(allFiles)];

    if (allFiles.length === 0) {
        if (!opts.json) {
            err("No files found matching the patterns");
        }
        process.exit(1);
    }

    if (!opts.json) {
        info(`Found ${c("cyan", allFiles.length)} files to analyze`);
    }

    try {
        const report = await codeCheck.analyzeProject(allFiles, opts);

        if (opts.json) {
            console.log(JSON.stringify(report, null, 2));
        } else {
            printProjectReport(report);
        }

        const exitCode = report.projectAnalysis.structural.filter(i => i.severity === "error").length > 0 ? 1 : 0;
        process.exit(exitCode);
    } catch (e) {
        if (opts.json) {
            console.error(JSON.stringify({ error: e.message }));
        } else {
            err(`Project analysis failed: ${e.message}`);
            console.error(e.stack);
        }
        process.exit(1);
    }
}

function printProjectReport(report) {
    const { projectAnalysis } = report;
    const divider = c("dim", "─".repeat(60));

    console.log(`\n${divider}`);
    console.log(`  ${bold("code-maester")} ${dim("—")} ${bold(c("cyan", "Project Analysis"))}`);
    console.log(divider);

    console.log(`  Files Analyzed: ${c("cyan", projectAnalysis.filesAnalyzed)}`);
    console.log(`  Total Issues: ${c(projectAnalysis.summary.totalIssues ? "yellow" : "green", projectAnalysis.summary.totalIssues)}`);
    console.log(divider);

    // Summary
    console.log(`\n  ${bold("Summary:")}`);
    console.log(`    Unused Exports: ${c(projectAnalysis.summary.unusedExports ? "yellow" : "green", projectAnalysis.summary.unusedExports)}`);
    console.log(`    Circular Dependencies: ${c(projectAnalysis.summary.circularDependencies ? "red" : "green", projectAnalysis.summary.circularDependencies)}`);

    // Structural issues
    if (projectAnalysis.structural.length > 0) {
        console.log(`\n  ${bold(c("orange", "Structural Issues:"))} (${projectAnalysis.structural.length})`);

        // Group by rule
        const byRule = {};
        projectAnalysis.structural.forEach((issue) => {
            if (!byRule[issue.rule]) byRule[issue.rule] = [];
            byRule[issue.rule].push(issue);
        });

        // Print circular dependencies
        if (byRule["circular-dependency"]) {
            console.log(`\n    ${bold(c("red", "Circular Dependencies:"))} (${byRule["circular-dependency"].length})`);
            byRule["circular-dependency"].forEach((issue, idx) => {
                console.log(`      ${c("red", `${idx + 1}.`)} ${issue.message}`);
                console.log(`         ${dim(issue.suggestion)}`);
            });
        }

        // Print unused exports
        if (byRule["unused-export"]) {
            console.log(`\n    ${bold(c("yellow", "Unused Exports:"))} (${byRule["unused-export"].length})`);
            const grouped = {};
            byRule["unused-export"].forEach((issue) => {
                const file = path.basename(issue.file);
                if (!grouped[file]) grouped[file] = [];
                grouped[file].push(issue);
            });

            Object.entries(grouped).forEach(([file, issues]) => {
                console.log(`      ${c("cyan", file)}:`);
                issues.slice(0, 5).forEach((issue) => {
                    console.log(`        ${c("yellow", "•")} ${issue.exportName} ${dim("(line " + issue.line + ")")}`);
                });
                if (issues.length > 5) {
                    console.log(`        ${dim(`… and ${issues.length - 5} more`)}`);
                }
            });
        }
    } else {
        console.log(`\n  ${c("green", "✔")} No structural issues found!`);
    }

    console.log(`\n${divider}\n`);
}

// ── Watch mode ────────────────────────────────────────────────────────────────

async function runWatch(pattern, opts) {
    const absPattern = path.resolve(pattern);

    console.log(`\n${bold(c("cyan", "code-maester"))} ${c("green", "—")} ${bold("Watch Mode")}`);
    console.log(dim("━".repeat(60)));
    info(`Watching : ${c("cyan", pattern)}`);
    info(`Backend  : ${c("cyan", opts.server)}`);
    console.log(dim("Press Ctrl+C to stop\n"));

    // Connect to backend WebSocket
    const backend = new BackendWS(opts.server);
    await backend.connect();

    // Tell backend we started watching (so browser UI can reflect it)
    backend.send({ type: "cli:watch:start", pattern: absPattern });

    // Start chokidar watcher
    const chokidar = requireOptional("chokidar");
    const watcher = chokidar.watch(pattern, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
    });

    watcher.on("ready", () => {
        ok(`Watcher ready — ${c("green", "waiting for file changes…")}`);
    });

    watcher.on("change", async (filePath) => {
        const rel = path.relative(process.cwd(), filePath);
        log(`${c("blue", "◎")} File changed: ${c("cyan", rel)}`);

        // Notify backend that analysis is starting
        backend.send({ type: "cli:analyzing", filePath: rel });

        try {
            const report = await codeCheck.analyzeFile(filePath);

            // Print brief summary to CLI stdout
            const score = typeof report.score === "number" ? report.score.toFixed(1) : "?";
            const grade = report.grade || "?";
            const gc = gradeColour(grade);
            log(
                `  Score: ${c(gc, bold(score))}  Grade: ${c(gc, bold(grade))}  ` +
                `Bugs: ${c((report.bugs || []).length ? "red" : "green", (report.bugs || []).length)}  ` +
                `Security: ${c((report.security || []).length ? "purple" : "green", (report.security || []).length)}  ` +
                `Lint: ${c((report.lint || []).length ? "yellow" : "green", (report.lint || []).length)}`,
            );

            // Push full result to backend → browser
            backend.send({ type: "cli:result", filePath: rel, report });
            ok(`Result pushed to backend ${c("green", "✅")}`);

        } catch (e) {
            err(`Analysis failed for ${rel}: ${e.message}`);
            backend.send({ type: "cli:error", filePath: rel, message: e.message });
        }
    });

    watcher.on("error", (e) => {
        err(`Watcher error: ${e.message}`);
    });

    // Graceful shutdown
    function shutdown() {
        info("Shutting down…");
        backend.send({ type: "cli:watch:stop", pattern: absPattern });
        watcher.close().then(() => {
            backend.close();
            process.exit(0);
        });
    }

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}

// ── Help ──────────────────────────────────────────────────────────────────────

function printHelp() {
    console.log(`
  ${bold(c("cyan", "code-maester"))} — Automated Code Quality Analyser
  ${dim("─".repeat(50))}

  ${bold("Usage:")}
    code-maester <file>                 Analyse a file (one-shot)
    code-maester <glob> --watch         Watch files for changes
    code-maester <file> --json          Output report as JSON
    code-maester --project <patterns>   Analyse multiple files for cross-file issues

  ${bold("Options:")}
    --watch,   -w          Enable watch mode
    --project, -p          Enable project-level analysis (unused exports, circular deps)
    --server,  -s <url>    Backend WebSocket URL
                           (default: ws://localhost:3001/ws)
    --json                 Output raw JSON instead of formatted report
    --version, -v          Print package version
    --help,    -h          Show this help

  ${bold("Examples:")}
    code-maester src/auth.js
    code-maester "src/**/*.js" --watch
    code-maester src/api.ts --watch --server ws://my-server:3001/ws
    code-maester src/index.js --json
    code-maester --project "src/**/*.js" "lib/**/*.js"

  ${bold("Watch mode flow:")}
    file save → local analysis → push to backend WS → browser updates live

  ${bold("Project mode:")}
    Detects unused exports and circular dependencies across all files
`);
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
    const opts = parseArgs(process.argv);

    if (opts.version) {
        console.log(codeCheck.version());
        process.exit(0);
    }

    if (opts.help || (!opts.pattern && !opts.project)) {
        printHelp();
        process.exit(opts.help ? 0 : 1);
    }

    if (opts.project) {
        if (opts.patterns.length === 0) {
            err("--project requires at least one file pattern");
            process.exit(1);
        }
        await runProject(opts.patterns, opts);
    } else if (opts.watch) {
        await runWatch(opts.pattern, opts);
    } else {
        await runOnce(opts.pattern, opts);
    }
}

main().catch((e) => {
    err(`Fatal: ${e.message}`);
    process.exit(1);
});

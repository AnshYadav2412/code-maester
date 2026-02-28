"use strict";

const { execSync, spawnSync } = require("child_process");
const os = require("os");
const fs = require("fs");
const path = require("path");

/**
 * Check if a CLI tool exists on the system.
 * @param {string} command
 * @returns {boolean}
 */
function commandExists(command) {
  try {
    const flag = process.platform === "win32" ? "/?" : "--version";
    execSync(`${command} ${flag}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Format Python code using Black (preferred) or autopep8 (fallback).
 * If neither is installed, falls back to basic indentation normalisation.
 *
 * @param {string} code    - raw Python source code
 * @param {object} options - { lineLength?: number }
 * @returns {Promise<{ formatted: string, tool: string, error: string|null }>}
 */
async function format(code, options = {}) {
  const lineLength = options.lineLength || 88; // Black's default

  // ── Try Black ─────────────────────────────────────────────────────────────
  if (commandExists("black")) {
    const result = formatWithTool("black", code, [
      "--quiet",
      `--line-length=${lineLength}`,
      "-", // read from stdin, write to stdout
    ]);

    if (!result.error) {
      return { formatted: result.output, tool: "black", error: null };
    }
  }

  // ── Try autopep8 ──────────────────────────────────────────────────────────
  if (commandExists("autopep8")) {
    const result = formatWithTool("autopep8", code, [
      "--aggressive",
      `--max-line-length=${lineLength}`,
      "-",
    ]);

    if (!result.error) {
      return { formatted: result.output, tool: "autopep8", error: null };
    }
  }

  // ── Fallback: temp file approach ──────────────────────────────────────────
  // Write code to a temp file and try formatting it
  try {
    const tmpFile = path.join(os.tmpdir(), `code_check_${Date.now()}.py`);
    fs.writeFileSync(tmpFile, code, "utf-8");

    if (commandExists("black")) {
      execSync(`black --quiet "${tmpFile}"`, { stdio: "ignore" });
      const formatted = fs.readFileSync(tmpFile, "utf-8");
      fs.unlinkSync(tmpFile);
      return { formatted, tool: "black-file", error: null };
    }
    fs.unlinkSync(tmpFile);
  } catch {
    // ignore temp file errors
  }

  // ── Final fallback: basic Python formatting ───────────────────────────────
  return {
    formatted: basicPyFormat(code),
    tool: "basic",
    error:
      "Neither Black nor autopep8 found — applied basic formatting only. Install Black: pip install black",
  };
}

/**
 * Run a formatting tool with stdin/stdout.
 * @param {string} tool    - tool name
 * @param {string} code    - source code to pipe in
 * @param {Array}  args    - CLI arguments
 * @returns {{ output: string, error: string|null }}
 */
function formatWithTool(tool, code, args) {
  try {
    const result = spawnSync(tool, args, {
      input: code,
      encoding: "utf-8",
      timeout: 10000,
    });

    if (result.status === 0 && result.stdout) {
      return { output: result.stdout, error: null };
    }

    return { output: "", error: result.stderr || "Unknown error" };
  } catch (err) {
    return { output: "", error: err.message };
  }
}

/**
 * Basic Python formatter fallback.
 * Normalises indentation to 4 spaces (PEP 8).
 * Does NOT change program logic.
 * @param {string} code
 * @returns {string}
 */
function basicPyFormat(code) {
  const lines = code.split("\n");
  const result = [];

  lines.forEach((line) => {
    if (!line.trim()) {
      result.push("");
      return;
    }

    // Detect existing indentation level using spaces or tabs
    const match = line.match(/^(\s*)/);
    const rawIndent = match ? match[1] : "";

    // Normalise: convert tabs to 4 spaces, ensure multiples of 4
    const spaceCount = rawIndent.replace(/\t/g, "    ").length;
    const newIndent = " ".repeat(spaceCount);

    result.push(newIndent + line.trim());
  });

  return result.join("\n");
}

module.exports = { format };

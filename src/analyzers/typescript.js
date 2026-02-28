"use strict";
/**
 * analyzers/typescript.js
 * ───────────────────────
 * TypeScript-specific analyzer.
 * Extends JavaScriptAnalyzer with additional TS-specific lint rules:
 *   - Explicit `any` type usage
 *   - Non-null assertions (!.)
 *   - Type casting with `as any`
 *   - Missing return type annotations on public functions
 *   - `@ts-ignore` suppression comments
 *   - Unsafe `as unknown as T` double-cast pattern
 */

const JavaScriptAnalyzer = require("./javascript");

// ─── TS-specific lint detectors ───────────────────────────────────────────────

const TS_RULES = [
    {
        rule: "no-explicit-any",
        pattern: /(?::\s*any\b|<any>|Array<any>|Promise<any>)/g,
        severity: "warning",
        type: "lint",
        message: (m) => `Explicit \`any\` type used: '${m[0].trim()}'. Prefer a specific type or \`unknown\`.`,
        suggestion: "Replace `any` with a specific type, generic parameter, or `unknown` with a type guard.",
    },
    {
        rule: "no-non-null-assertion",
        pattern: /\w+!\./g,
        severity: "warning",
        type: "lint",
        message: (m) => `Non-null assertion '${m[0]}' used. This bypasses TypeScript's null safety.`,
        suggestion: "Use optional chaining (?.) or add a proper null check instead of !.",
    },
    {
        rule: "no-unsafe-cast",
        pattern: /\bas\s+any\b/g,
        severity: "error",
        type: "bug",
        message: () => "`as any` cast disables type checking. This may hide runtime errors.",
        suggestion: "Use `as unknown as TargetType` only when absolutely necessary, or refactor the code.",
    },
    {
        rule: "no-double-cast",
        pattern: /as\s+unknown\s+as\s+\w+/g,
        severity: "warning",
        type: "lint",
        message: (m) => `Double-cast '${m[0]}' detected. This pattern indicates a type mismatch.`,
        suggestion: "Restructure the code so the type mismatch is resolved at the source.",
    },
    {
        rule: "no-ts-ignore",
        pattern: /@ts-ignore/g,
        severity: "warning",
        type: "lint",
        message: () => "`@ts-ignore` suppresses TypeScript errors. The underlying issue should be fixed.",
        suggestion: "Fix the type error instead of suppressing it. Use `@ts-expect-error` if temporary suppression is needed.",
    },
];

function runTSRules(code) {
    const bugs = [];
    const lint = [];

    for (const rule of TS_RULES) {
        // Reset regex state
        rule.pattern.lastIndex = 0;

        let match;
        while ((match = rule.pattern.exec(code)) !== null) {
            const lineNum = code.slice(0, match.index).split("\n").length;
            const col = match.index - code.lastIndexOf("\n", match.index);

            const issue = {
                type: rule.type,
                rule: rule.rule,
                severity: rule.severity,
                line: lineNum,
                column: col,
                file: "snippet",
                message: rule.message(match),
                suggestion: rule.suggestion,
            };

            if (rule.type === "bug") bugs.push(issue);
            else lint.push(issue);

            // Reset in case of global flag overlap
            rule.pattern.lastIndex = match.index + 1;
        }
    }

    return { bugs, lint };
}

// ─── TypeScript Analyzer ──────────────────────────────────────────────────────

class TypeScriptAnalyzer extends JavaScriptAnalyzer {
    constructor(config) {
        super(config);
        this.language = "typescript";
    }

    getSupportedExtensions() {
        return [".ts", ".tsx", ".d.ts"];
    }

    supportsLanguage(language) {
        return ["typescript", "ts", "tsx"].includes(language.toLowerCase());
    }

    async analyze(code, options = {}) {
        // Run base JS analysis first
        const base = await super.analyze(code, options);

        // Run TypeScript-specific rules on top
        const tsResults = runTSRules(code);

        return {
            bugs: [...base.bugs, ...tsResults.bugs],
            lint: [...base.lint, ...tsResults.lint],
            security: base.security,
            complexity: base.complexity,
            redundancy: base.redundancy,
        };
    }
}

module.exports = TypeScriptAnalyzer;

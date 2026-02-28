"use strict";

// Each entry has:
//   language  — the language name to return
//   weight    — how strongly this pattern implies the language (1-3)
//   pattern   — regex tested against the raw source code

const HEURISTIC_RULES = [
  // ── JavaScript ────────────────────────────────────────────────────────────
  // ── JavaScript ────────────────────────────────────────────────────────────
  { language: "javascript", weight: 3, pattern: /\brequire\s*\(/ },
  { language: "javascript", weight: 3, pattern: /\bmodule\.exports\s*=/ },
  { language: "javascript", weight: 3, pattern: /\bconsole\.log\s*\(/ },
  { language: "javascript", weight: 3, pattern: /\bimport\b.+\bfrom\s+['"]/ }, // ← UPDATED weight 2→3, anchored to quote
  {
    language: "javascript",
    weight: 3,
    pattern: /\bexport\s+(default|const|function|class)\b/,
  }, // ← NEW
  { language: "javascript", weight: 2, pattern: /\bconst\b|\blet\b|\bvar\b/ },
  { language: "javascript", weight: 2, pattern: /=>/ },
  {
    language: "javascript",
    weight: 1,
    pattern: /\bPromise\b|\basync\b|\bawait\b/,
  },
  { language: "javascript", weight: 1, pattern: /===|!==/ },

  // ── TypeScript ────────────────────────────────────────────────────────────
  {
    language: "typescript",
    weight: 3,
    pattern: /:\s*(string|number|boolean|any|void|never)\b/,
  },
  {
    language: "typescript",
    weight: 3,
    pattern: /\w+\s*\(.*:\s*(string|number|boolean|void|any).*\)/,
  },
  { language: "typescript", weight: 3, pattern: /\binterface\s+\w+/ },
  { language: "typescript", weight: 3, pattern: /\btype\s+\w+\s*=/ },
  { language: "typescript", weight: 2, pattern: /\benum\s+\w+/ },
  { language: "typescript", weight: 2, pattern: /<[A-Z]\w*>/ },
  {
    language: "typescript",
    weight: 1,
    pattern: /\bas\s+(string|number|boolean|any)/,
  },

  // ── Python ────────────────────────────────────────────────────────────────
  // ── Python ────────────────────────────────────────────────────────────────
  { language: "python", weight: 3, pattern: /\bdef\s+\w+\s*\(/ },
  {
    language: "python",
    weight: 3,
    pattern: /\bimport\s+\w+(?!\s+from)(?!\s*\()/,
  }, // ← tighter
  { language: "python", weight: 3, pattern: /\bfrom\s+\w+\s+import\b/ }, // ← python-only from...import
  { language: "python", weight: 3, pattern: /\bprint\s*\(/ },
  {
    language: "python",
    weight: 2,
    pattern: /\bif\s+__name__\s*==\s*['"]__main__['"]/,
  },
  { language: "python", weight: 2, pattern: /\bself\b/ },
  { language: "python", weight: 2, pattern: /:\s*$|\bpass\b/m },
  { language: "python", weight: 1, pattern: /\belif\b/ },
  { language: "python", weight: 1, pattern: /\bNone\b|\bTrue\b|\bFalse\b/ },

  // ── Java ──────────────────────────────────────────────────────────────────
  { language: "java", weight: 3, pattern: /\bpublic\s+class\s+\w+/ },
  {
    language: "java",
    weight: 3,
    pattern: /\bpublic\s+static\s+void\s+main\s*\(/,
  },
  { language: "java", weight: 3, pattern: /System\.out\.println\s*\(/ },
  { language: "java", weight: 2, pattern: /\bimport\s+java\./ },
  {
    language: "java",
    weight: 2,
    pattern: /\bprivate\b|\bprotected\b|\bpublic\b/,
  },
  { language: "java", weight: 2, pattern: /\bnew\s+\w+\s*\(/ },
  { language: "java", weight: 1, pattern: /;$|;\s*$/m },
  { language: "java", weight: 1, pattern: /\bvoid\b|\bint\b|\bString\b/ },

  // ── C ─────────────────────────────────────────────────────────────────────
  { language: "c", weight: 3, pattern: /#include\s*<.+\.h>/ },
  { language: "c", weight: 3, pattern: /\bint\s+main\s*\(/ },
  { language: "c", weight: 2, pattern: /\bprintf\s*\(/ },
  { language: "c", weight: 2, pattern: /\bscanf\s*\(/ },
  { language: "c", weight: 2, pattern: /\bmalloc\s*\(|\bfree\s*\(/ },
  { language: "c", weight: 1, pattern: /\bstruct\s+\w+/ },

  // ── C++ ───────────────────────────────────────────────────────────────────
  { language: "cpp", weight: 3, pattern: /#include\s*<iostream>/ },
  { language: "cpp", weight: 3, pattern: /\bstd::/ },
  { language: "cpp", weight: 3, pattern: /\bcout\s*<<|cin\s*>>/ },
  { language: "cpp", weight: 2, pattern: /\bclass\s+\w+\s*\{/ },
  { language: "cpp", weight: 2, pattern: /\btemplate\s*</ },
  { language: "cpp", weight: 1, pattern: /\bnamespace\s+\w+/ },
];

module.exports = HEURISTIC_RULES;

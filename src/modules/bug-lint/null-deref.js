"use strict";

const RISKY_SOURCES = [
  /\b(\w+)\s*=\s*.+\.(find|findIndex|pop|shift)\(/,
  /\b(\w+)\s*=\s*document\.(getElementById|querySelector|getElementsBy\w+)\(/,
  /\b(\w+)\s*=\s*JSON\.parse\(/,
  /\b(\w+)\s*=\s*\w+\.\w+\(/,
];

function detect(code) {
  const issues = [];
  const lines = code.split("\n");
  const riskyVars = new Set();

  // Pass 1 — collect risky variable names
  lines.forEach((line) => {
    for (const pattern of RISKY_SOURCES) {
      const match = line.match(pattern);
      if (match && match[1]) {
        riskyVars.add(match[1]);
      }
    }
  });

  // Pass 2 — find unguarded dereferences
  lines.forEach((line, i) => {
    // ← matchAll instead of match — catches ALL dereferences on the line
    const matches = [...line.matchAll(/(\w+)\.([\w]+)/g)];
    if (matches.length === 0) return;

    for (const match of matches) {
      const varName = match[1];
      if (!riskyVars.has(varName)) continue; // ← skip non-risky vars

      const context = lines.slice(Math.max(0, i - 3), i).join("\n");
      const hasNullCheck =
        context.includes(`if (${varName})`) ||
        context.includes(`if (${varName} !==`) ||
        context.includes(`if (${varName} !=`) ||
        context.includes(`${varName}?.`) ||
        context.includes(`${varName} &&`) ||
        new RegExp(`\\b${varName}\\s*&&`).test(context);

      if (!hasNullCheck) {
        issues.push({
          type: "bug",
          severity: "error",
          rule: "null-deref",
          line: i + 1,
          column: line.indexOf(varName) + 1,
          message: `Possible null/undefined dereference: '${varName}' may be null before accessing '.${match[2]}'`,
          suggestion: `Add a null check: if (${varName}) { ... } or use optional chaining: ${varName}?.${match[2]}`,
        });
      }
    }
  });

  return issues;
}

module.exports = { detect };

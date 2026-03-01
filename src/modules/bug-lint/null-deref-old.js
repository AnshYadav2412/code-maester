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
  const reported = new Set(); // avoid duplicate issues for same var
  lines.forEach((line, i) => {
    const matches = [...line.matchAll(/(\w+)\.([\w]+)/g)];
    if (matches.length === 0) return;

    for (const match of matches) {
      const varName = match[1];
      if (!riskyVars.has(varName)) continue;
      if (reported.has(`${varName}:${i}`)) continue;

      // Context includes current line AND 3 lines above (catches inline guards)
      const context = lines.slice(Math.max(0, i - 3), i + 1).join("\n");
      const hasNullCheck =
        context.includes(`if (${varName})`) ||
        context.includes(`if(${varName})`) ||
        context.includes(`if (${varName} !==`) ||
        context.includes(`if (${varName} !=`) ||
        context.includes(`if(${varName} !==`) ||
        context.includes(`if(${varName} !=`) ||
        context.includes(`${varName}?.`) ||
        new RegExp(`\\b${varName}\\s*&&`).test(context) ||
        new RegExp(`&&\\s*${varName}`).test(context) ||
        new RegExp(`${varName}\\s*!==\\s*(null|undefined)`).test(context) ||
        new RegExp(`${varName}\\s*!=\\s*(null|undefined)`).test(context);

      if (!hasNullCheck) {
        reported.add(`${varName}:${i}`);
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

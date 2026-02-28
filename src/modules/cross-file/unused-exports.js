"use strict";

/**
 * Detects exports that are never imported across the entire project.
 * Only flags exports as unused if they're not used in ANY file.
 */

const acorn = require("acorn");

/**
 * Extract all exports from a file
 * @param {string} code - Source code
 * @param {string} language - Language type
 * @returns {Array<{name: string, line: number, type: string}>}
 */
function extractExports(code, language) {
  const exports = [];

  if (language === "javascript" || language === "typescript") {
    try {
      const ast = acorn.parse(code, {
        ecmaVersion: "latest",
        sourceType: "module",
        locations: true,
      });

      // Walk the AST to find exports
      const walk = (node) => {
        if (!node || typeof node !== "object") return;

        // export function foo() {}
        // export class Bar {}
        // export const x = 1;
        if (node.type === "ExportNamedDeclaration") {
          if (node.declaration) {
            if (node.declaration.type === "FunctionDeclaration" && node.declaration.id) {
              exports.push({
                name: node.declaration.id.name,
                line: node.loc.start.line,
                type: "function",
              });
            } else if (node.declaration.type === "ClassDeclaration" && node.declaration.id) {
              exports.push({
                name: node.declaration.id.name,
                line: node.loc.start.line,
                type: "class",
              });
            } else if (node.declaration.type === "VariableDeclaration") {
              node.declaration.declarations.forEach((decl) => {
                if (decl.id && decl.id.name) {
                  exports.push({
                    name: decl.id.name,
                    line: node.loc.start.line,
                    type: "variable",
                  });
                }
              });
            }
          }
          // export { foo, bar };
          if (node.specifiers) {
            node.specifiers.forEach((spec) => {
              if (spec.exported && spec.exported.name) {
                exports.push({
                  name: spec.exported.name,
                  line: node.loc.start.line,
                  type: "named",
                });
              }
            });
          }
        }

        // export default ...
        if (node.type === "ExportDefaultDeclaration") {
          const name = node.declaration.id?.name || node.declaration.name || "default";
          exports.push({
            name,
            line: node.loc.start.line,
            type: "default",
            isDefault: true,
          });
        }

        // Recursively walk child nodes
        for (const key in node) {
          if (key === "loc" || key === "range") continue;
          const child = node[key];
          if (Array.isArray(child)) {
            child.forEach(walk);
          } else if (child && typeof child === "object") {
            walk(child);
          }
        }
      };

      walk(ast);
    } catch (err) {
      // If parsing fails, fall back to regex
      return extractExportsRegex(code);
    }
  } else if (language === "python") {
    return extractExportsPython(code);
  }

  return exports;
}

/**
 * Fallback regex-based export extraction for JavaScript
 */
function extractExportsRegex(code) {
  const exports = [];
  const lines = code.split("\n");

  lines.forEach((line, i) => {
    // export function foo
    const funcMatch = line.match(/export\s+(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
    if (funcMatch) {
      exports.push({ name: funcMatch[1], line: i + 1, type: "function" });
    }

    // export class Foo
    const classMatch = line.match(/export\s+class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
    if (classMatch) {
      exports.push({ name: classMatch[1], line: i + 1, type: "class" });
    }

    // export const/let/var
    const varMatch = line.match(/export\s+(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
    if (varMatch) {
      exports.push({ name: varMatch[1], line: i + 1, type: "variable" });
    }

    // export { foo, bar }
    const namedMatch = line.match(/export\s*\{\s*([^}]+)\s*\}/);
    if (namedMatch) {
      const names = namedMatch[1].split(",").map((n) => n.trim().split(/\s+as\s+/).pop());
      names.forEach((name) => {
        if (name) exports.push({ name, line: i + 1, type: "named" });
      });
    }

    // export default
    if (line.match(/export\s+default/)) {
      exports.push({ name: "default", line: i + 1, type: "default", isDefault: true });
    }
  });

  return exports;
}

/**
 * Extract exports from Python code
 */
function extractExportsPython(code) {
  const exports = [];
  const lines = code.split("\n");

  // In Python, __all__ defines public exports
  const allMatch = code.match(/__all__\s*=\s*\[([^\]]+)\]/);
  if (allMatch) {
    const names = allMatch[1].split(",").map((n) => n.trim().replace(/['"]/g, ""));
    names.forEach((name) => {
      const lineNum = lines.findIndex((l) => l.includes(name)) + 1;
      exports.push({ name, line: lineNum || 1, type: "public" });
    });
  }

  // Also detect top-level functions and classes
  lines.forEach((line, i) => {
    const funcMatch = line.match(/^def\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (funcMatch && !funcMatch[1].startsWith("_")) {
      exports.push({ name: funcMatch[1], line: i + 1, type: "function" });
    }

    const classMatch = line.match(/^class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (classMatch && !classMatch[1].startsWith("_")) {
      exports.push({ name: classMatch[1], line: i + 1, type: "class" });
    }
  });

  return exports;
}

/**
 * Extract all imports from a file
 * @param {string} code - Source code
 * @param {string} language - Language type
 * @returns {Set<string>} Set of imported names
 */
function extractImports(code, language) {
  const imports = new Set();

  if (language === "javascript" || language === "typescript") {
    try {
      const ast = acorn.parse(code, {
        ecmaVersion: "latest",
        sourceType: "module",
      });

      const walk = (node) => {
        if (!node || typeof node !== "object") return;

        // import { foo, bar } from './module'
        if (node.type === "ImportDeclaration") {
          node.specifiers.forEach((spec) => {
            if (spec.imported && spec.imported.name) {
              imports.add(spec.imported.name);
            }
            if (spec.local && spec.local.name) {
              imports.add(spec.local.name);
            }
          });
        }

        // require('module').foo or const { foo } = require('module')
        if (node.type === "CallExpression" && node.callee.name === "require") {
          // This is a basic check; full destructuring analysis would be more complex
          const parent = node.parent;
          if (parent && parent.type === "VariableDeclarator" && parent.id) {
            if (parent.id.type === "ObjectPattern") {
              parent.id.properties.forEach((prop) => {
                if (prop.key && prop.key.name) {
                  imports.add(prop.key.name);
                }
              });
            } else if (parent.id.name) {
              imports.add(parent.id.name);
            }
          }
        }

        for (const key in node) {
          if (key === "loc" || key === "range") continue;
          const child = node[key];
          if (Array.isArray(child)) {
            child.forEach((c) => {
              if (c && typeof c === "object") c.parent = node;
              walk(c);
            });
          } else if (child && typeof child === "object") {
            child.parent = node;
            walk(child);
          }
        }
      };

      walk(ast);
    } catch (err) {
      // Fallback to regex
      return extractImportsRegex(code);
    }
  } else if (language === "python") {
    return extractImportsPython(code);
  }

  return imports;
}

/**
 * Fallback regex-based import extraction
 */
function extractImportsRegex(code) {
  const imports = new Set();
  const lines = code.split("\n");

  lines.forEach((line) => {
    // import { foo, bar } from './module'
    const namedMatch = line.match(/import\s*\{\s*([^}]+)\s*\}/);
    if (namedMatch) {
      const names = namedMatch[1].split(",").map((n) => n.trim().split(/\s+as\s+/).shift());
      names.forEach((name) => imports.add(name));
    }

    // import foo from './module'
    const defaultMatch = line.match(/import\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s+from/);
    if (defaultMatch) {
      imports.add(defaultMatch[1]);
    }

    // const { foo, bar } = require('./module')
    const requireMatch = line.match(/const\s*\{\s*([^}]+)\s*\}\s*=\s*require/);
    if (requireMatch) {
      const names = requireMatch[1].split(",").map((n) => n.trim().split(/\s*:\s*/).shift());
      names.forEach((name) => imports.add(name));
    }

    // const foo = require('./module')
    const requireDefaultMatch = line.match(/const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*require/);
    if (requireDefaultMatch) {
      imports.add(requireDefaultMatch[1]);
    }
  });

  return imports;
}

/**
 * Extract imports from Python code
 */
function extractImportsPython(code) {
  const imports = new Set();
  const lines = code.split("\n");

  lines.forEach((line) => {
    // from module import foo, bar
    const fromMatch = line.match(/from\s+[\w.]+\s+import\s+(.+)/);
    if (fromMatch) {
      const names = fromMatch[1].split(",").map((n) => n.trim().split(/\s+as\s+/).shift());
      names.forEach((name) => imports.add(name));
    }

    // import module
    const importMatch = line.match(/import\s+([\w.]+)(?:\s+as\s+([\w]+))?/);
    if (importMatch) {
      imports.add(importMatch[2] || importMatch[1]);
    }
  });

  return imports;
}

/**
 * Detect unused exports across all files
 * @param {Array<{path: string, code: string, language: string}>} files
 * @param {object} options
 * @returns {Promise<Array>}
 */
async function detect(files) {
  const issues = [];
  const allExports = new Map(); // Map<exportName, Array<{file, line, type}>>
  const allImports = new Set(); // Set of all imported names across all files

  // Pass 1: Collect all exports from all files
  files.forEach((file) => {
    const exports = extractExports(file.code, file.language || "javascript");
    exports.forEach((exp) => {
      if (!allExports.has(exp.name)) {
        allExports.set(exp.name, []);
      }
      allExports.get(exp.name).push({
        file: file.path,
        line: exp.line,
        type: exp.type,
        isDefault: exp.isDefault,
      });
    });
  });

  // Pass 2: Collect all imports from all files
  files.forEach((file) => {
    const imports = extractImports(file.code, file.language || "javascript");
    imports.forEach((imp) => allImports.add(imp));
  });

  // Pass 3: Find exports that are never imported
  allExports.forEach((locations, exportName) => {
    // Skip 'default' exports as they might be imported differently
    if (exportName === "default") return;

    // Check if this export is imported anywhere
    if (!allImports.has(exportName)) {
      locations.forEach((loc) => {
        issues.push({
          type: "structural",
          severity: "warning",
          rule: "unused-export",
          file: loc.file,
          line: loc.line,
          message: `Export '${exportName}' is never imported in any file.`,
          suggestion: `Remove the export of '${exportName}' or ensure it's imported where needed.`,
          exportName,
          exportType: loc.type,
        });
      });
    }
  });

  return issues;
}

module.exports = { detect };

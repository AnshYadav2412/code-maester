"use strict";

/**
 * Detects circular dependencies between modules.
 * Reports them as high-severity structural issues.
 */

const path = require("path");
const acorn = require("acorn");

/**
 * Extract all import/require statements from a file
 * @param {string} code - Source code
 * @param {string} language - Language type
 * @param {string} filePath - Path of the current file
 * @returns {Array<string>} Array of imported module paths
 */
function extractDependencies(code, language, filePath) {
  const dependencies = [];

  if (language === "javascript" || language === "typescript") {
    try {
      const ast = acorn.parse(code, {
        ecmaVersion: "latest",
        sourceType: "module",
      });

      const walk = (node) => {
        if (!node || typeof node !== "object") return;

        // import ... from 'module'
        if (node.type === "ImportDeclaration" && node.source && node.source.value) {
          dependencies.push(node.source.value);
        }

        // require('module')
        if (
          node.type === "CallExpression" &&
          node.callee.name === "require" &&
          node.arguments[0] &&
          node.arguments[0].type === "Literal"
        ) {
          dependencies.push(node.arguments[0].value);
        }

        // export ... from 'module'
        if (node.type === "ExportNamedDeclaration" && node.source && node.source.value) {
          dependencies.push(node.source.value);
        }

        if (node.type === "ExportAllDeclaration" && node.source && node.source.value) {
          dependencies.push(node.source.value);
        }

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
      // Fallback to regex
      return extractDependenciesRegex(code);
    }
  } else if (language === "python") {
    return extractDependenciesPython(code);
  }

  // Resolve relative paths to absolute
  return dependencies
    .filter((dep) => dep.startsWith(".")) // Only track local modules
    .map((dep) => {
      try {
        const dir = path.dirname(filePath);
        return path.resolve(dir, dep);
      } catch {
        return dep;
      }
    });
}

/**
 * Fallback regex-based dependency extraction
 */
function extractDependenciesRegex(code) {
  const dependencies = [];
  const lines = code.split("\n");

  lines.forEach((line) => {
    // import ... from 'module'
    const importMatch = line.match(/import\s+.*\s+from\s+['"]([^'"]+)['"]/);
    if (importMatch) {
      dependencies.push(importMatch[1]);
    }

    // require('module')
    const requireMatch = line.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (requireMatch) {
      dependencies.push(requireMatch[1]);
    }

    // export ... from 'module'
    const exportMatch = line.match(/export\s+.*\s+from\s+['"]([^'"]+)['"]/);
    if (exportMatch) {
      dependencies.push(exportMatch[1]);
    }
  });

  return dependencies.filter((dep) => dep.startsWith("."));
}

/**
 * Extract dependencies from Python code
 */
function extractDependenciesPython(code) {
  const dependencies = [];
  const lines = code.split("\n");

  lines.forEach((line) => {
    // from .module import ...
    const fromMatch = line.match(/from\s+(\.[\w.]*)\s+import/);
    if (fromMatch) {
      dependencies.push(fromMatch[1]);
    }

    // import .module
    const importMatch = line.match(/import\s+(\.[\w.]+)/);
    if (importMatch) {
      dependencies.push(importMatch[1]);
    }
  });

  return dependencies;
}

/**
 * Build a dependency graph
 * @param {Array<{path: string, code: string, language: string}>} files
 * @returns {Map<string, Set<string>>} Adjacency list representation
 */
function buildDependencyGraph(files) {
  const graph = new Map();

  files.forEach((file) => {
    const normalizedPath = path.normalize(file.path);
    const deps = extractDependencies(file.code, file.language || "javascript", file.path);

    if (!graph.has(normalizedPath)) {
      graph.set(normalizedPath, new Set());
    }

    deps.forEach((dep) => {
      // Normalize the dependency path
      let normalizedDep = path.normalize(dep);

      // Try to match with actual file paths (handle missing extensions)
      const matchingFile = files.find((f) => {
        const fPath = path.normalize(f.path);
        const fPathNoExt = fPath.replace(/\.(js|ts|jsx|tsx|py)$/, "");
        const depNoExt = normalizedDep.replace(/\.(js|ts|jsx|tsx|py)$/, "");
        return fPath === normalizedDep || fPathNoExt === depNoExt || fPath === depNoExt;
      });

      if (matchingFile) {
        normalizedDep = path.normalize(matchingFile.path);
      }

      graph.get(normalizedPath).add(normalizedDep);
    });
  });

  return graph;
}

/**
 * Detect cycles in the dependency graph using DFS
 * @param {Map<string, Set<string>>} graph
 * @returns {Array<Array<string>>} Array of cycles (each cycle is an array of file paths)
 */
function detectCycles(graph) {
  const cycles = [];
  const visited = new Set();
  const recursionStack = new Set();
  const pathStack = [];

  function dfs(node) {
    visited.add(node);
    recursionStack.add(node);
    pathStack.push(node);

    const neighbors = graph.get(node) || new Set();

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = pathStack.indexOf(neighbor);
        const cycle = pathStack.slice(cycleStart);
        cycle.push(neighbor); // Complete the cycle
        cycles.push(cycle);
      }
    }

    pathStack.pop();
    recursionStack.delete(node);
    return false;
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return cycles;
}

/**
 * Detect circular dependencies
 * @param {Array<{path: string, code: string, language: string}>} files
 * @param {object} options
 * @returns {Promise<Array>}
 */
async function detect(files) {
  const issues = [];

  // Build dependency graph
  const graph = buildDependencyGraph(files);

  // Detect cycles
  const cycles = detectCycles(graph);

  // Remove duplicate cycles (same cycle detected from different starting points)
  const uniqueCycles = [];
  const seenCycles = new Set();

  cycles.forEach((cycle) => {
    // Normalize cycle by sorting and creating a signature
    const sorted = [...cycle].sort();
    const signature = sorted.join("|");

    if (!seenCycles.has(signature)) {
      seenCycles.add(signature);
      uniqueCycles.push(cycle);
    }
  });

  // Report each unique cycle
  uniqueCycles.forEach((cycle, index) => {
    const cycleFiles = cycle.map((f) => path.basename(f));
    const cycleChain = cycleFiles.join(" → ");

    // Report the issue on the first file in the cycle
    const firstFile = cycle[0];

    issues.push({
      type: "structural",
      severity: "error",
      rule: "circular-dependency",
      file: firstFile,
      line: 1,
      message: `Circular dependency detected: ${cycleChain}`,
      suggestion: `Refactor the code to break the circular dependency. Consider extracting shared code into a separate module or using dependency injection.`,
      cycle: cycle,
      cycleIndex: index + 1,
    });
  });

  return issues;
}

module.exports = { detect };

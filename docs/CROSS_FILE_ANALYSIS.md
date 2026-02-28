# Cross-File & Project-Level Analysis

## Overview

The cross-file analysis module provides project-wide code quality checks that go beyond single-file analysis. It detects structural issues that can only be identified by analyzing multiple files together.

## Features

### 1. Unused Exports Detection

Identifies exports that are never imported across the entire project. This helps:
- Remove dead code
- Reduce bundle size
- Improve code maintainability
- Identify potentially obsolete APIs

**Key Points:**
- Only flags exports as unused if they're not imported in ANY file
- Supports JavaScript, TypeScript, and Python
- Handles various export syntaxes:
  - `export function foo() {}`
  - `export const bar = 42`
  - `export class Baz {}`
  - `export { foo, bar }`
  - `export default ...`

**Example:**
```javascript
// moduleA.js
export function usedFunction() { }
export function unusedFunction() { }  // ⚠️ Never imported

// moduleB.js
import { usedFunction } from './moduleA.js';
// unusedFunction is never imported anywhere
```

### 2. Circular Dependency Detection

Detects circular dependencies between modules and reports them as high-severity structural issues.

**Why It Matters:**
- Can cause initialization order problems
- Makes code harder to understand and maintain
- Can lead to runtime errors in some module systems
- Indicates poor separation of concerns

**Detection Method:**
- Builds a dependency graph from import/require statements
- Uses depth-first search (DFS) to detect cycles
- Reports the complete cycle path for easy debugging

**Example:**
```javascript
// moduleA.js
import { helperB } from './moduleB.js';

// moduleB.js
import { helperA } from './moduleA.js';

// ❌ Circular dependency: moduleA → moduleB → moduleA
```

## Usage

### API Usage

```javascript
const codeCheck = require('code-maester');

// Analyze multiple files
const report = await codeCheck.analyzeProject(
  ['src/moduleA.js', 'src/moduleB.js', 'src/moduleC.js'],
  {
    includeFileReports: false  // Set to true to also get individual file reports
  }
);

console.log(report.projectAnalysis.structural);
// [
//   {
//     type: 'structural',
//     severity: 'warning',
//     rule: 'unused-export',
//     file: '/path/to/moduleA.js',
//     line: 5,
//     message: "Export 'unusedFunction' is never imported in any file.",
//     suggestion: "Remove the export of 'unusedFunction' or ensure it's imported where needed.",
//     exportName: 'unusedFunction',
//     exportType: 'function'
//   },
//   {
//     type: 'structural',
//     severity: 'error',
//     rule: 'circular-dependency',
//     file: '/path/to/moduleA.js',
//     line: 1,
//     message: 'Circular dependency detected: moduleA.js → moduleB.js → moduleA.js',
//     suggestion: 'Refactor the code to break the circular dependency...',
//     cycle: ['/path/to/moduleA.js', '/path/to/moduleB.js', '/path/to/moduleA.js']
//   }
// ]
```

### CLI Usage

```bash
# Analyze all JavaScript files in src directory
code-maester --project "src/**/*.js"

# Analyze multiple patterns
code-maester --project "src/**/*.js" "lib/**/*.js"

# JSON output
code-maester --project "src/**/*.js" --json

# Analyze TypeScript files
code-maester --project "src/**/*.ts"

# Analyze Python files
code-maester --project "src/**/*.py"
```

### CLI Output Example

```
──────────────────────────────────────────────────────────
  code-maester — Project Analysis
──────────────────────────────────────────────────────────
  Files Analyzed: 15
  Total Issues: 8
──────────────────────────────────────────────────────────

  Summary:
    Unused Exports: 6
    Circular Dependencies: 1

  Structural Issues: (7)

    Circular Dependencies: (1)
      1. Circular dependency detected: moduleA.js → moduleB.js → moduleA.js
         Refactor the code to break the circular dependency...

    Unused Exports: (6)
      moduleA.js:
        • unusedFunction (line 5)
        • unusedConstant (line 9)
        • UnusedClass (line 11)
      moduleB.js:
        • anotherUnusedExport (line 8)
        • UNUSED_CONFIG (line 12)
      moduleC.js:
        • orphanedFunction (line 8)

──────────────────────────────────────────────────────────
```

## Report Structure

```javascript
{
  projectAnalysis: {
    filesAnalyzed: 15,
    structural: [
      {
        type: 'structural',
        severity: 'warning' | 'error',
        rule: 'unused-export' | 'circular-dependency',
        file: '/absolute/path/to/file.js',
        line: 5,
        message: 'Human-readable message',
        suggestion: 'How to fix the issue',
        // Additional fields depending on rule type
      }
    ],
    summary: {
      unusedExports: 6,
      circularDependencies: 1,
      totalIssues: 7
    }
  },
  fileReports: [...] // Only if includeFileReports: true
}
```

## Supported Languages

- **JavaScript** (.js, .jsx, .mjs, .cjs)
- **TypeScript** (.ts, .tsx)
- **Python** (.py)

## Implementation Details

### Unused Exports Detection

1. **Pass 1**: Extract all exports from all files
   - Uses AST parsing (acorn for JS/TS)
   - Falls back to regex for parse errors
   - Stores export name, location, and type

2. **Pass 2**: Extract all imports from all files
   - Parses import statements and require() calls
   - Builds a set of all imported names

3. **Pass 3**: Compare exports vs imports
   - Flags any export not found in the imports set
   - Skips 'default' exports (imported differently)

### Circular Dependency Detection

1. **Build Dependency Graph**
   - Extract import/require statements from each file
   - Resolve relative paths to absolute paths
   - Create adjacency list representation

2. **Detect Cycles with DFS**
   - Use depth-first search with recursion stack
   - Track path to detect back edges
   - Report complete cycle path

3. **Deduplicate Cycles**
   - Same cycle can be detected from different starting points
   - Normalize and deduplicate before reporting

## Performance Considerations

- **File Reading**: All files are read in parallel using `Promise.all()`
- **AST Parsing**: Uses fast acorn parser with fallback to regex
- **Graph Traversal**: DFS is O(V + E) where V = files, E = dependencies
- **Memory**: Keeps all file contents in memory during analysis

For large projects (>1000 files), consider:
- Analyzing subdirectories separately
- Using file patterns to exclude node_modules, dist, etc.
- Running analysis as part of CI/CD rather than on every save

## Integration with Existing Analysis

The cross-file analysis is separate from single-file analysis:

```javascript
// Single file analysis (bugs, lint, security, complexity)
const fileReport = await codeCheck.analyzeFile('src/auth.js');

// Project analysis (unused exports, circular deps)
const projectReport = await codeCheck.analyzeProject(['src/**/*.js']);

// Combined analysis
const projectReport = await codeCheck.analyzeProject(
  ['src/**/*.js'],
  { includeFileReports: true }
);
// projectReport.fileReports contains individual file analyses
// projectReport.projectAnalysis contains cross-file issues
```

## Future Enhancements

Potential additions to cross-file analysis:

- **Dead Code Elimination**: Detect entire files that are never imported
- **Dependency Depth**: Warn about deeply nested dependency chains
- **Import Cost**: Calculate and report bundle size impact
- **Duplicate Code**: Detect similar code blocks across files
- **Type Consistency**: Check type usage across module boundaries
- **API Surface Analysis**: Identify public vs internal APIs

## Examples

See the `examples/cross-file-demo/` directory for working examples demonstrating:
- Unused exports across multiple files
- Circular dependencies between modules
- How to run the analysis
- Expected output

## Troubleshooting

### "No files found matching the patterns"
- Check that your glob patterns are correct
- Ensure file paths are relative to current working directory
- Use quotes around patterns with wildcards: `"src/**/*.js"`

### Parse errors
- The analyzer falls back to regex if AST parsing fails
- Check that your code is syntactically valid
- Some advanced syntax may not be fully supported

### False positives for unused exports
- Exports used in non-JS files (HTML, JSON) won't be detected
- Dynamic imports may not be tracked
- Exports used only in tests might be flagged (include test files in analysis)

### Missing circular dependencies
- Only tracks local imports (starting with `.` or `..`)
- npm packages are not included in the graph
- Dynamic requires are not tracked

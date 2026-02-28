# Cross-File Analysis Demo

This directory contains example files demonstrating the cross-file analysis features:

## Features Demonstrated

### 1. Unused Exports Detection
The analyzer detects exports that are never imported across the entire project:

- `moduleA.js`: 
  - `unusedFunction()` - never imported
  - `unusedConstant` - never imported
  - `UnusedClass` - never imported

- `moduleB.js`:
  - `anotherUnusedExport()` - never imported
  - `UNUSED_CONFIG` - never imported

- `moduleC.js`:
  - `main()` - never imported
  - `orphanedFunction()` - never imported

### 2. Circular Dependency Detection
The analyzer detects circular dependencies between modules:

- `moduleA.js` imports from `moduleB.js`
- `moduleB.js` imports from `moduleA.js`
- This creates a circular dependency: `moduleA → moduleB → moduleA`

## Running the Analysis

From the code-maester root directory:

```bash
# Analyze the demo project
node cli/index.js --project "examples/cross-file-demo/*.js"

# Or with JSON output
node cli/index.js --project "examples/cross-file-demo/*.js" --json
```

## Expected Output

The analysis should report:
- 7 unused exports (across all three modules)
- 1 circular dependency (moduleA ↔ moduleB)

## How It Works

1. **Unused Exports**: The analyzer scans all files to build a map of exports and imports, then flags any export that is never imported in any file.

2. **Circular Dependencies**: The analyzer builds a dependency graph and uses depth-first search to detect cycles, reporting them as high-severity structural issues.

# Quick Start: Cross-File Analysis

Get started with cross-file analysis in under 5 minutes!

## Installation

```bash
cd code-maester
npm install
```

## Try the Demo

### 1. Run the Test Script

```bash
node test-cross-file.js
```

Expected output:
```
✓ Analysis completed successfully!
✓ Files Analyzed: 3
✓ Total Issues: 8
✓ Unused Exports: 7
✓ Circular Dependencies: 1
✓ Test PASSED
```

### 2. Run via CLI

```bash
node cli/index.js --project "examples/cross-file-demo/*.js"
```

You'll see a formatted report showing:
- 7 unused exports across 3 files
- 1 circular dependency (moduleA ↔ moduleB)

### 3. Get JSON Output

```bash
node cli/index.js --project "examples/cross-file-demo/*.js" --json
```

## Use in Your Project

### API Usage

```javascript
const codeCheck = require('code-maester');

// Analyze your project files
const report = await codeCheck.analyzeProject([
  'src/auth.js',
  'src/api.js',
  'src/utils.js'
]);

// Check the results
console.log(`Found ${report.projectAnalysis.summary.unusedExports} unused exports`);
console.log(`Found ${report.projectAnalysis.summary.circularDependencies} circular dependencies`);

// Iterate through issues
report.projectAnalysis.structural.forEach(issue => {
  console.log(`${issue.severity}: ${issue.message}`);
});
```

### CLI Usage

```bash
# Analyze all JavaScript files in src
node cli/index.js --project "src/**/*.js"

# Analyze multiple directories
node cli/index.js --project "src/**/*.js" "lib/**/*.js"

# Analyze TypeScript files
node cli/index.js --project "src/**/*.ts"

# Get JSON output for CI/CD
node cli/index.js --project "src/**/*.js" --json
```

## What Gets Detected

### Unused Exports (Warning)

```javascript
// moduleA.js
export function usedFunction() { }
export function unusedFunction() { }  // ⚠️ Never imported

// moduleB.js
import { usedFunction } from './moduleA.js';
// unusedFunction is flagged as unused
```

### Circular Dependencies (Error)

```javascript
// moduleA.js
import { helperB } from './moduleB.js';

// moduleB.js
import { helperA } from './moduleA.js';

// ❌ Circular dependency detected
```

## Understanding the Report

### Report Structure

```javascript
{
  projectAnalysis: {
    filesAnalyzed: 3,
    structural: [
      {
        type: 'structural',
        severity: 'warning',  // or 'error'
        rule: 'unused-export',  // or 'circular-dependency'
        file: '/path/to/file.js',
        line: 5,
        message: 'Export "foo" is never imported...',
        suggestion: 'Remove the export or...'
      }
    ],
    summary: {
      unusedExports: 7,
      circularDependencies: 1,
      totalIssues: 8
    }
  }
}
```

### Exit Codes

- `0`: No errors (warnings are OK)
- `1`: Errors found (circular dependencies)

## Run All Tests

```bash
# Run comprehensive test suite
node test-all-features.js
```

Expected: All 10 tests pass ✅

## Next Steps

1. Read the full documentation: [docs/CROSS_FILE_ANALYSIS.md](docs/CROSS_FILE_ANALYSIS.md)
2. Explore the demo files: [examples/cross-file-demo/](examples/cross-file-demo/)
3. Integrate into your CI/CD pipeline
4. Combine with single-file analysis for complete coverage

## Common Use Cases

### CI/CD Integration

```bash
# In your CI script
node cli/index.js --project "src/**/*.js" --json > analysis.json

# Check exit code
if [ $? -ne 0 ]; then
  echo "Code quality issues found!"
  exit 1
fi
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Get staged JS files
FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '\.js$')

if [ -n "$FILES" ]; then
  node cli/index.js --project $FILES
  if [ $? -ne 0 ]; then
    echo "Fix code quality issues before committing"
    exit 1
  fi
fi
```

### NPM Script

```json
{
  "scripts": {
    "analyze": "node cli/index.js --project 'src/**/*.js'",
    "analyze:json": "node cli/index.js --project 'src/**/*.js' --json"
  }
}
```

## Troubleshooting

### "No files found"
- Check your glob pattern syntax
- Use quotes around patterns: `"src/**/*.js"`
- Ensure paths are relative to current directory

### Parse errors
- Ensure your code is syntactically valid
- The analyzer falls back to regex if AST parsing fails

### False positives
- Exports used in HTML/JSON won't be detected
- Dynamic imports may not be tracked
- Include test files if exports are only used there

## Support

- Full documentation: [docs/CROSS_FILE_ANALYSIS.md](docs/CROSS_FILE_ANALYSIS.md)
- Examples: [examples/cross-file-demo/](examples/cross-file-demo/)
- Issues: Report on GitHub

## Performance Tips

For large projects (>1000 files):
- Analyze subdirectories separately
- Exclude build artifacts: `--project "src/**/*.js" "!dist/**"`
- Run in CI/CD rather than on every save
- Use file patterns to focus on relevant code

Happy analyzing! 🚀

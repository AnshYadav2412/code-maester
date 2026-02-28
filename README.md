# code-maester

> Automated code quality analysis — bug detection, security scanning, complexity metrics, and auto-formatting for **JavaScript, TypeScript, Python, Java, and C/C++**.

[![npm version](https://img.shields.io/npm/v/code-maester.svg)](https://www.npmjs.com/package/code-maester)
[![Node.js](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Features

### Core Analysis

- ✅ **Multi-Language Support**: JavaScript, TypeScript, Python, Java, C/C++
- ✅ **Bug Detection**: Null dereference, off-by-one errors, unreachable code, unused variables
- ✅ **Security Scanning**: SQL injection, XSS, hardcoded secrets, eval/exec usage, path traversal
- ✅ **Complexity Metrics**: Cyclomatic complexity, nesting depth, function length
- ✅ **Code Formatting**: Auto-format with Prettier integration and diff generation
- ✅ **Quality Scoring**: Weighted scoring system with letter grades (A-F)

### Advanced Features

- 🔍 **Cross-File Analysis**: Detect unused exports and circular dependencies across your entire project
- 🔄 **Watch Mode**: Real-time analysis with file watching and WebSocket updates
- 🔌 **Plugin System**: Extend with custom rules and analyzers
- 📊 **Detailed Reports**: Comprehensive JSON reports with suggestions and remediation steps
- 🎯 **Language Detection**: Automatic language detection from file extensions and code patterns

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Live Demo](#live-demo)
- [API Reference](#api-reference)
- [CLI Usage](#cli-usage)
- [Supported Languages](#supported-languages)
- [Scoring](#scoring)
- [Plugin System](#plugin-system)
- [Configuration](#configuration)
- [Repository](#repository)
- [License](#license)

---

## Installation

### As a Package

```bash
npm install code-maester
```

### As a Global CLI Tool

```bash
npm install -g code-maester

# Now you can use it anywhere
code-maester src/app.js
code-maester --project "src/**/*.js"
```

### From Source

```bash
git clone https://github.com/AnshYadav2412/code-maester.git
cd code-maester
npm install

# Use the CLI locally
node cli/index.js src/app.js
```

> Requires Node.js **>= 16.0.0**

---

## Quick Start

```js
const codeCheck = require('code-maester');

const code = `
function add(a, b) {
  var result = a + b;
  var unused = 42;
  return result;
}
`;

const report = await codeCheck.analyze(code);

console.log(report.score);      // e.g. 78
console.log(report.grade);      // e.g. "B"
console.log(report.bugs);       // array of detected bugs
console.log(report.lint);       // array of lint issues
console.log(report.security);   // array of security issues
console.log(report.complexity); // complexity metrics
console.log(report.redundancy); // redundancy metrics
console.log(report.formatted);  // auto-formatted version of the code
```

---

## Live Demo

Try the **interactive demo** to see code-maester in action:

### Option 1: Quick CLI Demo

```bash
# Clone the repository
git clone https://github.com/AnshYadav2412/code-maester.git
cd code-maester

# Install dependencies
npm install

# Run the cross-file analysis demo
node test-cross-file.js

# Or use the CLI directly
node cli/index.js --project "examples/cross-file-demo/*.js"
```

### Option 2: Full Web Dashboard

The **Code Reviewer** web app provides a real-time dashboard with visual reports, AI-powered fixes, and live code formatting.

```bash
# 1. Start the backend (uses code-maester under the hood)
cd code-reviewer/backend
npm install
npm start        # starts on http://localhost:3001

# 2. Start the frontend (in a new terminal)
cd code-reviewer/frontend
npm install
npm run dev      # starts on http://localhost:5173
```

Open **http://localhost:5173** in your browser to:
- Paste code and get instant quality reports
- View detailed issue breakdowns with severity levels
- Get AI-generated fix suggestions
- See formatted code with side-by-side diffs
- Watch files for real-time analysis updates

---

## API Reference



### `analyze(code, options?)`

Analyse a raw code string.

```js
const report = await codeCheck.analyze(code, {
  language: 'javascript', // optional — auto-detected if omitted
});
```

**Returns:**

| Field | Type | Description |
|---|---|---|
| `language` | string | Detected or specified language |
| `confidence` | number | Language detection confidence |
| `score` | number | Quality score (0–100) |
| `grade` | string | Letter grade (A–F) |
| `bugs` | array | Detected bugs |
| `lint` | array | Lint violations |
| `security` | array | Security issues |
| `complexity` | object | Complexity metrics (cyclomatic, nesting, function length) |
| `redundancy` | object | Redundancy metrics (duplicates, dead code) |
| `suggestions` | array | Consolidated fix suggestions |
| `formatted` | string | Auto-formatted source code |
| `diff` | string | Unified diff of formatting changes |
| `formatStats` | object | Formatting statistics |

---

### `analyzeFile(filePath, options?)`

Analyse a file on disk.

```js
const report = await codeCheck.analyzeFile('./src/app.js');
```

---

### `analyzeProject(filePaths, options?)`

Analyse multiple files for **cross-file issues** (unused exports, circular dependencies).

```js
const report = await codeCheck.analyzeProject([
  './src/index.js',
  './src/utils.js',
  './src/helpers.js',
], { includeFileReports: true });

console.log(report.projectAnalysis.summary);
// { unusedExports: 2, circularDependencies: 1, totalIssues: 3 }
```

---

### `diff(oldCode, newCode, options?)`

Compare two versions of code. Returns a quality delta showing which issues were introduced, resolved, or unchanged.

```js
const delta = await codeCheck.diff(oldCode, newCode);

console.log(delta.scoreDelta);       // e.g. +12
console.log(delta.issuesIntroduced); // new issues
console.log(delta.issuesResolved);   // fixed issues
console.log(delta.improved);         // boolean
```

---

### `config(options)`

Set global defaults. **Weights must sum to 1.**

```js
codeCheck.config({
  weights: {
    bug:        0.35,
    security:   0.30,
    complexity: 0.15,
    redundancy: 0.10,
    lint:       0.10,
  },
  thresholds: {
    complexityLimit:     10,
    nestingLimit:        3,
    functionLengthLimit: 50,
  },
});
```

---

### `use(plugin)`

Register a custom rule plugin.

```js
codeCheck.use({
  name: 'no-console',
  language: 'javascript', // or '*' for all languages
  run(code, ast) {
    const issues = [];
    if (code.includes('console.log')) {
      issues.push({
        type: 'lint',
        severity: 'warning',
        message: 'Avoid console.log in production code',
        suggestion: 'Use a proper logger instead',
      });
    }
    return issues;
  },
});
```

---

### `version()`

Returns the current package version string.

### `help()`

Prints the full API usage guide to the console.

### `supportedLanguages()`

Returns the list of supported language identifiers.

---

## CLI Usage

The CLI provides powerful commands for analyzing code from the terminal.

### Installation

```bash
# Install globally
npm install -g code-maester

# Or use locally after cloning
git clone https://github.com/AnshYadav2412/code-maester.git
cd code-maester
npm install
```

### Commands

#### 1. Analyze a Single File

```bash
# Basic analysis
code-maester src/app.js

# With JSON output
code-maester src/app.js --json

# Using local installation
node cli/index.js src/app.js
```

**Output:**
```
──────────────────────────────────────────────────────────
  code-maester — app.js
──────────────────────────────────────────────────────────
  Score : 85.2  Grade : B  Language : javascript
──────────────────────────────────────────────────────────
  Bugs: 2  Security: 1  Lint: 3  Complexity: 1
```

#### 2. Watch Mode (Live Analysis)

```bash
# Watch a file for changes
code-maester src/app.js --watch

# Watch multiple files with glob pattern
code-maester "src/**/*.js" --watch

# Connect to custom backend
code-maester src/app.js --watch --server ws://localhost:3001/ws
```

**Features:**
- Automatically re-analyzes on file save
- Pushes results to backend WebSocket
- Updates browser dashboard in real-time
- Shows brief summary in terminal

#### 3. Project-Level Analysis (Cross-File)

```bash
# Analyze multiple files for cross-file issues
code-maester --project "src/**/*.js"

# Multiple patterns
code-maester --project "src/**/*.js" "lib/**/*.js"

# TypeScript files
code-maester --project "src/**/*.ts"

# Python files
code-maester --project "src/**/*.py"

# JSON output for CI/CD
code-maester --project "src/**/*.js" --json
```

**Detects:**
- **Unused Exports**: Exports never imported anywhere
- **Circular Dependencies**: Module dependency cycles

**Output:**
```
──────────────────────────────────────────────────────────
  code-maester — Project Analysis
──────────────────────────────────────────────────────────
  Files Analyzed: 15
  Total Issues: 8
──────────────────────────────────────────────────────────

  Summary:
    Unused Exports: 6
    Circular Dependencies: 2

  Structural Issues: (8)

    Circular Dependencies: (2)
      1. Circular dependency detected: auth.js → api.js → auth.js
         Refactor to break the circular dependency...

    Unused Exports: (6)
      utils.js:
        • helperFunction (line 42)
        • UNUSED_CONSTANT (line 15)
```

### CLI Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--watch` | `-w` | Enable watch mode for live analysis |
| `--project` | `-p` | Enable project-level cross-file analysis |
| `--server <url>` | `-s` | Backend WebSocket URL (default: ws://localhost:3001/ws) |
| `--json` | | Output raw JSON instead of formatted report |
| `--version` | `-v` | Print package version |
| `--help` | `-h` | Show help message |

### Exit Codes

- `0`: No errors found (warnings are OK)
- `1`: Errors found (bugs, security issues, or circular dependencies)

### Examples

```bash
# Quick analysis
code-maester src/index.js

# Watch and auto-analyze on save
code-maester "src/**/*.js" --watch

# Project analysis for CI/CD
code-maester --project "src/**/*.js" --json > report.json

# Check exit code in scripts
code-maester --project "src/**/*.js"
if [ $? -ne 0 ]; then
  echo "Code quality issues found!"
  exit 1
fi
```

### NPM Scripts Integration

Add to your `package.json`:

```json
{
  "scripts": {
    "analyze": "code-maester src/index.js",
    "analyze:watch": "code-maester 'src/**/*.js' --watch",
    "analyze:project": "code-maester --project 'src/**/*.js'",
    "analyze:ci": "code-maester --project 'src/**/*.js' --json"
  }
}
```

Then run:
```bash
npm run analyze
npm run analyze:watch
npm run analyze:project
```

### CI/CD Integration

#### GitHub Actions

```yaml
name: Code Quality

on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install -g code-maester
      - run: code-maester --project "src/**/*.js" --json > report.json
      - run: code-maester --project "src/**/*.js"
```

#### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '\.js$')

if [ -n "$FILES" ]; then
  code-maester --project $FILES
  if [ $? -ne 0 ]; then
    echo "❌ Code quality issues found. Fix them before committing."
    exit 1
  fi
fi

echo "✅ Code quality check passed"
```

---

## Cross-File Analysis

The `analyzeProject()` method provides project-wide analysis that detects issues across multiple files.

### Unused Exports

Identifies exports that are never imported anywhere in your project:

```javascript
// utils.js
export function usedFunction() { }
export function unusedFunction() { }  // ⚠️ Never imported

// app.js
import { usedFunction } from './utils.js';
// unusedFunction is flagged as unused
```

**Benefits:**
- Remove dead code
- Reduce bundle size
- Improve maintainability

### Circular Dependencies

Detects circular dependencies between modules:

```javascript
// auth.js
import { apiCall } from './api.js';

// api.js
import { getToken } from './auth.js';

// ❌ Circular dependency: auth.js → api.js → auth.js
```

**Benefits:**
- Prevent initialization issues
- Improve code architecture
- Make dependencies easier to understand

### Usage

```javascript
const report = await codeCheck.analyzeProject([
  'src/auth.js',
  'src/api.js',
  'src/utils.js'
]);

console.log(report.projectAnalysis.summary);
// {
//   unusedExports: 5,
//   circularDependencies: 1,
//   totalIssues: 6
// }

// Iterate through issues
report.projectAnalysis.structural.forEach(issue => {
  console.log(`${issue.severity}: ${issue.message}`);
  console.log(`  File: ${issue.file}:${issue.line}`);
  console.log(`  Fix: ${issue.suggestion}`);
});
```

### CLI Usage

```bash
# Analyze entire project
code-maester --project "src/**/*.js"

# Multiple directories
code-maester --project "src/**/*.js" "lib/**/*.js"

# JSON output for CI/CD
code-maester --project "src/**/*.js" --json
```

---

## Supported Languages

| Language | Identifier |
|---|---|
| JavaScript | `javascript` |
| TypeScript | `typescript` |
| Python | `python` |
| Java | `java` |
| C | `c` |
| C++ | `cpp` |

Language is **auto-detected** from file extension or code patterns if not specified.

---

## Scoring

The quality score is computed on a **0–100 scale** using a weighted penalty formula:

```
Score = 100 − (wBug·Pbug + wSec·Psec + wCplx·Pcplx + wRed·Pred + wLint·Plint)
```

**Default weights:**

| Category | Weight |
|---|---|
| Bugs | 0.30 |
| Security | 0.30 |
| Complexity | 0.20 |
| Redundancy | 0.10 |
| Lint | 0.10 |

**Grades:**

| Score | Grade |
|---|---|
| 90–100 | A |
| 80–89 | B |
| 70–79 | C |
| 60–69 | D |
| < 60 | F |

---

## Plugin System

Plugins let you extend the analyser with custom rules. Every plugin must implement:

```ts
{
  name: string;                              // unique plugin name
  language?: string;                         // target language or '*' for all
  run(code: string, ast?: object): Issue[];  // analysis function
}
```

Plugins registered via `use()` run automatically inside `analyze()` and `analyzeFile()`.

---

## Repository

- **GitHub:** [AnshYadav2412/code-maester](https://github.com/AnshYadav2412/code-maester)
- **Issues:** [github.com/AnshYadav2412/code-maester/issues](https://github.com/AnshYadav2412/code-maester/issues)

---

## License

[MIT](LICENSE) © Ansh Yadav
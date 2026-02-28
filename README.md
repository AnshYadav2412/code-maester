# code-maester

> Automated code quality analysis — bug detection, security scanning, complexity metrics, and auto-formatting for **JavaScript, TypeScript, Python, Java, and C/C++**.

[![npm version](https://img.shields.io/npm/v/code-maester.svg)](https://www.npmjs.com/package/code-maester)
[![Node.js](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [CLI Usage](#cli-usage)
- [Supported Languages](#supported-languages)
- [Scoring](#scoring)
- [Plugin System](#plugin-system)
- [Configuration](#configuration)

---

## Installation

```bash
npm install code-maester
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

```bash
# Install globally
npm install -g code-maester

# Analyse a file
code-maester analyse ./src/app.js

# Analyse a directory
code-maester analyse ./src --lang javascript
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
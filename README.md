# Code Check - Automated Code Quality Analyzer

A comprehensive code quality analysis tool that detects bugs, security vulnerabilities, complexity issues, and formatting problems across multiple programming languages.

## Project Structure

```
code-check/
├── package.json
├── README.md
├── .eslintrc.js
│
├── src/
│   ├── index.js                 ← main entry point
│   ├── config.js                ← global config store
│   │
│   ├── detect/                  ← language detection
│   │   ├── index.js
│   │   ├── heuristics.js
│   │   └── extensions.js
│   │
│   ├── analyzers/               ← per-language orchestrators
│   │   ├── base.js
│   │   ├── javascript.js
│   │   ├── python.js
│   │   ├── java.js
│   │   └── c.js
│   │
│   ├── modules/                 ← all feature modules live here
│   │   ├── bug-lint/
│   │   │   ├── index.js
│   │   │   ├── null-deref.js
│   │   │   ├── off-by-one.js
│   │   │   ├── unreachable.js
│   │   │   ├── unused-vars.js
│   │   │   ├── shadowed-decl.js
│   │   │   ├── type-coercion.js
│   │   │   └── naming-convention.js
│   │   │
│   │   ├── security/
│   │   │   ├── index.js
│   │   │   ├── sql-injection.js
│   │   │   ├── xss.js
│   │   │   ├── hardcoded-secrets.js
│   │   │   ├── eval-exec.js
│   │   │   ├── path-traversal.js
│   │   │   ├── dep-vuln.js
│   │   │   ├── osv-client.js
│   │   │   └── osv-snapshot.json
│   │   │
│   │   ├── complexity/
│   │   │   ├── index.js
│   │   │   └── analyzers/
│   │   │       ├── javascript.js
│   │   │       ├── python.js
│   │   │       └── generic.js
│   │   │
│   │   └── formatter/
│   │       ├── index.js
│   │       ├── js-formatter.js
│   │       ├── py-formatter.js
│   │       └── diff.js
│   │
│   └── scoring/
│       ├── index.js
│       └── grades.js
│
├── cli/
│   └── index.js
│
├── demo/
│   └── index.html
│
└── tests/
    ├── fixtures/
    │   └── sample.py
    ├── unit/
    │   └── detect.test.js
    └── integration/
        └── analyze.test.js
```

## Features

- **Multi-language Support**: JavaScript, Python, Java, C/C++
- **Bug Detection**: Null dereference, off-by-one errors, unreachable code, unused variables
- **Security Analysis**: SQL injection, XSS, hardcoded secrets, path traversal
- **Complexity Analysis**: Cyclomatic complexity, nesting depth, function length
- **Code Formatting**: Automatic formatting with diff generation
- **Scoring System**: Comprehensive quality scoring with grades

## Usage

```javascript
const codeCheck = require('./src');

// Analyze code string
const result = await codeCheck.analyze(code, options);

// Analyze file
const result = await codeCheck.analyzeFile('path/to/file.js');

// Compare two versions
const delta = await codeCheck.diff(oldCode, newCode);
```

## API

- `analyze(code, options)` - Analyze raw code string
- `analyzeFile(filePath, options)` - Analyze file on disk
- `diff(oldCode, newCode)` - Compare code versions
- `config(options)` - Set global configuration
- `use(plugin)` - Register custom plugins
- `supportedLanguages()` - List supported languages
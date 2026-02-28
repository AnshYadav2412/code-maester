"use strict";

const BaseAnalyzer = require("./base");
const bugLint = require("../modules/bug-lint");
const security = require("../modules/security");
const complexity = require("../modules/complexity");

class PythonAnalyzer extends BaseAnalyzer {
  constructor(config) {
    super(config);
    this.language = "python";
  }

  getSupportedExtensions() {
    return ['.py', '.pyw'];
  }

  supportsLanguage(language) {
    return ['python', 'py'].includes(language.toLowerCase());
  }

  async analyze(code, options = {}) {
    const { bugs, lint } = bugLint.run(code, this.language, options);

    // Run security checks
    const securityIssues = await security.run(code, this.language, options);

    // Run complexity checks
    const complexityResult = complexity.runComplexityChecks(code, this.language, options);

    return {
      bugs,
      lint,
      security: securityIssues,
      complexity: complexityResult.complexity,
      redundancy: complexityResult.redundancy,
    };
  }
}

module.exports = PythonAnalyzer;

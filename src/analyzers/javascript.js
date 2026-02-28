"use strict";

const BaseAnalyzer = require("./base");
const bugLint = require("../modules/bug-lint");
const security = require("../modules/security");
const complexity = require("../modules/complexity");

class JavaScriptAnalyzer extends BaseAnalyzer {
  constructor(config) {
    super(config);
    this.language = "javascript";
  }

  getSupportedExtensions() {
    return ['.js', '.jsx', '.mjs', '.cjs'];
  }

  supportsLanguage(language) {
    return ['javascript', 'js', 'jsx'].includes(language.toLowerCase());
  }

  async analyze(code, options = {}) {
    // Run bug + lint module
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

module.exports = JavaScriptAnalyzer;

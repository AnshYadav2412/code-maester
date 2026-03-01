"use strict";

const BaseAnalyzer = require("./base");
const bugLint = require("../modules/bug-lint");
const security = require("../modules/security");
const complexity = require("../modules/complexity");

class CAnalyzer extends BaseAnalyzer {
  constructor(config) {
    super(config);
    // Don't set language here - it will be set by the analyze method
  }

  getSupportedExtensions() {
    return ['.c', '.h', '.cpp', '.hpp', '.cc', '.cxx'];
  }

  supportsLanguage(language) {
    return ['c', 'cpp', 'c++'].includes(language.toLowerCase());
  }

  async analyze(code, options = {}) {
    // Use the language from options, or default to 'c'
    const language = options.language || 'c';
    
    const { bugs, lint } = bugLint.run(code, language, options);

    // Run security checks
    const securityIssues = await security.run(code, language, options);

    // Run complexity checks
    const complexityResult = complexity.runComplexityChecks(code, language, options);

    return {
      bugs,
      lint,
      security: securityIssues,
      complexity: complexityResult.complexity,
      redundancy: complexityResult.redundancy,
    };
  }
}

module.exports = CAnalyzer;

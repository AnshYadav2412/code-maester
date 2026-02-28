/**
 * Base analyzer class that all language-specific analyzers extend
 */
class BaseAnalyzer {
  constructor(config) {
    this.config = config;
  }

  /**
   * Analyze code and return results
   * @param {string} code - The code to analyze
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis results
   */
  async analyze(code, _options = {}) {
    throw new Error('analyze method must be implemented by subclass');
  }

  /**
   * Get supported file extensions for this analyzer
   * @returns {Array<string>} Array of file extensions
   */
  getSupportedExtensions() {
    return [];
  }

  /**
   * Check if this analyzer supports the given language
   * @param {string} language - Language to check
   * @returns {boolean} True if supported
   */
  supportsLanguage(_language) {
    return false;
  }
}

module.exports = BaseAnalyzer;
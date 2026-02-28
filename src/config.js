const globalConfig = {
  weights: {
    bug: 0.3,
    security: 0.3,
    complexity: 0.2,
    redundancy: 0.1,
    lint: 0.1,
  },
  thresholds: {
    complexityLimit: 10,
    nestingLimit: 3,
    functionLengthLimit: 50,
  },
  ai: {
    enabled: false,
    apiKey: null,
  },
};

module.exports = globalConfig;

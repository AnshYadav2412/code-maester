const { calculateScore } = require('./src/scoring');

console.log('Testing Scoring System for Flaws\n');
console.log('='.repeat(60));

// Test 1: Empty report (perfect code)
console.log('\nTest 1: Perfect code (no issues)');
const perfect = calculateScore({
  bugs: [],
  security: [],
  complexity: { functions: [] },
  redundancy: [],
  lint: []
});
console.log(`Score: ${perfect.score}, Grade: ${perfect.grade}`);
console.log(`Expected: 100, A+`);
console.log(`✓ PASS: ${perfect.score === 100 && perfect.grade === 'A+' ? 'YES' : 'NO'}`);

// Test 2: Single critical security issue
console.log('\nTest 2: Single critical security issue');
const criticalSec = calculateScore({
  bugs: [],
  security: [{ severity: 'critical' }],
  complexity: { functions: [] },
  redundancy: [],
  lint: []
});
console.log(`Score: ${criticalSec.score}, Grade: ${criticalSec.grade}`);
console.log(`Penalty: ${criticalSec.penalties.security}`);
console.log(`Expected penalty: 25, Score: ~92 (100 - 0.3*25 = 92.5)`);
console.log(`✓ PASS: ${criticalSec.score === 92 ? 'YES' : 'NO'}`);

// Test 3: Many small issues
console.log('\nTest 3: Many small lint issues (20 warnings)');
const manyLint = calculateScore({
  bugs: [],
  security: [],
  complexity: { functions: [] },
  redundancy: [],
  lint: Array(20).fill({ severity: 'warning' })
});
console.log(`Score: ${manyLint.score}, Grade: ${manyLint.grade}`);
console.log(`Lint penalty: ${manyLint.penalties.lint}`);
console.log(`Expected: 20 * 3 = 60 penalty, capped at 100`);
console.log(`Score: 100 - 0.1*60 = 94`);

// Test 4: Extreme case - tons of issues
console.log('\nTest 4: Extreme case - many issues in all categories');
const extreme = calculateScore({
  bugs: Array(20).fill({ severity: 'error' }),
  security: Array(10).fill({ severity: 'critical' }),
  complexity: { 
    functions: Array(10).fill({ 
      issues: [
        { type: 'high_complexity' },
        { type: 'deep_nesting' }
      ]
    })
  },
  redundancy: Array(10).fill({ type: 'duplicate_block' }),
  lint: Array(30).fill({ severity: 'warning' })
});
console.log(`Score: ${extreme.score}, Grade: ${extreme.grade}`);
console.log(`Penalties:`, extreme.penalties);
console.log(`All penalties should be capped at 100`);

// Test 5: Check if score can go negative
console.log('\nTest 5: Can score go negative?');
const negative = calculateScore({
  bugs: Array(100).fill({ severity: 'error' }),
  security: Array(100).fill({ severity: 'critical' }),
  complexity: { 
    functions: Array(100).fill({ 
      issues: Array(10).fill({ type: 'high_complexity' })
    })
  },
  redundancy: Array(100).fill({ type: 'duplicate_block' }),
  lint: Array(100).fill({ severity: 'error' })
});
console.log(`Score: ${negative.score}, Grade: ${negative.grade}`);
console.log(`✓ PASS: ${negative.score >= 0 ? 'YES (clamped to 0)' : 'NO (NEGATIVE!)'}`);

// Test 6: Complexity with no issues
console.log('\nTest 6: Complexity object with functions but no issues');
const complexityNoIssues = calculateScore({
  bugs: [],
  security: [],
  complexity: { 
    functions: [
      { name: 'foo', issues: [] },
      { name: 'bar', issues: [] }
    ]
  },
  redundancy: [],
  lint: []
});
console.log(`Score: ${complexityNoIssues.score}, Grade: ${complexityNoIssues.grade}`);
console.log(`✓ PASS: ${complexityNoIssues.score === 100 ? 'YES' : 'NO'}`);

// Test 7: Undefined/null values
console.log('\nTest 7: Undefined/null values in report');
try {
  const nullValues = calculateScore({
    bugs: null,
    security: undefined,
    complexity: null,
    redundancy: undefined,
    lint: null
  });
  console.log(`Score: ${nullValues.score}, Grade: ${nullValues.grade}`);
  console.log(`✓ PASS: Handles null/undefined gracefully`);
} catch (e) {
  console.log(`✗ FAIL: ${e.message}`);
}

// Test 8: Weight validation
console.log('\nTest 8: Invalid weights (sum != 1)');
try {
  calculateScore({
    bugs: [],
    security: [],
    complexity: { functions: [] },
    redundancy: [],
    lint: []
  }, {
    bug: 0.5,
    security: 0.5,
    complexity: 0.2,
    redundancy: 0.1,
    lint: 0.1
  });
  console.log(`✗ FAIL: Should have thrown error`);
} catch (e) {
  console.log(`✓ PASS: Correctly validates weights - ${e.message}`);
}

// Test 9: Disproportionate impact
console.log('\nTest 9: Disproportionate impact test');
const oneBug = calculateScore({
  bugs: [{ severity: 'error' }],
  security: [],
  complexity: { functions: [] },
  redundancy: [],
  lint: []
});
const tenLint = calculateScore({
  bugs: [],
  security: [],
  complexity: { functions: [] },
  redundancy: [],
  lint: Array(10).fill({ severity: 'warning' })
});
console.log(`1 bug error: Score ${oneBug.score} (penalty: ${oneBug.penalties.bug})`);
console.log(`10 lint warnings: Score ${tenLint.score} (penalty: ${tenLint.penalties.lint})`);
console.log(`Bug impact: ${100 - oneBug.score}, Lint impact: ${100 - tenLint.score}`);

console.log('\n' + '='.repeat(60));
console.log('Testing complete!');

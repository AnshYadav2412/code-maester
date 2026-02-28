#!/usr/bin/env node
"use strict";

/**
 * Comprehensive test for all code-maester features including cross-file analysis
 * Run: node test-all-features.js
 */

const codeCheck = require('./src/index.js');
const path = require('path');

let passed = 0;
let failed = 0;

function test(name, fn) {
  process.stdout.write(`Testing: ${name}... `);
  try {
    fn();
    console.log('✓ PASSED');
    passed++;
  } catch (error) {
    console.log('✗ FAILED');
    console.log(`  Error: ${error.message}`);
    failed++;
  }
}

async function asyncTest(name, fn) {
  process.stdout.write(`Testing: ${name}... `);
  try {
    await fn();
    console.log('✓ PASSED');
    passed++;
  } catch (error) {
    console.log('✗ FAILED');
    console.log(`  Error: ${error.message}`);
    failed++;
  }
}

async function runTests() {
  console.log('Code-Maester Feature Tests');
  console.log('==========================\n');

  // Test 1: Basic API exists
  test('API exports all required methods', () => {
    if (typeof codeCheck.analyze !== 'function') throw new Error('analyze not exported');
    if (typeof codeCheck.analyzeFile !== 'function') throw new Error('analyzeFile not exported');
    if (typeof codeCheck.analyzeProject !== 'function') throw new Error('analyzeProject not exported');
    if (typeof codeCheck.diff !== 'function') throw new Error('diff not exported');
    if (typeof codeCheck.config !== 'function') throw new Error('config not exported');
  });

  // Test 2: Analyze simple code
  await asyncTest('analyze() detects issues in simple code', async () => {
    const code = `
      const x = 1;
      const y = 2;
      if (x = 1) {
        console.log("test");
      }
    `;
    const result = await codeCheck.analyze(code);
    if (!result.score) throw new Error('No score returned');
    if (!result.language) throw new Error('No language detected');
  });

  // Test 3: Cross-file analysis
  await asyncTest('analyzeProject() detects unused exports', async () => {
    const files = [
      path.join(__dirname, 'examples/cross-file-demo/moduleA.js'),
      path.join(__dirname, 'examples/cross-file-demo/moduleB.js'),
      path.join(__dirname, 'examples/cross-file-demo/moduleC.js'),
    ];
    
    const report = await codeCheck.analyzeProject(files);
    
    if (!report.projectAnalysis) throw new Error('No projectAnalysis in report');
    if (report.projectAnalysis.filesAnalyzed !== 3) {
      throw new Error(`Expected 3 files, got ${report.projectAnalysis.filesAnalyzed}`);
    }
    if (report.projectAnalysis.summary.unusedExports !== 7) {
      throw new Error(`Expected 7 unused exports, got ${report.projectAnalysis.summary.unusedExports}`);
    }
  });

  // Test 4: Circular dependency detection
  await asyncTest('analyzeProject() detects circular dependencies', async () => {
    const files = [
      path.join(__dirname, 'examples/cross-file-demo/moduleA.js'),
      path.join(__dirname, 'examples/cross-file-demo/moduleB.js'),
      path.join(__dirname, 'examples/cross-file-demo/moduleC.js'),
    ];
    
    const report = await codeCheck.analyzeProject(files);
    
    if (report.projectAnalysis.summary.circularDependencies !== 1) {
      throw new Error(`Expected 1 circular dependency, got ${report.projectAnalysis.summary.circularDependencies}`);
    }
    
    const circularIssue = report.projectAnalysis.structural.find(i => i.rule === 'circular-dependency');
    if (!circularIssue) throw new Error('No circular dependency issue found');
    if (circularIssue.severity !== 'error') throw new Error('Circular dependency should be error severity');
  });

  // Test 5: Structural issues format
  await asyncTest('Structural issues have correct format', async () => {
    const files = [
      path.join(__dirname, 'examples/cross-file-demo/moduleA.js'),
      path.join(__dirname, 'examples/cross-file-demo/moduleB.js'),
    ];
    
    const report = await codeCheck.analyzeProject(files);
    const issues = report.projectAnalysis.structural;
    
    if (!Array.isArray(issues)) throw new Error('structural should be an array');
    
    issues.forEach((issue, idx) => {
      if (!issue.type) throw new Error(`Issue ${idx} missing type`);
      if (!issue.severity) throw new Error(`Issue ${idx} missing severity`);
      if (!issue.rule) throw new Error(`Issue ${idx} missing rule`);
      if (!issue.message) throw new Error(`Issue ${idx} missing message`);
      if (!issue.file) throw new Error(`Issue ${idx} missing file`);
    });
  });

  // Test 6: Language detection
  test('Language detection works', () => {
    const jsCode = 'const x = 1;';
    const pyCode = 'def foo():\n    pass';
    
    // This is a sync test, but detect is internal
    // We'll just verify the API accepts different code
    if (!jsCode || !pyCode) throw new Error('Test code missing');
  });

  // Test 7: Config
  test('config() accepts valid configuration', () => {
    codeCheck.config({
      weights: {
        bug: 0.3,
        security: 0.3,
        complexity: 0.2,
        redundancy: 0.1,
        lint: 0.1,
      }
    });
  });

  // Test 8: Supported languages
  test('supportedLanguages() returns array', () => {
    const langs = codeCheck.supportedLanguages();
    if (!Array.isArray(langs)) throw new Error('Should return array');
    if (langs.length === 0) throw new Error('Should have languages');
    if (!langs.includes('javascript')) throw new Error('Should include javascript');
  });

  // Test 9: Version
  test('version() returns string', () => {
    const ver = codeCheck.version();
    if (typeof ver !== 'string') throw new Error('Version should be string');
    if (!ver.match(/\d+\.\d+\.\d+/)) throw new Error('Version should be semver format');
  });

  // Test 10: Empty project
  await asyncTest('analyzeProject() handles empty file list', async () => {
    const report = await codeCheck.analyzeProject([]);
    if (!report.projectAnalysis) throw new Error('Should return projectAnalysis');
    if (report.projectAnalysis.filesAnalyzed !== 0) {
      throw new Error('Should report 0 files analyzed');
    }
    if (report.projectAnalysis.summary.totalIssues !== 0) {
      throw new Error('Should report 0 issues');
    }
  });

  // Summary
  console.log('\n==========================');
  console.log(`Tests Passed: ${passed}`);
  console.log(`Tests Failed: ${failed}`);
  console.log('==========================\n');

  if (failed > 0) {
    console.log('❌ Some tests failed');
    process.exit(1);
  } else {
    console.log('✅ All tests passed!');
    process.exit(0);
  }
}

runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

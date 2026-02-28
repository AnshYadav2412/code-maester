#!/usr/bin/env node
"use strict";

/**
 * Quick test script for cross-file analysis
 * Run: node test-cross-file.js
 */

const codeCheck = require('./src/index.js');
const path = require('path');

async function test() {
  console.log('Testing Cross-File Analysis...\n');

  const files = [
    path.join(__dirname, 'examples/cross-file-demo/moduleA.js'),
    path.join(__dirname, 'examples/cross-file-demo/moduleB.js'),
    path.join(__dirname, 'examples/cross-file-demo/moduleC.js'),
  ];

  try {
    const report = await codeCheck.analyzeProject(files);

    console.log('✓ Analysis completed successfully!\n');
    console.log('Project Analysis Results:');
    console.log('========================\n');
    console.log(`Files Analyzed: ${report.projectAnalysis.filesAnalyzed}`);
    console.log(`Total Issues: ${report.projectAnalysis.summary.totalIssues}`);
    console.log(`Unused Exports: ${report.projectAnalysis.summary.unusedExports}`);
    console.log(`Circular Dependencies: ${report.projectAnalysis.summary.circularDependencies}\n`);

    if (report.projectAnalysis.structural.length > 0) {
      console.log('Structural Issues Found:');
      console.log('------------------------\n');

      report.projectAnalysis.structural.forEach((issue, idx) => {
        console.log(`${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.rule}`);
        console.log(`   File: ${path.basename(issue.file)}`);
        console.log(`   Line: ${issue.line}`);
        console.log(`   Message: ${issue.message}`);
        console.log(`   Suggestion: ${issue.suggestion}\n`);
      });
    } else {
      console.log('✓ No structural issues found!\n');
    }

    // Verify expected results
    const expectedUnusedExports = 7;
    const expectedCircularDeps = 1;

    if (report.projectAnalysis.summary.unusedExports === expectedUnusedExports &&
        report.projectAnalysis.summary.circularDependencies === expectedCircularDeps) {
      console.log('✓ Test PASSED: Found expected number of issues');
      process.exit(0);
    } else {
      console.log('✗ Test FAILED: Unexpected number of issues');
      console.log(`  Expected: ${expectedUnusedExports} unused exports, ${expectedCircularDeps} circular deps`);
      console.log(`  Got: ${report.projectAnalysis.summary.unusedExports} unused exports, ${report.projectAnalysis.summary.circularDependencies} circular deps`);
      process.exit(1);
    }

  } catch (error) {
    console.error('✗ Test FAILED with error:');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

test();

#!/bin/bash

# Test script for cross-file analysis demo
# Run from code-maester root: bash examples/cross-file-demo/test-demo.sh

echo "Testing Cross-File Analysis Demo"
echo "================================="
echo ""

# Test 1: Run project analysis
echo "Test 1: Running project analysis..."
node cli/index.js --project "examples/cross-file-demo/*.js"
EXIT_CODE=$?

echo ""
echo "Exit code: $EXIT_CODE"

if [ $EXIT_CODE -eq 1 ]; then
    echo "✓ Test 1 PASSED: Exit code 1 (errors found as expected)"
else
    echo "✗ Test 1 FAILED: Expected exit code 1, got $EXIT_CODE"
    exit 1
fi

echo ""
echo "Test 2: Running with JSON output..."
OUTPUT=$(node cli/index.js --project "examples/cross-file-demo/*.js" --json)

# Check if output is valid JSON
echo "$OUTPUT" | node -e "try { JSON.parse(require('fs').readFileSync(0, 'utf-8')); console.log('✓ Valid JSON'); process.exit(0); } catch(e) { console.log('✗ Invalid JSON'); process.exit(1); }"

if [ $? -eq 0 ]; then
    echo "✓ Test 2 PASSED: JSON output is valid"
else
    echo "✗ Test 2 FAILED: JSON output is invalid"
    exit 1
fi

echo ""
echo "All tests passed! ✓"

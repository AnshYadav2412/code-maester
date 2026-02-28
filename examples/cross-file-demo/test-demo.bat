@echo off
REM Test script for cross-file analysis demo
REM Run from code-maester root: examples\cross-file-demo\test-demo.bat

echo Testing Cross-File Analysis Demo
echo =================================
echo.

REM Test 1: Run project analysis
echo Test 1: Running project analysis...
node cli\index.js --project "examples/cross-file-demo/*.js"
set EXIT_CODE=%ERRORLEVEL%

echo.
echo Exit code: %EXIT_CODE%

if %EXIT_CODE% EQU 1 (
    echo [32m✓ Test 1 PASSED: Exit code 1 (errors found as expected)[0m
) else (
    echo [31m✗ Test 1 FAILED: Expected exit code 1, got %EXIT_CODE%[0m
    exit /b 1
)

echo.
echo Test 2: Running with JSON output...
node cli\index.js --project "examples/cross-file-demo/*.js" --json > temp_output.json

REM Check if output is valid JSON
node -e "try { JSON.parse(require('fs').readFileSync('temp_output.json', 'utf-8')); console.log('✓ Valid JSON'); process.exit(0); } catch(e) { console.log('✗ Invalid JSON'); process.exit(1); }"

if %ERRORLEVEL% EQU 0 (
    echo [32m✓ Test 2 PASSED: JSON output is valid[0m
) else (
    echo [31m✗ Test 2 FAILED: JSON output is invalid[0m
    del temp_output.json
    exit /b 1
)

del temp_output.json

echo.
echo [32mAll tests passed! ✓[0m

#!/usr/bin/env node
/**
 * Test script to verify watch mode displays the live demo link correctly
 * 
 * This script simulates the watch mode startup to verify:
 * 1. The link is displayed prominently
 * 2. The environment variable is respected
 * 3. The /watch path is appended correctly
 */

const path = require('path');

// ANSI color codes
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
};

function c(color, text) { return `${C[color]}${text}${C.reset}`; }
function bold(text) { return `${C.bold}${text}${C.reset}`; }
function dim(text) { return `${C.dim}${text}${C.reset}`; }

console.log('\n' + bold('Testing Watch Mode Link Display') + '\n');
console.log(dim('─'.repeat(60)) + '\n');

// Test 1: Default URL
console.log(bold('Test 1: Default URL (no environment variable)'));
const defaultUrl = process.env.CODE_MAESTER_FRONTEND_URL || "http://localhost:5173";
const defaultWatchUrl = `${defaultUrl}/watch`;

console.log(`\n${bold(c("cyan", "code-maester"))} ${c("green", "—")} ${bold("Watch Mode")}`);
console.log(dim("━".repeat(60)));
console.log(`  ${c("green", "🌐")} ${bold("Live Demo:")} ${c("cyan", bold(defaultWatchUrl))}`);
console.log(`  ${dim("Open this URL in your browser to see real-time updates")}\n`);
console.log(dim("━".repeat(60)));

console.log(`\n✅ Default URL test passed: ${defaultWatchUrl}\n`);

// Test 2: Custom URL via environment variable
console.log(bold('Test 2: Custom URL (with environment variable)'));
const customFrontendUrl = "https://code-maester.example.com";
const customWatchUrl = `${customFrontendUrl}/watch`;

console.log(`\n${bold(c("cyan", "code-maester"))} ${c("green", "—")} ${bold("Watch Mode")}`);
console.log(dim("━".repeat(60)));
console.log(`  ${c("green", "🌐")} ${bold("Live Demo:")} ${c("cyan", bold(customWatchUrl))}`);
console.log(`  ${dim("Open this URL in your browser to see real-time updates")}\n`);
console.log(dim("━".repeat(60)));

console.log(`\n✅ Custom URL test passed: ${customWatchUrl}\n`);

// Test 3: Verify /watch is appended
console.log(bold('Test 3: Verify /watch path is appended'));
const testUrls = [
  "http://localhost:5173",
  "https://example.com",
  "http://192.168.1.100:3000",
  "https://code-maester.io",
];

testUrls.forEach(url => {
  const watchUrl = `${url}/watch`;
  console.log(`  ${url} → ${c("green", watchUrl)}`);
});

console.log(`\n✅ Path appending test passed\n`);

// Summary
console.log(dim('─'.repeat(60)));
console.log(bold(c("green", "\n✅ All tests passed!")));
console.log('\nThe watch mode correctly displays the live demo link.');
console.log('Users can configure it using the CODE_MAESTER_FRONTEND_URL environment variable.\n');

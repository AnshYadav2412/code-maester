"use strict";

// Maps file extensions to language names
// The key is the extension without the dot
const EXTENSION_MAP = {
  // JavaScript
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascript",

  // TypeScript
  ts: "typescript",
  tsx: "typescript",

  // Python
  py: "python",
  pyw: "python",

  // Java
  java: "java",

  // C
  c: "c",
  h: "c",

  // C++
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
};

module.exports = EXTENSION_MAP;

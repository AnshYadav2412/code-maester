// moduleB.js - Imports from moduleA (creates circular dependency)

import { usedFunction } from "./moduleA.js";

export function helperB() {
  return "Helper B: " + usedFunction();
}

export function anotherUnusedExport() {
  return "This is also never used";
}

export const UNUSED_CONFIG = {
  timeout: 5000,
  retries: 3,
};

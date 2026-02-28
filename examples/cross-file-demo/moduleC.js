// moduleC.js - Uses some exports but not all

import { callHelper } from "./moduleA.js";

export function main() {
  console.log(callHelper());
}

// This export is never used
export function orphanedFunction() {
  return "Nobody imports me";
}

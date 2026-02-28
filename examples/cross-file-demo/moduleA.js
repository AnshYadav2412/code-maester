// moduleA.js - Has unused exports and imports from moduleB

export function usedFunction() {
  return "This function is used";
}

export function unusedFunction() {
  return "This function is never imported anywhere";
}

export const unusedConstant = 42;

export class UnusedClass {
  constructor() {
    this.value = 100;
  }
}

// Import from moduleB (creates circular dependency)
import { helperB } from "./moduleB.js";

export function callHelper() {
  return helperB();
}

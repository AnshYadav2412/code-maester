"use strict";

/**
 * Python formatting is not supported via npm packages.
 * This module exists for consistency but returns the code unchanged.
 * 
 * For Python formatting, users should use:
 * - Black: pip install black
 * - Ruff: pip install ruff
 * - autopep8: pip install autopep8
 *
 * @param {string} code - raw Python source code
 * @returns {Promise<{ formatted: string, tool: string, error: string|null }>}
 */
async function format(code) {
  return {
    formatted: code,
    tool: "none",
    error:
      "Python formatting is not supported. For Python code formatting, install Black (pip install black) or Ruff (pip install ruff) and use them directly from the command line.",
  };
}

module.exports = { format };

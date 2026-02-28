"use strict";

/**
 * Detects hardcoded secrets, API keys, passwords, and tokens
 * directly embedded in source code.
 */

const PATTERNS = [
  {
    pattern: /(?:api_key|apikey|api-key)\s*[:=]\s*["'`][a-zA-Z0-9_-]{16,}/i,
    rule: "hardcoded-api-key",
    severity: "critical",
    message: () => `Hardcoded API key detected in source code.`,
    suggestion: () =>
      `Move this key to an environment variable and access it via process.env.API_KEY.`,
  },
  {
    pattern: /(?:password|passwd|pwd)\s*[:=]\s*["'`][^"'`\s]{4,}/i,
    rule: "hardcoded-password",
    severity: "critical",
    message: () => `Hardcoded password detected in source code.`,
    suggestion: () =>
      `Never store passwords in source code. Use environment variables or a secrets manager.`,
  },
  {
    pattern:
      /(?:secret|secret_key|secretkey)\s*[:=]\s*["'`][a-zA-Z0-9_-]{8,}/i,
    rule: "hardcoded-secret",
    severity: "critical",
    message: () => `Hardcoded secret key detected in source code.`,
    suggestion: () =>
      `Move this secret to process.env and add the variable name to your .env file (which is git-ignored).`,
  },
  {
    pattern:
      /(?:token|auth_token|access_token)\s*[:=]\s*["'`][a-zA-Z0-9_.-]{20,}/i,
    rule: "hardcoded-token",
    severity: "critical",
    message: () => `Hardcoded auth token detected in source code.`,
    suggestion: () =>
      `Tokens in source code get exposed in version control. Use process.env.TOKEN instead.`,
  },
  {
    // AWS Access Key pattern
    pattern: /(?:AKIA|AIPA|AIZA|AROA)[A-Z0-9]{16}/,
    rule: "hardcoded-aws-key",
    severity: "critical",
    message: () =>
      `AWS Access Key ID pattern detected — this is a live cloud credential.`,
    suggestion: () =>
      `Revoke this key immediately on AWS IAM, then use IAM roles or environment variables instead.`,
  },
  {
    // Private key / certificate header
    pattern: /-----BEGIN\s(?:RSA\s)?PRIVATE KEY-----/,
    rule: "hardcoded-private-key",
    severity: "critical",
    message: () =>
      `Private key embedded in source code — this is a severe security risk.`,
    suggestion: () =>
      `Remove the key from source code immediately. Store it in a secrets manager or environment variable.`,
  },
  {
    // JWT-like token (three base64 segments)
    pattern: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
    rule: "hardcoded-jwt",
    severity: "high",
    message: () =>
      `Hardcoded JWT token found. If this is a real token it should not be in source code.`,
    suggestion: () =>
      `Remove the JWT from source code and retrieve it from a secure store at runtime.`,
  },
  {
    // Connection strings with passwords
    pattern: /(?:mongodb|mysql|postgres|redis):\/\/[^:]+:[^@\s]{4,}@/i,
    rule: "hardcoded-connection-string",
    severity: "critical",
    message: () =>
      `Database connection string with embedded credentials detected.`,
    suggestion: () =>
      `Move the full connection string to process.env.DATABASE_URL and never commit it.`,
  },
];

function detect(code) {
  const issues = [];
  const lines = code.split("\n");

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    // Skip actual comments but NOT assignment lines that contain the word 'key'
    if (
      trimmed.startsWith("//") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("#")
    )
      return;

    for (const { pattern, rule, severity, message, suggestion } of PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        // Redact the actual secret value from the message for safety
        issues.push({
          type: "security",
          severity,
          rule,
          line: i + 1,
          column: line.search(pattern) + 1,
          message: message(match),
          suggestion: suggestion(match),
          remediation:
            "Use environment variables (.env + dotenv) or a dedicated secrets manager (AWS Secrets Manager, Vault, etc.).",
        });
      }
    }
  });

  return issues;
}

module.exports = { detect };

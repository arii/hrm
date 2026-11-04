// scripts/redact-secrets.ts
import { readFileSync, writeFileSync } from 'fs'

// A list of regexes for common secret patterns
const SECRET_REGEXES = [
  /ghp_[a-zA-Z0-9]{36,}/g, // GitHub PAT
  /ghs_[a-zA-Z0-9]{36,}/g, // GitHub App Token
  /ghu_[a-zA-Z0-9]{36,}/g, // GitHub User-to-Server Token
  /gho_[a-zA-Z0-9]{36,}/g, // GitHub OAuth Access Token
  /ghr_[a-zA-Z0-9]{36,}/g, // GitHub Refresh Token
  /xoxb-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,}/g, // Slack Bot Token
  /xoxp-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,}/g, // Slack User Token
  /sk_live_[0-9a-zA-Z]{24,}/g, // Stripe Live Key
  /rk_live_[0-9a-zA-Z]{24,}/g, // Stripe Restricted Live Key
  /sq0atp-[0-9a-zA-Z\-_]{22,}/g, // Square Access Token
  /sq0csp-[0-9a-zA-Z\-_]{43,}/g, // Square CSRF Token
  /amzn\.mws\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, // Amazon MWS Auth Token
  /da2-[a-z0-9]{26,}/g, // AWS AppSync
  /AKIA[0-9A-Z]{16,}/g, // AWS Access Key ID
  /AIzaSy[A-Za-z0-9\-_]{30,}/g, // Google API Key
  /SG\.[a-zA-Z0-9\.\-_]{22}\.[a-zA-Z0-9\.\-_]{43,}/g, // SendGrid API Key
  /Bearer\s[a-zA-Z0-9\-\._~+/]+=*/g, // Bearer Token
]

/** Env keys suggesting a secret value worth redacting. */
const SECRET_ENV_KEY = /(key|token|secret|password|pat)/i

/** Redacts values of secret-looking environment variables. */
function redactEnvSecretValues(content: string): string {
  let redacted = content
  for (const envVar in process.env) {
    const value = process.env[envVar]
    // Redact if the value is non-trivial and the key suggests it's a secret
    if (value && value.length > 8 && SECRET_ENV_KEY.test(envVar)) {
      if (redacted.includes(value)) {
        // Use a simple string replacement for the exact value
        redacted = redacted.split(value).join('***REDACTED***')
      }
    }
  }
  return redacted
}

/**
 * Redacts sensitive information from a given string.
 *
 * This function redacts:
 * 1. Common secret patterns using regular expressions (e.g., API keys, tokens).
 * 2. Values of environment variables that are likely to be secrets.
 *
 * @param logContent The string content to redact.
 * @returns The redacted string.
 */
export function redactSecrets(logContent: string): string {
  let redactedContent = logContent

  for (const regex of SECRET_REGEXES) {
    // Shared module-level regexes carry lastIndex state; reset per use.
    regex.lastIndex = 0
    redactedContent = redactedContent.replace(regex, '***REDACTED***')
  }

  return redactEnvSecretValues(redactedContent)
}

function main() {
  // Simple command-line argument parsing
  const inputFile = process.argv[2]
  const outputFile = process.argv[3]

  if (!inputFile || !outputFile) {
    console.error(
      'Usage: ts-node scripts/redact-secrets.ts <input-file> <output-file>'
    )
    process.exit(1)
  }

  try {
    const logContent = readFileSync(inputFile, 'utf-8')
    const redactedContent = redactSecrets(logContent)
    writeFileSync(outputFile, redactedContent)
    console.log(
      `Successfully redacted secrets from ${inputFile} to ${outputFile}`
    )
  } catch (error) {
    console.error(
      `Error processing files: ${error instanceof Error ? error.message : String(error)}`
    )
    process.exit(1)
  }
}

// This allows the script to be executed directly, but also to be imported as a module in tests
// without running the file I/O logic. Jest sets NODE_ENV to 'test' by default.
if (process.env.NODE_ENV !== 'test') {
  main()
}

# Environment Variable Handling Standards

This document provides clear standards for managing environment variables (env vars) within the HRM project. Proper handling of environment variables is critical for security, maintainability, and preventing configuration-related bugs.

## Core Principles

1.  **Security is Paramount**: Never commit secrets or environment-specific configurations to the repository.
2.  **Fail Fast**: The application should fail at startup if critical environment variables are missing or invalid, rather than failing unpredictably at runtime.
3.  **Clarity and Explicitness**: The purpose and type of each environment variable should be clear. Avoid vague or generic names.

## Best Practices

### 1. Centralized Validation

All environment variables must be validated in a single, centralized location (e.g., `lib/env.ts`). This validation should occur at application startup. We use Zod for schema-based validation, which provides both runtime validation and static type inference.

### 2. Avoid Type Assertions

Do not use type assertions (e.g., `as string`) to bypass TypeScript's type safety. This is a dangerous practice that can mask configuration issues and lead to runtime errors.

**Incorrect Pattern:**

```typescript
// This is unsafe and prohibited.
const myVar = process.env.MY_VAR as string;
```

### 3. Use Explicit Validation and Error Handling

For any environment variable that is required for the application to function, you must perform an explicit check. If the variable is missing, throw an error to halt the application's startup process.

**Correct Pattern:**

```typescript
// Example using a validation library like Zod
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  API_KEY: z.string().min(1),
});

const env = envSchema.parse(process.env);

// Now 'env.API_KEY' is guaranteed to be a non-empty string.
```

If not using a validation library, a manual check is required:

```typescript
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error('Required environment variable API_KEY is not set.');
}
// 'apiKey' is now known to be a string.
```

### 4. Provide Example and Documentation

All environment variables required by the project must be documented in the `.env.example` file. This file should:

-   List every required environment variable.
-   Provide a descriptive comment explaining the purpose of each variable.
-   Include placeholder or example values, but **never** real secrets.

### 5. Use Specific and Prefixed Names

To avoid naming collisions and to make the purpose of variables clear, use a consistent naming convention. For example, prefix all Spotify-related variables with `SPOTIFY_`.

-   **Good**: `SPOTIFY_CLIENT_ID`, `DATABASE_URL`
-   **Bad**: `ID`, `URL`

# Environment Variables

This document provides a comprehensive guide to managing environment variables in this application. A robust validation system is in place to ensure stability, security, and a smooth developer experience.

## Overview

All environment variables are managed and validated through a centralized system located at `lib/env.ts`. This system uses [Zod](https://zod.dev/) to enforce a strict schema, ensuring that the application starts only when all required variables are present and correctly formatted.

**Key Features:**

- **Centralized Schema:** A single source of truth for all environment variables.
- **Type Safety:** Zod's type inference provides a fully type-safe `env` object.
- **Early Validation:** The application fails fast at startup if any variable is missing or invalid.
- **Secure by Default:** Sensitive variables are restricted to the server-side, and only explicitly prefixed `NEXT_PUBLIC_` variables are exposed to the client.

## Adding a New Environment Variable

### 1. Add to `.env.example`

First, add the new variable to `.env.example` with a descriptive comment and a placeholder value.

```
# .env.example

# A brief description of the new variable.
NEW_VARIABLE=placeholder
```

### 2. Add to the Zod Schema

Next, add the new variable to the appropriate schema in `lib/env.ts`.

- **Server-Side Variables:** Add to `serverSchema`.
- **Client-Side Variables:** Add to `clientSchema`. **Must be prefixed with `NEXT_PUBLIC_`.**

```typescript
// lib/env.ts

const serverSchema = z.object({
  // ... existing variables
  NEW_VARIABLE: z.string(),
});

const clientSchema = z.object({
  // ... existing variables
  NEXT_PUBLIC_NEW_VARIABLE: z.string().optional(),
});
```

### 3. Use the Variable

You can now access the new variable from the type-safe `env` object:

```typescript
import { env } from '@/lib/env';

console.log(env.NEW_VARIABLE);
```

## Security Best Practices

- **Never Expose Sensitive Information:** Ensure that API keys, secrets, and other sensitive data are **never** prefixed with `NEXT_PUBLIC_`. The validation system is designed to prevent this, but it's crucial to remain vigilant.
- **Principle of Least Privilege:** Only expose variables to the client that are absolutely necessary for the client-side application to function.
- **Use Specific Schemas:** When defining variables in the Zod schema, use the most specific type possible (e.g., `z.string().url()` for URLs, `z.coerce.number()` for numbers) to catch errors early.

## Local Development

For local development, copy `.env.example` to a new file named `.env.local` and fill in the required values. This file is ignored by Git and will not be committed.

```bash
cp .env.example .env.local
```

## CI/CD Environments

In CI/CD environments like GitHub Actions, environment variables should be set up as repository or organization secrets. **Do not commit `.env.production` or similar files containing secrets to the repository.**

The CI/CD pipeline should be configured to inject these secrets into the environment where the build and deployment processes run. The validation system will then pick them up and ensure the application is configured correctly for the target environment.

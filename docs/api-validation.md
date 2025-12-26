# API Validation with `withValidation`

To ensure consistency, security, and a better developer experience, all App Router API endpoints (`app/api/*`) that accept input (request bodies, URL parameters, or headers) **must** be protected by the `withValidation` higher-order function (HOF). This middleware provides automatic, type-safe validation using Zod schemas.

## Basic Usage (Body Only)

For endpoints that only need to validate the request body, provide a Zod schema for the `body`.

```typescript
// app/api/users/route.ts
import { withValidation } from '@/lib/middleware/validation';
import { z } from 'zod';

const schemas = {
  body: z.object({
    username: z.string().min(3),
    email: z.string().email(),
  }),
};

async function postHandler(req, { body }) {
  // At this point, `body` is guaranteed to be a valid object
  // with a `username` and `email`.
  console.log(body.username);
  // ... create user logic
}

export const POST = withValidation(schemas)(postHandler);
```

## Advanced Usage (Body, Params, and Headers)

For more complex endpoints, you can provide schemas for `body`, `params` (URL parameters), and `headers`.

```typescript
// app/api/users/[userId]/route.ts
import { withValidation } from '@/lib/middleware/validation';
import { z } from 'zod';

const schemas = {
  params: z.object({
    userId: z.string().uuid(),
  }),
  body: z.object({
    role: z.enum(['admin', 'user']),
  }),
  headers: z.object({
    'x-api-key': z.string().length(32),
  }),
};

async function putHandler(req, { params, body, headers }) {
  // All inputs are validated and type-safe
  console.log('User ID:', params.userId);
  console.log('New Role:', body.role);
  console.log('API Key:', headers['x-api-key']);
  // ... update user logic
}

export const PUT = withValidation(schemas)(putHandler);
```

## Standardized Error Response

If validation fails for any reason (e.g., missing fields, incorrect types, malformed JSON), the middleware will automatically return a `400 Bad Request` response with a standardized JSON error format. This allows the frontend to easily parse the error and display specific messages to the user.

### Error Format

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid request parameters",
  "details": [
    {
      "location": "body",
      "path": "email",
      "message": "Invalid email"
    },
    {
      "location": "params",
      "path": "userId",
      "message": "Invalid uuid"
    }
  ]
}
```

### Fields Explained

- `error`: A constant string `VALIDATION_ERROR` for easy error identification.
- `message`: a high-level, human-readable summary of the error.
- `details`: An array of objects, each detailing a specific validation failure.
  - `location`: The part of the request where the error occurred (`body`, `params`, or `headers`).
  - `path`: The specific field that failed validation (e.g., `email`, `userId`).
  - `message`: A detailed error message from the Zod schema.

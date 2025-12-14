# TypeScript Best Practices

This document outlines the standards and patterns for writing TypeScript in the HRM project. Adhering to these guidelines is crucial for maintaining a robust, type-safe, and maintainable codebase.

## Guiding Principle: Prioritize Type Safety

TypeScript's primary benefit is its static type system. Our goal is to leverage this system to its fullest extent to catch errors at compile time, not runtime. Any pattern that compromises type safety should be avoided.

## TypeScript Strictness Requirements

All new code should be written to comply with a strict TypeScript configuration. This includes enabling flags like `strictNullChecks`, `noImplicitAny`, and `noImplicitThis`.

## Avoid Type Assertions (e.g., `as string`)

Type assertions are a way to tell the compiler "trust me, I know what I'm doing." While occasionally necessary for interoperating with untyped libraries, they should be avoided in application code, especially for values that can be `null` or `undefined` at runtime, such as environment variables.

### Incorrect Pattern (What to Avoid)

```typescript
// Unsafe: This bypasses compiler checks and can lead to runtime errors
// if the environment variable is not set.
const apiKey = process.env.API_KEY as string;
```

## Prefer Explicit Type Guards and Validation

Instead of asserting a type, use runtime checks like `if` statements or validation libraries (e.g., Zod) to prove the type to the compiler. This pattern ensures that the variable is not only typed correctly but also guaranteed to be present at runtime.

### Correct Pattern

```typescript
const apiKey = process.env.API_KEY;

if (!apiKey) {
  // Fail-fast mechanism for critical variables
  throw new Error('API_KEY environment variable is required and was not found.');
}

// From this point on, the TypeScript compiler correctly infers
// that 'apiKey' is of type 'string', not 'string | undefined'.
```

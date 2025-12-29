# TypeScript Best Practices and Patterns

This document outlines best practices and common patterns for using TypeScript in this project. The goal is to maintain a high level of code quality, type safety, and readability.

## The `any` Type: A Last Resort

The `any` type is a powerful tool, but it's a dangerous one. It effectively disables TypeScript's type checking, which is the primary reason we use TypeScript in the first place. In this project, we have the `@typescript-eslint/no-explicit-any` rule enabled to prevent its use.

**Before you reach for `any`, consider the alternatives.**

### Alternatives to `any`

1.  **`unknown`:** If you have a variable where the type is truly unknown, use the `unknown` type. `unknown` is a type-safe counterpart to `any`. You can't do anything with an `unknown` type until you perform some form of type checking.

2.  **Generics:** If you're writing a function that can operate on a variety of types, use generics.

3.  **Type Assertions:** If you have more information about the type of a value than TypeScript does, you can use a type assertion. However, be careful with type assertions, as they can lead to runtime errors if you're wrong.

4.  **`Record<string, unknown>`:** When working with dynamic objects where the keys are strings but the values are of unknown types, `Record<string, unknown>` is a great alternative to `any`.

    ```typescript
    function processDynamicObject(obj: Record<string, unknown>) {
      for (const key in obj) {
        const value = obj[key];
        if (typeof value === 'string') {
          console.log(value.toUpperCase());
        }
      }
    }
    ```

5.  **`Record<string, any>`:** In some cases, you might need to use `Record<string, any>`. This is still a bit of a code smell, but it's better than a naked `any`. It's useful when you have an object with a known set of keys, but the values can be of any type.

    ```typescript
    function processUserData(user: Record<string, any>) {
      if (typeof user.name === 'string') {
        console.log(user.name.toUpperCase());
      }
    }
    ```

### Type Narrowing

When you have a variable of a broad type (like `unknown`), you can use type narrowing to determine a more specific type.

```typescript
function processData(data: unknown) {
  if (typeof data === 'string') {
    // TypeScript now knows that `data` is a string.
    console.log(data.toUpperCase());
  } else if (data instanceof Error) {
    // TypeScript now knows that `data` is an Error.
    console.error(data.message);
  }
}
```

### Discriminated Unions

Discriminated unions are a powerful pattern for working with heterogeneous data. They allow you to define a type that can be one of several different shapes, and then use a common property to determine which shape the data has.

```typescript
interface Success {
  type: 'SUCCESS';
  data: string;
}

interface Failure {
  type: 'FAILURE';
  error: string;
}

type Result = Success | Failure;

function processResult(result: Result) {
  switch (result.type) {
    case 'SUCCESS':
      console.log(result.data.toUpperCase());
      break;
    case 'FAILURE':
      console.error(result.error);
      break;
  }
}
```

### When is `any` Acceptable?

There are very few scenarios where using `any` is the only option:

1.  **Interacting with Third-Party Libraries:** When working with a third-party library that doesn't have proper TypeScript types, you might need to use `any` to avoid compilation errors. In these cases, it's a good practice to create a custom type definition file (`.d.ts`) to provide some level of type safety.

### How to Document the Use of `any`

If you absolutely must use `any`, you need to document the reason for its use. You can do this by adding a comment above the line where `any` is used, explaining why it's necessary.

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let data: any; // Reason: The data comes from a third-party API with no type definitions.
```

By following these guidelines, we can ensure that our codebase remains type-safe and maintainable.

# TypeScript Best Practices and Patterns

This document outlines best practices and common patterns for using TypeScript in this project. The goal is to maintain a high level of code quality, type safety, and readability.

## The `any` Type: A Last Resort

The `any` type is a powerful tool, but it's a dangerous one. It effectively disables TypeScript's type checking, which is the primary reason we use TypeScript in the first place. In this project, we have the `@typescript-eslint/no-explicit-any` rule enabled to prevent its use.

**Before you reach for `any`, consider the alternatives.**

### Alternatives to `any`

1.  **`unknown`:** If you have a variable where the type is truly unknown, use the `unknown` type. `unknown` is a type-safe counterpart to `any`. You can't do anything with an `unknown` type until you perform some form of type checking.

2.  **Generics:** If you're writing a function that can operate on a variety of types, use generics.

3.  **Type Assertions:** If you have more information about the type of a value than TypeScript does, you can use a type assertion. However, be careful with type assertions, as they can lead to runtime errors if you're wrong.

    ```typescript
    function processUnknown(data: unknown) {
      const myData = data as { message: string };
      console.log(myData.message);
    }
    ```

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

### The Dangers of Unsafe Type Assertions

A type assertion (`as string`) tells the TypeScript compiler, "Trust me, I know what I'm doing." This can be dangerous because if you are wrong, you will introduce a runtime error. This is especially common with values that can be `null` or `undefined` at runtime, such as environment variables.

**Don't do this:**

```typescript
// Unsafe: This will throw a TypeError if API_KEY is not set.
const apiKey = process.env.API_KEY as string;
console.log(apiKey.toLowerCase());
```

**Do this instead:**

Use a runtime check to validate the value before you use it. This is a form of type narrowing that ensures your code is safe.

```typescript
const apiKey = process.env.API_KEY;

if (typeof apiKey !== 'string' || apiKey.length === 0) {
  throw new Error('API_KEY environment variable is not set.');
}

// Safe: TypeScript now knows apiKey is a string.
console.log(apiKey.toLowerCase());
```

5.  **`Record<string, any>` (Use with Caution):** `Record<string, any>` should be treated as a last resort. While it provides more structure than a naked `any`, it still disables type checking for the values of an object. The preferred approach is almost always `Record<string, unknown>` combined with type narrowing.

    Only use `Record<string, any>` in rare scenarios where you are forced to interact with a library or API that is so dynamic and poorly typed that `unknown` and type narrowing become genuinely impractical. If you must use it, provide a clear comment explaining why `Record<string, unknown>` was not a viable alternative.

    ```typescript
    // Use this as a last resort when `Record<string, unknown>` is not feasible.
    function processLegacyData(data: Record<string, any>) {
      // Justification: Interfacing with a legacy, untyped module.
      if (typeof data.name === 'string') {
        console.log(data.name.toUpperCase());
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

## Testing Private Members

Testing private members of a class can be challenging in TypeScript. While it's often a sign that your component might be doing too much, sometimes it's necessary to inspect internal state to ensure correctness. Instead of resorting to unsafe type assertions (`as any`), we use a type-safe pattern that exposes private members only in a test environment.

### The `_test_` Property Pattern

This pattern involves adding a public property to your class (e.g., `_test_`) that is conditionally defined based on the `NODE_ENV`.

```typescript
class MyService {
  private myPrivateValue = 42;

  /**
   * @internal
   * Test-only properties for inspecting internal state. This object is only defined
   * when `process.env.NODE_ENV === 'test'`, ensuring it does not exist in production.
   */
  public _test_ =
    process.env.NODE_ENV === 'test'
      ? {
          getMyPrivateValue: () => this.myPrivateValue,
        }
      : undefined;
}

// In your test file:
const service = new MyService();
if (service._test_) {
  expect(service._test_.getMyPrivateValue()).toBe(42);
}
```

This approach has several advantages:
- It's type-safe. The `_test_` property is properly typed, and your tests will fail to compile if you try to access a property that doesn't exist.
- It's explicit. It clearly communicates that these properties are for testing purposes only.
- It's safe for production. The `_test_` property is `undefined` in production, so there's no risk of it being used accidentally.

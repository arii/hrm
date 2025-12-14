# Hook Design Patterns

This document outlines best practices for creating and using custom React hooks within the HRM project.

## Guiding Principle: Expose Granular State

When designing custom hooks, it is crucial to expose granular state to the consuming components rather than relying on a single, generic boolean flag (like `isLoading`). This approach provides more context to the UI, allowing for more descriptive and user-friendly feedback.

### The Problem with a Single `isLoading` Flag

A single `isLoading` flag is ambiguous. It doesn't tell the user *what* is loading. Is the application making an initial connection? Is it waiting for data to stream? Has an error occurred?

### Best Practice: Use Descriptive, Granular State

Instead of one flag, return multiple, descriptive boolean values that represent the different states the hook can be in.

#### Example: A Data Fetching Hook

A hook that connects to a service and streams data should expose its internal state clearly.

**Instead of this:**

```typescript
const { isLoading, data, error } = useDataStream();
// What does isLoading mean here? Initial connect? Reconnecting?
```

**Do this:**

```typescript
const { isConnecting, isStreaming, isError, data } = useDataStream();

// Now the UI can be much more specific:
if (isConnecting) return <p>Connecting to the service...</p>;
if (isError) return <p>An error occurred. Please try again.</p>;
if (!isStreaming && !data) return <p>Waiting for data...</p>;
```

### Benefits of Granular State

-   **Clearer UI**: Allows for more specific and helpful loading and error messages.
-   **Easier Debugging**: The state of the hook is explicit, making it easier to trace its lifecycle.
-   **More Flexible Components**: Components can react to specific states, rather than trying to infer the state from a single flag.

### Timeout Mechanisms

For hooks that manage live data streams, consider implementing a timeout mechanism. If no data is received within a certain period, the hook could set an `isStale` or `isDataDelayed` flag to true. This allows the UI to inform the user of a potential connection issue without declaring a full error state.

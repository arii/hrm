# Logging Best Practices

This document outlines the best practices for logging in the HRM application. Following these guidelines will ensure that our logs are consistent, useful, and easy to analyze.

## Log Levels

We use the following log levels, in order of severity:

- **`debug`**: Detailed information for debugging purposes. This level should be used for information that is not typically needed in production but can be useful for diagnosing issues.
- **`info`**: General information about the application's state. This level should be used for significant events, such as the application starting or a user logging in.
- **`warn`**: Indicates a potential problem that does not prevent the application from functioning. This level should be used for recoverable errors or unexpected conditions.
- **`error`**: Indicates a serious error that prevents the application from functioning as expected. This level should be used for unrecoverable errors or unexpected exceptions.

## Client-Side Logging

Client-side logging is handled by `utils/logger.ts`, which wraps the browser's `console` object to provide a consistent logging interface.

- **Use `logger.debug()` for detailed debugging information.**
- **Use `logger.info()` for significant events.**
- **Use `logger.warn()` for potential problems.**
- **Use `logger.error()` for serious errors.**

## Server-Side Logging

Server-side logging is handled by `utils/logger.server.ts`, which uses the `pino` library for structured, high-performance logging.

- **Use `logger.debug()` for detailed debugging information.**
- **Use `logger.info()` for significant events.**
- **Use `logger.warn()` for potential problems.**
- **Use `logger.error()` for serious errors.**

When logging errors, pass the error object as the first argument to `logger.error()` to ensure that the error's stack trace is included in the log output.

```typescript
try {
  // ...
} catch (error) {
  logger.error(error, 'An unexpected error occurred.')
}
```

## HTTP Request Logging

HTTP request logging is handled by the `pino-http` middleware, which is configured in `utils/logger.server.ts`. This middleware automatically logs all incoming HTTP requests and their responses, providing valuable information about the application's performance and usage.

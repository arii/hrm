# Client-Side Logging

This document outlines the configuration, usage, and best practices for client-side logging in this project.

## 1. Logger Overview & Purpose

The client-side logger, located at `utils/logger.ts`, provides a standardized interface for logging messages in the browser. It is designed to be a lightweight wrapper around the native `console` object, ensuring consistent logging practices across the application.

### Key Characteristics:

-   **Pino-like API**: The logger mimics the API of the Pino logger used on the server-side, providing familiar methods such as `debug()`, `info()`, `warn()`, and `error()`. This consistency simplifies development and makes it easier to reason about logging throughout the entire stack.
-   **Lightweight Wrapper**: To minimize the impact on client-side performance, the logger is a thin wrapper over the browser's `console` object. It does not include any complex logic or external dependencies.
-   **No External Integration**: The client-side logger does not send logs to any external error tracking or monitoring services. Its primary purpose is to facilitate debugging and development directly in the browser.

## 2. Environment-Specific Configuration

The behavior of the client-side logger is influenced by the environment in which the application is running (`development`, `production`, or `test`). Since the logger is a wrapper around the `console` object, the output is primarily determined by the browser's developer tools and the Next.js build process.

### Development (`NODE_ENV=development`)

-   **Verbose Output**: In development, all log levels (`debug`, `info`, `warn`, `error`) will be visible in the browser's developer console.
-   **Immediate Feedback**: Logs appear immediately, providing real-time feedback during development and debugging.

### Production (`NODE_ENV=production`)

-   **Optimized for Performance**: The Next.js build process may optimize away `console.log` and `console.debug` statements to reduce the amount of code shipped to the browser and improve performance.
-   **Error and Warning Focus**: `console.warn` and `console.error` are typically preserved, ensuring that critical issues are still reported in the browser console.

### Test (`NODE_ENV=test`)

-   **Console Output**: When running tests with Jest, log messages will be output to the terminal where the tests are being executed.
-   **Noisy Output**: Be mindful that excessive logging in tests can make the test results difficult to read. It is recommended to use logging for debugging purposes and to mock the logger if necessary to control the output.

## 3. Logger API & Methods

The client-side logger provides four main methods for logging messages, each corresponding to a different level of severity.

### `logger.debug(msg, ...args)`

-   **Purpose**: Used for detailed diagnostic information that is useful for debugging.
-   **When to use**: Logging component lifecycle events, function entry and exit points, or the state of variables.
-   **Example**:
    ```typescript
    import logger from 'utils/logger';

    function handleButtonClick(event) {
      logger.debug('Button clicked', { event });
      // ...
    }
    ```

### `logger.info(msg, ...args)`

-   **Purpose**: Used for informational messages that highlight the progress of the application.
-   **When to use**: Logging routine events, such as the initialization of a service or successful API calls.
-   **Example**:
    ```typescript
    import logger from 'utils/logger';

    function initializeWebSocket() {
      logger.info('WebSocket connection established.');
      // ...
    }
    ```

### `logger.warn(msg, ...args)`

-   **Purpose**: Used for potential issues that do not prevent the application from functioning but should be addressed.
-   **When to use**: Logging deprecated API usage, unexpected but recoverable errors, or non-critical issues.
-   **Example**:
    ```typescript
    import logger from 'utils/logger';

    function fetchData() {
      if (retries > 3) {
        logger.warn('API call is taking longer than expected.');
      }
      // ...
    }
    ```

### `logger.error(msg, ...args)`

-   **Purpose**: Used for errors that prevent the application from functioning as expected.
-   **When to use**: Logging unhandled exceptions, failed API calls, or other critical issues.
-   **Example**:
    ```typescript
    import logger from 'utils/logger';

    async function saveUserData(data) {
      try {
        await api.save(data);
      } catch (error) {
        logger.error('Failed to save user data.', { error });
      }
    }
    ```

## 4. Debugging Patterns & Techniques

Effective logging is a key part of debugging. Here are some common patterns and techniques for using the client-side logger.

### Browser Console Integration

-   **Filtering**: Most browser developer tools allow you to filter console output by log level (e.g., "Verbose", "Info", "Warnings", "Errors"). This can be helpful for focusing on specific types of issues.
-   **Object Inspection**: When you log objects, the browser console provides an interactive view, allowing you to inspect their properties and methods.
-   **Search**: The console's search functionality can be used to find specific log messages or keywords.

### Log Capture and Analysis

-   **Preserve Logs**: In the browser's developer tools, you can enable the "Preserve log" option to prevent the console from being cleared on page navigation.
-   **Exporting Logs**: You can right-click in the console and save the log output to a file for later analysis or to share with other developers.

### Performance Debugging

-   **`console.time()` and `console.timeEnd()`**: While not part of the logger's API, these browser console methods can be used in conjunction with the logger to measure the performance of specific operations.
    ```typescript
    import logger from 'utils/logger';

    console.time('data-processing');
    logger.info('Starting data processing...');
    // ... long-running operation ...
    logger.info('Data processing complete.');
    console.timeEnd('data-processing');
    ```

## 5. Production Debugging

Debugging in a production environment requires a different approach, as direct access to the browser's developer tools is not always possible.

### Accessing Production Logs

-   **Browser Console**: For issues that can be reproduced by the development team, the browser's developer console is the primary way to access production logs.
-   **User-Reported Issues**: When a user reports an issue, you may need to guide them on how to open the developer console and provide you with the log output or a screenshot of any errors.

### Error Tracking Integration

-   **No Built-in Integration**: The client-side logger is not integrated with any external error tracking services.
-   **Future Enhancements**: In the future, the logger could be extended to send `error` logs to a service like Sentry or LogRocket to provide more visibility into production issues.

## 6. Best Practices

To ensure that logging remains a useful tool for development and debugging, please follow these best practices.

-   **Be Mindful of Production Builds**: Remember that `debug` and `info` logs may be stripped out in production. Only use `warn` and `error` for issues that need to be visible in the production browser console.
-   **Avoid Sensitive Information**: Do not log any sensitive or personal user information, such as passwords, API keys, or personally identifiable information (PII).
-   **Use a Consistent Style**: Write clear and descriptive log messages. Include relevant context, such as the name of the component or function where the log is being generated.
-   **Manage Log Volume**: Excessive logging can clutter the console and make it difficult to find important information. Use `debug` for verbose logging and avoid overusing `info` for trivial events.
-   **Remove Temporary Logs**: Remove or disable any temporary `debug` logs once they are no longer needed for debugging.
-   **Document Logging**: For complex features, consider adding comments to your code to explain the purpose of specific log messages.

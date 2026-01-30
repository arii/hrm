# Unified Application Logging

This document outlines the logging strategy for both the client and server-side components of the application. The goal is to provide a consistent and effective logging mechanism that is environment-aware.

### Logger Files

The application has two logger files:

- **`utils/logger.ts`**: Client-side logger (lightweight console wrapper)
- **`utils/logger.server.ts`**: Server-side logger (pino-based structured logging)

**Important**: Server-side code (API routes, server utilities, services) **must** explicitly import from `utils/logger.server.js` to ensure proper tree-shaking and prevent bundling pino in the client build.

### Unified Logger

The application uses a unified, environment-aware logger located at `utils/logger.ts` for client-side code and `utils/logger.server.ts` for server-side code. This logger provides a consistent interface for both client and server-side logging, while dynamically selecting the appropriate logging mechanism based on the execution environment.

- **Client-Side**: On the client, the logger is a lightweight wrapper around the native `console` object. This approach avoids shipping unnecessary code to the browser, which is critical for maintaining a fast and responsive user experience.
- **Server-Side**: On the server, the logger uses `pino`, a high-performance logging library, to provide structured and efficient logging.

#### Usage

To use the unified logger, import it into your component, utility, or server-side module and call the appropriate logging method:

```typescript
import logger from 'utils/logger'

// Client-side component
export const MyComponent = () => {
  logger.info('Component has been rendered.')
  // ...
}

// Server-side function
export const getServerSideProps = async () => {
  logger.info('Fetching server-side props.')
  // ...
}
```

#### Logging Levels

The unified logger supports the following logging levels:

- `debug`: For detailed debugging information.
- `info`: For informational messages.
- `warn`: For warnings and potential issues.
- `error`: For errors and exceptions.

#### Examples

Here are some examples of how to use the unified logger:

- **Info**: Use `logger.info` to log informational messages in both client and server environments.

  ```typescript
  import logger from 'utils/logger'

  // Client-side
  const handleButtonClick = () => {
    logger.info('User clicked the button.')
    // ...
  }

  // Server-side
  const apiHandler = (req, res) => {
    logger.info('API request received.')
    // ...
  }
  ```

- **Warning**: Use `logger.warn` to log potential issues that do not necessarily break the application.

  ```typescript
  import logger from 'utils/logger'

  // Client-side
  const checkApiResponse = (response) => {
    if (response.status !== 200) {
      logger.warn('API response was not successful.', {
        status: response.status,
      })
    }
  }
  ```

- **Error**: Use `logger.error` to log errors and exceptions. This is particularly useful in `catch` blocks when handling promise rejections or other runtime errors.

  ```typescript
  import logger from 'utils/logger'

  // Client-side
  const fetchData = async () => {
    try {
      const response = await fetch('/api/data')
      // ...
    } catch (error) {
      logger.error('Failed to fetch data.', { error })
    }
  }
  ```

### Server-Side Logging

Server-side logging is handled by `pino`, a high-performance logging library that provides structured logging in JSON format. This makes it easy to parse, filter, and analyze logs in a production environment.

#### Usage

The `httpLogger` middleware, also exported from `utils/logger.ts`, is used in `server.ts` to automatically log all incoming HTTP requests and their responses.

For custom logging in your server-side code, you can use the same `logger` object as on the client-side.

#### Redaction

To prevent sensitive information from being logged, the server-side logger is configured to redact the following fields from log entries:

- `req.headers.cookie`
- `req.headers.authorization`
- `res.headers`

This helps to protect user privacy and prevent security vulnerabilities. For more details, see the redaction configuration in `utils/logger.ts`.

# ADR-0005: Use Pino for Logging

- Status: Accepted
- Date: 2024-05-20
- Deciders: Ariel Anders
- Technical Story: #1653

## Context and Problem Statement

We need a structured and performant logging solution for the HRM application. The logging solution should be easy to use, provide structured logging in JSON format, and have a low overhead.

## Decision Drivers

- The need for a fast and efficient logging library.
- The desire for structured logging (JSON) to make logs easier to parse and search.
- The goal of having a logger that is well-suited for a Node.js environment.
- The need for a human-readable format for development.

## Considered Options

- Pino
- Winston
- `console.log`

## Decision Outcome

Chosen option: "Pino", because it is a very fast, low-overhead logger for Node.js. It provides structured logging in JSON format by default and can be easily configured to use a human-readable format (with `pino-pretty`) in development.

### Positive Consequences

- Excellent performance.
- Structured logging in JSON format.
- Good developer experience with `pino-pretty`.
- A rich ecosystem of plugins and transports.

### Negative Consequences

- The API is not as flexible as some other loggers (e.g., Winston).
- Requires a separate tool (`pino-pretty`) for human-readable logs.

## Pros and Cons of the Options

### Pino

- Pro: Very high performance.
- Pro: Structured logging by default.
- Pro: Lightweight and simple.
- Con: Less flexible than some other loggers.

### Winston

- Pro: Very flexible and feature-rich.
- Pro: Supports multiple transports and formats.
- Con: Can be slower than Pino.
- Con: More complex to configure.

### `console.log`

- Pro: Built-in and easy to use.
- Con: Not structured.
- Con: Lacks features like log levels and transports.
- Con: Not recommended for production logging.

# Testing

This document provides an overview of the testing strategy and conventions used in this project.

## Unit Tests

Unit tests are written with [Jest](https://jestjs.io/) and are located in the `tests/unit` directory. They are designed to be fast and to run in isolation.

### Environment Variables

The application uses a strict validation schema for environment variables. To allow unit tests to run without requiring all environment variables to be set, the validation is relaxed when the `TESTING` environment variable is set to `true`.

The `test:unit` script in `package.json` automatically sets this flag.

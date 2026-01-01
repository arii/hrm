# Development Guidelines

This document provides guidelines for developing and contributing to the HRM application.

## AI-Powered Development

This project leverages AI, specifically Google's Gemini models, to assist with various development tasks, including code generation, refactoring, and pull request reviews. The AI integration is managed through a set of scripts and GitHub Actions workflows.

### Gemini Client (`scripts/gemini-client.ts`)

This is the core script for interacting with the Gemini API. It supports various presets and options for different tasks.

#### Context Caching

To improve performance and reduce costs, the Gemini client supports context caching. This feature uploads the context files to a temporary cache and reuses it for subsequent API calls.

**Usage:**

The `--use-cache` flag enables context caching.

```bash
npx tsx scripts/gemini-client.ts --task "My task" --context "file1.ts,file2.ts" --use-cache
```

**Configuration:**

- **`GEMINI_CACHE_TTL_SECONDS`**: This environment variable controls the Time To Live (TTL) of the cache, in seconds. The default is `3600` (1 hour).

- **`GEMINI_CACHE_FILE_THRESHOLD`**: In the `gemini-coder.yml` workflow, this environment variable controls the number of files required to trigger context caching. The default is `5`.

## Getting Started

1.  **Install dependencies:**
    ```bash
    pnpm install
    ```

2.  **Run the development server:**
    ```bash
    pnpm run dev
    ```

## Testing

- **Unit Tests:**
  ```bash
  pnpm run test:unit
  ```

- **Visual Regression Tests:**
  ```bash
  pnpm run test:visual
  ```

## Code Style

This project uses Prettier for code formatting and ESLint for linting.

- **Format code:**
  ```bash
  pnpm run format
  ```

- **Lint code:**
  ```bash
  pnpm run lint
  ```

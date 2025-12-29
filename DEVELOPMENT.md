# Development Guidelines

This document provides guidelines for developing and maintaining the HRM application.

## Gemini AI Assistant

The project includes a sophisticated AI assistant powered by the Gemini API, located at `scripts/gemini-client.ts`. This client is used in GitHub Actions workflows to automate tasks like code generation, pull request reviews, and issue triage. For more information on the Gemini API, see the [official documentation](https://ai.google.dev/docs).

### Context Caching

To optimize performance and reduce API costs, the Gemini client implements a context caching mechanism. For tasks involving a large amount of context (e.g., analyzing multiple large files), the client can cache the context to avoid re-uploading and re-processing the same data on subsequent API calls.

**How it Works:**

1.  **Cache Trigger:** In the `gemini-coder.yml` workflow, caching is automatically enabled when the total size of the context files exceeds a **32KB threshold**.
2.  **`--use-cache` Flag:** The caching mechanism is controlled by the `--use-cache` flag passed to the `gemini-client.ts` script. When this flag is present, the script will attempt to create and use a cached context.
3.  **Cache Invalidation:** The cache is automatically invalidated whenever the content of the context files changes. This is achieved by generating a SHA-256 hash of the combined file contents and including it in the cache's display name. If the content changes, the hash changes, and a new cache is created.
4.  **Fallback Mechanism:** If caching fails for any reason, the script will gracefully fall back to the standard, non-cached method of sending the full text context with each request. This ensures that the CI process remains reliable.
5.  **Manual Cache Eviction:** There is currently no mechanism to manually or programmatically evict the cache. The cache will expire based on its TTL.

### Configuration

The caching behavior can be fine-tuned with the following environment variables:

*   **`GEMINI_CACHE_TTL_SECONDS`**: Sets the Time-To-Live for the cache in seconds. Defaults to `3600` (1 hour).
*   **`GEMINI_CACHE_MODEL`**: Specifies the exact model version to be used for creating the cache (e.g., `gemini-1.5-flash-001`). This decouples the caching model from the fallback list, allowing for greater stability. If not set, it defaults to the first model in the `MODEL_FALLBACKS` list.

**Troubleshooting Caching Failures:**

If you notice that caching is not working as expected, check the CI logs for the following common issues:

*   **File Upload Failures:** The script may fail to upload one or more context files to the Google AI File Service. The logs will contain a `⚠️ [Cache] Failed to upload ...` warning with the specific error message. This could be due to incorrect file paths, permissions issues, or transient network problems.
*   **Cache Creation Failures:** The script may fail to create the cache after the files have been uploaded. The logs will show a `⚠️ [Cache] Failed to create cache: ...` warning. This can happen due to API errors, invalid model names, or authentication issues with the `GEMINI_API_KEY`.
*   **Fallback Logging:** If the script falls back to the standard text context, it will log a `🔄 Falling back to standard text-based context due to CACHE FAILURE.` message. This indicates that the caching process was unsuccessful, and the script is continuing in the less efficient, non-cached mode.
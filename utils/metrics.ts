import { Registry, Histogram } from 'prom-client';

export const registry = new Registry();

/**
 * Sanitizes a URL path to prevent a cardinality explosion in Prometheus.
 * Replaces numeric path segments with a generic ':id' placeholder.
 * e.g., /api/users/123 -> /api/users/:id
 * @param path The URL path to sanitize.
 * @returns The sanitized path.
 */
export function sanitizePath(path: string): string {
  if (!path) {
    return '';
  }
  return path
    .split('/')
    .map((part) => (/^\d+$/.test(part) ? ':id' : part))
    .join('/');
}

export const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5], // buckets for response time from 5ms to 5s
});

registry.registerMetric(httpRequestDurationSeconds);

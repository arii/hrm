// File: constants/server.ts
/**
 * Centralized constants for server and timer configuration.
 */

// --- Server Configuration ---
export const DEFAULT_PORT = 3000;
export const PROD_HOST = '0.0.0.0';
export const DEV_HOST = '127.0.0.1';
export const CACHE_MAX_AGE = '365d';

// --- Tabata Timer Configuration ---
export const DEFAULT_WORK_DURATION = 20; // seconds
export const DEFAULT_REST_DURATION = 10; // seconds
export const START_COUNTDOWN_DURATION = 5; // seconds
export const TIMER_INTERVAL_MS = 1000; // 1 second

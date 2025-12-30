/**
 * @fileoverview Defines the GeminiModel enum and default fallback list for type-safe model identifiers.
 * This file centralizes model names to prevent typos and ensure consistency across the application.
 * Using an enum is preferred over string literals ("magic strings") to catch errors at compile-time.
 */

/**
 * Enum representing the available Gemini models for the v1beta API.
 * Using a string enum allows for readable and debuggable values.
 * Source: https://ai.google.dev/gemini-api/docs/models
 */
export enum GeminiModel {
  GEMINI_2_5_PRO = 'gemini-2.5-pro',
  GEMINI_2_5_FLASH = 'gemini-2.5-flash',
  GEMINI_2_5_FLASH_LITE = 'gemini-2.5-flash-lite',
  GEMINI_2_0_FLASH = 'gemini-2.0-flash',
  GEMINI_2_0_FLASH_LITE = 'gemini-2.0-flash-lite',
}

/**
 * List of models to try in order.
 * This list is based on the official Google AI documentation and prioritizes models by their
 * recommended use cases, balancing performance, cost, and availability.
 */
export const MODEL_FALLBACKS = [
  GeminiModel.GEMINI_2_0_FLASH,
  GeminiModel.GEMINI_2_0_FLASH_LITE,
  GeminiModel.GEMINI_2_5_FLASH,
  GeminiModel.GEMINI_2_5_FLASH_LITE,
  GeminiModel.GEMINI_2_5_PRO,
];

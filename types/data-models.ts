/**
 * @file This file contains the centralized data models for the application.
 *
 * @see /docs/decisions/0001-centralized-data-models.md
 */

/**
 * Represents a user's profile information.
 *
 * @property {string} id - The unique identifier for the user (UUID).
 * @property {string} username - The user's chosen username. Must be unique.
 * @property {string} email - The user's email address. Must be unique.
 * @property {string | null} firstName - The user's first name.
 * @property {string | null} lastName - The user's last name.
 * @property {string} createdAt - The timestamp when the user was created (ISO 8601).
 * @property {string} updatedAt - The timestamp when the user was last updated (ISO 8601).
 */
export interface UserProfile {
  id: string
  username: string
  email: string
  firstName: string | null
  lastName: string | null
  createdAt: string
  updatedAt: string
}

/**
 * @file Centralized Zod instance with OpenAPI extensions.
 *
 * This file imports the standard Zod library, extends it with the
 * zod-to-openapi functionality, and exports the extended instance.
 * All other files in the application should import Zod from this
 * file to ensure the OpenAPI extensions are always available.
 *
 * @see /docs/decisions/0002-api-validation-with-zod.md
 */
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

// Extend the Zod instance with OpenAPI-specific methods
extendZodWithOpenApi(z)

// Export the extended z instance for use throughout the app
export { z }

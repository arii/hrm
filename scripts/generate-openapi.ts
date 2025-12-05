/**
 * @file This script generates an OpenAPI specification from Zod schemas.
 *
 * @see /docs/decisions/0003-automated-api-documentation.md
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import {
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from '@asteasolutions/zod-to-openapi';
import * as Schemas from '../lib/validation/schemas.ts';

const registry = new OpenAPIRegistry();

// Register all schemas
Object.entries(Schemas).forEach(([name, schema]) => {
  registry.register(name, schema);
});

// Define the API endpoints
registry.registerPath({
  method: 'post',
  path: '/api/users',
  summary: 'Create a new user',
  request: {
    body: {
      content: {
        'application/json': {
          schema: Schemas.CreateUserProfileSchema.openapi('CreateUserProfile'),
        },
      },
    },
  },
  responses: {
    '201': {
      description: 'User created successfully',
      content: {
        'application/json': {
          schema: Schemas.UserProfileSchema.openapi('UserProfile'),
        },
      },
    },
    '400': {
      description: 'Invalid request body',
    },
  },
});

const generator = new OpenApiGeneratorV3(registry.definitions);
const openapiSpec = generator.generateDocument({
  openapi: '3.0.0',
  info: {
    title: 'Heart Rate Monitor API',
    version: '1.0.0',
  },
});

const outputPath = resolve(process.cwd(), 'public', 'openapi.json');
writeFileSync(outputPath, JSON.stringify(openapiSpec, null, 2));

console.log(`✅ OpenAPI specification generated at ${outputPath}`);

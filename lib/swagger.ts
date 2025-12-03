import swaggerJsdoc from 'swagger-jsdoc'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { spotifyControlSchema } from './validation/schemas'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HRM API',
      version: '1.0.0',
      description: 'API documentation for the HRM application',
    },
    components: {
      schemas: {
        SpotifyControl: zodToJsonSchema(spotifyControlSchema),
      },
    },
  },
  apis: ['./app/api/**/*.ts', './server.ts'],
}

const swaggerSpec = swaggerJsdoc(options)

export default swaggerSpec

import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HRM API',
      version: '1.0.0',
      description: 'API documentation for the HRM application',
    },
  },
  apis: ['./app/api/**/*.ts', './server.ts', './lib/api-contract.ts'], // files containing annotations as above
}

const swaggerSpec = swaggerJsdoc(options)

export default swaggerSpec

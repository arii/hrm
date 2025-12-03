import swaggerJsdoc from 'swagger-jsdoc'

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
        HealthStatus: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'unhealthy'] },
            services: {
              type: 'object',
              properties: {
                nextApp: { type: 'string' },
                webSocketServer: { type: 'string' },
                spotifyPollingService: { type: 'string' },
                tabataTimerService: { type: 'string' },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'string' },
          },
        },
        SpotifyDevice: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            is_active: { type: 'boolean' },
            is_private_session: { type: 'boolean' },
            is_restricted: { type: 'boolean' },
            name: { type: 'string' },
            type: { type: 'string' },
            volume_percent: { type: 'integer' },
          },
        },
        SpotifyPresetPlaylist: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                uri: { type: 'string' },
            },
        },
        SpotifyUserPlaylist: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                uri: { type: 'string' },
                description: { type: 'string', nullable: true },
                imageUrl: { type: 'string', nullable: true },
                trackCount: { type: 'integer' },
                owner: { type: 'string' },
                public: { type: 'boolean' },
            },
        },
        SpotifyTokenPayload: {
            type: 'object',
            properties: {
                sub: { type: 'string' },
                access_token: { type: 'string' },
                refresh_token: { type: 'string' },
                expires_in: { type: 'integer' },
                obtainedAt: { type: 'integer' },
            },
        },
        NextAuthSession: {
            type: 'object',
            properties: {
                user: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        email: { type: 'string' },
                        image: { type: 'string' },
                    },
                },
                expires: { type: 'string', format: 'date-time' },
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
            },
        },
        SpotifyTokenStatus: {
            type: 'object',
            properties: {
                status: { type: 'string', example: 'token_found' },
                userId: { type: 'string' },
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                expiresIn: { type: 'integer' },
                obtainedAt: { type: 'string', format: 'date-time' },
                expiresAt: { type: 'string', format: 'date-time' },
                isExpired: { type: 'boolean' },
                willExpireSoon: { type: 'boolean' },
            },
        },
      },
    },
  },
  apis: ['./app/api/**/*.ts', './server.ts', './lib/validation/schemas.ts'], // files containing annotations as above
}

const swaggerSpec = swaggerJsdoc(options)

export default swaggerSpec

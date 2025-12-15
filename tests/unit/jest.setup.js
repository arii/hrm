// tests/unit/jest.setup.js
process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/db'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.NEXTAUTH_SECRET = 'secret'
process.env.INTERNAL_TOKEN_DELIVERY_SECRET = 'secret'
process.env.SPOTIFY_CLIENT_ID = 'spotify-client-id'
process.env.SPOTIFY_CLIENT_SECRET = 'spotify-client-secret'

// tests/unit/jest.setup.js
/* eslint-disable @typescript-eslint/no-var-requires */
require('@testing-library/jest-dom')

process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.BASE_URL = 'http://localhost:3000'
process.env.SPOTIFY_CLIENT_ID = 'test'
process.env.SPOTIFY_CLIENT_SECRET = 'test'
process.env.SPOTIFY_CALLBACK_URL = 'http://localhost:3000/callback'
process.env.INTERNAL_TOKEN_DELIVERY_SECRET = 'test'
process.env.GOOGLE_DOC_WORKOUT_URL = 'https://docs.google.com/document/d/123/edit'

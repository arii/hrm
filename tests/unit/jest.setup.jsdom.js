// tests/unit/jest.setup.jsdom.js
import '@testing-library/jest-dom'

process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.SPOTIFY_CLIENT_ID = 'test_client_id'
process.env.SPOTIFY_CLIENT_SECRET = 'test_client_secret'
process.env.TESTING = 'true'

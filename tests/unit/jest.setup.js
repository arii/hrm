// tests/unit/jest.setup.js
/* eslint-disable @typescript-eslint/no-var-requires */
require('@testing-library/jest-dom')

// Set up environment variables for tests
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.SPOTIFY_CLIENT_ID = 'test-spotify-client-id'
process.env.SPOTIFY_CLIENT_SECRET = 'test-spotify-client-secret'
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret'

const React = require('react');

jest.mock('react-window', () => ({
  FixedSizeList: jest.fn(({ children, itemCount, ...rest }) => {
    const items = [];
    for (let i = 0; i < itemCount; i++) {
      items.push(children({ index: i, style: {} }));
    }
    return React.createElement('div', rest, items);
  }),
  VariableSizeList: jest.fn(({ children, itemData, ...rest }) => {
    const items = itemData.map((item, index) => children({ index, style: {}, data: itemData }));
    return React.createElement('div', rest, items);
  }),
}))

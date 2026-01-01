// tests/unit/jest.setup.js
/* eslint-disable @typescript-eslint/no-var-requires */
require('@testing-library/jest-dom')

// Set up environment variables for tests
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.SPOTIFY_CLIENT_ID = 'test-spotify-client-id'
process.env.SPOTIFY_CLIENT_SECRET = 'test-spotify-client-secret'
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret'

const React = require('react');

jest.mock('react-window', () => {
  const React = require('react');
  const FixedSizeList = React.forwardRef(({ children, itemCount, ...rest }, ref) => {
    const items = [];
    for (let i = 0; i < itemCount; i++) {
      items.push(children({ index: i, style: {} }));
    }
    return React.createElement('div', { ...rest, ref }, items);
  });

  const VariableSizeList = React.forwardRef(({ children, itemData, ...rest }, ref) => {
    const items = itemData.map((item, index) => children({ index, style: {}, data: itemData }));
    return React.createElement('div', { ...rest, ref }, items);
  });

  return {
    FixedSizeList,
    VariableSizeList,
  };
});

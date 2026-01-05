// tests/unit/__mocks__/recharts.js
module.exports = {
  ...jest.requireActual('recharts'),
  ResponsiveContainer: ({ children }) => children,
}

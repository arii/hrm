// tests/__mocks__/recharts.tsx
import React from 'react';

// Mock Recharts components to prevent errors in Jest environment
// and allow testing components that use them.
export const ResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="ResponsiveContainer">{children}</div>
);
export const LineChart = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="LineChart">{children}</div>
);
export const Line = () => <div data-testid="Line" />;
export const XAxis = () => <div data-testid="XAxis" />;
export const YAxis = () => <div data-testid="YAxis" />;
export const CartesianGrid = () => <div data-testid="CartesianGrid" />;
export const Tooltip = () => <div data-testid="Tooltip" />;
export const Legend = () => <div data-testid="Legend" />;
// Add any other Recharts exports used in the components under test.

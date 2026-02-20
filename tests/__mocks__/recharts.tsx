// tests/__mocks__/recharts.tsx

import React from 'react'

// A generic stub component for recharts components
const RechartsStub = (props: {
  'data-testid'?: string
  children?: React.ReactNode
}) => {
  return (
    <div data-testid={props['data-testid'] || 'recharts-stub'}>
      {props.children}
    </div>
  )
}

// Export all used recharts components as the stub
export const LineChart = RechartsStub
export const Line = RechartsStub
export const XAxis = RechartsStub
export const YAxis = RechartsStub
export const CartesianGrid = RechartsStub
export const Tooltip = RechartsStub
export const Legend = RechartsStub
export const ResponsiveContainer = RechartsStub
export const PieChart = RechartsStub
export const Pie = RechartsStub
export const Cell = RechartsStub

// If there's a default export in recharts that's used, add:
// export default RechartsStub;

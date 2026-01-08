import React from 'react'

export const LineChart = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="mock-LineChart">{children}</div>
)
export const Line = () => <div data-testid="mock-Line" />
export const XAxis = () => <div data-testid="mock-XAxis" />
export const YAxis = () => <div data-testid="mock-YAxis" />
export const CartesianGrid = () => <div data-testid="mock-CartesianGrid" />
export const Tooltip = () => <div data-testid="mock-Tooltip" />
export const Legend = () => <div data-testid="mock-Legend" />
export const ResponsiveContainer = ({
  children,
}: {
  children: React.ReactNode
}) => <div data-testid="mock-ResponsiveContainer">{children}</div>
// Add other recharts components as needed, e.g., AreaChart, BarChart, PieChart

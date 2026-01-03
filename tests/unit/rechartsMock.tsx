module.exports = {
  ResponsiveContainer: ({ children }: { children: any }) => (
    <div>{children}</div>
  ),
  LineChart: ({ children }: { children: any }) => <div>{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  ReferenceLine: () => <div />,
  PieChart: ({ children }: { children: any }) => <div>{children}</div>,
  Pie: ({ children }: { children: any }) => <div>{children}</div>,
  Cell: () => <div />,
}

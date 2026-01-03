import React from 'react';
module.exports = {
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  LineChart: ({ children }) => <div>{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  ReferenceLine: () => <div />,
  PieChart: ({ children }) => <div>{children}</div>,
  Pie: () => <div />,
  Cell: () => <div />,
};

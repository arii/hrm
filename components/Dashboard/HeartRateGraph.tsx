
// File: components/Dashboard/HeartRateGraph.tsx
'use client'
import React from 'react';
import { useTheme } from '@mui/material/styles';
import { HeartRateDataPoint } from '../../types/websocket';

interface HeartRateGraphProps {
  data: HeartRateDataPoint[];
}

const HeartRateGraph: React.FC<HeartRateGraphProps> = ({ data }) => {
  const theme = useTheme();

  if (data.length < 2) {
    return null; // Not enough data to draw a graph
  }

  const width = 100;
  const height = 40;
  const graphPadding = 8; // Use numeric value for padding, adhering to 8px grid

  const maxHr = Math.max(...data.map(p => p.value || 0), 100);
  const minHr = Math.min(...data.map(p => p.value || 0), 60);

  // TypeScript guard to ensure array elements exist
  const firstPoint = data[0];
  const lastPoint = data[data.length - 1];

  if (!firstPoint || !lastPoint) {
      return null; // Should not happen due to the length check, but satisfies TS
  }

  const maxTime = lastPoint.timestamp;
  const minTime = firstPoint.timestamp;

  const scaleX = (timestamp: number) => {
    if (maxTime === minTime) {
      return graphPadding; // Avoid division by zero
    }
    return ((timestamp - minTime) / (maxTime - minTime)) * (width - graphPadding * 2) + graphPadding;
  };

  const scaleY = (hr: number | null) => {
    if (hr === null) {
      return height - graphPadding;
    }
    if (maxHr === minHr) {
        return height / 2; // Avoid division by zero
    }
    return height - (((hr - minHr) / (maxHr - minHr)) * (height - graphPadding * 2) + graphPadding);
  };

  const pathData = data
    .map((p, i) => {
      if (p.value === null) {
        return '';
      }
      const x = scaleX(p.timestamp);
      const y = scaleY(p.value);

      const prevPoint = i > 0 ? data[i - 1] : null;
      if (i === 0 || prevPoint?.value === null) {
        return `M${x},${y}`;
      } else {
        return `L${x},${y}`;
      }
    })
    .filter(Boolean)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Heart Rate Graph">
      <title>Heart Rate over Time</title>
      <path d={pathData} stroke={theme.palette.error.main} strokeWidth={theme.spacing(0.25)} fill="none" />
    </svg>
  );
};

export default HeartRateGraph;

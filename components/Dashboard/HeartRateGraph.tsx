
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
  const padding = 5;

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
      return padding; // Avoid division by zero
    }
    return ((timestamp - minTime) / (maxTime - minTime)) * (width - padding * 2) + padding;
  };

  const scaleY = (hr: number | null) => {
    if (hr === null) {
      return height - padding;
    }
    if (maxHr === minHr) {
        return height / 2; // Avoid division by zero
    }
    return height - (((hr - minHr) / (maxHr - minHr)) * (height - padding * 2) + padding);
  };

  const pathData = data
    .map((p, i) => {
      const x = scaleX(p.timestamp);
      const y = scaleY(p.value);
      return (i === 0 ? 'M' : 'L') + `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Heart Rate Graph">
      <title>Heart Rate over Time</title>
      <path d={pathData} stroke={theme.palette.error.main} strokeWidth={theme.spacing(0.25)} fill="none" />
    </svg>
  );
};

export default HeartRateGraph;


// File: components/Dashboard/HeartRateGraph.tsx
'use client'
import React from 'react';
import { HeartRateDataPoint } from '../../types/websocket';

interface HeartRateGraphProps {
  data: HeartRateDataPoint[];
}

const HeartRateGraph: React.FC<HeartRateGraphProps> = ({ data }) => {
  if (data.length < 2) {
    return null; // Not enough data to draw a graph
  }

  const width = 100;
  const height = 40;
  const padding = 5;

  const maxHr = Math.max(...data.map(p => p.value || 0), 100);
  const minHr = Math.min(...data.map(p => p.value || 0), 60);

  const maxTime = data[data.length - 1].timestamp;
  const minTime = data[0].timestamp;

  const scaleX = (timestamp: number) => {
    return ((timestamp - minTime) / (maxTime - minTime)) * (width - padding * 2) + padding;
  };

  const scaleY = (hr: number | null) => {
    if (hr === null) {
      return height - padding;
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
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
      <path d={pathData} stroke="red" strokeWidth="2" fill="none" />
    </svg>
  );
};

export default HeartRateGraph;

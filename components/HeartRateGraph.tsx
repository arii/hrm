// File: components/HeartRateGraph.tsx
'use client'
import React from 'react';

interface HeartRateGraphProps {
  data: { time: number; bpm: number }[];
  width?: number;
  height?: number;
  lineColor?: string;
  lineWidth?: number;
}

const HeartRateGraph: React.FC<HeartRateGraphProps> = ({
  data,
  width = 500,
  height = 150,
  lineColor = 'red',
  lineWidth = 2,
}) => {
  if (data.length < 2) {
    return (
      <svg width={width} height={height} data-testid="heart-rate-graph">
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle">
          Awaiting data...
        </text>
      </svg>
    );
  }

  const padding = 5;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const maxBpm = Math.max(...data.map((d) => d.bpm), 100);
  const minBpm = Math.min(...data.map((d) => d.bpm), 60);

  const xScale = chartWidth / (data.length - 1);
  const yScale = chartHeight / (maxBpm - minBpm);

  const pathD = data
    .map((d, i) => {
      const x = i * xScale + padding;
      const y = chartHeight - (d.bpm - minBpm) * yScale + padding;
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} data-testid="heart-rate-graph">
      <path
        d={pathD}
        stroke={lineColor}
        strokeWidth={lineWidth}
        fill="none"
      />
    </svg>
  );
};

export default HeartRateGraph;

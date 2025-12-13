// components/Dashboard/HeartRateGraph.tsx
import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { HrmDataPoint } from '@/context/WebSocketContext';

interface HeartRateGraphProps {
  data: HrmDataPoint[];
}

const HeartRateGraph: React.FC<HeartRateGraphProps> = ({ data }) => {
  const width = 300;
  const height = 100;
  const padding = 10;

  const maxValue = Math.max(...data.map(p => p.value), 0);
  const minValue = Math.min(...data.map(p => p.value), Infinity);

  const getX = (index: number) => {
    return (index / (data.length - 1)) * (width - padding * 2) + padding;
  };

  const getY = (value: number) => {
    const yRange = maxValue - minValue;
    if (yRange === 0) {
      return height / 2;
    }
    return height - ((value - minValue) / yRange) * (height - padding * 2) - padding;
  };

  const pathData = data
    .map((point, index) => {
      const x = getX(index);
      const y = getY(point.value);
      return `${index === 0 ? 'M' : 'L'} ${x},${y}`;
    })
    .join(' ');

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="div">
          Heart Rate Trend
        </Typography>
        <Box sx={{ mt: (theme) => theme.spacing(2) }}>
          <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="A line graph showing the recent trend of heart rate data.">
            {data.length > 1 ? (
              <path d={pathData} fill="none" stroke="currentColor" strokeWidth="2" />
            ) : (
              <text x={width / 2} y={height / 2} textAnchor="middle">
                Not enough data to display graph
              </text>
            )}
          </svg>
        </Box>
      </CardContent>
    </Card>
  );
};

export default HeartRateGraph;

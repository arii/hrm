// components/analytics/ZoneDistributionChart.tsx
'use client';
import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Paper, Typography } from '@mui/material';
import { WorkoutDataPoint } from '@/hooks/useLocalWorkoutBuffer';
import { HrZoneName } from '@/lib/shared/hr-zones';
import { HR_ZONE_UI_PROPS_MAP } from '@/utils/visualization';

interface ZoneDistributionChartProps {
  data: WorkoutDataPoint[];
}

const ZoneDistributionChart: React.FC<ZoneDistributionChartProps> = ({
  data,
}) => {
  const chartData = useMemo(() => {
    const zoneDistribution = data.reduce(
      (acc, point) => {
        acc[point.zone] = (acc[point.zone] || 0) + 1;
        return acc;
      },
      {} as Record<HrZoneName, number>
    );

    return Object.entries(zoneDistribution).map(([zone, time]) => ({
      zone,
      time,
    }));
  }, [data]);

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Time in Heart Rate Zones
      </Typography>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="zone" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="time">
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={HR_ZONE_UI_PROPS_MAP[entry.zone as HrZoneName]?.progressColor}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default ZoneDistributionChart;

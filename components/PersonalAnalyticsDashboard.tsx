// components/PersonalAnalyticsDashboard.tsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatDuration } from '@/lib/utils';

/**
 * @interface AnalyticsProps
 * @description Props for the PersonalAnalyticsDashboard component.
 */
interface AnalyticsProps {
  /**
   * @property {Array<{time: number, hr: number}>} data - An array of heart rate data points over time.
   */
  data: Array<{time: number, hr: number}>;
  /**
   * @property {Record<string, number>} zoneDurations - An object mapping heart rate zones to their durations in seconds.
   */
  zoneDurations: Record<string, number>;
}

/**
 * @component PersonalAnalyticsDashboard
 * @description A component that displays a real-time heart rate graph and a table of time spent in each heart rate zone.
 * @param {AnalyticsProps} props - The props for the component.
 * @returns {React.FC}
 */
export const PersonalAnalyticsDashboard: React.FC<AnalyticsProps> = ({ data, zoneDurations }) => {
  const totalDuration = Object.values(zoneDurations).reduce((a, b) => a + b, 0);

  return (
    <div>
      <h2>Real-Time Heart Rate</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            tickFormatter={(time) => new Date(time).toLocaleTimeString()}
          />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="hr" stroke="#8884d8" activeDot={{ r: 8 }} />
        </LineChart>
      </ResponsiveContainer>

      <h2>Time in Zones</h2>
      <table>
        <thead>
          <tr>
            <th>Zone</th>
            <th>Duration</th>
            <th>% of Total</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(zoneDurations).map(([zone, duration]) => (
            <tr key={zone}>
              <td>{zone}</td>
              <td>{formatDuration(duration)}</td>
              <td>{totalDuration > 0 ? ((duration / totalDuration) * 100).toFixed(1) : 0}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

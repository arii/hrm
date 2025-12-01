// components/widgets/DataWidget.tsx
import React from 'react';
import { Typography, Box } from '@mui/material';
import DashboardWidget from './DashboardWidget';

interface DataWidgetProps {
  title: string;
  value: string | number;
  unit?: string;
}

const DataWidget: React.FC<DataWidgetProps> = ({ title, value, unit }) => {
  return (
    <DashboardWidget title={title}>
      <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
        <Typography variant="h4" component="span">
          {value}
        </Typography>
        {unit && (
          <Typography variant="subtitle1" component="span" sx={{ ml: 1 }}>
            {unit}
          </Typography>
        )}
      </Box>
    </DashboardWidget>
  );
};

export default DataWidget;

// File: components/widgets/DataWidget.tsx
import React from 'react';
import { Typography, Box } from '@mui/material';
import DashboardWidget from './DashboardWidget';
import { CardProps } from '@mui/material/Card';

interface DataWidgetProps extends CardProps {
  label: string;
  value: string | number;
  unit?: string;
}

const DataWidget: React.FC<DataWidgetProps> = ({ label, value, unit, ...cardProps }) => {
  return (
    <DashboardWidget {...cardProps}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography
          variant="h4"
          component="div"
          sx={{
            fontWeight: 'bold',
            fontFamily: 'var(--font-roboto-mono), monospace',
          }}
        >
          {value}
          {unit && (
            <Typography
              component="span"
              sx={{
                fontSize: '0.5em',
                verticalAlign: 'super',
                marginLeft: '4px',
              }}
            >
              {unit}
            </Typography>
          )}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ color: '#ccc' }}>
          {label}
        </Typography>
      </Box>
    </DashboardWidget>
  );
};

export default DataWidget;

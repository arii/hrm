// File: components/widgets/DashboardWidget.tsx
import React, { ReactNode } from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface DashboardWidgetProps {
  title: string;
  children: ReactNode;
}

const DashboardWidget: React.FC<DashboardWidgetProps> = ({ title, children }) => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" component="div" sx={{ mb: 2 }}>
          {title}
        </Typography>
        <Box>{children}</Box>
      </CardContent>
    </Card>
  );
};

export default DashboardWidget;

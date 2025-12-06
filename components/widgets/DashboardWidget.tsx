// File: components/widgets/DashboardWidget.tsx
import React, { ReactNode } from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface DashboardWidgetProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

const DashboardWidget: React.FC<DashboardWidgetProps> = ({ title, children, actions }) => {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
        <Typography variant="h6" component="div">
          {title}
        </Typography>
        {actions}
      </Box>
      <CardContent sx={{ flexGrow: 1 }}>
        {children}
      </CardContent>
    </Card>
  );
};

export default DashboardWidget;

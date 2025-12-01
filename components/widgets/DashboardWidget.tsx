// File: components/widgets/DashboardWidget.tsx
import React from 'react';
import { Card, CardProps, CardContent, CardContentProps, Typography, Box } from '@mui/material';

interface DashboardWidgetProps extends CardProps {
  title?: string;
  children: React.ReactNode;
  cardContentProps?: CardContentProps;
}

const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  title,
  children,
  cardContentProps,
  ...cardProps
}) => {
  return (
    <Card
      elevation={4}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        background: 'linear-gradient(to bottom right, #1a1a1a, #000)',
        color: 'white',
        ...cardProps.sx,
      }}
      {...cardProps}
    >
      {title && (
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" component="div">
            {title}
          </Typography>
        </Box>
      )}
      <CardContent
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          ...cardContentProps?.sx,
        }}
        {...cardContentProps}
      >
        {children}
      </CardContent>
    </Card>
  );
};

export default DashboardWidget;

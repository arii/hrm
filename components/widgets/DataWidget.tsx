import React from 'react'
import { Box, Typography, Divider } from '@mui/material'

interface DataItem {
  label: string
  value: string | number
}

interface DataWidgetProps {
  data: DataItem[]
}

const DataWidget = ({ data }: DataWidgetProps) => {
  return (
    <Box>
      {data.map((item, index) => (
        <React.Fragment key={item.label}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              py: 1.5,
            }}
          >
            <Typography variant="body1" color="text.secondary">
              {item.label}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {item.value}
            </Typography>
          </Box>
          {index < data.length - 1 && <Divider />}
        </React.Fragment>
      ))}
    </Box>
  )
}

export default DataWidget

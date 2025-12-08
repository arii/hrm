// File: components/widgets/DataWidget.tsx
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

interface DataWidgetProps {
  label: string
  value: string | number
}

const DataWidget = ({ label, value }: DataWidgetProps) => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
      <Typography variant="body1">{label}</Typography>
      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
        {value}
      </Typography>
    </Box>
  )
}

export default DataWidget

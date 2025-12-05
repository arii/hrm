// File: components/widgets/DataWidget.tsx
import Typography from '@mui/material/Typography'
import DashboardWidget from './DashboardWidget'

export interface DataWidgetProps {
  title: string
  label: string
  value: string | number
}

const DataWidget = ({ title, label, value }: DataWidgetProps) => {
  return (
    <DashboardWidget title={title}>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        {label}
      </Typography>
      <Typography variant="h4" component="div" sx={{ fontWeight: 'medium' }}>
        {value}
      </Typography>
    </DashboardWidget>
  )
}

export default DataWidget

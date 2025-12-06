import { Paper, PaperProps, styled } from '@mui/material'

const DashboardWidget = styled(Paper)<PaperProps>(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
}))

export default DashboardWidget

// components/shared/StyledCard.tsx
import Card, { CardProps } from '@mui/material/Card'
import { styled } from '@mui/material/styles'

const StyledCard = styled(Card)<CardProps>(({ theme }) => ({
  borderRadius: '12px',
  padding: theme.spacing(2),
  boxShadow: theme.shadows[3],
  border: 'none',
}))

export default StyledCard

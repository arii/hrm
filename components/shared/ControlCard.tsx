// components/shared/ControlCard.tsx
import Card, { CardProps } from '@mui/material/Card'
import { styled } from '@mui/material/styles'

const ControlCard = styled(Card)<CardProps>(({ theme }) => ({
  backdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: Number(theme.shape.borderRadius) * 1.5,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  padding: theme.spacing(2),
}))

export default ControlCard

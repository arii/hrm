import theme from '@/theme/theme'
import { CSSObject } from '@mui/material/styles'

describe('Theme', () => {
  it('should have the correct hover styles for MuiButton', () => {
    const buttonStyles = theme.components?.MuiButton?.styleOverrides
      ?.root as CSSObject
    expect(buttonStyles.transition).toBe(
      'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out'
    )
    expect(buttonStyles['&:hover']).toEqual({
      transform: 'scale(1.05)',
      boxShadow: '0 0 20px rgba(255, 255, 255, 0.5)',
    })
  })

  it('should have the correct ripple styles for MuiIconButton', () => {
    const iconButtonStyles = theme.components?.MuiIconButton?.styleOverrides
      ?.root as CSSObject
    expect(iconButtonStyles.position).toBe('relative')
    expect(iconButtonStyles.overflow).toBe('hidden')
    expect(iconButtonStyles['&::after']).toEqual({
      content: '""',
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: '5px',
      height: '5px',
      background: 'rgba(255, 255, 255, 0.3)',
      borderRadius: '50%',
      transform: 'scale(10, 10)',
      opacity: 0,
      transition: 'transform 0.3s, opacity 1s',
    })
    expect(iconButtonStyles['&:active::after']).toEqual({
      transform: 'scale(0, 0)',
      opacity: 0.5,
      transition: '0s',
    })
  })
})

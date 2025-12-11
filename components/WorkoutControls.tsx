import { Button, ButtonGroup } from '@mui/material'

const WorkoutControls = () => {
  return (
    <ButtonGroup variant="contained" aria-label="outlined primary button group">
      <Button>Start</Button>
      <Button>Pause</Button>
      <Button>Stop</Button>
    </ButtonGroup>
  )
}

export default WorkoutControls

// app/client/experimental/components/SessionList.tsx
import {
  List,
  ListItem,
  ListItemText,
  Typography,
  IconButton,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogActions,
  Button,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { WorkoutSessionData } from '@/lib/workout-session-storage'
import LiveDuration from './LiveDuration'
import { useState } from 'react'
import { formatDate } from '@/lib/utils'

interface SessionListProps {
  sessions: WorkoutSessionData[]
  onSelectSession: (session: WorkoutSessionData) => void
  onDeleteSession: (sessionId: string) => void
}

const getTotalCalories = (session: WorkoutSessionData) =>
  session.calorieHistory.length > 0
    ? (session.calorieHistory[session.calorieHistory.length - 1]
        ?.totalToThisPoint ?? 0)
    : 0

const SessionList = ({
  sessions,
  onSelectSession,
  onDeleteSession,
}: SessionListProps) => {
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)

  const handleDeleteClick = (sessionId: string) => {
    setSessionToDelete(sessionId)
  }

  const confirmDelete = () => {
    if (sessionToDelete) {
      onDeleteSession(sessionToDelete)
      setSessionToDelete(null)
    }
  }

  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h6">Workout History</Typography>
          {sessions.length === 0 && (
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              No workouts saved yet. Tap New Workout to record one.
            </Typography>
          )}
          <List>
            {sessions.map((session) => (
              <ListItem
                key={session.sessionId}
                // One summary card per session: date, duration and
                // calories readable at a glance.
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  mb: 1.5,
                  py: 1.5,
                }}
                secondaryAction={
                  <>
                    <IconButton
                      edge="end"
                      aria-label="view"
                      onClick={() => onSelectSession(session)}
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleDeleteClick(session.sessionId)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </>
                }
              >
                <ListItemText
                  slotProps={{
                    primary: { variant: 'h6', sx: { fontWeight: 700 } },
                    secondary: {
                      variant: 'body1',
                      component: 'div',
                      color: 'text.primary',
                    },
                  }}
                  primary={`Workout - ${formatDate(session.startTime, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}`}
                  secondary={
                    <>
                      <LiveDuration
                        startTime={session.startTime}
                        endTime={session.endTime}
                      />
                      <Typography
                        variant="body1"
                        component="span"
                        sx={{ display: 'block', fontWeight: 700 }}
                      >
                        Calories: {getTotalCalories(session).toFixed(0)} kCal
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
      <Dialog open={!!sessionToDelete} onClose={() => setSessionToDelete(null)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogActions>
          <Button onClick={() => setSessionToDelete(null)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default SessionList

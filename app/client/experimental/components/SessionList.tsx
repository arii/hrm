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
import { WorkoutSessionData } from '@/lib/sessionDataValidator'
import { useState, useMemo } from 'react'

interface SessionListProps {
  sessions: WorkoutSessionData[]
  onSelectSession: (session: WorkoutSessionData) => void
  onDeleteSession: (sessionId: string) => void
}

const getTotalCalories = (session: WorkoutSessionData) =>
  session.calorieHistory.reduce((total, dp) => total + dp.calories, 0)

const getDurationInMinutes = (session: WorkoutSessionData, now: number) =>
  session.endTime
    ? (session.endTime - session.startTime) / 60000
    : (now - session.startTime) / 60000

const SessionList = ({
  sessions,
  onSelectSession,
  onDeleteSession,
}: SessionListProps) => {
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)
  const now = useMemo(() => Date.now(), [])

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
          <List>
            {sessions.map((session) => (
              <ListItem
                key={session.id}
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
                      onClick={() => handleDeleteClick(session.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </>
                }
              >
                <ListItemText
                  primary={`Workout - ${new Date(
                    session.startTime
                  ).toLocaleDateString()}`}
                  secondary={`Duration: ${getDurationInMinutes(
                    session,
                    now
                  ).toFixed(1)} mins | Calories: ${getTotalCalories(
                    session
                  ).toFixed(0)} kCal`}
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

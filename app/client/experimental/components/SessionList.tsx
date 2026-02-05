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
          <List>
            {sessions.map((session) => (
              <ListItem
                key={session.sessionId}
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
                      <Typography variant="caption">
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

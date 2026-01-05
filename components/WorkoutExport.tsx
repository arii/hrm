'use client'
import { Button } from '@mui/material'
import { generateFitFile } from '@/lib/export/fit-generator'

interface WorkoutExportProps {
  workoutData: {
    startTime: number
    durationSeconds: number
    totalCalories: number
    records: Array<{
      time: number
      hr: number
    }>
    userAge?: number
    userWeight?: number
  }
}

const WorkoutExport = ({ workoutData }: WorkoutExportProps) => {
  const handleExport = () => {
    if (workoutData.records.length === 0) return

    const blob = generateFitFile(workoutData)

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `workout-${new Date().toISOString()}.fit`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Button
      variant="contained"
      onClick={handleExport}
      disabled={workoutData.records.length === 0}
    >
      Export FIT
    </Button>
  )
}

export default WorkoutExport

'use client'
import { Button } from '@mui/material'
import { WorkoutExportData } from '@/types'
import { useState, useEffect } from 'react' // Import useState and useEffect

interface WorkoutExportProps {
  workoutData: WorkoutExportData
}

const WorkoutExport = ({ workoutData }: WorkoutExportProps) => {
  // State to hold the dynamically imported function
  const [generateFitFileFunction, setGenerateFitFileFunction] = useState<
    ((data: WorkoutExportData) => Blob) | null
  >(null)

  useEffect(() => {
    // Dynamically import the fit-generator on the client side only
    import('@/lib/export/fit-generator')
      .then((module) => {
        setGenerateFitFileFunction(() => module.generateFitFile)
      })
      .catch(console.error) // Basic error logging
  }, []) // Run once on client mount

  const handleExport = () => {
    if (workoutData.records.length === 0 || !generateFitFileFunction) return

    const blob = generateFitFileFunction(workoutData)

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
      disabled={workoutData.records.length === 0 || !generateFitFileFunction} // Disable until function is loaded
    >
      Export FIT
    </Button>
  )
}

export default WorkoutExport

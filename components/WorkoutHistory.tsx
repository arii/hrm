// File: components/WorkoutHistory.tsx
'use client';
import React from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from '@mui/material';
import { WorkoutStats } from '@/services/HeartRateService';

const fetchWorkouts = async (): Promise<WorkoutStats[]> => {
  const res = await fetch('/api/workouts');
  if (!res.ok) {
    throw new Error('Network response was not ok');
  }
  return res.json();
};

const WorkoutHistory: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: workouts, isLoading, isError } = useQuery('workouts', fetchWorkouts);

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error fetching workouts</div>;

  return (
    <TableContainer component={Paper}>
      <Button onClick={() => queryClient.invalidateQueries('workouts')}>Refresh</Button>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Duration</TableCell>
            <TableCell>Avg HR</TableCell>
            <TableCell>Calories</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {workouts?.map((workout, index) => (
            <TableRow key={index}>
              <TableCell>{new Date(workout.date).toLocaleDateString()}</TableCell>
              <TableCell>{(workout.duration / 60).toFixed(2)} mins</TableCell>
              <TableCell>{workout.averageHr.toFixed(0)} bpm</TableCell>
              <TableCell>{workout.caloriesBurned.toFixed(0)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default WorkoutHistory;

// app/api/workouts/route.ts
import { NextResponse } from 'next/server';
import { serviceContainer } from '../../../lib/serviceContainer';
import { WorkoutHistoryService } from '../../../services/workoutHistoryService';
import { z } from 'zod';

const workoutSchema = z.object({
  id: z.string().uuid({ message: "Invalid workout ID format" }),
  userId: z.string().min(1, { message: "User ID cannot be empty" }),
  timestamp: z.string().datetime({ message: "Invalid timestamp format" }),
  duration: z.number().positive({ message: "Duration must be positive" }),
  averageHeartRate: z.number().int().gt(0, { message: "Average heart rate must be greater than 0" }),
  maxHeartRate: z.number().int().gt(0, { message: "Max heart rate must be greater than 0" }),
  caloriesBurned: z.number().positive({ message: "Calories burned must be positive" }),
  trainingLoad: z.number(),
  zoneDistribution: z.object({
    zone1: z.number().int().nonnegative(),
    zone2: z.number().int().nonnegative(),
    zone3: z.number().int().nonnegative(),
    zone4: z.number().int().nonnegative(),
    zone5: z.number().int().nonnegative(),
  }),
});

const getService = () => {
  return serviceContainer.get<WorkoutHistoryService>('workoutHistoryService');
}

export async function GET(request: Request) {
  const service = getService();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id) {
    const workout = await service.getWorkoutById(id);
    if (workout) {
      return NextResponse.json(workout);
    }
    return NextResponse.json({ message: 'Workout not found' }, { status: 404 });
  }

  const history = await service.getHistory();
  return NextResponse.json(history);
}

export async function POST(request: Request) {
  const service = getService();
  try {
    const body = await request.json();
    const newWorkoutData = workoutSchema.parse(body);
    const newWorkout = await service.addWorkout(newWorkoutData);
    return NextResponse.json(newWorkout, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid workout data', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Failed to create workout' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const service = getService();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ message: 'Workout ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const updatedWorkoutData = workoutSchema.partial().parse(body);
    const updatedWorkout = await service.updateWorkout(id, updatedWorkoutData);

    if (updatedWorkout) {
      return NextResponse.json(updatedWorkout);
    }
    return NextResponse.json({ message: 'Workout not found' }, { status: 404 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid workout data', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Failed to update workout' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const service = getService();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ message: 'Workout ID is required' }, { status: 400 });
  }

  const success = await service.deleteWorkout(id);
  if (success) {
    return NextResponse.json({ message: 'Workout deleted successfully' });
  }
  return NextResponse.json({ message: 'Workout not found' }, { status: 404 });
}

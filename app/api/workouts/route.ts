// File: app/api/workouts/route.ts
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const WORKOUTS_FILE = path.join(process.cwd(), 'logs', 'workouts.json');

async function readWorkouts() {
  try {
    const data = await fs.readFile(WORKOUTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function writeWorkouts(workouts: any[]) {
  await fs.writeFile(WORKOUTS_FILE, JSON.stringify(workouts, null, 2));
}

export async function GET() {
  const workouts = await readWorkouts();
  return NextResponse.json(workouts);
}

export async function POST(request: Request) {
  const workout = await request.json();
  const workouts = await readWorkouts();
  workouts.push(workout);
  await writeWorkouts(workouts);
  return NextResponse.json(workout, { status: 201 });
}

// types/heart-rate.ts
import { HrZoneName } from '../lib/shared/hr-zones';

export interface HrZone {
  zoneName: HrZoneName;
  percentage: number;
  bpm: number;
}

export interface UserHrZones {
  warmUp: { min: number };
  fatBurn: { min: number };
  cardio: { min: number };
  peak: { min: number };
  max: { min: number };
}

export interface HrData {
  bpm: number;
  percentMax: number; // 0-100
}

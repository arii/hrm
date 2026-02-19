declare module '@garmin/fitsdk' {
  export interface FileIdMessage {
    mesgNum: 0
    type: number
    manufacturer: number
    product: number
    serialNumber: number
    timeCreated: number
  }

  export interface RecordMessage {
    mesgNum: 20
    timestamp: number
    heartRate: number
  }

  export interface SessionMessage {
    mesgNum: 18
    timestamp: number
    startTime: number
    totalTimerTime: number
    totalElapsedTime: number
    totalCalories: number
    avgHeartRate: number
    maxHeartRate: number
    event: number
    eventType: number
    sport: number
    subSport: number
    trigger: number
  }

  export type FitMessage = FileIdMessage | RecordMessage | SessionMessage

  export class Encoder {
    constructor(options?: unknown)
    writeMesg(mesg: FitMessage): void
    close(): Uint8Array
  }
}

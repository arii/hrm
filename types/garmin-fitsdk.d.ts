declare module '@garmin/fitsdk' {
  export class Encoder {
    constructor()
    write(message: FileIdMessage | RecordMessage | SessionMessage): void
    close(): Uint8Array
  }

  export interface FileIdMessage {
    fileId: {
      type: number
      manufacturer: number
      product: number
      serialNumber: number
      timeCreated: Date
    }
  }

  export interface RecordMessage {
    record: {
      timestamp: Date
      heartRate: number
      calories?: number
    }
  }

  export interface SessionMessage {
    session: {
      timestamp: Date
      startTime: Date
      totalElapsedTime: number
      totalTimerTime: number
      totalCalories: number
      avgHeartRate: number
      maxHeartRate: number
    }
  }
}

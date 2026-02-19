declare module '@garmin/fitsdk' {
  export interface FitMessage {
    mesgNum: number
    timestamp?: number
    [key: string]: unknown
  }

  export class Encoder {
    constructor(options?: unknown)
    writeMesg(mesg: FitMessage): void
    close(): Uint8Array
  }
}

declare module '@garmin/fitsdk' {
  export namespace Profile {
    export enum MesgNum {
      FILE_ID = 0,
      SESSION = 18,
      LAP = 19,
      RECORD = 20,
      EVENT = 21,
      DEVICE_INFO = 23,
      ACTIVITY = 34,
    }
  }

  export class Encoder {
    constructor(fileType: number, protocolVersion: number)
    onMesg(mesgNum: number, fields: Record<string, unknown>): void
    close(): Uint8Array
  }
}

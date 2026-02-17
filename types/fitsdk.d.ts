declare module '@garmin/fitsdk' {
  export class Encoder {
    constructor()
    writeMesg(message: Record<string, unknown>): void
    close(): Uint8Array
  }

  export namespace Profile {
    export enum MesgNum {
      FILE_ID = 0,
      SESSION = 18,
      RECORD = 20,
    }
  }
}

declare module '@garmin/fitsdk' {
  export class Encoder {
    constructor()
    writeMesg(message: { mesgNum: number; [key: string]: unknown }): void
    close(): Uint8Array
  }

  export namespace Profile {
    export enum MesgNum {
      FILE_ID = 0,
      SESSION = 18,
      RECORD = 20,
    }

    // The SDK exports value->string maps at runtime.
    // We declare the specific maps available on the Profile object to support type-safe access.
    export const types: {
      file: Record<number, string>
      manufacturer: Record<number, string>
      sport: Record<number, string>
    }
  }
}

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

    // SDK exports these as maps (value -> string), but we need the constants (string -> value).
    // Since SDK doesn't export them, we can't augment the namespace with values.
    // However, we can declare that they exist if we were to use them, but we can't because they don't exist at runtime as enums.
    // So we only declare what exists.
    export const types: {
      file: Record<number, string>
      manufacturer: Record<number, string>
      sport: Record<number, string>
    }
  }
}

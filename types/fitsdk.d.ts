declare module '@garmin/fitsdk' {
  export class Encoder {
    constructor(options?: { fieldDescriptions?: Record<string, unknown> })
    writeMesg(message: Record<string, unknown>): void
    close(): Uint8Array
  }

  export namespace Profile {
    export enum MesgNum {
      FILE_ID = 0,
      SESSION = 18,
      RECORD = 20,
    }

    export namespace types {
      export namespace file {
        export const ACTIVITY: number
      }

      export namespace manufacturer {
        export const DEVELOPMENT: number
      }

      export namespace sport {
        export const GENERIC: number
      }
    }
  }
}

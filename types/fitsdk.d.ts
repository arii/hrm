declare module '@garmin/fitsdk' {
  export namespace Stream {
    class MemoryStream {
      constructor()
      bytes: Uint8Array
    }
  }

  export class Encoder {
    constructor(stream: Stream.MemoryStream)
    writeMesg(message: Record<string, unknown>): void
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

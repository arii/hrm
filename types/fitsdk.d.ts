declare module '@garmin/fitsdk' {
  export namespace Stream {
    class MemoryStream {
      constructor()
      // Use any to avoid "Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'BlobPart'"
      // due to mismatching ArrayBuffer definitions in strict CI environments.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bytes: any
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

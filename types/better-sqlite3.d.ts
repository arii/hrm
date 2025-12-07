/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'better-sqlite3' {
  import { EventEmitter } from 'events'

  interface Statement {
    database: Database
    source: string
    reader: boolean
    busy: boolean

    run(...params: any[]): Database.RunResult
    get(...params: any[]): any
    all(...params: any[]): any[]
    iterate(...params: any[]): IterableIterator<any>
    pluck(toggleState?: boolean): this
    expand(toggleState?: boolean): this
    raw(toggleState?: boolean): this
    bind(...params: any[]): this
  }

  interface Transaction {
    (...params: any[]): any
    default(...params: any[]): any
    deferred(...params: any[]): any
    immediate(...params: any[]): any
    exclusive(...params: any[]): any
  }

  interface Database extends EventEmitter {
    memory: boolean
    readonly: boolean
    name: string
    open: boolean
    inTransaction: boolean

    prepare(source: string): Statement
    transaction(fn: (...params: any[]) => any): Transaction
    exec(source: string): this
    pragma(source: string, options?: { simple: true }): any
    pragma(source: string, options?: { simple: false }): any[]
    backup(
      destinationFile: string,
      options?: Database.BackupOptions
    ): Promise<Database.BackupMetadata>
    serialize(options?: { attached?: string }): Buffer
    function(name: string, cb: (...params: any[]) => any): this
    function(
      name: string,
      options: {
        varargs?: boolean
        deterministic?: boolean
        directOnly?: boolean
      },
      cb: (...params: any[]) => any
    ): this
    aggregate(
      name: string,
      options: {
        start?: any
        step: (total: any, next: any) => any
        inverse?: (total: any, dropped: any) => any
        result?: (total: any) => any
        varargs?: boolean
        deterministic?: boolean
        directOnly?: boolean
      }
    ): this
    loadExtension(path: string): this
    close(): this
    defaultSafeIntegers(toggleState?: boolean): this
    unsafeMode(unsafe?: boolean): this

    [Symbol.iterator](): IterableIterator<any>
  }

  namespace Database {
    interface RunResult {
      changes: number
      lastInsertRowid: number | bigint
    }

    interface BackupOptions {
      progress?: (info: BackupMetadata) => number
    }

    interface BackupMetadata {
      totalPages: number
      remainingPages: number
    }

    interface Options {
      memory?: boolean
      readonly?: boolean
      fileMustExist?: boolean
      timeout?: number
      verbose?: (...args: any[]) => void
    }

    interface SqliteError extends Error {
      name: string
      code: string
    }
  }

  function Database(filename: string, options?: Database.Options): Database

  export = Database
}

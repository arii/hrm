import type { Database, Statement } from 'better-sqlite3'

/**
 * A simple cache for prepared SQLite statements.
 * This avoids the overhead of re-preparing the same SQL query repeatedly.
 *
 * @template T - An object type where keys are statement names and values are SQL strings.
 */
export class StmtCache<T extends Record<string, string>> {
  private cache: Map<keyof T, Statement> = new Map()
  private db: Database

  /**
   * Initializes a new instance of the StmtCache.
   * @param db - The better-sqlite3 database instance.
   * @param statements - An object containing the SQL statements to prepare.
   */
  constructor(db: Database, statements: T) {
    this.db = db
    this.prepareAll(statements)
  }

  /**
   * Prepares all provided SQL statements and caches them.
   * @param statements - An object of SQL queries.
   */
  private prepareAll(statements: T): void {
    for (const key in statements) {
      if (Object.prototype.hasOwnProperty.call(statements, key)) {
        const sql = statements[key]
        if (typeof sql === 'string') {
          this.cache.set(key, this.db.prepare(sql))
        }
      }
    }
  }

  /**
   * Retrieves a prepared statement from the cache.
   * Throws an error if the statement is not found.
   *
   * @param name - The name of the statement to retrieve.
   * @returns The cached `Statement` object.
   */
  public get(name: keyof T): Statement {
    const stmt = this.cache.get(name)
    if (!stmt) {
      throw new Error(`Statement "${String(name)}" not found in cache.`)
    }
    return stmt
  }
}

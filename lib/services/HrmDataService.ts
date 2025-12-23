// lib/services/HrmDataService.ts
import sqlite3 from 'sqlite3'
import { HrmStreamData } from '../../types/core'

const DB_FILE = 'hrm_data.sqlite'

export class HrmDataService {
  private db: sqlite3.Database | null = null
  private dbFile: string

  constructor(dbFile: string = DB_FILE) {
    this.dbFile = dbFile
  }

  async init(): Promise<void> {
    if (this.db) {
      return
    }

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbFile, (err) => {
        if (err) {
          console.error('Error opening database', err)
          reject(err)
        } else {
          const sql = `
            CREATE TABLE IF NOT EXISTS hrm_data (
              clientId TEXT PRIMARY KEY,
              value INTEGER,
              maxHr INTEGER,
              age INTEGER,
              calories REAL,
              name TEXT,
              restingHr INTEGER
            )
          `
          this.db!.run(sql, (err) => {
            if (err) {
              console.error('Error creating table', err)
              reject(err)
            } else {
              resolve()
            }
          })
        }
      })
    })
  }

  async save(data: HrmStreamData): Promise<void> {
    await this.init()
    const sql = `
      INSERT OR REPLACE INTO hrm_data (clientId, value, maxHr, age, calories, name, restingHr)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    const stmt = this.db!.prepare(sql)
    return new Promise((resolve, reject) => {
      stmt.run(
        [
          data.clientId,
          data.value,
          data.maxHr,
          data.age,
          data.calories,
          data.name,
          data.restingHr,
        ],
        (err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        }
      )
    })
  }

  async findById(id: string): Promise<HrmStreamData | undefined> {
    await this.init()
    const sql = 'SELECT * FROM hrm_data WHERE clientId = ?'
    const stmt = this.db!.prepare(sql)
    return new Promise((resolve, reject) => {
      stmt.get([id], (err, row: HrmStreamData) => {
        if (err) {
          reject(err)
        } else {
          resolve(row)
        }
      })
    })
  }

  async findAll(): Promise<HrmStreamData[]> {
    await this.init()
    const sql = 'SELECT * FROM hrm_data'
    return new Promise((resolve, reject) => {
      this.db!.all(sql, [], (err, rows: HrmStreamData[]) => {
        if (err) {
          reject(err)
        } else {
          resolve(rows)
        }
      })
    })
  }

  async deleteById(id: string): Promise<void> {
    await this.init()
    const sql = 'DELETE FROM hrm_data WHERE clientId = ?'
    const stmt = this.db!.prepare(sql)
    return new Promise((resolve, reject) => {
      stmt.run([id], (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  async clear(): Promise<void> {
    await this.init()
    const sql = 'DELETE FROM hrm_data'
    return new Promise((resolve, reject) => {
      this.db!.run(sql, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  async close(): Promise<void> {
    if (!this.db) {
      return
    }
    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) {
          reject(err)
        } else {
          this.db = null
          resolve()
        }
      })
    })
  }
}

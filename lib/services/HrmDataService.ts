// lib/services/HrmDataService.ts
import sqlite3 from 'sqlite3';
import { HrmStreamData } from '../../types/core';

const DB_FILE = 'hrm_data.sqlite';

export class HrmDataService {
  private db: sqlite3.Database;

  constructor(dbFile: string = DB_FILE) {
    this.db = new sqlite3.Database(dbFile, (err) => {
      if (err) {
        console.error('Error opening database', err);
      } else {
        this.init();
      }
    });
  }

  private init(): void {
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
    `;
    this.db.run(sql, (err) => {
      if (err) {
        console.error('Error creating table', err);
      }
    });
  }

  save(data: HrmStreamData): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO hrm_data (clientId, value, maxHr, age, calories, name, restingHr)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.clientId,
      data.value,
      data.maxHr,
      data.age,
      data.calories,
      data.name,
      data.restingHr,
    ];
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  findById(id: string): Promise<HrmStreamData | undefined> {
    const sql = 'SELECT * FROM hrm_data WHERE clientId = ?';
    return new Promise((resolve, reject) => {
      this.db.get(sql, [id], (err, row: HrmStreamData) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  findAll(): Promise<HrmStreamData[]> {
    const sql = 'SELECT * FROM hrm_data';
    return new Promise((resolve, reject) => {
      this.db.all(sql, [], (err, rows: HrmStreamData[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  deleteById(id: string): Promise<void> {
    const sql = 'DELETE FROM hrm_data WHERE clientId = ?';
    return new Promise((resolve, reject) => {
      this.db.run(sql, [id], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  clear(): Promise<void> {
    const sql = 'DELETE FROM hrm_data';
    return new Promise((resolve, reject) => {
      this.db.run(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

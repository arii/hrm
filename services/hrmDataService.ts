// File: services/hrmDataService.ts
/**
 * Service for managing historical heart rate monitoring (HRM) data.
 * This service handles the storage and retrieval of heart rate data points
 * using a simple JSON file for persistence.
 */
import { promises as fs } from 'fs'
import path from 'path'
import { z } from 'zod'

// --- Constants ---
const HRM_DATA_PATH = path.join(process.cwd(), 'logs', 'hrm_data.json')

// --- Zod Schema for HRM Data Point ---
export const HrmDataPointSchema = z.object({
  timestamp: z.number(),
  hrm: z.number(),
  clientId: z.string(),
})

// --- TypeScript Type from Schema ---
export type HrmDataPoint = z.infer<typeof HrmDataPointSchema>

// --- In-memory cache for HRM data ---
let hrmDataCache: HrmDataPoint[] = []
let isCacheInitialized = false
let pendingWrites: HrmDataPoint[] = []
let writeTimeout: NodeJS.Timeout | null = null

const BATCH_INTERVAL = 5000 // 5 seconds

/**
 * Ensures the log directory and file exist.
 */
const ensureLogFile = async () => {
  try {
    await fs.mkdir(path.dirname(HRM_DATA_PATH), { recursive: true })
    await fs.access(HRM_DATA_PATH)
  } catch {
    // If the file doesn't exist, create it with an empty array.
    await fs.writeFile(HRM_DATA_PATH, JSON.stringify([]))
  }
}

/**
 * Initializes the in-memory cache from the JSON file.
 */
const initializeCache = async () => {
  if (isCacheInitialized) return
  await ensureLogFile()
  const fileContent = await fs.readFile(HRM_DATA_PATH, 'utf-8')
  hrmDataCache = JSON.parse(fileContent)
  isCacheInitialized = true
}

/**
 * Flushes the pending HRM data to the JSON file.
 */
export const flushHrmData = async () => {
  if (pendingWrites.length === 0) return
  if (writeTimeout) {
    clearTimeout(writeTimeout)
    writeTimeout = null
  }

  await initializeCache()
  hrmDataCache.push(...pendingWrites)
  pendingWrites = []
  await fs.writeFile(HRM_DATA_PATH, JSON.stringify(hrmDataCache, null, 2))
}

/**
 * Adds a new heart rate data point to the history.
 * @param dataPoint - The HRM data point to add.
 */
export const addHrmDataPoint = async (dataPoint: HrmDataPoint) => {
  await initializeCache()

  // Validate the data point against the schema.
  const validationResult = HrmDataPointSchema.safeParse(dataPoint)
  if (!validationResult.success) {
    throw new Error(`Invalid HRM data point: ${validationResult.error.message}`)
  }

  pendingWrites.push(dataPoint)

  if (!writeTimeout) {
    writeTimeout = setTimeout(flushHrmData, BATCH_INTERVAL)
  }
}

/**
 * Retrieves the heart rate data history.
 * @param since - An optional timestamp. If provided, only returns data points newer than this.
 * @returns An array of HRM data points.
 */
export const getHrmDataHistory = async (
  since?: number
): Promise<HrmDataPoint[]> => {
  await initializeCache()
  if (!since) {
    return [...hrmDataCache]
  }
  return hrmDataCache.filter((dp) => dp.timestamp > since)
}

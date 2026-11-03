import { parse, HTMLElement } from 'node-html-parser'
import { decode } from 'he'
import { WorkoutTableDto } from '@/types/workout'

/**
 * Block-level elements that start a new line inside a doc cell.
 * Elements like `ul`/`ol` are omitted as their children (`li`) are included
 * in this selector and provide the necessary breaks.
 */
const BLOCK_SELECTOR = 'div,p,h1,h2,h3,h4,h5,h6,li,blockquote'

/**
 * Splits a doc cell into its lines: first line is the timing header,
 * the rest are exercises.
 */
const extractCellLines = (cell: HTMLElement): string[] => {
  cell.querySelectorAll('br').forEach((br) => {
    br.replaceWith('\n')
  })

  cell.querySelectorAll(BLOCK_SELECTOR).forEach((block) => {
    block.insertAdjacentHTML('beforebegin', '\n')
    block.insertAdjacentHTML('afterend', '\n')
  })

  // Decode FIRST to handle &nbsp; correctly, then normalize each line.
  return decode(cell.text)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

type SplitExercise = { name: string; reps: string | null }

/**
 * Splits combined exercise lines, ported from previous_workouts:
 * "B. squat row 20 Floor press 15" -> two exercises, "Swings 20" -> one
 * with reps. Lines without trailing digits pass through untouched.
 */
const separateCombinedExercises = (exerciseName: string): SplitExercise[] => {
  // Groups are guaranteed present when the pattern matches; the defaults
  // below only satisfy the index-access checker, they never fire.
  const combined = exerciseName.match(/^(.+?)\s+(\d+)\s+(.+?)\s+(\d+)$/)
  if (combined) {
    const [, name1 = '', reps1 = '', name2 = '', reps2 = ''] = combined
    return [
      { name: name1.trim(), reps: reps1 || null },
      { name: name2.trim(), reps: reps2 || null },
    ]
  }
  const single = exerciseName.match(/^(.+?)\s+(\d+)$/)
  if (single) {
    const [, name = '', reps = ''] = single
    return [{ name: name.trim(), reps: reps || null }]
  }
  return [{ name: exerciseName, reps: null }]
}

/**
 * Parses raw HTML from a Google Doc export into workout phases.
 * The doc format is stable: one row, one column per phase; first line is
 * the timing header, the rest are exercises. Fully empty columns are
 * dropped (docs sometimes carry a trailing blank one); header-only phases
 * are kept — the UI renders them as note strips, not cards.
 */
export const parseGoogleDocTable = (html: string): WorkoutTableDto => {
  const root = parse(html)
  const table = root.querySelector('table')

  if (!table) {
    throw new Error('No table found in the Google Doc')
  }

  const firstRow = table.querySelector('tr')
  if (!firstRow) {
    return { headers: [], columns: [] }
  }

  const phases = firstRow
    .querySelectorAll('td, th')
    .map(extractCellLines)
    .filter((lines) => lines.length > 0)
    .map((lines) => ({
      header: lines[0] ?? '',
      exercises: lines
        .slice(1)
        .flatMap(separateCombinedExercises)
        .map(({ name, reps }) => (reps ? `${name} (${reps} reps)` : name)),
    }))

  if (phases.length === 0) {
    return { headers: [], columns: [] }
  }

  return {
    headers: phases.map((phase) => phase.header),
    columns: phases.map((phase) => phase.exercises),
  }
}

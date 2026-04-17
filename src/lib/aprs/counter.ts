export interface CounterStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const STORAGE_KEY = 'fmo_aprs_counter'

interface CounterState {
  time_slot: number
  counter: number
  last_updated?: string
}

function readState(storage: CounterStorage): CounterState | null {
  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as CounterState
    if (typeof parsed.time_slot !== 'number' || typeof parsed.counter !== 'number') {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export class AprsCounter {
  constructor(private readonly storage: CounterStorage) {}

  next(timeSlot: number): number {
    const state = readState(this.storage)
    const counter = state?.time_slot === timeSlot ? state.counter + 1 : 0

    const newState: CounterState = {
      time_slot: timeSlot,
      counter,
      last_updated: new Date().toISOString()
    }
    this.storage.setItem(STORAGE_KEY, JSON.stringify(newState))

    return counter
  }
}

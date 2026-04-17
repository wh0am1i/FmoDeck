import { create } from 'zustand'
import type { ServerStation, StationService } from '@/lib/station-service/client'

export type StationStatus = 'idle' | 'loading' | 'switching' | 'error'

export interface StationState {
  current: ServerStation | null
  list: ServerStation[]
  status: StationStatus
  error: Error | null

  loadCurrent: (svc: StationService) => Promise<void>
  loadList: (svc: StationService) => Promise<void>
  setCurrent: (svc: StationService, uid: number) => Promise<void>
  next: (svc: StationService) => Promise<void>
  prev: (svc: StationService) => Promise<void>
}

const INITIAL = {
  current: null as ServerStation | null,
  list: [] as ServerStation[],
  status: 'idle' as StationStatus,
  error: null as Error | null
}

function handleError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err))
}

export const stationStore = create<StationState>()((set) => ({
  ...INITIAL,

  loadCurrent: async (svc) => {
    try {
      const current = await svc.getCurrent()
      set({ current })
    } catch (err) {
      set({ status: 'error', error: handleError(err) })
    }
  },

  loadList: async (svc) => {
    set({ status: 'loading', error: null })
    try {
      const list = await svc.getListAll()
      set({ list, status: 'idle' })
    } catch (err) {
      set({ status: 'error', error: handleError(err) })
    }
  },

  setCurrent: async (svc, uid) => {
    set({ status: 'switching', error: null })
    try {
      await svc.setCurrent(uid)
      const current = await svc.getCurrent()
      set({ current, status: 'idle' })
    } catch (err) {
      set({ status: 'error', error: handleError(err) })
    }
  },

  next: async (svc) => {
    set({ status: 'switching', error: null })
    try {
      await svc.next()
      const current = await svc.getCurrent()
      set({ current, status: 'idle' })
    } catch (err) {
      set({ status: 'error', error: handleError(err) })
    }
  },

  prev: async (svc) => {
    set({ status: 'switching', error: null })
    try {
      await svc.prev()
      const current = await svc.getCurrent()
      set({ current, status: 'idle' })
    } catch (err) {
      set({ status: 'error', error: handleError(err) })
    }
  }
}))

export function resetStationForTest(): void {
  stationStore.setState({ ...INITIAL })
}

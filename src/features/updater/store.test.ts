import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetUpdaterStoreForTest, updaterStore } from './store'

const VALID_MANIFEST = {
  version: '0.1.6',
  url: 'https://x/fmodeck/android/FmoDeck_0.1.6_android.apk',
  sha256: 'a'.repeat(64),
  size: 1024,
  notes: 'changelog',
  publishedAt: '2026-04-19T12:00:00Z',
  minVersion: null
}

describe('updaterStore', () => {
  beforeEach(() => {
    resetUpdaterStoreForTest()
    vi.restoreAllMocks()
  })

  it('idle → checking → available when fresher version', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(VALID_MANIFEST)
    }))
    await updaterStore.getState().check('https://x', '0.1.5')
    const s = updaterStore.getState()
    expect(s.state).toBe('available')
    expect(s.manifest?.version).toBe('0.1.6')
  })

  it('idle when local >= remote', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(VALID_MANIFEST)
    }))
    await updaterStore.getState().check('https://x', '0.1.6')
    expect(updaterStore.getState().state).toBe('idle')
  })

  it('idle when HTTP fails (silent)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('net')))
    await updaterStore.getState().check('https://x', '0.1.5')
    expect(updaterStore.getState().state).toBe('idle')
  })

  it('idle when manifest malformed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ version: '0.1.6' })
    }))
    await updaterStore.getState().check('https://x', '0.1.5')
    expect(updaterStore.getState().state).toBe('idle')
  })

  it('dismiss clears to idle', () => {
    updaterStore.setState({ state: 'available', manifest: VALID_MANIFEST })
    updaterStore.getState().dismiss()
    expect(updaterStore.getState().state).toBe('idle')
  })

  it('setError flips to error', () => {
    updaterStore.getState().setError('boom')
    expect(updaterStore.getState().state).toBe('error')
    expect(updaterStore.getState().error).toBe('boom')
  })
})

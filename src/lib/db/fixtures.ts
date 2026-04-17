import type { QsoRecord } from '@/types/qso'

export function makeQso(overrides: Partial<QsoRecord> = {}): QsoRecord {
  return {
    timestamp: 1776038400000,
    freqHz: 144640000,
    fromCallsign: 'BA0AX',
    fromGrid: 'OM89',
    toCallsign: 'BY4SDL',
    toGrid: 'OM89',
    toComment: '',
    mode: 'FM',
    relayName: 'TestRelay',
    relayAdmin: 'BY0ADM',
    ...overrides
  }
}

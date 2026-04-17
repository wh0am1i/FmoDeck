import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import i18n from '@/i18n'
import { AprsGatewayClient, type AprsSendResponse } from '@/lib/aprs-gateway/client'
import { AprsCounter } from '@/lib/aprs/counter'
import { buildAprsPacket } from '@/lib/aprs/packet'
import { getTimeSlot } from '@/lib/aprs/signing'
import { parseCallsignSsid } from '@/lib/utils/callsign'

export type AprsAction = 'NORMAL' | 'STANDBY' | 'REBOOT'

const DEFAULT_GATEWAY = 'wss://fmoac.srv.ink/api/ws'

export interface AprsHistoryRecord {
  timestamp: string
  /** `send` / `success` / `fail` */
  operationType: 'send' | 'success' | 'fail'
  message: string
  raw: string
}

export interface AprsParams {
  mycall: string
  passcode: string
  secret: string
  tocall: string
  gatewayUrl: string
}

export type AprsStatus = 'idle' | 'sending' | 'success' | 'error'

export interface AprsState extends AprsParams {
  history: AprsHistoryRecord[]
  status: AprsStatus
  lastMessage: string

  setParams: (patch: Partial<AprsParams>) => void
  sendCommand: (action: AprsAction) => Promise<void>
  clearHistory: () => void
}

const INITIAL_PARAMS: AprsParams = {
  mycall: '',
  passcode: '',
  secret: '',
  tocall: '',
  gatewayUrl: DEFAULT_GATEWAY
}

const HISTORY_MAX = 20

function appendHistory(existing: AprsHistoryRecord[], rec: AprsHistoryRecord): AprsHistoryRecord[] {
  return [rec, ...existing].slice(0, HISTORY_MAX)
}

const ACTION_I18N_KEY: Record<AprsAction, string> = {
  NORMAL: 'aprsRemote.modeNormal',
  STANDBY: 'aprsRemote.modeStandby',
  REBOOT: 'aprsRemote.modeReboot'
}

export const aprsStore = create<AprsState>()(
  persist(
    (set, get) => ({
      ...INITIAL_PARAMS,
      history: [],
      status: 'idle',
      lastMessage: '',

      setParams: (patch) => set((s) => ({ ...s, ...patch })),

      sendCommand: async (action: AprsAction) => {
        const state = get()
        const mycallInput = state.mycall.trim()
        const passcode = state.passcode.trim()
        const secret = state.secret.trim()
        const tocallInput = state.tocall.trim() || mycallInput

        if (!mycallInput) throw new Error(i18n.t('aprsRemote.errMycall'))
        if (!passcode) throw new Error(i18n.t('aprsRemote.errPasscode'))
        if (!secret) throw new Error(i18n.t('aprsRemote.errSecret'))

        const { call: myCall, ssid: mySsid } = parseCallsignSsid(mycallInput)
        const { call: toCall, ssid: toSsid } = parseCallsignSsid(tocallInput)
        const timeSlot = getTimeSlot()
        const counter = new AprsCounter(window.localStorage).next(timeSlot)

        const rawPacket = buildAprsPacket({
          fromCall: myCall,
          fromSsid: mySsid,
          toCall,
          toSsid,
          action,
          timeSlot,
          counter,
          secret
        })

        const actionLabel = i18n.t(ACTION_I18N_KEY[action])
        const sendRec: AprsHistoryRecord = {
          timestamp: new Date().toISOString(),
          operationType: 'send',
          message: i18n.t('aprsRemote.sendLog', {
            from: `${myCall}-${mySsid}`,
            to: `${toCall}-${toSsid}`,
            action: actionLabel
          }),
          raw: rawPacket
        }
        set((s) => ({
          status: 'sending',
          lastMessage: i18n.t('aprsRemote.sendingStatus', { action: actionLabel }),
          history: appendHistory(s.history, sendRec)
        }))

        const gateway = new AprsGatewayClient(state.gatewayUrl)
        let resp: AprsSendResponse
        try {
          resp = await gateway.send({
            mycall: `${myCall}-${mySsid}`,
            passcode,
            tocall: `${toCall}-${toSsid}`,
            rawPacket
          })
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          const failRec: AprsHistoryRecord = {
            timestamp: new Date().toISOString(),
            operationType: 'fail',
            message: msg,
            raw: rawPacket
          }
          set((s) => ({
            status: 'error',
            lastMessage: msg,
            history: appendHistory(s.history, failRec)
          }))
          throw err
        }

        const resultRec: AprsHistoryRecord = {
          timestamp: resp.timestamp ?? new Date().toISOString(),
          operationType: resp.success ? 'success' : 'fail',
          message: resp.message,
          raw: resp.raw ?? rawPacket
        }
        set((s) => ({
          status: resp.success ? 'success' : 'error',
          lastMessage: resp.message,
          history: appendHistory(s.history, resultRec)
        }))
      },

      clearHistory: () => set({ history: [] })
    }),
    {
      name: 'fmodeck-aprs',
      // 敏感字段（passcode/secret）也持久化 —— 与 FmoLogs 对齐
      partialize: (s) => ({
        mycall: s.mycall,
        passcode: s.passcode,
        secret: s.secret,
        tocall: s.tocall,
        gatewayUrl: s.gatewayUrl,
        history: s.history
      })
    }
  )
)

export function resetAprsForTest(): void {
  aprsStore.setState({
    ...INITIAL_PARAMS,
    history: [],
    status: 'idle',
    lastMessage: ''
  })
}

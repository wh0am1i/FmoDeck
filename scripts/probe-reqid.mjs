const HOST = process.argv[2] ?? 'ws://fmo.local/ws'
const TIMEOUT_MS = 5000

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

function probeWithReqId() {
  return new Promise((resolve) => {
    const ws = new WebSocket(HOST)
    const reqId = genId()
    const result = { supports: false, echoed: null, error: null, responses: [] }
    const timer = setTimeout(() => {
      ws.close()
      resolve(result)
    }, TIMEOUT_MS)

    ws.onopen = () => {
      const req = { type: 'station', subType: 'getCurrent', reqId }
      console.log('→', JSON.stringify(req))
      ws.send(JSON.stringify(req))
    }

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        console.log('←', JSON.stringify(msg))
        result.responses.push(msg)
        if (msg.reqId === reqId) {
          result.supports = true
          result.echoed = msg.reqId
          clearTimeout(timer)
          ws.close()
          resolve(result)
        } else if (msg.type === 'station' || msg.subType?.endsWith('Response')) {
          // 响应来了但没 reqId
          result.echoed = msg.reqId ?? null
          clearTimeout(timer)
          ws.close()
          resolve(result)
        }
      } catch (e) {
        result.error = String(e)
      }
    }

    ws.onerror = (e) => {
      result.error = e.message ?? 'WebSocket error'
      clearTimeout(timer)
      resolve(result)
    }

    ws.onclose = (e) => {
      if (!result.supports && result.responses.length === 0) {
        result.error ??= `Closed: code=${e.code} reason=${e.reason}`
      }
      clearTimeout(timer)
      resolve(result)
    }
  })
}

console.log(`Probing ${HOST}...`)
const result = await probeWithReqId()
console.log('\n=== Probe Result ===')
console.log(JSON.stringify(result, null, 2))
console.log(
  result.supports
    ? '\n✅ 服务端支持 reqId 回传（走路线 A）'
    : '\n❌ 不支持 reqId（走路线 B · 串行队列）'
)
process.exit(result.supports ? 0 : 1)

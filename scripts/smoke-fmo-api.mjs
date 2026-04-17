// 直接跑 TS 源（用 tsx）不方便；简化：直接在 Node 中实现等价逻辑，
// 验证 "请求→subTypeResponse" 协议工作正常，且并发请求能按序完成。

const HOST = process.argv[2] ?? 'ws://fmo.local/ws'
const TIMEOUT_MS = 10000

async function test() {
  const ws = new WebSocket(HOST)
  await new Promise((r, j) => {
    ws.onopen = r
    ws.onerror = () => j(new Error('connect error'))
    setTimeout(() => j(new Error('connect timeout')), 5000)
  })
  console.log('✅ connected')

  const queue = []
  let inFlight = null

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (inFlight) {
      const responseSubType = `${inFlight.req.subType}Response`
      if (msg.type === inFlight.req.type && msg.subType === responseSubType) {
        clearTimeout(inFlight.timer)
        const r = inFlight.resolve
        inFlight = null
        r(msg)
        processQueue()
        return
      }
    }
    console.log('push:', JSON.stringify(msg).slice(0, 120))
  }

  function processQueue() {
    if (inFlight || queue.length === 0) return
    const next = queue.shift()
    const timer = setTimeout(() => {
      if (inFlight === flight) {
        inFlight = null
        next.reject(new Error('timeout'))
        processQueue()
      }
    }, TIMEOUT_MS)
    const flight = { ...next, timer }
    inFlight = flight
    ws.send(JSON.stringify(next.req))
  }

  function send(req) {
    return new Promise((resolve, reject) => {
      queue.push({ req, resolve, reject })
      processQueue()
    })
  }

  console.log('→ sending 2 concurrent requests...')
  const [r1, r2] = await Promise.all([
    send({ type: 'station', subType: 'getCurrent' }),
    send({ type: 'user', subType: 'getInfo' })
  ])

  console.log('✅ r1 (station/getCurrent):', JSON.stringify(r1).slice(0, 200))
  console.log('✅ r2 (user/getInfo):', JSON.stringify(r2).slice(0, 200))

  ws.close()
  console.log('\n🎉 Serial queue works end-to-end against fmo.local')
}

test().catch((e) => {
  console.error('❌', e.message)
  process.exit(1)
})

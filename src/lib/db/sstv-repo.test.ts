// src/lib/db/sstv-repo.test.ts
import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { sstvRepo } from './sstv-repo'

async function makeImage(
  mode: 'robot36' = 'robot36'
): Promise<Parameters<typeof sstvRepo.add>[0]> {
  const imageBlob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' })
  const thumbnailBlob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' })
  return {
    mode,
    width: 320,
    height: 240,
    imageBlob,
    thumbnailBlob
  }
}

afterEach(async () => {
  await sstvRepo.clear()
})

describe('sstv-repo', () => {
  it('add 后能 get 和 list', async () => {
    const img = await sstvRepo.add(await makeImage())
    expect(img.id).toBeTruthy()
    expect(img.createdAt).toBeGreaterThan(0)

    const list = await sstvRepo.list()
    expect(list).toHaveLength(1)
    expect(list[0]!.id).toBe(img.id)

    const got = await sstvRepo.get(img.id)
    expect(got?.id).toBe(img.id)
  })

  it('list 按 createdAt 降序(新在前)', async () => {
    const a = await sstvRepo.add(await makeImage())
    await new Promise((r) => setTimeout(r, 5))
    const b = await sstvRepo.add(await makeImage())
    const list = await sstvRepo.list()
    expect(list[0]!.id).toBe(b.id)
    expect(list[1]!.id).toBe(a.id)
  })

  it('list 支持 limit 分页', async () => {
    for (let i = 0; i < 5; i++) {
      await sstvRepo.add(await makeImage())
      await new Promise((r) => setTimeout(r, 2))
    }
    const page = await sstvRepo.list({ limit: 2 })
    expect(page).toHaveLength(2)
  })

  it('list 支持 before 游标', async () => {
    const records: Array<{ id: string; createdAt: number }> = []
    for (let i = 0; i < 3; i++) {
      const r = await sstvRepo.add(await makeImage())
      records.push({ id: r.id, createdAt: r.createdAt })
      await new Promise((r) => setTimeout(r, 5))
    }
    const page = await sstvRepo.list({ before: records[1]!.createdAt })
    expect(page).toHaveLength(1)
    expect(page[0]!.id).toBe(records[0]!.id)
  })

  it('delete 删单条', async () => {
    const img = await sstvRepo.add(await makeImage())
    await sstvRepo.delete(img.id)
    expect(await sstvRepo.get(img.id)).toBeNull()
    expect(await sstvRepo.list()).toHaveLength(0)
  })

  it('count 返回条数', async () => {
    expect(await sstvRepo.count()).toBe(0)
    await sstvRepo.add(await makeImage())
    await sstvRepo.add(await makeImage())
    expect(await sstvRepo.count()).toBe(2)
  })

  it('clear 清空所有', async () => {
    await sstvRepo.add(await makeImage())
    await sstvRepo.add(await makeImage())
    await sstvRepo.clear()
    expect(await sstvRepo.count()).toBe(0)
  })
})

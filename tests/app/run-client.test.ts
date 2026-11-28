import { describe, expect, it } from 'vitest'
import { createRunClient, type RunReply, type RunRequest } from '../../src/app/run-client'

describe('run client', () => {
  it('never lets a stale reply win', async () => {
    const sent: RunRequest[] = []
    const c = createRunClient(req => sent.push(req))
    const a = c.request({})
    const b = c.request({ riskFree: { '2027Q1': 5 } })
    c.onReply({ id: sent[1].id, run: 'new' as never, conditions: {} as never } as RunReply)
    c.onReply({ id: sent[0].id, run: 'old' as never, conditions: {} as never } as RunReply)
    expect((await b).run).toBe('new')
    await expect(Promise.race([a, Promise.resolve('pending')])).resolves.toBe('pending')
  })
})

describe('run client grid', () => {
  it('rebuilds the grid that cannot cross from the worker', async () => {
    const sent: RunRequest[] = []
    const c = createRunClient(req => sent.push(req))
    const p = c.request({})
    c.onReply({ id: sent[0].id, run: { nvidia: [] } as never, conditions: {} as never })
    expect((await p).run.grid.idx('2026Q3')).toBe(18)
  })
})

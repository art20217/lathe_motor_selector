import { describe, expect, it } from 'vitest'
import { deflectionCheck } from '../workpiece'

describe('工件撓曲檢核', () => {
  it('夾頭+尾座 D500 L2500 與 Python golden data 一致', () => {
    const r = deflectionCheck('chuck_tail', 500, 2500, 20000, 6000, 206e9, 0.02)
    expect(r.deflection).toBeCloseTo(0.004693, 3)
    expect(r.ok).toBe(true)
  })

  it('懸臂支撐 k=3，撓曲量遠大於夾頭+尾座', () => {
    const cantilever = deflectionCheck('chuck', 500, 2500, 20000, 6000, 206e9, 0.02)
    const chuckTail = deflectionCheck('chuck_tail', 500, 2500, 20000, 6000, 206e9, 0.02)
    expect(cantilever.deflection).toBeGreaterThan(chuckTail.deflection * 10)
  })

  it('L/D > 4 → 有尾座建議', () => {
    const r = deflectionCheck('chuck', 100, 500, 5000, 1500, 206e9, 0.05)
    expect(r.ldRatio).toBeCloseTo(5, 6)
    expect(r.advice.some((a) => a.includes('尾座'))).toBe(true)
  })

  it('L/D > 8 → 有中心架建議', () => {
    const r = deflectionCheck('chuck_tail', 50, 500, 5000, 1500, 206e9, 0.05)
    expect(r.ldRatio).toBe(10)
    expect(r.advice.some((a) => a.includes('中心架'))).toBe(true)
  })

  it('空心截面慣性矩正確', () => {
    const solid = deflectionCheck('chuck_tail', 100, 1000, 5000, 1500, 206e9, 0.1)
    const hollow = deflectionCheck('chuck_tail', 100, 1000, 5000, 1500, 206e9, 0.1, 80)
    expect(hollow.deflection).toBeGreaterThan(solid.deflection)
  })
})

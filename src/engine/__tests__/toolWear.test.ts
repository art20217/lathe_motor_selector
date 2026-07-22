import { describe, expect, it } from 'vitest'
import { VB_DEFAULT, VB_TABLE_MAX, wearMultipliers } from '../toolWear'

describe('刃口磨耗 VB 分力放大倍率', () => {
  it('VB=0（全新刃口）不放大', () => {
    expect(wearMultipliers(0)).toEqual({ fc: 1, ff: 1, fp: 1 })
    expect(wearMultipliers(-1)).toEqual({ fc: 1, ff: 1, fp: 1 })
  })

  it('VB=0.3mm 錨點值（ISO 3685 基準，與使用者提供數據點吻合）', () => {
    const w = wearMultipliers(VB_DEFAULT)
    expect(w.fc).toBeCloseTo(1.3, 6)
    expect(w.ff).toBeCloseTo(1.6, 6)
    expect(w.fp).toBeCloseTo(1.75, 6)
  })

  it('表格點之間線性內插', () => {
    const w = wearMultipliers(0.15)
    expect(w.fc).toBeCloseTo((1.08 + 1.18) / 2, 6)
    expect(w.ff).toBeCloseTo((1.15 + 1.35) / 2, 6)
    expect(w.fp).toBeCloseTo((1.2 + 1.45) / 2, 6)
  })

  it('超出表格上限：以末端值外插，不再放大', () => {
    const atMax = wearMultipliers(VB_TABLE_MAX)
    const beyond = wearMultipliers(1.0)
    expect(beyond).toEqual(atMax)
  })

  it('放大順序 Fp > Ff > Fc（磨耗對徑向/軸向影響大於主切削力）', () => {
    const w = wearMultipliers(0.3)
    expect(w.fp).toBeGreaterThan(w.ff)
    expect(w.ff).toBeGreaterThan(w.fc)
  })
})

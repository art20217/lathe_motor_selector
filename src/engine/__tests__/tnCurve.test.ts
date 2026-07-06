import { describe, expect, it } from 'vitest'
import {
  availableTorque,
  constPowerGaps,
  coveringGears,
  gearConstPowerBand,
  gearSpeedRange,
  motorTorque,
  sampleGearCurve,
  verifyCoverage,
} from '../tnCurve'
import type { DutyPoint, Gear, Motor } from '../types'

/** 測試馬達：22 kW / n_base 1500 / n_max 6000 → T_rated ≈ 140.05 N·m */
const motor: Motor = {
  id: 'm1',
  brand: 'TEST',
  model: 'T22',
  powerS1: 22,
  nBase: 1500,
  nMax: 6000,
  inertia: null,
  ratedCurrent: null,
  voltage: null,
  verified: true,
  note: '',
}

const gear = (ratio: number, efficiency = 0.95): Gear => ({ ratio, efficiency })

describe('Phase 3 T-n 特性與覆蓋驗證', () => {
  it('馬達 T-n 曲線：恆扭矩區 → 恆功率區 → 超出 n_max 為 0', () => {
    const tRated = (22 * 9549) / 1500
    expect(motorTorque(motor, 0)).toBeCloseTo(tRated, 6)
    expect(motorTorque(motor, 1500)).toBeCloseTo(tRated, 6)
    expect(motorTorque(motor, 3000)).toBeCloseTo(tRated / 2, 6)
    expect(motorTorque(motor, 6000)).toBeCloseTo(tRated / 4, 6)
    expect(motorTorque(motor, 6001)).toBe(0)
  })

  it('齒比映射：T_avail = T_motor(n_sp/i)·(1/i)·η', () => {
    const g = gear(0.25)
    const tRated = (22 * 9549) / 1500
    // n_sp = 300 → n_motor = 1200（恆扭矩區）
    expect(availableTorque(motor, g, 300)).toBeCloseTo((tRated / 0.25) * 0.95, 6)
    // n_sp = 1500 → n_motor = 6000（恆功率區末端）
    expect(availableTorque(motor, g, 1500)).toBeCloseTo((tRated / 4 / 0.25) * 0.95, 6)
    // n_sp = 1501 → n_motor > n_max，不可運轉
    expect(availableTorque(motor, g, 1501)).toBe(0)
  })

  it('檔位轉速範圍與恆功率帶', () => {
    const g = gear(0.25)
    expect(gearSpeedRange(motor, g)).toEqual([0, 1500])
    expect(gearConstPowerBand(motor, g)).toEqual([375, 1500])
  })

  it('覆蓋判定：低速大扭矩點僅由低檔覆蓋', () => {
    const gears = [gear(0.05), gear(0.12), gear(0.28), gear(0.65)]
    // n_sp = 100 → 一檔馬達端 2000 rpm（恆功率區），T_avail ≈ 1995.7 N·m
    const p: DutyPoint = { caseId: 'p1', name: '重切削', nSp: 100, TSp: 1900 }
    expect(coveringGears(motor, gears, p)).toEqual([0])
  })

  it('覆蓋驗證：扭矩不足的點回報未覆蓋與最大可用扭矩', () => {
    const gears = [gear(0.05), gear(0.12), gear(0.28), gear(0.65)]
    const points: DutyPoint[] = [
      { caseId: 'ok', name: '可覆蓋', nSp: 100, TSp: 1900 },
      { caseId: 'ng', name: '扭矩不足', nSp: 100, TSp: 2500 },
    ]
    const r = verifyCoverage(motor, gears, points)
    expect(r.allCovered).toBe(false)
    expect(r.perPoint[0].covered).toBe(true)
    expect(r.perPoint[1].covered).toBe(false)
    // 一檔 n_motor = 2000：T_avail = 22·9549/2000/0.05·0.95
    expect(r.perPoint[1].maxAvailable).toBeCloseTo(((22 * 9549) / 2000 / 0.05) * 0.95, 3)
  })

  it('覆蓋驗證：超出所有檔位轉速範圍的點未覆蓋', () => {
    const gears = [gear(0.05), gear(0.12), gear(0.28), gear(0.65)]
    // 四檔上限 n_sp = 6000×0.65 = 3900
    const r = verifyCoverage(motor, gears, [
      { caseId: 'fast', name: '超速', nSp: 4000, TSp: 10 },
    ])
    expect(r.perPoint[0].covered).toBe(false)
    expect(r.perPoint[0].maxAvailable).toBe(0)
  })

  it('恆功率帶盲區：i₂ > R_cp·i₁ 時出現縫隙', () => {
    // R_cp = 4：i = 0.05 帶 [75, 300]、i = 0.25 帶 [375, 1500] → 盲區 (300, 375)
    const gaps = constPowerGaps(motor, [gear(0.05), gear(0.25)])
    expect(gaps).toHaveLength(1)
    expect(gaps[0].from).toBeCloseTo(300, 6)
    expect(gaps[0].to).toBeCloseTo(375, 6)
  })

  it('恆功率帶相鄰重疊時無盲區', () => {
    const gaps = constPowerGaps(motor, [gear(0.05), gear(0.12), gear(0.28), gear(0.65)])
    expect(gaps).toEqual([])
  })

  it('曲線取樣：首末點與轉折點正確', () => {
    const g = gear(0.25)
    const pts = sampleGearCurve(motor, g, 10)
    const tRated = (22 * 9549) / 1500
    expect(pts[0]).toEqual({ n: 0, T: (tRated / 0.25) * 0.95 })
    expect(pts[1].n).toBeCloseTo(375, 6)
    expect(pts.at(-1)!.n).toBeCloseTo(1500, 6)
    expect(pts.at(-1)!.T).toBeCloseTo((tRated / 4 / 0.25) * 0.95, 4)
  })
})

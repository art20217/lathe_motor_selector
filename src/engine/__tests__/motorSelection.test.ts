import { describe, expect, it } from 'vitest'
import {
  constantPowerRatio,
  estimateEfficiency,
  filterCandidates,
  minMotorPower,
  ratedTorque,
} from '../motorSelection'
import type { Motor } from '../types'

const motor = (id: string, powerS1: number, nBase = 1500, nMax = 6000): Motor => ({
  id,
  brand: 'TEST',
  model: id,
  powerS1,
  nBase,
  nMax,
  inertia: null,
  ratedCurrent: null,
  voltage: null,
  verified: true,
  note: '',
})

describe('Phase 2 馬達候選篩選', () => {
  it('效率估算：五級 0.97 → 約 0.859（SOP 範例）', () => {
    expect(estimateEfficiency(0.97, 5)).toBeCloseTo(0.859, 3)
  })

  it('功率下限 P_min = max(Pc)/η × SF', () => {
    expect(minMotorPower(24.3, 0.859, 1.4)).toBeCloseTo((24.3 / 0.859) * 1.4, 6)
  })

  it('額定扭矩 T_rated = P·9549/n_base', () => {
    expect(ratedTorque(22, 1500)).toBeCloseTo(140.052, 3)
  })

  it('恆功率區速比 R_cp = n_max/n_base', () => {
    expect(constantPowerRatio(motor('m', 22))).toBe(4)
  })

  it('S1 篩選：邊界值（恰等於 P_min）視為通過', () => {
    const list = [motor('a', 15), motor('b', 22), motor('c', 30)]
    expect(filterCandidates(list, 22).map((m) => m.id)).toEqual(['b', 'c'])
  })
})

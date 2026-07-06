import { describe, expect, it } from 'vitest'
import {
  accelTime,
  cylinderMass,
  hollowCylinderInertia,
  reflectedInertia,
  solidCylinderInertia,
} from '../dynamics'

describe('Phase 4 慣量與加減速', () => {
  it('實心圓柱 J = ½mR²', () => {
    expect(solidCylinderInertia(2000, 0.5)).toBe(250)
  })

  it('空心圓柱 J = ½m(Ro² + Ri²)', () => {
    expect(hollowCylinderInertia(1000, 0.5, 0.3)).toBeCloseTo(170, 10)
  })

  it('圓柱質量 m = ρπ(Ro²−Ri²)L', () => {
    expect(cylinderMass(7850, 1, 0.5)).toBeCloseTo(7850 * Math.PI * 0.25, 4)
    expect(cylinderMass(7850, 1, 0.5, 0.3)).toBeCloseTo(7850 * Math.PI * 0.16, 4)
  })

  it('慣量折算：負載慣量乘 i²（減速時大幅縮小）', () => {
    expect(reflectedInertia(0.2, 250, 0.05, 0.05)).toBeCloseTo(0.875, 10)
  })

  it('加速時間 t = J·Δω/T_acc', () => {
    // J = 1 kg·m²，Δn = 1000 rpm → Δω = 104.72 rad/s，T = 100 N·m → 1.047 s
    expect(accelTime(1, 1000, 100)).toBeCloseTo(1.0472, 4)
  })
})

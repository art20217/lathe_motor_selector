import { describe, expect, it } from 'vitest'
import {
  accelTime,
  accelTimeCurve,
  cylinderMass,
  hollowCylinderInertia,
  reflectedInertia,
  solidCylinderInertia,
} from '../dynamics'
import type { Motor } from '../types'

const testMotor: Motor = {
  id: 'm1',
  brand: 'TEST',
  model: 'T22',
  powerS1: 22,
  powerS3: 26,
  nBase: 1500,
  nMax: 6000,
  inertia: 0.2,
  ratedCurrent: null,
  voltage: null,
  verified: true,
  note: '',
}

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

  it('數值積分：恆扭矩區內與線性式近似一致', () => {
    const jTotal = 1
    const nTo = 1000 // 在 n_base=1500 以內（恆扭矩區）
    const tRated = (22 * 9550) / 1500
    const tFriction = tRated * 0.05
    const linear = accelTime(jTotal, nTo, tRated - tFriction)
    const integral = accelTimeCurve(testMotor, 's1', jTotal, 0, nTo, tFriction)
    expect(integral).not.toBeNull()
    expect(Math.abs(integral! - linear) / linear).toBeLessThan(0.02)
  })

  it('數值積分：跨恆功率區時大於線性式', () => {
    const jTotal = 1
    const nTo = 4000 // 超過 n_base，進入恆功率區
    const tRated = (22 * 9550) / 1500
    const tFriction = tRated * 0.05
    const linear = accelTime(jTotal, nTo, tRated - tFriction)
    const integral = accelTimeCurve(testMotor, 's1', jTotal, 0, nTo, tFriction)
    expect(integral).not.toBeNull()
    expect(integral!).toBeGreaterThan(linear)
  })

  it('數值積分：S3 額定比 S1 更快', () => {
    const jTotal = 1
    const s1 = accelTimeCurve(testMotor, 's1', jTotal, 0, 3000, 5)
    const s3 = accelTimeCurve(testMotor, 's3', jTotal, 0, 3000, 5)
    expect(s1).not.toBeNull()
    expect(s3).not.toBeNull()
    expect(s3!).toBeLessThan(s1!)
  })

  it('數值積分：超過 n_max 回傳 null', () => {
    expect(accelTimeCurve(testMotor, 's1', 1, 0, 7000, 0)).toBeNull()
  })
})

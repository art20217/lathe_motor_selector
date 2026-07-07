import { describe, expect, it } from 'vitest'
import { bearingFriction, spindleLosses, windage } from '../spindleLosses'

describe('主軸機械損失', () => {
  it('軸承摩擦（圓錐滾子 dm=250 n=114.6）與 Python golden data 一致', () => {
    const r = bearingFriction(250, 114.6, 25000, 'taper', 30)
    expect(r.torque).toBeCloseTo(4.635, 1)
  })

  it('風阻（工件 D=500 L=2500 n=114.6）與 Python golden data 一致', () => {
    const r = windage(500, 2500, 114.6)
    expect(r.torque).toBeCloseTo(0.034, 2)
  })

  it('spindleLosses 合計合理', () => {
    const r = spindleLosses(1500, {
      bearings: [
        { dm: 250, preload: 25000, type: 'taper' },
        { dm: 180, preload: 15000, type: 'taper' },
      ],
      lubeViscosity: 30,
      wpDia: 500,
      wpLen: 2500,
      chuckDia: 800,
      chuckLen: 280,
    })
    expect(r.tTotal).toBeGreaterThan(0)
    expect(r.pTotal).toBeGreaterThan(0)
    expect(r.tTotal).toBeCloseTo(r.tBearing + r.tWindage, 6)
  })

  it('轉速為 0 時風阻為 0，軸承預壓項仍有靜態摩擦', () => {
    const r = spindleLosses(0, {
      bearings: [{ dm: 250, preload: 25000, type: 'taper' }],
      lubeViscosity: 30,
      wpDia: 500,
      wpLen: 2500,
      chuckDia: 800,
      chuckLen: 280,
    })
    expect(r.tWindage).toBe(0)
    expect(r.pTotal).toBe(0)
    expect(r.tBearing).toBeGreaterThan(0)
  })
})

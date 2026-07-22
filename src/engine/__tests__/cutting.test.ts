import { describe, expect, it } from 'vitest'
import {
  CHIP_THICKNESS_MIN,
  chipThickness,
  chipThicknessRound,
  computeDuty,
  cuttingForce,
  cuttingPower,
  specificCuttingForce,
  spindleSpeed,
  spindleTorque,
  spindleTorqueFromForce,
} from '../cutting'
import type { DutyCase } from '../types'

// vb 明確設為 0（全新刃口）：確保純 Kienzle 公式驗算不受磨耗放大干擾
const baseCase: DutyCase = {
  id: 'c1',
  name: '外徑粗車',
  operation: 'od',
  material: 'S45C',
  kc1: 1700,
  mc: 0.25,
  D: 800,
  ap: 8,
  fn: 0.5,
  vc: 180,
  kappaR: 95,
  gamma0: 6,
  gammaRef: 6,
  vb: 0,
  note: '',
}

describe('Phase 1 切削計算', () => {
  it('切屑厚度 h = fn·sin(κr)', () => {
    expect(chipThickness(0.5, 90)).toBeCloseTo(0.5, 10)
    expect(chipThickness(0.5, 95)).toBeCloseTo(0.5 * Math.sin((95 * Math.PI) / 180), 10)
  })

  it('h = 1 mm、γ0 = γref 時 kc = kc1（參考條件還原）', () => {
    expect(specificCuttingForce(1700, 0.25, 1, 6, 6)).toBeCloseTo(1700, 10)
  })

  it('前角每增大 1°，kc 約降 1%（Sandvik 線性修正）', () => {
    expect(specificCuttingForce(2000, 0.25, 1, 16, 6)).toBeCloseTo(2000 * 0.9, 10)
  })

  it('外徑粗車工況：手算對照（S45C、D800、ap8、fn0.5、vc180）', () => {
    const r = computeDuty(baseCase)
    const h = 0.5 * Math.sin((95 * Math.PI) / 180)
    const kc = 1700 * Math.pow(h, -0.25)
    const Fc = kc * 8 * 0.5
    expect(r.h).toBeCloseTo(h, 6)
    expect(r.kc).toBeCloseTo(kc, 3)
    expect(r.Fc).toBeCloseTo(Fc, 2)
    expect(r.Pc).toBeCloseTo((Fc * 180) / 60e3, 4) // ≈ 24.3 kW
    expect(r.nSp).toBeCloseTo((1000 * 180) / (Math.PI * 800), 4) // ≈ 71.6 rpm
  })

  it('交叉驗證：T_sp（功率式）與 T_sp = Fc·D/2·10⁻³（力臂式）一致', () => {
    const r = computeDuty(baseCase)
    expect(r.TSpCross).not.toBeNull()
    const rel = Math.abs(r.TSp - r.TSpCross!) / r.TSpCross!
    expect(rel).toBeLessThan(1e-3) // 9550 為 60000/2π 的工程慣用值，容許 1e-3 相對差
  })

  it('SOP 驗證式：Pc = T_sp·2π·n_sp/(60·10³) 與 Pc 一致', () => {
    const r = computeDuty(baseCase)
    const pcCheck = (r.TSp * 2 * Math.PI * r.nSp) / 60e3
    expect(Math.abs(r.Pc - pcCheck) / r.Pc).toBeLessThan(1e-4)
  })

  it('direct 模式：功率由 P = T·n/9550 反推', () => {
    const r = computeDuty({
      ...baseCase,
      operation: 'direct',
      directNSp: 100,
      directTSp: 955,
    })
    expect(r.nSp).toBe(100)
    expect(r.TSp).toBe(955)
    expect(r.Pc).toBeCloseTo((955 * 100) / 9550, 6) // ≈ 10.0 kW
    expect(r.h).toBeNull()
    expect(r.TSpCross).toBeNull()
  })

  it('切屑厚度鉗制下限 0.01 mm', () => {
    expect(chipThickness(0.001, 90)).toBe(CHIP_THICKNESS_MIN)
    expect(chipThickness(0.005, 90)).toBe(CHIP_THICKNESS_MIN)
    expect(chipThickness(0.02, 90)).toBe(0.02)
  })

  it('三分力 Ff/Fp 依 ffRatio/fpRatio 比例', () => {
    const r = computeDuty({ ...baseCase, ffRatio: 0.4, fpRatio: 0.3 })
    expect(r.Ff).toBeCloseTo(r.Fc! * 0.4, 2)
    expect(r.Fp).toBeCloseTo(r.Fc! * 0.3, 2)
  })

  it('direct 模式 Ff/Fp 為 null', () => {
    const r = computeDuty({ ...baseCase, operation: 'direct', directNSp: 100, directTSp: 955 })
    expect(r.Ff).toBeNull()
    expect(r.Fp).toBeNull()
  })

  it('vb 明確設為 0：wearApplied=false，分力不放大（全新刃口）', () => {
    const r = computeDuty(baseCase)
    expect(r.wearApplied).toBe(false)
  })

  it('vb 未設定（欄位缺省，如舊專案/匯入資料）：預設採 VB_DEFAULT=0.3mm 保守磨耗餘裕，而非全新刃口', () => {
    const { vb: _drop, ...caseWithoutVb } = baseCase
    const r = computeDuty(caseWithoutVb as DutyCase)
    const rSharp = computeDuty(baseCase) // vb=0 明確全新刃口，作為對照基準
    expect(r.wearApplied).toBe(true)
    expect(r.Fc).toBeCloseTo(rSharp.Fc! * 1.3, 2)
  })

  it('vb=0.3mm：Fc/Ff/Fp 依磨耗倍率放大，Pc 隨 Fc 同步提高', () => {
    const rSharp = computeDuty(baseCase)
    const rWorn = computeDuty({ ...baseCase, vb: 0.3 })
    expect(rWorn.wearApplied).toBe(true)
    expect(rWorn.Fc).toBeCloseTo(rSharp.Fc! * 1.3, 2)
    expect(rWorn.Ff).toBeCloseTo(rSharp.Ff! * 1.6, 2)
    expect(rWorn.Fp).toBeCloseTo(rSharp.Fp! * 1.75, 2)
    expect(rWorn.Pc).toBeCloseTo(rSharp.Pc * 1.3, 4)
  })

  it('圓形刀片平均切屑厚度 hm ≈ fn·√(ap/d)', () => {
    expect(chipThicknessRound(0.4, 4, 25)).toBeCloseTo(0.4 * Math.sqrt(4 / 25), 10)
    expect(chipThicknessRound(0.001, 4, 25)).toBe(CHIP_THICKNESS_MIN)
  })

  it('insertShape=round：computeDuty 改用 hm≈fn·√(ap/d)，忽略 kappaR', () => {
    const r = computeDuty({ ...baseCase, insertShape: 'round', insertDia: 25, kappaR: 1 })
    const hExpected = 0.5 * Math.sqrt(8 / 25)
    expect(r.h).toBeCloseTo(hExpected, 6)
  })

  it('insertShape 未設定或為 straight：行為與既有直刃公式一致', () => {
    const r1 = computeDuty(baseCase)
    const r2 = computeDuty({ ...baseCase, insertShape: 'straight' })
    expect(r2.h).toBeCloseTo(r1.h!, 10)
  })

  it('個別公式單位一致性', () => {
    expect(cuttingForce(2000, 8, 0.5)).toBe(8000)
    expect(cuttingPower(8000, 180)).toBeCloseTo(24, 10)
    expect(spindleSpeed(180, 800)).toBeCloseTo(71.6197, 3)
    expect(spindleTorque(24, 71.6197)).toBeCloseTo((24 * 9550) / 71.6197, 6)
    expect(spindleTorqueFromForce(8000, 800)).toBe(3200)
  })
})

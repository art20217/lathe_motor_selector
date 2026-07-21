/**
 * Phase 1：切削力、淨功率與主軸端座標計算
 *
 * 公式依據 SOP Step 1.2 / 1.3（kc 修正式為 Sandvik 線性近似，
 * 前角偏離參考值 ±10° 以內適用）。
 */
import { wearMultipliers } from './toolWear'
import { TORQUE_CONST, type DutyCase, type DutyResult } from './types'

const DEG = Math.PI / 180

/** Kienzle 外插下限：h 過小時 kc = kc1·h⁻ᵐᶜ 發散，比照業界工具鉗制於 0.01 mm */
export const CHIP_THICKNESS_MIN = 0.01

/** 進給/背分力比缺省值（ISO P 群經驗值；舊專案資料無此欄位時使用） */
export const DEFAULT_FF_RATIO = 0.4
export const DEFAULT_FP_RATIO = 0.3

/** kc1 測量基準前角缺省值 [°]（Sandvik 標準；Iscar/Kienzle 體系材料填 0） */
export const DEFAULT_GAMMA_REF = 6

/** 切屑厚度 h = fn·sin(κr) [mm]，下限鉗制於 CHIP_THICKNESS_MIN */
export function chipThickness(fn: number, kappaRDeg: number): number {
  return Math.max(fn * Math.sin(kappaRDeg * DEG), CHIP_THICKNESS_MIN)
}

/** 修正後比切削力 kc = kc1·h⁻ᵐᶜ·(1 − (γ0 − γref)/100) [N/mm²] */
export function specificCuttingForce(
  kc1: number,
  mc: number,
  h: number,
  gamma0Deg: number,
  gammaRefDeg: number,
): number {
  return kc1 * Math.pow(h, -mc) * (1 - (gamma0Deg - gammaRefDeg) / 100)
}

/** 主切削力 Fc = kc·ap·fn [N] */
export function cuttingForce(kc: number, ap: number, fn: number): number {
  return kc * ap * fn
}

/** 淨切削功率 Pc = Fc·vc / (60·10³) [kW] */
export function cuttingPower(Fc: number, vc: number): number {
  return (Fc * vc) / 60e3
}

/** 主軸轉速 n_sp = 1000·vc / (π·D) [rpm] */
export function spindleSpeed(vc: number, D: number): number {
  return (1000 * vc) / (Math.PI * D)
}

/** 主軸端所需扭矩 T_sp = Pc·9550 / n_sp [N·m] */
export function spindleTorque(Pc: number, nSp: number): number {
  return (Pc * TORQUE_CONST) / nSp
}

/** 交叉驗證式：T_sp = Fc·(D/2)·10⁻³ [N·m]（與 spindleTorque 數學等價） */
export function spindleTorqueFromForce(Fc: number, D: number): number {
  return (Fc * D) / 2 / 1e3
}

/**
 * 計算單一工況的主軸端座標。
 * direct 模式（螺紋等由廠商工具計算的工況）直接採用給定 (n, T)，
 * 功率由 P = T·n/9550 反推。
 */
export function computeDuty(c: DutyCase): DutyResult {
  if (c.operation === 'direct') {
    const nSp = c.directNSp ?? 0
    const TSp = c.directTSp ?? 0
    return {
      caseId: c.id,
      h: null,
      kc: null,
      Fc: null,
      Ff: null,
      Fp: null,
      Pc: (TSp * nSp) / TORQUE_CONST, // P [kW] = T·n / 9550
      nSp,
      TSp,
      TSpCross: null,
      wearApplied: false,
    }
  }
  const h = chipThickness(c.fn, c.kappaR)
  const kc = specificCuttingForce(c.kc1, c.mc, h, c.gamma0, c.gammaRef)
  const FcSharp = cuttingForce(kc, c.ap, c.fn)
  const FfSharp = (c.ffRatio ?? DEFAULT_FF_RATIO) * FcSharp
  const FpSharp = (c.fpRatio ?? DEFAULT_FP_RATIO) * FcSharp
  const wear = wearMultipliers(c.vb ?? 0)
  const Fc = FcSharp * wear.fc
  const Ff = FfSharp * wear.ff
  const Fp = FpSharp * wear.fp
  const Pc = cuttingPower(Fc, c.vc)
  const nSp = spindleSpeed(c.vc, c.D)
  return {
    caseId: c.id,
    h,
    kc,
    Fc,
    Ff,
    Fp,
    Pc,
    nSp,
    TSp: spindleTorque(Pc, nSp),
    TSpCross: spindleTorqueFromForce(Fc, c.D),
    wearApplied: (c.vb ?? 0) > 0,
  }
}

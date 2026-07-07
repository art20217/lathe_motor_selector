/**
 * 主軸機械損失模型 — 軸承預壓摩擦（Palmgren）＋ 空氣阻力（風阻）
 *
 * 1. 軸承摩擦：M = M0（黏性項）+ M1（負載/預壓項）
 *    M0 = f0·(ν·n)^(2/3)·dm³·10⁻⁷ [N·mm]（ν·n ≥ 2000；以下用定值式）
 *    M1 = f1·P1·dm [N·mm]
 * 2. 風阻：旋轉工件圓柱側面（平板紊流類比）＋ 端面圓盤摩擦矩，
 *    夾頭爪擾流以 jawFactor 放大（光滑圓柱 = 1、夾頭 ≈ 3）。
 *
 * 係數為代表值，輸出屬估算 — 報告須標記為假設值。
 */

const AIR_DENSITY = 1.2 // kg/m³
const AIR_VISC = 1.5e-5 // m²/s 空氣動黏度

export type BearingType = 'angular' | 'taper' | 'cylindrical'

/** 軸承型式係數（Palmgren 代表值） */
export const BEARING_TYPES: Record<BearingType, { f0: number; f1: number; name: string }> = {
  angular: { f0: 2.0, f1: 0.001, name: '角接觸滾珠' },
  taper: { f0: 6.0, f1: 0.0004, name: '圓錐滾子' },
  cylindrical: { f0: 3.0, f1: 0.0003, name: '圓筒滾子' },
}

export interface BearingSpec {
  /** 節圓徑 [mm] */
  dm: number
  /** 預壓＋外載當量 [N] */
  preload: number
  type: BearingType
}

/** 單組軸承摩擦：回傳扭矩 [N·m] 與損失功率 [W]。visc: 潤滑劑運轉黏度 [cSt] */
export function bearingFriction(
  dm: number,
  nRpm: number,
  preload: number,
  type: BearingType,
  visc = 30,
): { torque: number; power: number } {
  const bt = BEARING_TYPES[type]
  const vn = visc * nRpm
  const m0 = vn >= 2000 ? 1e-7 * bt.f0 * Math.pow(vn, 2 / 3) * dm ** 3 : 160e-7 * bt.f0 * dm ** 3
  const m1 = bt.f1 * preload * dm
  const torque = (m0 + m1) / 1000
  return { torque, power: (torque * 2 * Math.PI * nRpm) / 60 }
}

/** 旋轉件風阻：diameter/length [mm]。回傳扭矩 [N·m] 與功率 [W] */
export function windage(
  diameter: number,
  length: number,
  nRpm: number,
  jawFactor = 1,
): { torque: number; power: number } {
  const r = diameter / 2000
  const lengthM = length / 1000
  const omega = (2 * Math.PI * nRpm) / 60
  if (omega <= 0 || r <= 0) return { torque: 0, power: 0 }

  const u = omega * r // 表面線速度
  const reC = Math.max((u * 2 * Math.PI * r) / AIR_VISC, 10)
  const cf = reC > 1e5 ? 0.074 * Math.pow(reC, -0.2) : 1.328 * Math.pow(reC, -0.5)
  const tau = 0.5 * cf * AIR_DENSITY * u * u
  const tSide = tau * (2 * Math.PI * r * lengthM) * r

  const reD = Math.max((omega * r * r) / AIR_VISC, 10)
  const cm = reD > 3e5 ? 0.146 * Math.pow(reD, -0.2) : 3.87 * Math.pow(reD, -0.5)
  const tDisc = 0.5 * cm * AIR_DENSITY * omega * omega * r ** 5 // 單一端面

  const torque = (tSide + 2 * tDisc) * jawFactor
  return { torque, power: torque * omega }
}

export interface SpindleLossInput {
  bearings: BearingSpec[]
  /** 潤滑劑運轉黏度 [cSt] */
  lubeViscosity: number
  /** 工件外徑/長度 [mm]（風阻用） */
  wpDia: number
  wpLen: number
  /** 夾頭外徑/厚度 [mm] */
  chuckDia: number
  chuckLen: number
}

export interface SpindleLossResult {
  tBearing: number
  pBearing: number
  tWindage: number
  pWindage: number
  /** 主軸端損失扭矩合計 [N·m] */
  tTotal: number
  /** 損失功率合計 [W] */
  pTotal: number
}

/** 主軸端總機械損失（軸承＋工件/夾頭風阻）@ 指定主軸轉速 */
export function spindleLosses(nRpm: number, input: SpindleLossInput): SpindleLossResult {
  let tBearing = 0
  let pBearing = 0
  for (const b of input.bearings) {
    const { torque, power } = bearingFriction(b.dm, nRpm, b.preload, b.type, input.lubeViscosity)
    tBearing += torque
    pBearing += power
  }
  const wp = windage(input.wpDia, input.wpLen, nRpm, 1)
  const ck = windage(input.chuckDia, input.chuckLen, nRpm, 3)
  return {
    tBearing,
    pBearing,
    tWindage: wp.torque + ck.torque,
    pWindage: wp.power + ck.power,
    tTotal: tBearing + wp.torque + ck.torque,
    pTotal: pBearing + wp.power + ck.power,
  }
}

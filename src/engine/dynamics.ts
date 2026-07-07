/**
 * Phase 4：慣量折算與加減速時間
 *
 * 依據 SOP Step 4.1。本模組內部使用 SI 單位（kg、m、s）；
 * UI 層負責 mm → m 換算。
 */
import type { Motor } from './types'
import { motorTorque, type MotorRating } from './tnCurve'

/** 實心圓柱慣量 J = ½·m·R² [kg·m²]（m: kg，R: m） */
export function solidCylinderInertia(m: number, R: number): number {
  return 0.5 * m * R * R
}

/** 空心圓柱慣量 J = ½·m·(R_outer² + R_inner²) [kg·m²] */
export function hollowCylinderInertia(m: number, rOuter: number, rInner: number): number {
  return 0.5 * m * (rOuter * rOuter + rInner * rInner)
}

/** 圓柱（可空心）質量 m = ρ·π·(R_o² − R_i²)·L [kg]（ρ: kg/m³，長度: m） */
export function cylinderMass(density: number, length: number, rOuter: number, rInner = 0): number {
  return density * Math.PI * (rOuter * rOuter - rInner * rInner) * length
}

/**
 * 慣量折算至馬達端：
 * J_total = J_motor + (J_spindle + J_chuck + J_wp)·i² + J_gears
 * i = n_sp/n_motor < 1（減速），故負載慣量折算後大幅縮小。
 */
export function reflectedInertia(
  jMotor: number,
  jSpindleSide: number,
  ratio: number,
  jGears: number,
): number {
  return jMotor + jSpindleSide * ratio * ratio + jGears
}

/**
 * 加速時間 t_acc = J_total·Δω / T_acc [s]
 * Δω = 2π·Δn/60（Δn: rpm，馬達端），T_acc = T_rated − T_friction [N·m]。
 */
export function accelTime(jTotal: number, deltaNMotor: number, tAcc: number): number {
  const deltaOmega = (2 * Math.PI * deltaNMotor) / 60
  return (jTotal * deltaOmega) / tAcc
}

/**
 * 加速時間（沿 T-n 曲線數值積分）：dω/dt = (T(n) − T_friction) / J_total。
 *
 * 線性式 accelTime 假設全程可用 T_rated，馬達越過基底轉速進入恆功率區後
 * 扭矩隨轉速反比下降，線性式會低估時間（偏樂觀）；本式逐步積分正確反映。
 * rating='s3' 時以 S3/30min 額定積分（加速屬短時工況，通常允許）。
 *
 * @param nFromMotor / nToMotor 馬達端起訖轉速 [rpm]
 * @param tFriction 全程扣除的摩擦扭矩 [N·m]
 * @returns 秒；目標超出 n_max、扭矩不足或超過 120 s 時回傳 null
 */
export function accelTimeCurve(
  motor: Motor,
  rating: MotorRating,
  jTotal: number,
  nFromMotor: number,
  nToMotor: number,
  tFriction: number,
  dt = 0.001,
): number | null {
  if (nToMotor > motor.nMax || nToMotor <= nFromMotor || jTotal <= 0) return null
  let t = 0
  let n = Math.max(nFromMotor, 1)
  while (n < nToMotor) {
    const torque = motorTorque(motor, n, rating) - tFriction
    if (torque <= 0) return null
    const alpha = torque / jTotal // rad/s²
    n += (alpha * dt * 60) / (2 * Math.PI) // rpm 增量
    t += dt
    if (t > 120) return null
  }
  return t
}

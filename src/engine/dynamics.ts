/**
 * Phase 4：慣量折算與加減速時間
 *
 * 依據 SOP Step 4.1。本模組內部使用 SI 單位（kg、m、s）；
 * UI 層負責 mm → m 換算。
 */

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

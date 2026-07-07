/**
 * Phase 2：馬達候選篩選
 *
 * 依據 SOP Step 2.1–2.3：功率下限 → S1 額定篩選 → 恆功率區速比。
 */
import { TORQUE_CONST, type Motor } from './types'

/**
 * 變速箱總效率估算：單級嚙合效率 ^ 級數（SOP：0.97–0.98/級）。
 * 屬假設值，UI 與報告須標記。
 */
export function estimateEfficiency(stageEfficiency: number, stages: number): number {
  return Math.pow(stageEfficiency, stages)
}

/** 馬達輸出功率下限 P_min = max(Pc)/η_total × SF [kW] */
export function minMotorPower(maxPc: number, etaTotal: number, SF: number): number {
  return (maxPc / etaTotal) * SF
}

/** 額定扭矩 T_rated = P_rated·9550 / n_base [N·m] */
export function ratedTorque(powerS1: number, nBase: number): number {
  return (powerS1 * TORQUE_CONST) / nBase
}

/** 恆功率區速比 R_cp = n_max / n_base */
export function constantPowerRatio(motor: Motor): number {
  return motor.nMax / motor.nBase
}

/** S1 功率篩選：P_rated ≥ P_min 者列為候選 */
export function filterCandidates(motors: Motor[], pMin: number): Motor[] {
  return motors.filter((m) => m.powerS1 >= pMin)
}

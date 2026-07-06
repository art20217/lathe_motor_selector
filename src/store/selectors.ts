/**
 * 衍生資料 selector：由 store 狀態計算引擎輸出（不落地儲存，隨輸入即時重算）
 */
import { BUILT_IN_MOTORS } from '../data/motors'
import { computeDuty } from '../engine/cutting'
import { minMotorPower } from '../engine/motorSelection'
import type { DutyCase, DutyPoint, DutyResult, Motor } from '../engine/types'
import type { ProjectState } from './projectStore'

/** 完整馬達清單：內建（套用覆寫、排除隱藏）＋ 自訂 */
export function getMotorList(s: ProjectState): Motor[] {
  const builtIn = BUILT_IN_MOTORS.filter((m) => !s.hiddenBuiltInMotors.includes(m.id)).map(
    (m) => s.motorOverrides[m.id] ?? m,
  )
  return [...builtIn, ...s.customMotors]
}

export function getSelectedMotor(s: ProjectState): Motor | null {
  if (!s.selectedMotorId) return null
  return getMotorList(s).find((m) => m.id === s.selectedMotorId) ?? null
}

/** Phase 1：全部工況的計算結果 */
export function getDutyResults(cases: DutyCase[]): DutyResult[] {
  return cases.map(computeDuty)
}

/** Phase 3 輸入：主軸端需求點 */
export function getDutyPoints(cases: DutyCase[], results: DutyResult[]): DutyPoint[] {
  return results.map((r) => {
    const c = cases.find((x) => x.id === r.caseId)
    return { caseId: r.caseId, name: c?.name ?? r.caseId, nSp: r.nSp, TSp: r.TSp }
  })
}

export function getMaxPc(results: DutyResult[]): number {
  return results.length ? Math.max(...results.map((r) => r.Pc)) : 0
}

/** Phase 2：馬達輸出功率下限 */
export function getPMin(s: ProjectState, results: DutyResult[]): number {
  return minMotorPower(getMaxPc(results), s.etaTotal, s.sf)
}

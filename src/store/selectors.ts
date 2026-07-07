/**
 * 衍生資料 selector：由 store 狀態計算引擎輸出（不落地儲存，隨輸入即時重算）
 */
import { BUILT_IN_MOTORS } from '../data/motors'
import { computeDuty } from '../engine/cutting'
import { minMotorPower } from '../engine/motorSelection'
import { spindleLosses, type SpindleLossResult } from '../engine/spindleLosses'
import { verifyCoverage } from '../engine/tnCurve'
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

/** Phase 1：全部工況的計算結果（純切削，不含機械損失） */
export function getDutyResults(cases: DutyCase[]): DutyResult[] {
  return cases.map(computeDuty)
}

/** 指定主軸轉速下的機械損失；lossConfig 未啟用時回傳 null */
export function getSpindleLossAt(s: ProjectState, nSp: number): SpindleLossResult | null {
  if (!s.lossConfig.enabled) return null
  return spindleLosses(nSp, {
    bearings: s.lossConfig.bearings,
    lubeViscosity: s.lossConfig.lubeViscosity,
    wpDia: s.dynamics.wpOuterDia,
    wpLen: s.dynamics.wpLength,
    chuckDia: s.lossConfig.chuckDia,
    chuckLen: s.lossConfig.chuckLen,
  })
}

/**
 * 有效工況結果：lossConfig 啟用時，每個工況點的 T_sp / Pc 加上該轉速下的
 * 機械損失（軸承摩擦＋風阻），並自然流入 max(Pc) → P_min → Phase 3 覆蓋驗證。
 */
export function getEffectiveDutyResults(s: ProjectState): DutyResult[] {
  const results = getDutyResults(s.cases)
  if (!s.lossConfig.enabled) return results
  return results.map((r) => {
    const loss = getSpindleLossAt(s, r.nSp)!
    return { ...r, TSp: r.TSp + loss.tTotal, Pc: r.Pc + loss.pTotal / 1000 }
  })
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

export interface CandidateEvaluation {
  /** 以目前 Phase 3 齒比設定，全部工況點是否被覆蓋 */
  covered: boolean
  /** 全點中最高的扭矩負載率 max(T_sp / T_avail)；無有效點為 null */
  maxUtil: number | null
}

/**
 * Phase 2 自動推薦：對每個候選馬達以目前齒比跑覆蓋驗證。
 * 回傳 Map<motorId, CandidateEvaluation>；齒比在 Phase 3 調整後結果會變。
 */
export function getCandidateEvaluation(
  s: ProjectState,
  points: DutyPoint[],
  candidates: Motor[],
): Map<string, CandidateEvaluation> {
  const map = new Map<string, CandidateEvaluation>()
  for (const m of candidates) {
    const cov = verifyCoverage(m, s.gears, points)
    let maxUtil: number | null = null
    for (const p of cov.perPoint) {
      const util = p.maxAvailable > 0 ? p.point.TSp / p.maxAvailable : Infinity
      if (maxUtil === null || util > maxUtil) maxUtil = util
    }
    map.set(m.id, { covered: cov.allCovered && points.length > 0, maxUtil })
  }
  return map
}

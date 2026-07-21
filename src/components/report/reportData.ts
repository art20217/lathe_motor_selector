/**
 * 報告用衍生資料：一次計算，供 ReportView（HTML）與 markdown 產生器共用
 */
import {
  accelTime,
  accelTimeCurve,
  cylinderMass,
  hollowCylinderInertia,
  reflectedInertia,
  solidCylinderInertia,
} from '../../engine/dynamics'
import { constantPowerRatio, ratedTorque } from '../../engine/motorSelection'
import { constPowerGaps, verifyCoverage, type CoverageResult, type PowerBandGap } from '../../engine/tnCurve'
import { deflectionCheck, type DeflectionResult } from '../../engine/workpiece'
import type { DutyPoint, DutyResult, Motor } from '../../engine/types'
import type { ProjectState } from '../../store/projectStore'
import {
  getDutyPoints,
  getEffectiveDutyResults,
  getMaxPc,
  getMotorList,
  getPMin,
  getSelectedMotor,
} from '../../store/selectors'

export interface ReportData {
  state: ProjectState
  results: DutyResult[]
  points: DutyPoint[]
  maxPc: number
  pMin: number
  candidates: Motor[]
  motor: Motor | null
  motorTRated: number | null
  motorRcp: number | null
  coverage: CoverageResult | null
  gaps: PowerBandGap[]
  dyn: {
    mass: number
    jWp: number
    jLoad: number
    jTotal: number | null
    tAccTorque: number | null
    deltaNMotor: number | null
    tAcc: number | null
    tAccIntegral: number | null
    pass: boolean | null
  }
  deflectionResult: DeflectionResult | null
  /** 報告須揭露的假設值/未核對項清單 */
  assumptions: string[]
}

export function buildReportData(s: ProjectState): ReportData {
  const results = getEffectiveDutyResults(s)
  const points = getDutyPoints(s.cases, results)
  const maxPc = getMaxPc(results)
  const pMin = getPMin(s, results)
  const motors = getMotorList(s)
  const candidates = motors.filter((m) => m.powerS1 >= pMin)
  const motor = getSelectedMotor(s)
  const coverage = motor ? verifyCoverage(motor, s.gears, points) : null
  const gaps = motor ? constPowerGaps(motor, s.gears) : []

  const d = s.dynamics
  const rOuter = d.wpOuterDia / 2000
  const rInner = d.wpInnerDia / 2000
  const mass = cylinderMass(d.wpDensity, d.wpLength / 1000, rOuter, d.workpieceType === 'hollow' ? rInner : 0)
  const jWp =
    d.workpieceType === 'hollow'
      ? hollowCylinderInertia(mass, rOuter, rInner)
      : solidCylinderInertia(mass, rOuter)
  const jLoad = d.jSpindle + d.jChuck + jWp
  const gear = s.gears[d.gearIndex]
  const jTotal =
    motor?.inertia != null && gear ? reflectedInertia(motor.inertia, jLoad, gear.ratio, d.jGears) : null
  const tRated = motor ? ratedTorque(motor.powerS1, motor.nBase) : null
  const tAccTorque = tRated !== null ? tRated * (1 - d.frictionPct / 100) : null
  const deltaNMotor = gear ? d.deltaNSp / gear.ratio : null
  const tAcc =
    jTotal !== null && deltaNMotor !== null && tAccTorque !== null && tAccTorque > 0
      ? accelTime(jTotal, deltaNMotor, tAccTorque)
      : null
  const tFriction = tRated !== null ? tRated * d.frictionPct / 100 : null
  const tAccIntegral =
    motor && jTotal !== null && deltaNMotor !== null && tFriction !== null
      ? accelTimeCurve(motor, 's1', jTotal, 0, Math.abs(deltaNMotor), tFriction)
      : null
  const pass = tAccIntegral !== null && d.requiredTime !== null
    ? tAccIntegral <= d.requiredTime
    : tAcc !== null && d.requiredTime !== null
      ? tAcc <= d.requiredTime
      : null

  // Deflection check
  const worstFc = Math.max(...results.map((r) => r.Fc ?? 0), 0)
  const worstFp = Math.max(...results.map((r) => r.Fp ?? 0), 0)
  const deflectionResult = worstFc > 0
    ? deflectionCheck(
        s.deflection.support,
        s.deflection.diameter,
        s.deflection.length,
        worstFc,
        worstFp,
        s.deflection.eGpa * 1e9,
        s.deflection.limit,
        s.deflection.bore,
      )
    : null

  const assumptions: string[] = []
  if (s.etaIsEstimated)
    assumptions.push(
      `η_total = ${s.etaTotal.toFixed(3)} 為估算值（單級 ${s.etaStageEff} ^ ${s.etaStages} 級），非實測`,
    )
  assumptions.push(`空載摩擦扭矩取額定扭矩的 ${d.frictionPct}%（假設值，SOP 建議 5–10%）`)
  if (s.lossConfig.enabled)
    assumptions.push('主軸機械損失（軸承 Palmgren 經驗式＋紊流風阻）已計入工況需求，係數為代表值')
  if (motor && !motor.verified)
    assumptions.push(`選定馬達「${motor.brand} ${motor.model}」規格未核對型錄，正式選型前須以 FANUC B-65272EN 確認`)
  assumptions.push('材料 kc1/mc 若採內建參考值，正式選型前須核對現行刀具廠商手冊（參考條件 h=1mm、γref=6°）')
  assumptions.push('扭矩常數 9550 = 60000/(2π) 的工程慣用值（精確值 9549.30）')
  if (results.some((r) => r.wearApplied))
    assumptions.push('部分工況已套用刃口磨耗（VB）分力放大修正，倍率為近似參考範圍，非單一權威公式')

  return {
    state: s,
    results,
    points,
    maxPc,
    pMin,
    candidates,
    motor,
    motorTRated: tRated,
    motorRcp: motor ? constantPowerRatio(motor) : null,
    coverage,
    gaps,
    dyn: { mass, jWp, jLoad, jTotal, tAccTorque, deltaNMotor, tAcc, tAccIntegral, pass },
    deflectionResult,
    assumptions,
  }
}

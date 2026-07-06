/**
 * Phase 3：馬達 T-n 特性、齒比映射與覆蓋驗證
 *
 * 依據 SOP Step 3.1–3.4。齒比定義 i_k = n_sp / n_motor（減速 < 1）。
 */
import { TORQUE_CONST, type DutyPoint, type Gear, type Motor } from './types'
import { ratedTorque } from './motorSelection'

/**
 * 馬達 T-n 特性 [N·m]：
 * 恆扭矩區（n ≤ n_base）輸出額定扭矩，恆功率區（n_base < n ≤ n_max）扭矩反比下降。
 * n 超出 n_max 回傳 0（不可運轉）。
 */
export function motorTorque(motor: Motor, n: number): number {
  if (n < 0 || n > motor.nMax) return 0
  if (n <= motor.nBase) return ratedTorque(motor.powerS1, motor.nBase)
  return (motor.powerS1 * TORQUE_CONST) / n
}

/**
 * 第 k 檔映射後的主軸端可用扭矩 T_avail = T_motor(n_sp/i)·(1/i)·η [N·m]。
 * 主軸轉速超出該檔可用範圍（馬達端超過 n_max）回傳 0。
 */
export function availableTorque(motor: Motor, gear: Gear, nSp: number): number {
  const nMotor = nSp / gear.ratio
  if (nMotor > motor.nMax) return 0
  return (motorTorque(motor, nMotor) / gear.ratio) * gear.efficiency
}

/** 檔位主軸端可用轉速範圍 [0, n_max·i] */
export function gearSpeedRange(motor: Motor, gear: Gear): [number, number] {
  return [0, motor.nMax * gear.ratio]
}

/** 檔位主軸端恆功率帶 [n_base·i, n_max·i] */
export function gearConstPowerBand(motor: Motor, gear: Gear): [number, number] {
  return [motor.nBase * gear.ratio, motor.nMax * gear.ratio]
}

/** 回傳能覆蓋指定工況點的檔位 index 陣列（判準：扭矩足夠且轉速在範圍內） */
export function coveringGears(motor: Motor, gears: Gear[], point: DutyPoint): number[] {
  const hits: number[] = []
  gears.forEach((g, k) => {
    if (point.nSp / g.ratio > motor.nMax) return
    if (availableTorque(motor, g, point.nSp) >= point.TSp) hits.push(k)
  })
  return hits
}

export interface PointCoverage {
  point: DutyPoint
  /** 覆蓋此點的檔位 index（0-based） */
  gears: number[]
  covered: boolean
  /** 全檔位中在此轉速的最大可用扭矩 [N·m]（診斷用） */
  maxAvailable: number
}

export interface CoverageResult {
  perPoint: PointCoverage[]
  allCovered: boolean
}

/** Step 3.4 覆蓋驗證：每一個工況點至少被一個檔位覆蓋 */
export function verifyCoverage(motor: Motor, gears: Gear[], points: DutyPoint[]): CoverageResult {
  const perPoint = points.map((p) => {
    const hits = coveringGears(motor, gears, p)
    const maxAvailable = Math.max(0, ...gears.map((g) => availableTorque(motor, g, p.nSp)))
    return { point: p, gears: hits, covered: hits.length > 0, maxAvailable }
  })
  return { perPoint, allCovered: perPoint.every((p) => p.covered) }
}

export interface PowerBandGap {
  /** 齒比升冪排序後，盲區下緣所屬檔位 index（原始陣列 index） */
  lowerGear: number
  upperGear: number
  /** 盲區主軸端轉速範圍 [rpm] */
  from: number
  to: number
}

/**
 * 相鄰檔位恆功率帶盲區檢查（SOP Step 2.3 / 約束 3）。
 * 齒比升冪排序後，若下一檔恆功率帶起點高於前一檔終點，兩帶之間即為盲區
 * （該轉速帶內任何檔位都無法以恆功率運轉）。
 */
export function constPowerGaps(motor: Motor, gears: Gear[]): PowerBandGap[] {
  const order = gears
    .map((g, k) => ({ g, k }))
    .sort((a, b) => a.g.ratio - b.g.ratio)
  const gaps: PowerBandGap[] = []
  for (let j = 0; j + 1 < order.length; j++) {
    const [, hiEnd] = gearConstPowerBand(motor, order[j].g)
    const [loStart] = gearConstPowerBand(motor, order[j + 1].g)
    if (loStart > hiEnd) {
      gaps.push({ lowerGear: order[j].k, upperGear: order[j + 1].k, from: hiEnd, to: loStart })
    }
  }
  return gaps
}

/**
 * 圖表取樣：產生單一檔位的主軸端 T_avail 曲線點。
 * 恆扭矩段以兩點表示，恆功率雙曲段以等比刻度取樣以保曲線平滑。
 */
export function sampleGearCurve(
  motor: Motor,
  gear: Gear,
  samples = 40,
): { n: number; T: number }[] {
  const nBaseSp = motor.nBase * gear.ratio
  const nMaxSp = motor.nMax * gear.ratio
  const pts: { n: number; T: number }[] = [
    { n: 0, T: availableTorque(motor, gear, 0) },
    { n: nBaseSp, T: availableTorque(motor, gear, nBaseSp) },
  ]
  const ratio = motor.nMax / motor.nBase
  for (let j = 1; j <= samples; j++) {
    const n = nBaseSp * Math.pow(ratio, j / samples)
    pts.push({ n, T: availableTorque(motor, gear, Math.min(n, nMaxSp)) })
  }
  return pts
}

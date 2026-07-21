/**
 * 刀具刃口磨耗（flank wear, VB）對切削分力的修正
 *
 * 依據：機械加工文獻對刃口磨耗造成分力增加的一般趨勢——磨耗帶與已加工面的
 * 額外摩擦/犁切主要作用在徑向與軸向，故 Fp 受影響最大、Ff 次之、Fc 最小
 * （Fp > Ff > Fc 的放大順序具普遍共識）。VB = 0.3 mm 為 ISO 3685 標準刀具
 * 壽命判定基準之一，本表以此為錨點校準；倍率為近似參考範圍，實際隨材料／
 * 刀具／塗層而異，非單一權威公式。
 */

export interface WearMultipliers {
  fc: number
  ff: number
  fp: number
}

/** ISO 3685 標準刀具壽命判定基準：保守磨耗餘裕預設值 [mm] */
export const VB_DEFAULT = 0.3

/** 參考表上限；超過此值以表格末端倍率外插（不再放大），使用端應提示已超出參考範圍 */
export const VB_TABLE_MAX = 0.5

const VB_TABLE: { vb: number; fc: number; ff: number; fp: number }[] = [
  { vb: 0.0, fc: 1.0, ff: 1.0, fp: 1.0 },
  { vb: 0.1, fc: 1.08, ff: 1.15, fp: 1.2 },
  { vb: 0.2, fc: 1.18, ff: 1.35, fp: 1.45 },
  { vb: 0.3, fc: 1.3, ff: 1.6, fp: 1.75 },
  { vb: 0.4, fc: 1.45, ff: 1.9, fp: 2.1 },
  { vb: 0.5, fc: 1.6, ff: 2.2, fp: 2.5 },
]

/** VB 磨耗量 [mm] → 分力放大倍率（線性內插；VB≤0 回傳 1.0；VB 超出表格以末端值外插） */
export function wearMultipliers(vb: number): WearMultipliers {
  const v = Math.max(0, vb)
  if (v <= 0) return { fc: 1, ff: 1, fp: 1 }
  const last = VB_TABLE[VB_TABLE.length - 1]
  if (v >= last.vb) return { fc: last.fc, ff: last.ff, fp: last.fp }
  for (let i = 0; i < VB_TABLE.length - 1; i++) {
    const a = VB_TABLE[i]
    const b = VB_TABLE[i + 1]
    if (v >= a.vb && v <= b.vb) {
      const t = (v - a.vb) / (b.vb - a.vb)
      return {
        fc: a.fc + (b.fc - a.fc) * t,
        ff: a.ff + (b.ff - a.ff) * t,
        fp: a.fp + (b.fp - a.fp) * t,
      }
    }
  }
  return { fc: 1, ff: 1, fp: 1 }
}

/**
 * 刀具刃口磨耗（flank wear, VB）對切削分力的修正
 *
 * 依據：機械加工文獻對刃口磨耗造成分力增加的一般趨勢——磨耗帶與已加工面的
 * 額外摩擦/犁切主要作用在徑向與軸向，故 Fp 受影響最大、Ff 次之、Fc 最小
 * （Fp > Ff > Fc 的放大順序具普遍共識）。VB = 0.3 mm 為 ISO 3685 標準刀具
 * 壽命判定基準之一，本表以此為錨點校準；倍率為近似參考範圍，實際隨材料／
 * 刀具／塗層而異，非單一權威公式。
 *
 * 缺省值採 VB_DEFAULT（保守磨耗餘裕）：DutyCase.vb 為 undefined（新建以外的
 * 舊資料、匯入專案缺此欄位）時一律視為 VB_DEFAULT，而非全新刃口 0——唯有
 * 使用者明確填 0 才代表「全新刃口、不計磨耗」。
 */

export interface WearMultipliers {
  fc: number
  ff: number
  fp: number
}

export interface VbReferencePoint extends WearMultipliers {
  vb: number
  /** 該磨耗量對應的可辨識刃口狀態，供 UI 顯示避免使用者盲猜 */
  label: string
}

/** VB 磨耗量 [mm] → 分力放大倍率＋刃口狀態說明參考表（放大順序 Fp>Ff>Fc） */
export const VB_REFERENCE: VbReferencePoint[] = [
  { vb: 0.0, label: '全新刃口／未使用', fc: 1.0, ff: 1.0, fp: 1.0 },
  { vb: 0.1, label: '輕微磨耗，肉眼幾乎無法辨識', fc: 1.08, ff: 1.15, fp: 1.2 },
  { vb: 0.2, label: '磨耗帶明顯可見，尚未到換刀時機', fc: 1.18, ff: 1.35, fp: 1.45 },
  { vb: 0.3, label: '標準換刀基準（ISO 3685），建議之保守假設值', fc: 1.3, ff: 1.6, fp: 1.75 },
  { vb: 0.4, label: '磨耗加劇，建議儘快安排換刀', fc: 1.45, ff: 1.9, fp: 2.1 },
  { vb: 0.5, label: '嚴重磨耗，接近刀具壽命臨界', fc: 1.6, ff: 2.2, fp: 2.5 },
]

/** ISO 3685 標準刀具壽命判定基準：保守磨耗餘裕預設值 [mm]（DutyCase.vb 未設定時的缺省值） */
export const VB_DEFAULT = 0.3

/** 參考表上限；超過此值以表格末端倍率外插（不再放大），使用端應提示已超出參考範圍 */
export const VB_TABLE_MAX = VB_REFERENCE[VB_REFERENCE.length - 1].vb

/** VB 磨耗量 [mm] → 分力放大倍率（線性內插；VB≤0 回傳 1.0；VB 超出表格以末端值外插） */
export function wearMultipliers(vb: number): WearMultipliers {
  const v = Math.max(0, vb)
  if (v <= 0) return { fc: 1, ff: 1, fp: 1 }
  const last = VB_REFERENCE[VB_REFERENCE.length - 1]
  if (v >= last.vb) return { fc: last.fc, ff: last.ff, fp: last.fp }
  for (let i = 0; i < VB_REFERENCE.length - 1; i++) {
    const a = VB_REFERENCE[i]
    const b = VB_REFERENCE[i + 1]
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

/** 回傳與給定 VB 最接近的參考點描述，供 UI 顯示目前數值對應的刃口狀態 */
export function nearestWearLabel(vb: number): string {
  const v = Math.max(0, vb)
  let closest = VB_REFERENCE[0]
  for (const p of VB_REFERENCE) {
    if (Math.abs(p.vb - v) < Math.abs(closest.vb - v)) closest = p
  }
  return closest.label
}

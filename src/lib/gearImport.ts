/**
 * 齒比資料 JSON 匯入：解析與驗證
 *
 * 檔案格式（亦接受純陣列）：
 *   { "formatVersion": 1, "gears": [ { "ratio": 0.05, "efficiency": 0.85 }, … ] }
 *
 * 四檔變速箱固定：檔案須恰含 4 筆，依序對應第 1–4 檔。
 */
import type { Gear } from '../engine/types'

export const GEAR_COUNT = 4

export interface GearImportResult {
  gears: Gear[]
  errors: string[]
}

function asFiniteNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** 解析齒比 JSON 內容；格式錯誤不丟例外，統一以 errors 回報 */
export function parseGearFile(text: string): GearImportResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { gears: [], errors: ['不是有效的 JSON 檔'] }
  }
  const list = Array.isArray(data)
    ? data
    : typeof data === 'object' && data !== null && Array.isArray((data as Record<string, unknown>).gears)
      ? ((data as Record<string, unknown>).gears as unknown[])
      : null
  if (list === null) return { gears: [], errors: ['缺少 gears 陣列（或檔案本身須為齒比陣列）'] }
  if (list.length !== GEAR_COUNT)
    return { gears: [], errors: [`齒比檔須恰含 ${GEAR_COUNT} 筆（四檔變速箱固定），目前 ${list.length} 筆`] }

  const errors: string[] = []
  const gears: Gear[] = []
  list.forEach((raw, i) => {
    const row = `第 ${i + 1} 檔`
    if (typeof raw !== 'object' || raw === null) {
      errors.push(`${row}：不是物件`)
      return
    }
    const r = raw as Record<string, unknown>
    const ratio = asFiniteNumber(r.ratio)
    if (ratio === null || ratio <= 0) {
      errors.push(`${row}：ratio 須為正數`)
      return
    }
    const efficiency = asFiniteNumber(r.efficiency)
    if (efficiency === null || efficiency <= 0 || efficiency > 1) {
      errors.push(`${row}：efficiency 須為 0–1 之間`)
      return
    }
    gears.push({ ratio, efficiency })
  })
  // 任一檔驗證失敗即整檔拒收：避免部分套用造成檔位錯位
  return errors.length ? { gears: [], errors } : { gears, errors }
}

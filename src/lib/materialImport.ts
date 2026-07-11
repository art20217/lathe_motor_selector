/**
 * 材料庫 JSON 匯入：解析與驗證
 *
 * 檔案格式（亦接受純陣列）：
 *   { "formatVersion": 1, "materials": [ { name, kc1, mc, isoGroup?, gammaRef?, ffRatio?, fpRatio?, source?, verified? }, … ] }
 *
 * 設計目的：大量材料資料（如公司內部整理的廠商係數表）以檔案形式
 * 保存於內部儲存空間，不隨工具程式碼發佈；使用者匯入後存於瀏覽器
 * localStorage（customMaterials），與內建參考庫合併顯示。
 */
import type { Material } from '../engine/types'

export interface MaterialImportResult {
  materials: Material[]
  /** 各筆驗證失敗原因（含列號），供 UI 顯示 */
  errors: string[]
}

const ISO_GROUPS = new Set(['P', 'M', 'K', 'N', 'S', 'H'])

function asFiniteNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** 解析單筆材料；回傳 null 時把原因寫入 errors */
function parseEntry(raw: unknown, index: number, errors: string[]): Material | null {
  const row = `第 ${index + 1} 筆`
  if (typeof raw !== 'object' || raw === null) {
    errors.push(`${row}：不是物件`)
    return null
  }
  const r = raw as Record<string, unknown>
  const name = typeof r.name === 'string' ? r.name.trim() : ''
  if (!name) {
    errors.push(`${row}：缺少材料名稱 name`)
    return null
  }
  const kc1 = asFiniteNumber(r.kc1)
  if (kc1 === null || kc1 <= 0) {
    errors.push(`${row}（${name}）：kc1 須為正數`)
    return null
  }
  const mc = asFiniteNumber(r.mc)
  if (mc === null || mc <= 0 || mc >= 1) {
    errors.push(`${row}（${name}）：mc 須為 0–1 之間`)
    return null
  }
  const isoGroup =
    typeof r.isoGroup === 'string' && ISO_GROUPS.has(r.isoGroup) ? r.isoGroup : 'P'
  const m: Material = {
    id: typeof r.id === 'string' && r.id ? r.id : crypto.randomUUID(),
    name,
    isoGroup,
    kc1,
    mc,
    source: typeof r.source === 'string' ? r.source : '',
    verified: r.verified === true,
  }
  const gammaRef = asFiniteNumber(r.gammaRef)
  if (gammaRef !== null) m.gammaRef = gammaRef
  const ffRatio = asFiniteNumber(r.ffRatio)
  if (ffRatio !== null && ffRatio > 0) m.ffRatio = ffRatio
  const fpRatio = asFiniteNumber(r.fpRatio)
  if (fpRatio !== null && fpRatio > 0) m.fpRatio = fpRatio
  return m
}

/** 解析材料庫 JSON 內容；格式錯誤不丟例外，統一以 errors 回報 */
export function parseMaterialLibrary(text: string): MaterialImportResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { materials: [], errors: ['不是有效的 JSON 檔'] }
  }
  const list = Array.isArray(data)
    ? data
    : typeof data === 'object' && data !== null && Array.isArray((data as Record<string, unknown>).materials)
      ? ((data as Record<string, unknown>).materials as unknown[])
      : null
  if (list === null)
    return { materials: [], errors: ['缺少 materials 陣列（或檔案本身須為材料陣列）'] }

  const errors: string[] = []
  const materials: Material[] = []
  list.forEach((raw, i) => {
    const m = parseEntry(raw, i, errors)
    if (m) materials.push(m)
  })
  return { materials, errors }
}

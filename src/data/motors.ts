/**
 * 內建馬達範例庫
 *
 * ⚠ 全部為「示意範例」：型號結構仿 FANUC αiI 系列命名，但規格數值未經型錄核對
 * （verified = false）。正式選型前務必以 FANUC B-65272EN 或現行型錄逐欄核對後，
 * 於 UI 編輯修正或匯入正式資料。
 */
import type { Motor } from '../engine/types'

const NOTE = '示意範例，數值須以 FANUC 型錄（B-65272EN）核對後方可用於正式選型'

export const BUILT_IN_MOTORS: Motor[] = [
  {
    id: 'fanuc-aii-12',
    brand: 'FANUC',
    model: 'αiI 12/7000（範例）',
    powerS1: 11,
    nBase: 1500,
    nMax: 7000,
    inertia: 0.06,
    ratedCurrent: null,
    voltage: '200V',
    verified: false,
    note: NOTE,
  },
  {
    id: 'fanuc-aii-15',
    brand: 'FANUC',
    model: 'αiI 15/7000（範例）',
    powerS1: 15,
    nBase: 1500,
    nMax: 7000,
    inertia: 0.09,
    ratedCurrent: null,
    voltage: '200V',
    verified: false,
    note: NOTE,
  },
  {
    id: 'fanuc-aii-22',
    brand: 'FANUC',
    model: 'αiI 22/7000（範例）',
    powerS1: 18.5,
    nBase: 1500,
    nMax: 7000,
    inertia: 0.12,
    ratedCurrent: null,
    voltage: '200V',
    verified: false,
    note: NOTE,
  },
  {
    id: 'fanuc-aii-30',
    brand: 'FANUC',
    model: 'αiI 30/6000（範例）',
    powerS1: 22,
    nBase: 1500,
    nMax: 6000,
    inertia: 0.2,
    ratedCurrent: null,
    voltage: '200V',
    verified: false,
    note: NOTE,
  },
  {
    id: 'fanuc-aii-40',
    brand: 'FANUC',
    model: 'αiI 40/6000（範例）',
    powerS1: 30,
    nBase: 1500,
    nMax: 6000,
    inertia: 0.3,
    ratedCurrent: null,
    voltage: '200V',
    verified: false,
    note: NOTE,
  },
  {
    id: 'fanuc-aii-50',
    brand: 'FANUC',
    model: 'αiI 50/4500（範例）',
    powerS1: 37,
    nBase: 1150,
    nMax: 4500,
    inertia: 0.55,
    ratedCurrent: null,
    voltage: '400V',
    verified: false,
    note: NOTE,
  },
]

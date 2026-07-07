/**
 * 材料比切削力參考庫
 *
 * 全部為 Sandvik CMC 分類體系常見引用之參考值（測定條件 h = 1 mm、γref = 6°），
 * verified = false：正式選型前務必核對現行刀具廠商手冊（不同廠商參考條件可能不同）。
 * UI 建立工況時將 kc1/mc 複製為工況列數值，可直接覆寫。
 */
import type { Material } from '../engine/types'

const SRC = 'Sandvik 比切削力參考表常見引用值（h=1mm、γref=6°）— 使用前須核對現行刀具廠商手冊'

export const BUILT_IN_MATERIALS: Material[] = [
  {
    id: 'mat-s15c',
    name: 'S15C（低碳鋼，CMC 01.1 級）',
    isoGroup: 'P',
    kc1: 1500,
    mc: 0.25,
    ffRatio: 0.4,
    fpRatio: 0.3,
    source: SRC,
    verified: false,
  },
  {
    id: 'mat-s45c',
    name: 'S45C（中碳鋼，CMC 01.2 級）',
    isoGroup: 'P',
    kc1: 1600,
    mc: 0.25,
    ffRatio: 0.4,
    fpRatio: 0.3,
    source: SRC,
    verified: false,
  },
  {
    id: 'mat-scm440-a',
    name: 'SCM440 退火（低合金鋼，CMC 02.1 級）',
    isoGroup: 'P',
    kc1: 1700,
    mc: 0.25,
    ffRatio: 0.4,
    fpRatio: 0.3,
    source: SRC,
    verified: false,
  },
  {
    id: 'mat-scm440-qt',
    name: 'SCM440 調質（低合金鋼硬化回火，CMC 02.2 級）',
    isoGroup: 'P',
    kc1: 2000,
    mc: 0.25,
    ffRatio: 0.4,
    fpRatio: 0.3,
    source: SRC,
    verified: false,
  },
  {
    id: 'mat-sus304',
    name: 'SUS304（沃斯田鐵系不鏽鋼，CMC 05.21 級）',
    isoGroup: 'M',
    kc1: 2000,
    mc: 0.21,
    ffRatio: 0.45,
    fpRatio: 0.35,
    source: SRC,
    verified: false,
  },
  {
    id: 'mat-fc250',
    name: 'FC250（灰鑄鐵，CMC 08 級）',
    isoGroup: 'K',
    kc1: 1100,
    mc: 0.28,
    ffRatio: 0.35,
    fpRatio: 0.25,
    source: SRC,
    verified: false,
  },
]

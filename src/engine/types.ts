/**
 * 計算引擎共用型別
 *
 * 依據《AC 主軸馬達選型 SOP v1.0》。
 * 單位慣例：長度 mm、轉速 rpm、扭矩 N·m、功率 kW、慣量 kg·m²（慣量計算內部使用 SI）。
 */

/** 加工型態 */
export type OperationType = 'od' | 'facing' | 'thread' | 'direct'

export const OPERATION_LABELS: Record<OperationType, string> = {
  od: '外徑車削',
  facing: '端面車削',
  thread: '螺紋車削',
  direct: '直接輸入 (n, T)',
}

/** 設計工況（工況矩陣的一列） */
export interface DutyCase {
  id: string
  name: string
  operation: OperationType
  /** 材料名稱（kc1/mc 於建立時複製為本列數值，可覆寫） */
  material: string
  /** 比切削力參考值 [N/mm²]（h = 1 mm 條件） */
  kc1: number
  /** 比切削力指數（無因次） */
  mc: number
  /** 工件直徑 [mm] */
  D: number
  /** 切深 [mm] */
  ap: number
  /** 每轉進給 [mm/rev] */
  fn: number
  /** 切削速度 [m/min] */
  vc: number
  /** 主偏角 [°] */
  kappaR: number
  /** 實際前角 [°] */
  gamma0: number
  /** kc1 測量基準前角 [°]（Sandvik 標準 = 6） */
  gammaRef: number
  /** 進給分力比 Ff/Fc（經驗值，建立時自材料複製）；舊資料缺省時以 0.40 計 */
  ffRatio?: number
  /** 背分力比 Fp/Fc（經驗值）；舊資料缺省時以 0.30 計 */
  fpRatio?: number
  /** 刃口磨耗量 VB [mm]（放大 Fc/Ff/Fp 估算磨耗餘裕）；0 = 全新刃口；舊資料缺省時以 0 計 */
  vb?: number
  /** operation = 'direct'（如螺紋，由廠商工具計算）時直接給定主軸端座標 */
  directNSp?: number
  /** [N·m] */
  directTSp?: number
  note: string
}

/** Phase 1 輸出：單一工況的計算結果（主軸端座標點） */
export interface DutyResult {
  caseId: string
  /** 切屑厚度 [mm]；direct 模式為 null */
  h: number | null
  /** 修正後比切削力 [N/mm²]；direct 模式為 null */
  kc: number | null
  /** 主切削力 [N]；direct 模式為 null */
  Fc: number | null
  /** 進給分力 Ff = ffRatio·Fc [N]（Z 軸方向）；direct 模式為 null */
  Ff: number | null
  /** 背分力 Fp = fpRatio·Fc [N]（X 軸方向）；direct 模式為 null */
  Fp: number | null
  /** 淨切削功率 [kW] */
  Pc: number
  /** 主軸轉速 [rpm] */
  nSp: number
  /** 主軸端所需扭矩 [N·m] */
  TSp: number
  /** 交叉驗證：T_sp = Fc·D/2·10⁻³ 獨立計算值；direct 模式為 null */
  TSpCross: number | null
  /** 是否已套用刃口磨耗修正（vb > 0）；供 UI 顯示提示 */
  wearApplied: boolean
}

/** 主軸端需求點（Phase 3 覆蓋驗證的輸入） */
export interface DutyPoint {
  caseId: string
  name: string
  nSp: number
  TSp: number
}

/** AC 主軸馬達規格 */
export interface Motor {
  id: string
  brand: string
  model: string
  /** S1 連續額定功率 [kW] */
  powerS1: number
  /** S3/30min 短時額定功率 [kW]；未知為 null（篩選仍以 S1 為主） */
  powerS3?: number | null
  /** 基底轉速 [rpm] */
  nBase: number
  /** 最高轉速 [rpm] */
  nMax: number
  /** 轉子慣量 [kg·m²]；未知為 null */
  inertia: number | null
  /** 額定電流 [A]；未知為 null */
  ratedCurrent: number | null
  voltage: '200V' | '400V' | null
  /** false = 範例/未核對資料，UI 須警示「須核對型錄」 */
  verified: boolean
  note: string
}

/** 變速箱單一檔位 */
export interface Gear {
  /** 齒比 i_k = n_sp / n_motor（減速傳動 < 1） */
  ratio: number
  /** 該檔傳動效率 η_k（0–1） */
  efficiency: number
}

/** 材料比切削力資料 */
export interface Material {
  id: string
  name: string
  /** ISO 切削材料群（P / M / K / N / S / H） */
  isoGroup: string
  kc1: number
  mc: number
  /**
   * kc1 測定基準前角 [°]（選填，缺省視為 6）。
   * Sandvik 體系 = 6；Iscar/Kienzle kc1.1 體系 = 0。
   * 選用材料時複製到工況 γref，確保前角修正以正確基準計算。
   */
  gammaRef?: number
  /** 進給分力比 Ff/Fc（經驗值，選填） */
  ffRatio?: number
  /** 背分力比 Fp/Fc（經驗值，選填） */
  fpRatio?: number
  /** 數據來源與參考條件說明 */
  source: string
  /** false = 參考值，正式選型前須核對刀具廠商手冊 */
  verified: boolean
}

/**
 * 扭矩－功率換算常數：T [N·m] = P [kW] × 9550 / n [rpm]
 *
 * 由來：T = P/ω = P[kW]·1000·60 / (2π·n) = P × (60000/2π) / n，
 * 60000/2π = 9549.30…；9550 為機械業型錄與手冊（FANUC、Sandvik 等）
 * 慣用的四捨五入工程值（相對誤差 +0.007%）。
 */
export const TORQUE_CONST = 9550

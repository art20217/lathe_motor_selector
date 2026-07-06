/**
 * 選型案全域狀態（zustand + persist → localStorage 自動保存）
 *
 * 專案檔 JSON 即本 state 的序列化，schemaVersion 供日後升級 migration。
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DutyCase, Gear, Motor } from '../engine/types'

export const SCHEMA_VERSION = 1

/** Phase 4 加減速計算輸入 */
export interface DynamicsInput {
  /** 工件型式 */
  workpieceType: 'solid' | 'hollow'
  /** 工件外徑 [mm] */
  wpOuterDia: number
  /** 工件內徑 [mm]（hollow 時） */
  wpInnerDia: number
  /** 工件長度 [mm] */
  wpLength: number
  /** 材料密度 [kg/m³] */
  wpDensity: number
  /** 主軸本體慣量 [kg·m²] */
  jSpindle: number
  /** 卡盤慣量 [kg·m²] */
  jChuck: number
  /** 齒輪系統折算至馬達端等效慣量 [kg·m²] */
  jGears: number
  /** 使用檔位 index（0–3） */
  gearIndex: number
  /** 主軸端轉速變化量 [rpm] */
  deltaNSp: number
  /** 空載摩擦扭矩佔額定扭矩比例 [%]（假設值） */
  frictionPct: number
  /** 機台規格要求的加速時間 [s]；null = 未定義 */
  requiredTime: number | null
}

/** 查核清單單項 */
export interface CheckItem {
  id: string
  label: string
  checked: boolean
  note: string
}

export interface ProjectState {
  schemaVersion: number
  projectName: string
  // Phase 1
  cases: DutyCase[]
  // Phase 2
  etaTotal: number
  /** true = etaTotal 由單級效率^級數估算（假設值，報告須標記） */
  etaIsEstimated: boolean
  etaStageEff: number
  etaStages: number
  sf: number
  customMotors: Motor[]
  /** 內建馬達的使用者覆寫版（以 id 對應） */
  motorOverrides: Record<string, Motor>
  /** 被使用者隱藏的內建馬達 id */
  hiddenBuiltInMotors: string[]
  selectedMotorId: string | null
  // Phase 3
  gears: Gear[]
  // Phase 4
  dynamics: DynamicsInput
  driverChecklist: CheckItem[]
  thermalChecklist: CheckItem[]
  // UI
  activePhase: number
}

export interface ProjectActions {
  setProjectName: (name: string) => void
  setActivePhase: (phase: number) => void
  addCase: (c: DutyCase) => void
  updateCase: (id: string, patch: Partial<DutyCase>) => void
  removeCase: (id: string) => void
  duplicateCase: (id: string) => void
  setEta: (patch: Partial<Pick<ProjectState, 'etaTotal' | 'etaIsEstimated' | 'etaStageEff' | 'etaStages'>>) => void
  setSf: (sf: number) => void
  addMotor: (m: Motor) => void
  updateMotor: (id: string, patch: Partial<Motor>) => void
  removeMotor: (id: string) => void
  overrideBuiltInMotor: (m: Motor) => void
  hideBuiltInMotor: (id: string) => void
  selectMotor: (id: string | null) => void
  setGear: (index: number, patch: Partial<Gear>) => void
  setDynamics: (patch: Partial<DynamicsInput>) => void
  setCheckItem: (list: 'driver' | 'thermal', id: string, patch: Partial<CheckItem>) => void
  importProject: (data: ProjectState) => void
  resetProject: () => void
}

export const DRIVER_CHECKLIST_TEMPLATE: CheckItem[] = [
  { id: 'drv-list', label: '馬達型號在 SPM 放大器支援清單中（FANUC B-65272EN "Applicable amplifier"）', checked: false, note: '' },
  { id: 'drv-current', label: 'SPM 放大器額定電流 ≥ 馬達額定電流', checked: false, note: '' },
  { id: 'drv-voltage', label: '電源電壓規格匹配（200V / 400V）', checked: false, note: '' },
]

export const THERMAL_CHECKLIST_TEMPLATE: CheckItem[] = [
  { id: 'th-nameplate', label: '馬達銘牌額定條件（環境溫度、海拔、冷卻方式）與實際安裝環境一致', checked: false, note: '' },
  { id: 'th-derate', label: '環境溫度高於銘牌條件時：已查降額曲線，降額後功率仍 ≥ P_min', checked: false, note: '' },
]

const initialState: ProjectState = {
  schemaVersion: SCHEMA_VERSION,
  projectName: '未命名選型案',
  cases: [],
  etaTotal: 0.85,
  etaIsEstimated: true,
  etaStageEff: 0.97,
  etaStages: 5,
  sf: 1.5,
  customMotors: [],
  motorOverrides: {},
  hiddenBuiltInMotors: [],
  selectedMotorId: null,
  gears: [
    { ratio: 0.05, efficiency: 0.85 },
    { ratio: 0.12, efficiency: 0.88 },
    { ratio: 0.28, efficiency: 0.91 },
    { ratio: 0.65, efficiency: 0.94 },
  ],
  dynamics: {
    workpieceType: 'solid',
    wpOuterDia: 1000,
    wpInnerDia: 0,
    wpLength: 3000,
    wpDensity: 7850,
    jSpindle: 50,
    jChuck: 100,
    jGears: 0.1,
    gearIndex: 0,
    deltaNSp: 100,
    frictionPct: 10,
    requiredTime: null,
  },
  driverChecklist: DRIVER_CHECKLIST_TEMPLATE,
  thermalChecklist: THERMAL_CHECKLIST_TEMPLATE,
  activePhase: 1,
}

export const useProjectStore = create<ProjectState & ProjectActions>()(
  persist(
    (set) => ({
      ...initialState,
      setProjectName: (projectName) => set({ projectName }),
      setActivePhase: (activePhase) => set({ activePhase }),
      addCase: (c) => set((s) => ({ cases: [...s.cases, c] })),
      updateCase: (id, patch) =>
        set((s) => ({ cases: s.cases.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      removeCase: (id) => set((s) => ({ cases: s.cases.filter((c) => c.id !== id) })),
      duplicateCase: (id) =>
        set((s) => {
          const src = s.cases.find((c) => c.id === id)
          if (!src) return s
          const copy = { ...src, id: crypto.randomUUID(), name: `${src.name}（複製）` }
          return { cases: [...s.cases, copy] }
        }),
      setEta: (patch) => set(patch),
      setSf: (sf) => set({ sf }),
      addMotor: (m) => set((s) => ({ customMotors: [...s.customMotors, m] })),
      updateMotor: (id, patch) =>
        set((s) => ({
          customMotors: s.customMotors.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),
      removeMotor: (id) =>
        set((s) => ({
          customMotors: s.customMotors.filter((m) => m.id !== id),
          selectedMotorId: s.selectedMotorId === id ? null : s.selectedMotorId,
        })),
      overrideBuiltInMotor: (m) =>
        set((s) => ({ motorOverrides: { ...s.motorOverrides, [m.id]: m } })),
      hideBuiltInMotor: (id) =>
        set((s) => ({
          hiddenBuiltInMotors: [...s.hiddenBuiltInMotors, id],
          selectedMotorId: s.selectedMotorId === id ? null : s.selectedMotorId,
        })),
      selectMotor: (selectedMotorId) => set({ selectedMotorId }),
      setGear: (index, patch) =>
        set((s) => ({ gears: s.gears.map((g, k) => (k === index ? { ...g, ...patch } : g)) })),
      setDynamics: (patch) => set((s) => ({ dynamics: { ...s.dynamics, ...patch } })),
      setCheckItem: (list, id, patch) =>
        set((s) => {
          const key = list === 'driver' ? 'driverChecklist' : 'thermalChecklist'
          return {
            [key]: s[key].map((i) => (i.id === id ? { ...i, ...patch } : i)),
          }
        }),
      importProject: (data) => set({ ...data, schemaVersion: SCHEMA_VERSION }),
      resetProject: () => set(initialState),
    }),
    { name: 'lathe-motor-selector', version: SCHEMA_VERSION },
  ),
)

/** 匯出用：抽出純資料（去除 actions） */
export function serializeProject(s: ProjectState & ProjectActions): ProjectState {
  return {
    schemaVersion: s.schemaVersion,
    projectName: s.projectName,
    cases: s.cases,
    etaTotal: s.etaTotal,
    etaIsEstimated: s.etaIsEstimated,
    etaStageEff: s.etaStageEff,
    etaStages: s.etaStages,
    sf: s.sf,
    customMotors: s.customMotors,
    motorOverrides: s.motorOverrides,
    hiddenBuiltInMotors: s.hiddenBuiltInMotors,
    selectedMotorId: s.selectedMotorId,
    gears: s.gears,
    dynamics: s.dynamics,
    driverChecklist: s.driverChecklist,
    thermalChecklist: s.thermalChecklist,
    activePhase: s.activePhase,
  }
}

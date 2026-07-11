import { useEffect, useState } from 'react'
import { Copy, Pencil, Plus, Trash2, X } from 'lucide-react'
import { BUILT_IN_MATERIALS } from '../../data/materials'
import {
  OPERATION_LABELS,
  type DutyCase,
  type DutyResult,
  type Material,
  type OperationType,
} from '../../engine/types'
import {
  CHIP_THICKNESS_MIN,
  DEFAULT_FF_RATIO,
  DEFAULT_FP_RATIO,
  DEFAULT_GAMMA_REF,
} from '../../engine/cutting'
import { deflectionCheck, SUPPORT_FACTOR, type SupportType } from '../../engine/workpiece'
import { fmt } from '../../lib/format'
import { useProjectStore } from '../../store/projectStore'
import { getEffectiveDutyResults, getMaxPc, getSpindleLossAt } from '../../store/selectors'
import { Badge, Field, NumInput, Section } from '../ui'

function newCase(seq: number): DutyCase {
  const mat = BUILT_IN_MATERIALS[1] // S45C
  return {
    id: crypto.randomUUID(),
    name: `工況 ${seq}`,
    operation: 'od',
    material: mat.name,
    kc1: mat.kc1,
    mc: mat.mc,
    ffRatio: mat.ffRatio ?? DEFAULT_FF_RATIO,
    fpRatio: mat.fpRatio ?? DEFAULT_FP_RATIO,
    D: 500,
    ap: 5,
    fn: 0.4,
    vc: 180,
    kappaR: 95,
    gamma0: 6,
    gammaRef: mat.gammaRef ?? DEFAULT_GAMMA_REF,
    note: '',
  }
}

const ISO_GROUPS = [
  { value: 'P', label: 'P — 鋼' },
  { value: 'M', label: 'M — 不鏽鋼' },
  { value: 'K', label: 'K — 鑄鐵' },
  { value: 'N', label: 'N — 非鐵金屬' },
  { value: 'S', label: 'S — 耐熱合金' },
  { value: 'H', label: 'H — 高硬度材' },
]

function blankMaterial(): Material {
  return {
    id: crypto.randomUUID(),
    name: '',
    isoGroup: 'P',
    kc1: 1600,
    mc: 0.25,
    gammaRef: DEFAULT_GAMMA_REF,
    ffRatio: DEFAULT_FF_RATIO,
    fpRatio: DEFAULT_FP_RATIO,
    source: '',
    verified: false,
  }
}

function MaterialForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Material
  onSave: (m: Material) => void
  onCancel: () => void
}) {
  const [m, setM] = useState<Material>(initial)
  const patch = (p: Partial<Material>) => setM((prev) => ({ ...prev, ...p }))
  const valid = m.name.trim() && m.kc1 > 0 && m.mc > 0

  return (
    <div className="rounded border border-blue-200 bg-blue-50/50 p-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Field label="材料名稱">
          <input
            value={m.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="如：SNCM439 調質"
            className="w-full rounded border border-slate-300 px-1.5 py-1 text-sm focus:border-blue-500 focus:outline-none"
          />
        </Field>
        <Field label="ISO 切削材料群">
          <select
            value={m.isoGroup}
            onChange={(e) => patch({ isoGroup: e.target.value })}
            className="w-full rounded border border-slate-300 px-1 py-1 text-sm focus:border-blue-500 focus:outline-none"
          >
            {ISO_GROUPS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="kc1（h=1mm 基準）" unit="N/mm²">
          <NumInput value={m.kc1} onChange={(v) => patch({ kc1: v })} step={50} min={0} />
        </Field>
        <Field label="mc">
          <NumInput value={m.mc} onChange={(v) => patch({ mc: v })} step={0.01} min={0} />
        </Field>
        <Field label="kc1 基準前角 γref" unit="°">
          <NumInput
            value={m.gammaRef ?? DEFAULT_GAMMA_REF}
            onChange={(v) => patch({ gammaRef: v })}
            step={1}
          />
        </Field>
        <Field label="進給分力比 Ff/Fc">
          <NumInput
            value={m.ffRatio ?? DEFAULT_FF_RATIO}
            onChange={(v) => patch({ ffRatio: v })}
            step={0.05}
            min={0}
          />
        </Field>
        <Field label="背分力比 Fp/Fc">
          <NumInput
            value={m.fpRatio ?? DEFAULT_FP_RATIO}
            onChange={(v) => patch({ fpRatio: v })}
            step={0.05}
            min={0}
          />
        </Field>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        γref 為 kc1 的測定基準前角，各廠商不同：Sandvik 型錄 = 6°、Iscar/Kienzle 體系的 kc1.1 =
        0°。選用材料時 γref 會帶入工況，前角修正即以正確基準計算。
      </p>
      <div className="mt-3 flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={m.verified}
            onChange={(e) => patch({ verified: e.target.checked })}
          />
          數據已核對刀具廠商手冊
        </label>
        <input
          value={m.source}
          onChange={(e) => patch({ source: e.target.value })}
          placeholder="資料來源（廠商手冊頁次、測定條件…）"
          className="flex-1 rounded border border-slate-300 px-1.5 py-1 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          type="button"
          disabled={!valid}
          onClick={() => onSave(m)}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
        >
          儲存
        </button>
        <button type="button" onClick={onCancel} className="p-1.5 text-slate-400 hover:text-slate-600">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

/** 工件撓曲/支撐檢核：彎曲合力自動取全工況最惡劣者（√(Fc²+Fp²) 最大） */
function DeflectionSection() {
  const s = useProjectStore()
  const cfg = s.deflection
  const results = getEffectiveDutyResults(s)

  let worst: { name: string; fc: number; fp: number; bend: number } | null = null
  for (const r of results) {
    if (r.Fc === null) continue
    const bend = Math.hypot(r.Fc, r.Fp ?? 0)
    if (!worst || bend > worst.bend) {
      const c = s.cases.find((x) => x.id === r.caseId)
      worst = { name: c?.name ?? r.caseId, fc: r.Fc, fp: r.Fp ?? 0, bend }
    }
  }
  const defl = worst
    ? deflectionCheck(
        cfg.support,
        cfg.diameter,
        cfg.length,
        worst.fc,
        worst.fp,
        cfg.eGpa * 1e9,
        cfg.limit,
        cfg.bore,
      )
    : null

  return (
    <Section title="工件撓曲 / 支撐檢核">
      <p className="mb-3 text-xs leading-relaxed text-slate-500">
        以最惡劣工況的彎曲合力 √(Fc²+Fp²) 檢核工件剛性（懸臂 δ=FL³/3EI、夾頭＋尾座
        δ=FL³/110EI、兩頂心 δ=FL³/48EI）。直接輸入 (n,T) 型態的工況無切削力，不列入。
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Field label="支撐方式">
          <select
            value={cfg.support}
            onChange={(e) => s.setDeflection({ support: e.target.value as SupportType })}
            className="w-full rounded border border-slate-300 px-1 py-1 text-sm focus:border-blue-500 focus:outline-none"
          >
            {Object.entries(SUPPORT_FACTOR).map(([v, f]) => (
              <option key={v} value={v}>
                {f.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="工件直徑（最小斷面）" unit="mm">
          <NumInput value={cfg.diameter} onChange={(v) => s.setDeflection({ diameter: v })} step={10} min={1} />
        </Field>
        <Field label="懸伸長 / 跨距 L" unit="mm">
          <NumInput value={cfg.length} onChange={(v) => s.setDeflection({ length: v })} step={100} min={1} />
        </Field>
        <Field label="內孔徑" unit="mm">
          <NumInput value={cfg.bore} onChange={(v) => s.setDeflection({ bore: v })} step={10} min={0} />
        </Field>
        <Field label="楊氏模數 E" unit="GPa">
          <NumInput value={cfg.eGpa} onChange={(v) => s.setDeflection({ eGpa: v })} step={1} min={1} />
        </Field>
        <Field label="允許撓曲" unit="mm">
          <NumInput value={cfg.limit} onChange={(v) => s.setDeflection({ limit: v })} step={0.005} min={0.001} />
        </Field>
      </div>
      {defl && worst && (
        <div className="mt-3 rounded bg-slate-50 px-3 py-2 text-sm">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 tabular-nums">
            <span className="text-slate-600">
              彎曲合力 {fmt(defl.fBend, 0)} N（來源：{worst.name}）
            </span>
            <span className="text-slate-600">L/D = {fmt(defl.ldRatio, 1)}</span>
            <span>
              最大撓曲 δ = <b>{fmt(defl.deflection, 4)}</b> mm（允許 {fmt(defl.limit, 3)} mm）
            </span>
            {defl.ok ? <Badge kind="ok">✓ 通過</Badge> : <Badge kind="error">✗ 超出允許值</Badge>}
          </div>
          {defl.advice.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-xs text-amber-700">
              {defl.advice.map((a) => (
                <li key={a}>⚠ {a}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Section>
  )
}

/** 單一工況卡片：所有輸入與操作按鈕都在可視範圍內，不需水平捲動 */
function DutyCaseCard({ c, r, flash }: { c: DutyCase; r: DutyResult; flash: boolean }) {
  const s = useProjectStore()
  const direct = c.operation === 'direct'
  const allMaterials = [...s.customMaterials, ...BUILT_IN_MATERIALS]
  const loss = getSpindleLossAt(s, r.nSp)

  return (
    <div
      data-case-id={c.id}
      className="rounded-lg border border-slate-200 p-3"
      style={flash ? { animation: 'flash-new 1.6s ease-out' } : undefined}
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={c.name}
          onChange={(e) => s.updateCase(c.id, { name: e.target.value })}
          className="w-36 rounded border border-slate-300 px-2 py-1 text-sm font-medium focus:border-blue-500 focus:outline-none"
          placeholder="工況名稱"
        />
        <select
          value={c.operation}
          onChange={(e) => s.updateCase(c.id, { operation: e.target.value as OperationType })}
          className="rounded border border-slate-300 px-1.5 py-1 text-sm focus:border-blue-500 focus:outline-none"
        >
          {Object.entries(OPERATION_LABELS).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
        <div className="ml-auto flex gap-1.5">
          <button
            type="button"
            onClick={() => s.duplicateCase(c.id)}
            className="flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            <Copy size={13} /> 複製
          </button>
          <button
            type="button"
            onClick={() => s.removeCase(c.id)}
            className="flex items-center gap-1 rounded border border-red-300 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50"
          >
            <Trash2 size={13} /> 刪除
          </button>
        </div>
      </div>

      {direct ? (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Field label="主軸轉速 n_sp" unit="rpm">
            <span className="block w-28">
              <NumInput
                value={c.directNSp ?? NaN}
                onChange={(v) => s.updateCase(c.id, { directNSp: v })}
                step={1}
                min={0}
              />
            </span>
          </Field>
          <Field label="主軸端扭矩 T_sp" unit="N·m">
            <span className="block w-28">
              <NumInput
                value={c.directTSp ?? NaN}
                onChange={(v) => s.updateCase(c.id, { directTSp: v })}
                step={1}
                min={0}
              />
            </span>
          </Field>
          <label className="min-w-52 flex-1 text-sm">
            <span className="mb-0.5 block text-xs text-slate-500">來源備註</span>
            <input
              value={c.note}
              onChange={(e) => s.updateCase(c.id, { note: e.target.value })}
              placeholder="如：CoroPlus 螺紋模組計算"
              className="w-full rounded border border-slate-300 px-1.5 py-1 text-sm focus:border-blue-500 focus:outline-none"
            />
          </label>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          <div className="col-span-2">
            <Field label="材料（帶入 kc1/mc 參考值）">
              <select
                value={c.material}
                onChange={(e) => {
                  const mat = allMaterials.find((m) => m.name === e.target.value)
                  s.updateCase(
                    c.id,
                    mat
                      ? {
                          material: mat.name,
                          kc1: mat.kc1,
                          mc: mat.mc,
                          gammaRef: mat.gammaRef ?? DEFAULT_GAMMA_REF,
                          ffRatio: mat.ffRatio ?? DEFAULT_FF_RATIO,
                          fpRatio: mat.fpRatio ?? DEFAULT_FP_RATIO,
                        }
                      : { material: e.target.value },
                  )
                }}
                className="w-full rounded border border-slate-300 px-1 py-1 text-sm focus:border-blue-500 focus:outline-none"
              >
                {!allMaterials.some((m) => m.name === c.material) && (
                  <option value={c.material}>{c.material}</option>
                )}
                {s.customMaterials.length > 0 && (
                  <optgroup label="自訂材料">
                    {s.customMaterials.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="內建參考庫">
                  {BUILT_IN_MATERIALS.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </Field>
          </div>
          <Field label="kc1" unit="N/mm²">
            <NumInput value={c.kc1} onChange={(v) => s.updateCase(c.id, { kc1: v })} step={50} min={0} />
          </Field>
          <Field label="mc">
            <NumInput value={c.mc} onChange={(v) => s.updateCase(c.id, { mc: v })} step={0.01} min={0} />
          </Field>
          <Field label="工件直徑 D" unit="mm">
            <NumInput value={c.D} onChange={(v) => s.updateCase(c.id, { D: v })} step={10} min={1} />
          </Field>
          <Field label="切深 ap" unit="mm">
            <NumInput value={c.ap} onChange={(v) => s.updateCase(c.id, { ap: v })} step={0.5} min={0} />
          </Field>
          <Field label="進給 fn" unit="mm/rev">
            <NumInput value={c.fn} onChange={(v) => s.updateCase(c.id, { fn: v })} step={0.05} min={0} />
          </Field>
          <Field label="切削速度 vc" unit="m/min">
            <NumInput value={c.vc} onChange={(v) => s.updateCase(c.id, { vc: v })} step={10} min={1} />
          </Field>
          <Field label="主偏角 κr" unit="°">
            <NumInput value={c.kappaR} onChange={(v) => s.updateCase(c.id, { kappaR: v })} step={1} min={1} max={180} />
          </Field>
          <Field label="前角 γ0" unit="°">
            <NumInput value={c.gamma0} onChange={(v) => s.updateCase(c.id, { gamma0: v })} step={1} />
          </Field>
          <Field label="kc1 基準 γref" unit="°">
            <NumInput value={c.gammaRef} onChange={(v) => s.updateCase(c.id, { gammaRef: v })} step={1} />
          </Field>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 rounded bg-slate-50 px-3 py-2 text-sm tabular-nums">
        <span className="text-xs font-medium text-slate-400">計算結果</span>
        {!direct && (
          <>
            <span className="text-slate-600">
              h = {fmt(r.h, 3)} mm
              {c.fn * Math.sin((c.kappaR * Math.PI) / 180) < CHIP_THICKNESS_MIN && (
                <span className="ml-1"><Badge kind="warn">已鉗制下限 {CHIP_THICKNESS_MIN} mm</Badge></span>
              )}
            </span>
            <span className="text-slate-600">kc = {fmt(r.kc, 0)} N/mm²</span>
            <span className="text-slate-600">Fc = {fmt(r.Fc, 0)} N</span>
            <span className="text-slate-500">Ff = {fmt(r.Ff, 0)} N</span>
            <span className="text-slate-500">Fp = {fmt(r.Fp, 0)} N</span>
          </>
        )}
        {loss && (
          <span className="text-amber-700">
            含損失 +{fmt(loss.tTotal, 1)} N·m / +{fmt(loss.pTotal / 1000, 2)} kW
          </span>
        )}
        <span>
          Pc = <b>{fmt(r.Pc, 2)}</b> kW
        </span>
        <span>
          n_sp = <b>{fmt(r.nSp, 1)}</b> rpm
        </span>
        <span>
          T_sp = <b>{fmt(r.TSp, 1)}</b> N·m
        </span>
      </div>
    </div>
  )
}

export function Phase1() {
  const s = useProjectStore()
  const results = getEffectiveDutyResults(s)
  const maxPc = getMaxPc(results)
  const maxT = results.length ? Math.max(...results.map((r) => r.TSp)) : 0
  const [flashId, setFlashId] = useState<string | null>(null)
  const [addingMat, setAddingMat] = useState(false)
  const [editingMatId, setEditingMatId] = useState<string | null>(null)
  const editingMat = s.customMaterials.find((m) => m.id === editingMatId)

  const handleAdd = () => {
    const c = newCase(s.cases.length + 1)
    s.addCase(c)
    setFlashId(c.id)
  }

  const saveMaterial = (m: Material) => {
    if (s.customMaterials.some((x) => x.id === m.id)) s.updateMaterial(m.id, m)
    else s.addMaterial(m)
    setAddingMat(false)
    setEditingMatId(null)
  }

  useEffect(() => {
    if (!flashId) return
    document
      .querySelector(`[data-case-id="${flashId}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    const t = setTimeout(() => setFlashId(null), 1700)
    return () => clearTimeout(t)
  }, [flashId])

  return (
    <div className="space-y-4">
      <Section
        title="Step 1.1–1.3 設計工況矩陣"
        aside={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setAddingMat(true)
                setEditingMatId(null)
              }}
              className="flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              <Plus size={15} /> 新增材料
            </button>
            <button
              type="button"
              onClick={handleAdd}
              className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus size={15} /> 新增工況
            </button>
          </div>
        }
      >
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          列出對功率與扭矩需求最惡劣的代表性工況（最大切深 × 最大進給 × 難切削材料 ×
          最大直徑低速端，以及最小直徑高速端）。螺紋車削依 SOP 不展開公式，請以刀具廠商工具（如
          Sandvik CoroPlus ToolGuide）計算後，用「直接輸入 (n, T)」型態填入結果。新增的工況會帶入
          S45C 與常用切削條件作為起始值，全部欄位皆可修改。
        </p>
        {addingMat && (
          <div className="mb-3">
            <MaterialForm
              initial={blankMaterial()}
              onSave={saveMaterial}
              onCancel={() => setAddingMat(false)}
            />
          </div>
        )}
        {editingMat && (
          <div className="mb-3">
            <MaterialForm
              key={editingMat.id}
              initial={editingMat}
              onSave={saveMaterial}
              onCancel={() => setEditingMatId(null)}
            />
          </div>
        )}
        {s.customMaterials.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium text-slate-500">自訂材料</span>
            {s.customMaterials.map((m) => (
              <span
                key={m.id}
                className="flex items-center gap-1.5 rounded border border-slate-300 bg-white px-2 py-1"
              >
                <span className="font-medium">{m.name}</span>
                <span className="tabular-nums text-slate-400">
                  kc1 {m.kc1}・mc {m.mc}・γref {m.gammaRef ?? DEFAULT_GAMMA_REF}°
                </span>
                {!m.verified && <Badge kind="warn">須核對</Badge>}
                <button
                  type="button"
                  title="編輯"
                  onClick={() => {
                    setEditingMatId(m.id)
                    setAddingMat(false)
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  title="刪除"
                  onClick={() => s.removeMaterial(m.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        {s.cases.length === 0 ? (
          <button
            type="button"
            onClick={handleAdd}
            className="block w-full rounded border border-dashed border-slate-300 py-10 text-center text-sm text-slate-400 hover:border-blue-400 hover:text-blue-600"
          >
            尚無工況，點此（或右上「新增工況」）開始建立設計工況矩陣
          </button>
        ) : (
          <div className="space-y-3">
            {s.cases.map((c) => {
              const r = results.find((x) => x.caseId === c.id)!
              return <DutyCaseCard key={c.id} c={c} r={r} flash={c.id === flashId} />
            })}
          </div>
        )}
      </Section>

      {results.length > 0 && <DeflectionSection />}

      {results.length > 0 && (
        <Section title="Phase 1 輸出摘要">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-slate-500">最大淨切削功率 max(Pc)：</span>
              <span className="font-semibold tabular-nums">{fmt(maxPc, 2)} kW</span>
            </div>
            <div>
              <span className="text-slate-500">最大主軸端扭矩需求：</span>
              <span className="font-semibold tabular-nums">{fmt(maxT, 1)} N·m</span>
            </div>
            <Badge kind="info">γref 隨材料帶入（Sandvik 體系 = 6°、Iscar kc1.1 = 0°）；前角偏離基準 ±10° 以上時線性修正未經驗證</Badge>
          </div>
        </Section>
      )}
    </div>
  )
}

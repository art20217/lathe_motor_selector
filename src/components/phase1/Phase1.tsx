import { useEffect, useState } from 'react'
import { Copy, Plus, Trash2 } from 'lucide-react'
import { BUILT_IN_MATERIALS } from '../../data/materials'
import {
  OPERATION_LABELS,
  type DutyCase,
  type DutyResult,
  type OperationType,
} from '../../engine/types'
import { fmt } from '../../lib/format'
import { useProjectStore } from '../../store/projectStore'
import { getDutyResults, getMaxPc } from '../../store/selectors'
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
    D: 500,
    ap: 5,
    fn: 0.4,
    vc: 180,
    kappaR: 95,
    gamma0: 6,
    gammaRef: 6,
    note: '',
  }
}

/** 單一工況卡片：所有輸入與操作按鈕都在可視範圍內，不需水平捲動 */
function DutyCaseCard({ c, r, flash }: { c: DutyCase; r: DutyResult; flash: boolean }) {
  const s = useProjectStore()
  const direct = c.operation === 'direct'

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
                  const mat = BUILT_IN_MATERIALS.find((m) => m.name === e.target.value)
                  s.updateCase(
                    c.id,
                    mat
                      ? { material: mat.name, kc1: mat.kc1, mc: mat.mc }
                      : { material: e.target.value },
                  )
                }}
                className="w-full rounded border border-slate-300 px-1 py-1 text-sm focus:border-blue-500 focus:outline-none"
              >
                {!BUILT_IN_MATERIALS.some((m) => m.name === c.material) && (
                  <option value={c.material}>{c.material}</option>
                )}
                {BUILT_IN_MATERIALS.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
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
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 rounded bg-slate-50 px-3 py-2 text-sm tabular-nums">
        <span className="text-xs font-medium text-slate-400">計算結果</span>
        {!direct && (
          <>
            <span className="text-slate-600">h = {fmt(r.h, 3)} mm</span>
            <span className="text-slate-600">kc = {fmt(r.kc, 0)} N/mm²</span>
            <span className="text-slate-600">Fc = {fmt(r.Fc, 0)} N</span>
          </>
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
  const results = getDutyResults(s.cases)
  const maxPc = getMaxPc(results)
  const maxT = results.length ? Math.max(...results.map((r) => r.TSp)) : 0
  const [flashId, setFlashId] = useState<string | null>(null)

  const handleAdd = () => {
    const c = newCase(s.cases.length + 1)
    s.addCase(c)
    setFlashId(c.id)
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
          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={15} /> 新增工況
          </button>
        }
      >
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          列出對功率與扭矩需求最惡劣的代表性工況（最大切深 × 最大進給 × 難切削材料 ×
          最大直徑低速端，以及最小直徑高速端）。螺紋車削依 SOP 不展開公式，請以刀具廠商工具（如
          Sandvik CoroPlus ToolGuide）計算後，用「直接輸入 (n, T)」型態填入結果。新增的工況會帶入
          S45C 與常用切削條件作為起始值，全部欄位皆可修改。
        </p>
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
            <Badge kind="info">γref 預設 6°（Sandvik 基準）；前角偏離 ±10° 以上時線性修正未經驗證</Badge>
          </div>
        </Section>
      )}
    </div>
  )
}

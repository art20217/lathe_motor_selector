import { Copy, Plus, Trash2 } from 'lucide-react'
import { BUILT_IN_MATERIALS } from '../../data/materials'
import { OPERATION_LABELS, type DutyCase, type OperationType } from '../../engine/types'
import { fmt } from '../../lib/format'
import { useProjectStore } from '../../store/projectStore'
import { getDutyResults, getMaxPc } from '../../store/selectors'
import { Badge, NumInput, Section } from '../ui'

function newCase(): DutyCase {
  const mat = BUILT_IN_MATERIALS[1] // S45C
  return {
    id: crypto.randomUUID(),
    name: `工況 ${new Date().toLocaleTimeString('zh-TW', { hour12: false })}`,
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

export function Phase1() {
  const s = useProjectStore()
  const results = getDutyResults(s.cases)
  const maxPc = getMaxPc(results)
  const maxT = results.length ? Math.max(...results.map((r) => r.TSp)) : 0

  const th = 'px-2 py-1.5 text-xs font-medium text-slate-500 whitespace-nowrap'
  const td = 'px-2 py-1'

  return (
    <div className="space-y-4">
      <Section
        title="Step 1.1–1.3 設計工況矩陣"
        aside={
          <button
            type="button"
            onClick={() => s.addCase(newCase())}
            className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={15} /> 新增工況
          </button>
        }
      >
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          列出對功率與扭矩需求最惡劣的代表性工況（最大切深 × 最大進給 × 難切削材料 ×
          最大直徑低速端，以及最小直徑高速端）。螺紋車削依 SOP 不展開公式，請以刀具廠商工具（如
          Sandvik CoroPlus ToolGuide）計算後，用「直接輸入 (n, T)」型態填入結果。材料 kc1/mc
          為參考值，可直接覆寫。
        </p>
        {s.cases.length === 0 ? (
          <div className="rounded border border-dashed border-slate-300 py-10 text-center text-sm text-slate-400">
            尚無工況，點「新增工況」開始建立設計工況矩陣
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className={th}>名稱</th>
                  <th className={th}>加工型態</th>
                  <th className={th}>材料</th>
                  <th className={th}>kc1 [N/mm²]</th>
                  <th className={th}>mc</th>
                  <th className={th}>D [mm]</th>
                  <th className={th}>ap [mm]</th>
                  <th className={th}>fn [mm/rev]</th>
                  <th className={th}>vc [m/min]</th>
                  <th className={th}>κr [°]</th>
                  <th className={th}>γ0 [°]</th>
                  <th className={`${th} border-l border-slate-200`}>Pc [kW]</th>
                  <th className={th}>n_sp [rpm]</th>
                  <th className={th}>T_sp [N·m]</th>
                  <th className={th}></th>
                </tr>
              </thead>
              <tbody>
                {s.cases.map((c) => {
                  const r = results.find((x) => x.caseId === c.id)!
                  const direct = c.operation === 'direct'
                  return (
                    <tr key={c.id} className="border-b border-slate-100 align-top hover:bg-slate-50">
                      <td className={`${td} min-w-32`}>
                        <input
                          value={c.name}
                          onChange={(e) => s.updateCase(c.id, { name: e.target.value })}
                          className="w-full rounded border border-slate-300 px-1.5 py-1 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className={td}>
                        <select
                          value={c.operation}
                          onChange={(e) =>
                            s.updateCase(c.id, { operation: e.target.value as OperationType })
                          }
                          className="rounded border border-slate-300 px-1 py-1 text-sm focus:border-blue-500 focus:outline-none"
                        >
                          {Object.entries(OPERATION_LABELS).map(([v, label]) => (
                            <option key={v} value={v}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      {direct ? (
                        <td className={td} colSpan={9}>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-xs text-slate-500">主軸端座標：</span>
                            <span className="flex items-center gap-1">
                              n_sp
                              <span className="w-24">
                                <NumInput
                                  value={c.directNSp ?? NaN}
                                  onChange={(v) => s.updateCase(c.id, { directNSp: v })}
                                  step={1}
                                  min={0}
                                />
                              </span>
                              rpm
                            </span>
                            <span className="flex items-center gap-1">
                              T_sp
                              <span className="w-24">
                                <NumInput
                                  value={c.directTSp ?? NaN}
                                  onChange={(v) => s.updateCase(c.id, { directTSp: v })}
                                  step={1}
                                  min={0}
                                />
                              </span>
                              N·m
                            </span>
                            <input
                              value={c.note}
                              onChange={(e) => s.updateCase(c.id, { note: e.target.value })}
                              placeholder="來源備註（如：CoroPlus 螺紋模組計算）"
                              className="flex-1 rounded border border-slate-300 px-1.5 py-1 text-sm focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className={`${td} min-w-40`}>
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
                          </td>
                          <td className={`${td} w-24`}>
                            <NumInput value={c.kc1} onChange={(v) => s.updateCase(c.id, { kc1: v })} step={50} min={0} />
                          </td>
                          <td className={`${td} w-20`}>
                            <NumInput value={c.mc} onChange={(v) => s.updateCase(c.id, { mc: v })} step={0.01} min={0} />
                          </td>
                          <td className={`${td} w-24`}>
                            <NumInput value={c.D} onChange={(v) => s.updateCase(c.id, { D: v })} step={10} min={1} />
                          </td>
                          <td className={`${td} w-20`}>
                            <NumInput value={c.ap} onChange={(v) => s.updateCase(c.id, { ap: v })} step={0.5} min={0} />
                          </td>
                          <td className={`${td} w-20`}>
                            <NumInput value={c.fn} onChange={(v) => s.updateCase(c.id, { fn: v })} step={0.05} min={0} />
                          </td>
                          <td className={`${td} w-24`}>
                            <NumInput value={c.vc} onChange={(v) => s.updateCase(c.id, { vc: v })} step={10} min={1} />
                          </td>
                          <td className={`${td} w-20`}>
                            <NumInput value={c.kappaR} onChange={(v) => s.updateCase(c.id, { kappaR: v })} step={1} min={1} max={180} />
                          </td>
                          <td className={`${td} w-20`}>
                            <NumInput value={c.gamma0} onChange={(v) => s.updateCase(c.id, { gamma0: v })} step={1} />
                          </td>
                        </>
                      )}
                      <td className={`${td} border-l border-slate-200 text-right tabular-nums`}>{fmt(r.Pc, 2)}</td>
                      <td className={`${td} text-right tabular-nums`}>{fmt(r.nSp, 1)}</td>
                      <td className={`${td} text-right font-medium tabular-nums`}>{fmt(r.TSp, 1)}</td>
                      <td className={`${td} whitespace-nowrap`}>
                        <button
                          type="button"
                          title="複製工況"
                          onClick={() => s.duplicateCase(c.id)}
                          className="p-1 text-slate-400 hover:text-blue-600"
                        >
                          <Copy size={15} />
                        </button>
                        <button
                          type="button"
                          title="刪除工況"
                          onClick={() => s.removeCase(c.id)}
                          className="p-1 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
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

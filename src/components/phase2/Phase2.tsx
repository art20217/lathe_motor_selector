import { useState } from 'react'
import { Download, FileUp, Pencil, Plus, Trash2, X } from 'lucide-react'
import { BUILT_IN_MOTORS } from '../../data/motors'
import { constantPowerRatio, estimateEfficiency, ratedTorque } from '../../engine/motorSelection'
import type { Motor } from '../../engine/types'
import { fmt } from '../../lib/format'
import { useProjectStore } from '../../store/projectStore'
import { getDutyResults, getMaxPc, getMotorList, getPMin } from '../../store/selectors'
import { downloadText } from '../layout/Header'
import { Badge, Field, NumInput, Section } from '../ui'

function blankMotor(): Motor {
  return {
    id: crypto.randomUUID(),
    brand: '',
    model: '',
    powerS1: 15,
    nBase: 1500,
    nMax: 6000,
    inertia: null,
    ratedCurrent: null,
    voltage: null,
    verified: true,
    note: '',
  }
}

function MotorForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Motor
  onSave: (m: Motor) => void
  onCancel: () => void
}) {
  const [m, setM] = useState<Motor>(initial)
  const patch = (p: Partial<Motor>) => setM((prev) => ({ ...prev, ...p }))
  const valid = m.model.trim() && m.powerS1 > 0 && m.nBase > 0 && m.nMax >= m.nBase

  return (
    <div className="rounded border border-blue-200 bg-blue-50/50 p-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Field label="品牌">
          <input
            value={m.brand}
            onChange={(e) => patch({ brand: e.target.value })}
            className="w-full rounded border border-slate-300 px-1.5 py-1 text-sm focus:border-blue-500 focus:outline-none"
          />
        </Field>
        <Field label="型號">
          <input
            value={m.model}
            onChange={(e) => patch({ model: e.target.value })}
            className="w-full rounded border border-slate-300 px-1.5 py-1 text-sm focus:border-blue-500 focus:outline-none"
          />
        </Field>
        <Field label="S1 額定功率" unit="kW">
          <NumInput value={m.powerS1} onChange={(v) => patch({ powerS1: v })} step={0.5} min={0} />
        </Field>
        <Field label="基底轉速 n_base" unit="rpm">
          <NumInput value={m.nBase} onChange={(v) => patch({ nBase: v })} step={50} min={1} />
        </Field>
        <Field label="最高轉速 n_max" unit="rpm">
          <NumInput value={m.nMax} onChange={(v) => patch({ nMax: v })} step={100} min={1} />
        </Field>
        <Field label="轉子慣量" unit="kg·m²">
          <NumInput
            value={m.inertia ?? NaN}
            onChange={(v) => patch({ inertia: Number.isFinite(v) ? v : null })}
            step={0.01}
            min={0}
          />
        </Field>
        <Field label="額定電流" unit="A">
          <NumInput
            value={m.ratedCurrent ?? NaN}
            onChange={(v) => patch({ ratedCurrent: Number.isFinite(v) ? v : null })}
            step={1}
            min={0}
          />
        </Field>
        <Field label="電壓">
          <select
            value={m.voltage ?? ''}
            onChange={(e) => patch({ voltage: (e.target.value || null) as Motor['voltage'] })}
            className="w-full rounded border border-slate-300 px-1 py-1 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">未指定</option>
            <option value="200V">200V</option>
            <option value="400V">400V</option>
          </select>
        </Field>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={m.verified}
            onChange={(e) => patch({ verified: e.target.checked })}
          />
          規格已核對型錄
        </label>
        <input
          value={m.note}
          onChange={(e) => patch({ note: e.target.value })}
          placeholder="備註（型錄頁次、資料來源…）"
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

export function Phase2() {
  const s = useProjectStore()
  const results = getDutyResults(s.cases)
  const maxPc = getMaxPc(results)
  const pMin = getPMin(s, results)
  const motors = getMotorList(s)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const etaEstimated = estimateEfficiency(s.etaStageEff, s.etaStages)
  const isBuiltIn = (id: string) => BUILT_IN_MOTORS.some((m) => m.id === id)

  const saveMotor = (m: Motor) => {
    if (isBuiltIn(m.id)) s.overrideBuiltInMotor(m)
    else if (s.customMotors.some((x) => x.id === m.id)) s.updateMotor(m.id, m)
    else s.addMotor(m)
    setEditingId(null)
    setAdding(false)
  }

  const importMotors = (file: File) => {
    file.text().then((text) => {
      try {
        const list = JSON.parse(text) as Motor[]
        if (!Array.isArray(list)) throw new Error()
        list
          .filter((m) => m && typeof m.model === 'string' && Number.isFinite(m.powerS1))
          .forEach((m) => s.addMotor({ ...blankMotor(), ...m, id: crypto.randomUUID() }))
      } catch {
        alert('馬達庫 JSON 解析失敗：須為 Motor 物件陣列')
      }
    })
  }

  const th = 'px-2 py-1.5 text-xs font-medium text-slate-500 whitespace-nowrap text-left'

  return (
    <div className="space-y-4">
      <Section title="Step 2.1 馬達輸出功率下限">
        {s.cases.length === 0 && (
          <p className="mb-3 text-sm text-amber-700">尚未定義工況，請先完成 Phase 1。</p>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-3">
            <Field label="max(Pc) — Phase 1 全工況最大淨切削功率" unit="kW">
              <div className="rounded bg-slate-100 px-2 py-1.5 text-right text-sm font-semibold tabular-nums">
                {fmt(maxPc, 2)}
              </div>
            </Field>
          </div>
          <div className="space-y-2">
            <Field label="變速箱總傳動效率 η_total">
              <div className="flex items-center gap-2">
                <NumInput
                  value={s.etaTotal}
                  onChange={(v) => s.setEta({ etaTotal: v, etaIsEstimated: false })}
                  step={0.01}
                  min={0.1}
                  max={1}
                />
                {s.etaIsEstimated && <Badge kind="warn">假設值</Badge>}
              </div>
            </Field>
            <div className="rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
              <div className="mb-1 font-medium">估算器：單級效率 ^ 級數（取級數最多的檔位）</div>
              <div className="flex items-center gap-2">
                <span className="w-20">
                  <NumInput
                    value={s.etaStageEff}
                    onChange={(v) => s.setEta({ etaStageEff: v })}
                    step={0.005}
                    min={0.9}
                    max={1}
                  />
                </span>
                <span>^</span>
                <span className="w-16">
                  <NumInput
                    value={s.etaStages}
                    onChange={(v) => s.setEta({ etaStages: v })}
                    step={1}
                    min={1}
                    max={10}
                  />
                </span>
                <span>= {fmt(etaEstimated, 3)}</span>
                <button
                  type="button"
                  onClick={() => s.setEta({ etaTotal: etaEstimated, etaIsEstimated: true })}
                  className="ml-auto rounded border border-slate-300 bg-white px-2 py-1 hover:bg-slate-100"
                >
                  套用
                </button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Field label={`安全係數 SF = ${fmt(s.sf, 2)}`}>
              <input
                type="range"
                min={1.3}
                max={1.5}
                step={0.05}
                value={s.sf}
                onChange={(e) => s.setSf(Number(e.target.value))}
                className="w-full"
              />
            </Field>
            <p className="text-xs leading-relaxed text-slate-500">
              1.3：工況矩陣已含最惡劣條件、kc 來源可靠、效率有實測。
              <br />
              1.5：工況不確定、kc 僅估算、效率為假設值。
            </p>
          </div>
        </div>
        <div className="mt-4 rounded bg-blue-50 px-4 py-3 text-sm">
          P<sub>motor</sub><sup>min</sup> = max(Pc) / η_total × SF ={' '}
          <span className="text-lg font-bold tabular-nums text-blue-700">{fmt(pMin, 2)} kW</span>
          <span className="ml-3 text-xs text-slate-500">
            （以 S1 連續額定為篩選基準；S3/S6 僅適用於已定義工作週期的間歇性重切削）
          </span>
        </div>
      </Section>

      <Section
        title="Step 2.2–2.3 馬達庫與候選篩選"
        aside={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => downloadText('馬達庫.json', JSON.stringify(motors, null, 2))}
              className="flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            >
              <Download size={13} /> 匯出馬達庫
            </button>
            <label className="flex cursor-pointer items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
              <FileUp size={13} /> 匯入馬達庫
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) importMotors(f)
                  e.target.value = ''
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setAdding(true)
                setEditingId(null)
              }}
              className="flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              <Plus size={13} /> 新增馬達
            </button>
          </div>
        }
      >
        {motors.some((m) => !m.verified) && (
          <p className="mb-2 text-xs text-amber-700">
            ⚠ 標示「須核對」的內建範例規格未經型錄核對，正式選型前務必以 FANUC 型錄（B-65272EN）逐欄確認並編輯修正。
          </p>
        )}
        {adding && <div className="mb-3"><MotorForm initial={blankMotor()} onSave={saveMotor} onCancel={() => setAdding(false)} /></div>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className={th}>選定</th>
                <th className={th}>品牌 / 型號</th>
                <th className={`${th} text-right`}>S1 [kW]</th>
                <th className={`${th} text-right`}>n_base [rpm]</th>
                <th className={`${th} text-right`}>n_max [rpm]</th>
                <th className={`${th} text-right`}>R_cp</th>
                <th className={`${th} text-right`}>T_rated [N·m]</th>
                <th className={`${th} text-right`}>J [kg·m²]</th>
                <th className={th}>電壓</th>
                <th className={th}>狀態</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {motors.map((m) => {
                const candidate = s.cases.length > 0 && m.powerS1 >= pMin
                const selected = s.selectedMotorId === m.id
                if (editingId === m.id)
                  return (
                    <tr key={m.id}>
                      <td colSpan={11} className="py-2">
                        <MotorForm initial={m} onSave={saveMotor} onCancel={() => setEditingId(null)} />
                      </td>
                    </tr>
                  )
                return (
                  <tr
                    key={m.id}
                    className={`border-b border-slate-100 ${
                      selected ? 'bg-blue-50' : candidate ? 'bg-emerald-50/40' : ''
                    }`}
                  >
                    <td className="px-2 py-1.5">
                      <input
                        type="radio"
                        name="selectedMotor"
                        checked={selected}
                        disabled={!candidate}
                        onChange={() => s.selectMotor(m.id)}
                        title={candidate ? '選定此馬達進入 Phase 3' : 'S1 功率未達 P_min，不可選'}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="font-medium">{m.brand} {m.model}</div>
                      {m.note && <div className="text-xs text-slate-400">{m.note}</div>}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmt(m.powerS1, 1)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmt(m.nBase, 0)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmt(m.nMax, 0)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmt(constantPowerRatio(m), 2)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmt(ratedTorque(m.powerS1, m.nBase), 1)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{m.inertia === null ? '—' : fmt(m.inertia, 3)}</td>
                    <td className="px-2 py-1.5">{m.voltage ?? '—'}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex flex-wrap gap-1">
                        {s.cases.length > 0 &&
                          (candidate ? <Badge kind="ok">候選</Badge> : <Badge kind="error">功率不足</Badge>)}
                        {!m.verified && <Badge kind="warn">須核對</Badge>}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5">
                      <button
                        type="button"
                        title="編輯"
                        onClick={() => {
                          setEditingId(m.id)
                          setAdding(false)
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        title={isBuiltIn(m.id) ? '自清單隱藏' : '刪除'}
                        onClick={() => (isBuiltIn(m.id) ? s.hideBuiltInMotor(m.id) : s.removeMotor(m.id))}
                        className="p-1 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}

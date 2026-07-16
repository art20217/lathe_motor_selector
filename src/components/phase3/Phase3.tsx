import { useRef, useState } from 'react'
import { Download, Upload, X } from 'lucide-react'
import { constPowerGaps, gearConstPowerBand, verifyCoverage } from '../../engine/tnCurve'
import { fmt } from '../../lib/format'
import { parseGearFile } from '../../lib/gearImport'
import { useProjectStore } from '../../store/projectStore'
import { getDutyPoints, getEffectiveDutyResults, getSelectedMotor } from '../../store/selectors'
import { Badge, Field, NumInput, Section } from '../ui'
import { TnChart } from './TnChart'

/** 解析齒數比字串「24/72 × 20/80」→ 齒比乘積（i = 從動輪在分母：n_out/n_in = z_in/z_out 連乘） */
function parseTeethRatio(text: string): number | null {
  const pairs = text.split(/[×x*]/).map((p) => p.trim())
  let ratio = 1
  for (const pair of pairs) {
    const m = pair.match(/^(\d+(?:\.\d+)?)\s*[/:]\s*(\d+(?:\.\d+)?)$/)
    if (!m) return null
    const zIn = Number(m[1])
    const zOut = Number(m[2])
    if (!zIn || !zOut) return null
    ratio *= zIn / zOut
  }
  return ratio
}

function GearTeethHelper({ onApply }: { onApply: (ratio: number) => void }) {
  const [text, setText] = useState('')
  const parsed = text.trim() ? parseTeethRatio(text) : null
  return (
    <div className="mt-1 flex items-center gap-1.5">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="齒數比：24/72 × 20/80"
        className="w-full rounded border border-slate-300 px-1.5 py-0.5 text-xs focus:border-blue-500 focus:outline-none"
      />
      <button
        type="button"
        disabled={parsed === null}
        onClick={() => parsed !== null && onApply(parsed)}
        className="whitespace-nowrap rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs hover:bg-slate-100 disabled:opacity-40"
        title={parsed !== null ? `i = ${parsed.toFixed(5)}` : '格式：z1/z2 × z3/z4'}
      >
        {parsed !== null ? `= ${parsed.toFixed(4)}` : '換算'}
      </button>
    </div>
  )
}

export function Phase3() {
  const s = useProjectStore()
  const motor = getSelectedMotor(s)
  const results = getEffectiveDutyResults(s)
  const points = getDutyPoints(s.cases, results)
  const [importMsg, setImportMsg] = useState<{ text: string; errors: string[] } | null>(null)
  const importFileRef = useRef<HTMLInputElement>(null)

  const handleImportFile = async (file: File) => {
    const { gears, errors } = parseGearFile(await file.text())
    if (gears.length === 0) {
      setImportMsg({ text: '匯入失敗', errors })
      return
    }
    s.setGears(gears)
    setImportMsg({ text: '匯入完成：四檔齒比與效率已更新', errors: [] })
  }

  const handleExportGears = () => {
    const blob = new Blob([JSON.stringify({ formatVersion: 1, gears: s.gears }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '齒比.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!motor) {
    return (
      <Section title="Step 3.1–3.4 齒比設計與 T-n 覆蓋驗證">
        <p className="py-8 text-center text-sm text-slate-400">
          請先在 Phase 2 選定候選馬達，才能進行齒比映射與覆蓋驗證。
        </p>
      </Section>
    )
  }

  const coverage = verifyCoverage(motor, s.gears, points)
  const gaps = constPowerGaps(motor, s.gears)

  return (
    <div className="space-y-4">
      <Section
        title={`Step 3.2–3.3 齒比設定 — 馬達：${motor.brand} ${motor.model}`}
        aside={
          <div className="flex gap-2">
            <input
              ref={importFileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) void handleImportFile(f)
              }}
            />
            <button
              type="button"
              onClick={() => importFileRef.current?.click()}
              title="自 JSON 檔匯入四檔齒比與效率"
              className="flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              <Upload size={15} /> 匯入齒比
            </button>
            <button
              type="button"
              onClick={handleExportGears}
              title="將目前四檔齒比與效率匯出為 JSON 檔"
              className="flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              <Download size={15} /> 匯出齒比
            </button>
          </div>
        }
      >
        {importMsg && (
          <div className="mb-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <span>{importMsg.text}</span>
              <button
                type="button"
                onClick={() => setImportMsg(null)}
                className="ml-auto p-0.5 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            </div>
            {importMsg.errors.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs text-amber-700">
                {importMsg.errors.map((e) => (
                  <li key={e}>⚠ {e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          齒比定義 i_k = n_sp / n_motor（減速傳動 &lt; 1）。SOP
          尚未包含帶域分割方法論，帶域劃分由設計者判斷；輸入理論目標值或齒輪箱實現後的實際齒比（Step 3.5
          回驗）皆可。可用齒數比字串換算（例：24/72 × 20/80）。
        </p>
        <div className="grid gap-3 md:grid-cols-4">
          {s.gears.map((g, k) => {
            const [cpFrom, cpTo] = gearConstPowerBand(motor, g)
            return (
              <div key={`gear-${k + 1}`} className="rounded border border-slate-200 p-3">
                <div className="mb-2 text-sm font-semibold text-slate-600">第 {k + 1} 檔</div>
                <Field label="齒比 i" unit="n_sp/n_motor">
                  <NumInput value={g.ratio} onChange={(v) => s.setGear(k, { ratio: v })} step={0.005} min={0.001} />
                </Field>
                <GearTeethHelper onApply={(ratio) => s.setGear(k, { ratio })} />
                <div className="mt-2">
                  <Field label="傳動效率 η">
                    <NumInput value={g.efficiency} onChange={(v) => s.setGear(k, { efficiency: v })} step={0.01} min={0.1} max={1} />
                  </Field>
                </div>
                <div className="mt-2 space-y-0.5 text-xs text-slate-500">
                  <div>主軸端範圍：0 – {fmt(motor.nMax * g.ratio, 0)} rpm</div>
                  <div>恆功率帶：{fmt(cpFrom, 0)} – {fmt(cpTo, 0)} rpm</div>
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="Step 3.4 T-n 覆蓋驗證">
        {points.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Phase 1 尚無工況點可驗證。</p>
        ) : (
          <>
            <div className="mb-3">
              {coverage.allCovered && gaps.length === 0 && (
                <Badge kind="ok">✓ 驗證通過：所有工況點皆被覆蓋，且相鄰檔位恆功率帶無盲區</Badge>
              )}
              {coverage.allCovered && gaps.length > 0 && (
                <Badge kind="warn">工況點皆覆蓋，但相鄰檔位間存在恆功率盲區（見圖中黃色帶）</Badge>
              )}
              {!coverage.allCovered && (
                <Badge kind="error">
                  ✗ 驗證未通過：{coverage.perPoint.filter((p) => !p.covered).length} 個工況點未被任何檔位覆蓋
                  → 調整齒比，或回 Phase 2 改選功率/扭矩更大的馬達
                </Badge>
              )}
            </div>
            <TnChart motor={motor} gears={s.gears} points={points} />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-2 py-1.5 text-xs font-medium text-slate-500">工況</th>
                    <th className="px-2 py-1.5 text-right text-xs font-medium text-slate-500">n_sp [rpm]</th>
                    <th className="px-2 py-1.5 text-right text-xs font-medium text-slate-500">T_sp [N·m]</th>
                    <th className="px-2 py-1.5 text-xs font-medium text-slate-500">覆蓋檔位</th>
                    <th className="px-2 py-1.5 text-right text-xs font-medium text-slate-500">最大可用 T [N·m]</th>
                    <th className="px-2 py-1.5 text-right text-xs font-medium text-slate-500">扭矩裕度</th>
                    <th className="px-2 py-1.5 text-xs font-medium text-slate-500">狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {coverage.perPoint.map((p) => {
                    const margin = p.point.TSp > 0 ? (p.maxAvailable / p.point.TSp - 1) * 100 : null
                    return (
                      <tr key={p.point.caseId} className="border-b border-slate-100">
                        <td className="px-2 py-1.5">{p.point.name}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{fmt(p.point.nSp, 1)}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{fmt(p.point.TSp, 1)}</td>
                        <td className="px-2 py-1.5">
                          {p.gears.length ? p.gears.map((k) => `第 ${k + 1} 檔`).join('、') : '—'}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{fmt(p.maxAvailable, 1)}</td>
                        <td className={`px-2 py-1.5 text-right tabular-nums ${margin !== null && margin < 0 ? 'text-red-600' : ''}`}>
                          {margin === null ? '—' : `${margin >= 0 ? '+' : ''}${fmt(margin, 0)}%`}
                        </td>
                        <td className="px-2 py-1.5">
                          {p.covered ? <Badge kind="ok">覆蓋</Badge> : <Badge kind="error">未覆蓋</Badge>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Step 3.5：齒輪箱機構設計完成後，將實際齒數比回填本頁重新驗證覆蓋。
            </p>
          </>
        )}
      </Section>
    </div>
  )
}

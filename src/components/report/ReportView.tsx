import { FileDown, Printer } from 'lucide-react'
import { OPERATION_LABELS } from '../../engine/types'
import { fmt } from '../../lib/format'
import { useProjectStore } from '../../store/projectStore'
import { downloadText } from '../layout/Header'
import { TnChart } from '../phase3/TnChart'
import { Badge } from '../ui'
import { buildMarkdownReport } from './markdown'
import { buildReportData } from './reportData'

const th = 'border border-slate-300 px-2 py-1 text-xs font-medium bg-slate-100 whitespace-nowrap'
const td = 'border border-slate-300 px-2 py-1 text-sm tabular-nums'

export function ReportView() {
  const s = useProjectStore()
  const r = buildReportData(s)
  const d = s.dynamics
  const today = new Date().toLocaleDateString('zh-TW')

  return (
    <div className="mx-auto max-w-5xl bg-white p-6 shadow-sm print:max-w-none print:p-0 print:shadow-none">
      <div className="mb-4 flex items-center gap-2 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Printer size={15} /> 列印 / 存 PDF
        </button>
        <button
          type="button"
          onClick={() => downloadText(`${s.projectName}-選型報告.md`, buildMarkdownReport(r), 'text/markdown')}
          className="flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          <FileDown size={15} /> 匯出 Markdown
        </button>
        <span className="text-xs text-slate-400">Markdown 版不含 T-n 圖，圖表請用列印/PDF。</span>
      </div>

      <h1 className="text-xl font-bold">主軸馬達選型報告：{s.projectName}</h1>
      <p className="mt-1 text-xs text-slate-500">
        產出日期：{today}　|　依據：AC 主軸馬達選型 SOP v1.0　|　車床主軸馬達選型工具
      </p>

      <h2 className="mt-5 border-b border-slate-300 pb-1 text-base font-semibold">假設值與待核對項</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
        {r.assumptions.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>

      <h2 className="mt-5 border-b border-slate-300 pb-1 text-base font-semibold">Phase 1 設計工況矩陣</h2>
      {s.cases.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">（無工況）</p>
      ) : (
        <table className="mt-2 w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>工況</th>
              <th className={th}>型態</th>
              <th className={th}>材料</th>
              <th className={th}>D [mm]</th>
              <th className={th}>ap [mm]</th>
              <th className={th}>fn</th>
              <th className={th}>vc</th>
              <th className={th}>kc [N/mm²]</th>
              <th className={th}>Fc [N]</th>
              <th className={th}>Pc [kW]</th>
              <th className={th}>n_sp [rpm]</th>
              <th className={th}>T_sp [N·m]</th>
            </tr>
          </thead>
          <tbody>
            {s.cases.map((c) => {
              const res = r.results.find((x) => x.caseId === c.id)!
              const direct = c.operation === 'direct'
              return (
                <tr key={c.id}>
                  <td className={td}>{c.name}</td>
                  <td className={td}>{OPERATION_LABELS[c.operation]}</td>
                  <td className={td}>{direct ? '—' : c.material}</td>
                  <td className={`${td} text-right`}>{direct ? '—' : fmt(c.D, 0)}</td>
                  <td className={`${td} text-right`}>{direct ? '—' : fmt(c.ap, 1)}</td>
                  <td className={`${td} text-right`}>{direct ? '—' : fmt(c.fn, 2)}</td>
                  <td className={`${td} text-right`}>{direct ? '—' : fmt(c.vc, 0)}</td>
                  <td className={`${td} text-right`}>{fmt(res.kc, 0)}</td>
                  <td className={`${td} text-right`}>{fmt(res.Fc, 0)}</td>
                  <td className={`${td} text-right`}>{fmt(res.Pc, 2)}</td>
                  <td className={`${td} text-right`}>{fmt(res.nSp, 1)}</td>
                  <td className={`${td} text-right font-medium`}>{fmt(res.TSp, 1)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <h2 className="mt-5 border-b border-slate-300 pb-1 text-base font-semibold">Phase 2 馬達候選篩選</h2>
      <p className="mt-2 text-sm">
        max(Pc) = <b className="tabular-nums">{fmt(r.maxPc, 2)} kW</b>、η_total ={' '}
        <span className="tabular-nums">{fmt(s.etaTotal, 3)}</span>
        {s.etaIsEstimated && <Badge kind="warn">估算</Badge>}、SF = <span className="tabular-nums">{fmt(s.sf, 2)}</span> →
        P<sub>motor</sub><sup>min</sup> = <b className="tabular-nums">{fmt(r.pMin, 2)} kW</b>
      </p>
      {r.candidates.length > 0 && (
        <table className="mt-2 w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>候選馬達</th>
              <th className={th}>S1 [kW]</th>
              <th className={th}>n_base</th>
              <th className={th}>n_max</th>
              <th className={th}>R_cp</th>
              <th className={th}>型錄核對</th>
            </tr>
          </thead>
          <tbody>
            {r.candidates.map((m) => (
              <tr key={m.id} className={m.id === s.selectedMotorId ? 'bg-blue-50' : ''}>
                <td className={td}>
                  {m.brand} {m.model} {m.id === s.selectedMotorId && <b>（選定）</b>}
                </td>
                <td className={`${td} text-right`}>{fmt(m.powerS1, 1)}</td>
                <td className={`${td} text-right`}>{fmt(m.nBase, 0)}</td>
                <td className={`${td} text-right`}>{fmt(m.nMax, 0)}</td>
                <td className={`${td} text-right`}>{fmt(m.nMax / m.nBase, 2)}</td>
                <td className={td}>{m.verified ? '已核對' : '⚠ 須核對'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="mt-5 border-b border-slate-300 pb-1 text-base font-semibold">
        Phase 3 齒比設計與 T-n 覆蓋驗證
      </h2>
      {!r.motor ? (
        <p className="mt-2 text-sm text-slate-400">（未選定馬達，未執行覆蓋驗證）</p>
      ) : (
        <>
          <p className="mt-2 text-sm">
            選定馬達：<b>{r.motor.brand} {r.motor.model}</b>（T_rated ={' '}
            <span className="tabular-nums">{fmt(r.motorTRated, 1)}</span> N·m、R_cp ={' '}
            <span className="tabular-nums">{fmt(r.motorRcp, 2)}</span>）
          </p>
          <table className="mt-2 w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>檔位</th>
                <th className={th}>齒比 i</th>
                <th className={th}>η</th>
                <th className={th}>主軸端範圍 [rpm]</th>
                <th className={th}>恆功率帶 [rpm]</th>
              </tr>
            </thead>
            <tbody>
              {s.gears.map((g, k) => (
                <tr key={`rg${k + 1}`}>
                  <td className={td}>第 {k + 1} 檔</td>
                  <td className={`${td} text-right`}>{fmt(g.ratio, 4)}</td>
                  <td className={`${td} text-right`}>{fmt(g.efficiency, 2)}</td>
                  <td className={`${td} text-right`}>0 – {fmt(r.motor!.nMax * g.ratio, 0)}</td>
                  <td className={`${td} text-right`}>
                    {fmt(r.motor!.nBase * g.ratio, 0)} – {fmt(r.motor!.nMax * g.ratio, 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {r.points.length > 0 && (
            <div className="mt-3 break-inside-avoid">
              <TnChart motor={r.motor} gears={s.gears} points={r.points} />
            </div>
          )}
          {r.coverage && r.coverage.perPoint.length > 0 && (
            <>
              <table className="mt-3 w-full border-collapse">
                <thead>
                  <tr>
                    <th className={th}>工況</th>
                    <th className={th}>n_sp [rpm]</th>
                    <th className={th}>T_sp [N·m]</th>
                    <th className={th}>覆蓋檔位</th>
                    <th className={th}>最大可用 T [N·m]</th>
                    <th className={th}>判定</th>
                  </tr>
                </thead>
                <tbody>
                  {r.coverage.perPoint.map((p) => (
                    <tr key={p.point.caseId}>
                      <td className={td}>{p.point.name}</td>
                      <td className={`${td} text-right`}>{fmt(p.point.nSp, 1)}</td>
                      <td className={`${td} text-right`}>{fmt(p.point.TSp, 1)}</td>
                      <td className={td}>{p.gears.length ? p.gears.map((k) => `第${k + 1}檔`).join('、') : '—'}</td>
                      <td className={`${td} text-right`}>{fmt(p.maxAvailable, 1)}</td>
                      <td className={td}>{p.covered ? '✓ 覆蓋' : '✗ 未覆蓋'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-sm font-medium">
                {r.coverage.allCovered
                  ? '驗證結果：全部工況點通過覆蓋驗證。'
                  : '驗證結果：存在未覆蓋工況點，馬達功率/扭矩不足或齒比需調整。'}
                {r.gaps.length > 0 &&
                  ` ⚠ 恆功率帶盲區：${r.gaps.map((g) => `${fmt(g.from, 0)}–${fmt(g.to, 0)} rpm`).join('、')}`}
              </p>
            </>
          )}
        </>
      )}

      <h2 className="mt-5 border-b border-slate-300 pb-1 text-base font-semibold">Phase 4 系統驗證</h2>
      <h3 className="mt-3 text-sm font-semibold">Step 4.1 加減速時間</h3>
      <table className="mt-2 border-collapse">
        <tbody>
          <tr>
            <td className={td}>
              工件（{d.workpieceType === 'solid' ? '實心' : '空心'}）Ø{fmt(d.wpOuterDia, 0)}
              {d.workpieceType === 'hollow' && ` / Ø${fmt(d.wpInnerDia, 0)}`} × {fmt(d.wpLength, 0)} mm
            </td>
            <td className={`${td} text-right`}>m = {fmt(r.dyn.mass, 0)} kg</td>
          </tr>
          <tr>
            <td className={td}>負載側慣量 J_spindle + J_chuck + J_wp</td>
            <td className={`${td} text-right`}>{fmt(r.dyn.jLoad, 1)} kg·m²</td>
          </tr>
          <tr>
            <td className={td}>折算至馬達端 J_total（第 {d.gearIndex + 1} 檔）</td>
            <td className={`${td} text-right`}>{r.dyn.jTotal === null ? '—' : `${fmt(r.dyn.jTotal, 3)} kg·m²`}</td>
          </tr>
          <tr>
            <td className={td}>可用加速扭矩 T_acc（摩擦 {fmt(d.frictionPct, 0)}% 假設值）</td>
            <td className={`${td} text-right`}>{r.dyn.tAccTorque === null ? '—' : `${fmt(r.dyn.tAccTorque, 1)} N·m`}</td>
          </tr>
          <tr>
            <td className={`${td} font-semibold`}>加速時間 t_acc（Δn_sp = {fmt(d.deltaNSp, 0)} rpm）</td>
            <td className={`${td} text-right font-bold`}>{r.dyn.tAcc === null ? '—' : `${fmt(r.dyn.tAcc, 2)} s`}</td>
          </tr>
          <tr>
            <td className={td}>規格要求</td>
            <td className={`${td} text-right`}>
              {d.requiredTime === null
                ? '未定義'
                : `≤ ${fmt(d.requiredTime, 1)} s（${r.dyn.pass ? '✓ 通過' : '✗ 未通過'}）`}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">Step 4.2 驅動器匹配查核</h3>
          <ul className="mt-1 space-y-1 text-sm">
            {s.driverChecklist.map((i) => (
              <li key={i.id}>
                {i.checked ? '☑' : '☐'} {i.label}
                {i.note && <span className="text-slate-500">（{i.note}）</span>}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Step 4.3 熱負載驗證查核</h3>
          <ul className="mt-1 space-y-1 text-sm">
            {s.thermalChecklist.map((i) => (
              <li key={i.id}>
                {i.checked ? '☑' : '☐'} {i.label}
                {i.note && <span className="text-slate-500">（{i.note}）</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-6 border-t border-slate-200 pt-2 text-xs text-slate-400">
        本報告由車床主軸馬達選型工具產出（{today}）。所有標記「假設值 / 須核對」之項目，須於設計審查前完成確認。
      </p>
    </div>
  )
}

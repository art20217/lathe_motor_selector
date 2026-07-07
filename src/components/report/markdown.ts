/**
 * Markdown 選型報告產生器（貼入 Notion / GitBook 用；圖表僅在列印/PDF 版）
 */
import { OPERATION_LABELS } from '../../engine/types'
import { fmt } from '../../lib/format'
import type { ReportData } from './reportData'

export function buildMarkdownReport(r: ReportData): string {
  const s = r.state
  const today = new Date().toLocaleDateString('zh-TW')
  const lines: string[] = []
  const push = (...ls: string[]) => lines.push(...ls)

  push(
    `# 主軸馬達選型報告：${s.projectName}`,
    '',
    `> 產出日期：${today}　|　工具：車床主軸馬達選型工具　|　依據：AC 主軸馬達選型 SOP v1.0`,
    '',
    '## 假設值與待核對項',
    '',
    ...r.assumptions.map((a) => `- ⚠ ${a}`),
    '',
    '## Phase 1 設計工況矩陣',
    '',
  )

  if (s.cases.length === 0) {
    push('（無工況）', '')
  } else {
    push(
      '| 工況 | 型態 | 材料 | D [mm] | ap [mm] | fn [mm/rev] | vc [m/min] | kc [N/mm²] | Fc [N] | Ff [N] | Fp [N] | Pc [kW] | n_sp [rpm] | T_sp [N·m] |',
      '|:--|:--|:--|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|',
      ...s.cases.map((c) => {
        const res = r.results.find((x) => x.caseId === c.id)!
        const direct = c.operation === 'direct'
        const cell = (v: number | null | undefined, d: number) => (direct ? '—' : fmt(v ?? NaN, d))
        return `| ${c.name} | ${OPERATION_LABELS[c.operation]} | ${direct ? '—' : c.material} | ${cell(c.D, 0)} | ${cell(c.ap, 1)} | ${cell(c.fn, 2)} | ${cell(c.vc, 0)} | ${fmt(res.kc, 0)} | ${fmt(res.Fc, 0)} | ${res.Ff != null ? fmt(res.Ff, 0) : '—'} | ${res.Fp != null ? fmt(res.Fp, 0) : '—'} | ${fmt(res.Pc, 2)} | ${fmt(res.nSp, 1)} | ${fmt(res.TSp, 1)} |`
      }),
      '',
    )
  }

  push(
    '## Phase 2 馬達候選篩選',
    '',
    `- max(Pc) = **${fmt(r.maxPc, 2)} kW**`,
    `- η_total = ${fmt(s.etaTotal, 3)}${s.etaIsEstimated ? '（估算值）' : ''}`,
    `- SF = ${fmt(s.sf, 2)}`,
    `- **P_motor_min = ${fmt(r.pMin, 2)} kW**（S1 額定篩選基準）`,
    '',
  )

  if (r.candidates.length) {
    push(
      '| 候選馬達 | S1 [kW] | S3 [kW] | n_base [rpm] | n_max [rpm] | R_cp | 型錄核對 |',
      '|:--|--:|--:|--:|--:|--:|:--|',
      ...r.candidates.map(
        (m) =>
          `| ${m.brand} ${m.model}${m.id === s.selectedMotorId ? '（**選定**）' : ''} | ${fmt(m.powerS1, 1)} | ${m.powerS3 != null ? fmt(m.powerS3, 1) : '—'} | ${fmt(m.nBase, 0)} | ${fmt(m.nMax, 0)} | ${fmt(m.nMax / m.nBase, 2)} | ${m.verified ? '已核對' : '⚠ 須核對'} |`,
      ),
      '',
    )
  } else {
    push('（無符合 P_min 的候選馬達）', '')
  }

  push('## Phase 3 齒比設計與 T-n 覆蓋驗證', '')
  if (!r.motor) {
    push('（未選定馬達，未執行覆蓋驗證）', '')
  } else {
    push(
      `選定馬達：**${r.motor.brand} ${r.motor.model}**（S1 ${fmt(r.motor.powerS1, 1)} kW，T_rated = ${fmt(r.motorTRated, 1)} N·m，R_cp = ${fmt(r.motorRcp, 2)}）`,
      '',
      '| 檔位 | 齒比 i | η | 主軸端範圍 [rpm] | 恆功率帶 [rpm] |',
      '|:--|--:|--:|:--|:--|',
      ...s.gears.map(
        (g, k) =>
          `| 第 ${k + 1} 檔 | ${fmt(g.ratio, 4)} | ${fmt(g.efficiency, 2)} | 0 – ${fmt(r.motor!.nMax * g.ratio, 0)} | ${fmt(r.motor!.nBase * g.ratio, 0)} – ${fmt(r.motor!.nMax * g.ratio, 0)} |`,
      ),
      '',
      '### 覆蓋驗證結果',
      '',
    )
    if (r.coverage && r.coverage.perPoint.length) {
      push(
        '| 工況 | n_sp [rpm] | T_sp [N·m] | 覆蓋檔位 | 最大可用 T [N·m] | 判定 |',
        '|:--|--:|--:|:--|--:|:--|',
        ...r.coverage.perPoint.map(
          (p) =>
            `| ${p.point.name} | ${fmt(p.point.nSp, 1)} | ${fmt(p.point.TSp, 1)} | ${p.gears.length ? p.gears.map((k) => `第${k + 1}檔`).join('、') : '—'} | ${fmt(p.maxAvailable, 1)} | ${p.covered ? '✓ 覆蓋' : '✗ 未覆蓋'} |`,
        ),
        '',
        r.coverage.allCovered
          ? '**驗證結果：全部工況點通過覆蓋驗證。**'
          : '**驗證結果：存在未覆蓋工況點，馬達功率/扭矩不足或齒比需調整。**',
        '',
      )
      if (r.gaps.length) {
        push(
          `⚠ 相鄰檔位恆功率帶盲區：${r.gaps.map((g) => `${fmt(g.from, 0)}–${fmt(g.to, 0)} rpm`).join('、')}`,
          '',
        )
      }
    } else {
      push('（無工況點）', '')
    }
    push('> T-n 覆蓋驗證圖請見本工具報告頁的列印/PDF 版本。', '')
  }

  const d = s.dynamics
  push(
    '## Phase 4 系統驗證',
    '',
    '### Step 4.1 加減速時間',
    '',
    `| 項目 | 數值 |`,
    `|:--|--:|`,
    `| 工件（${d.workpieceType === 'solid' ? '實心' : '空心'}）Ø${fmt(d.wpOuterDia, 0)}${d.workpieceType === 'hollow' ? ` / Ø${fmt(d.wpInnerDia, 0)}` : ''} × ${fmt(d.wpLength, 0)} mm，ρ=${fmt(d.wpDensity, 0)} | m = ${fmt(r.dyn.mass, 0)} kg |`,
    `| 工件慣量 J_wp | ${fmt(r.dyn.jWp, 1)} kg·m² |`,
    `| 負載側慣量 J_spindle + J_chuck + J_wp | ${fmt(r.dyn.jLoad, 1)} kg·m² |`,
    `| 折算至馬達端 J_total（第 ${d.gearIndex + 1} 檔） | ${r.dyn.jTotal === null ? '—' : `${fmt(r.dyn.jTotal, 3)} kg·m²`} |`,
    `| 可用加速扭矩 T_acc（摩擦 ${fmt(d.frictionPct, 0)}% 假設值） | ${r.dyn.tAccTorque === null ? '—' : `${fmt(r.dyn.tAccTorque, 1)} N·m`} |`,
    `| 主軸端 Δn = ${fmt(d.deltaNSp, 0)} rpm → 馬達端 Δn | ${r.dyn.deltaNMotor === null ? '—' : `${fmt(r.dyn.deltaNMotor, 0)} rpm`} |`,
    `| **加速時間（數值積分）** | **${r.dyn.tAccIntegral === null ? '—' : `${fmt(r.dyn.tAccIntegral, 2)} s`}** |`,
    `| 加速時間（線性近似） | ${r.dyn.tAcc === null ? '—' : `${fmt(r.dyn.tAcc, 2)} s`} |`,
    `| 規格要求 | ${d.requiredTime === null ? '未定義' : `≤ ${fmt(d.requiredTime, 1)} s（${r.dyn.pass ? '✓ 通過' : '✗ 未通過'}）`} |`,
    '',
    '### Step 4.2 驅動器匹配查核',
    '',
    ...s.driverChecklist.map((i) => `- [${i.checked ? 'x' : ' '}] ${i.label}${i.note ? `（${i.note}）` : ''}`),
    '',
    '### Step 4.3 熱負載驗證查核',
    '',
    ...s.thermalChecklist.map((i) => `- [${i.checked ? 'x' : ' '}] ${i.label}${i.note ? `（${i.note}）` : ''}`),
    '',
  )

  if (r.deflectionResult) {
    const df = r.deflectionResult
    push(
      '### 工件撓曲檢核',
      '',
      `| 項目 | 數值 |`,
      `|:--|--:|`,
      `| 支撐方式 | ${df.supportName} |`,
      `| L/D | ${fmt(df.ldRatio, 1)} |`,
      `| 彎曲合力 √(Fc²+Fp²) | ${fmt(df.fBend, 0)} N |`,
      `| **最大撓曲量 δ** | **${fmt(df.deflection, 4)} mm** |`,
      `| 允許值 | ${fmt(df.limit, 3)} mm（${df.ok ? '✓ 通過' : '✗ 超限'}）|`,
      '',
    )
    if (df.advice.length)
      push(...df.advice.map((a) => `- ⚠ ${a}`), '')
  }

  push(
    '---',
    '',
    `*本報告由車床主軸馬達選型工具產出（${today}）。所有標記「假設值 / 須核對」之項目，須於設計審查前完成確認。*`,
  )

  return lines.join('\n')
}

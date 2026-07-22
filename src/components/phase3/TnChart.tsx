/**
 * T-n 覆蓋驗證圖：四檔主軸端可用扭矩曲線 vs 工況需求點
 */
import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { constPowerGaps, sampleGearCurve, verifyCoverage } from '../../engine/tnCurve'
import type { DutyPoint, Gear, Motor } from '../../engine/types'
import { fmt } from '../../lib/format'

const GEAR_COLORS = ['#2563eb', '#0d9488', '#9333ea', '#ea580c']

export function TnChart({
  motor,
  gears,
  points,
}: {
  motor: Motor
  gears: Gear[]
  points: DutyPoint[]
}) {
  const [logX, setLogX] = useState(true)

  const { curves, covered, uncovered, gaps, maxN } = useMemo(() => {
    const curves = gears.map((g) => sampleGearCurve(motor, g, 50))
    const coverage = verifyCoverage(motor, gears, points)
    const covered = coverage.perPoint.filter((p) => p.covered).map((p) => p.point)
    const uncovered = coverage.perPoint.filter((p) => !p.covered).map((p) => p.point)
    const gaps = constPowerGaps(motor, gears)
    const maxN = Math.max(
      ...gears.map((g) => motor.nMax * g.ratio),
      ...points.map((p) => p.nSp),
      1,
    )
    return { curves, covered, uncovered, gaps, maxN }
  }, [motor, gears, points])

  // 對數座標不可含 0：以最低檔恆功率帶起點的 1/4 為下限，並將曲線起點鉗制到下限
  const minN = useMemo(() => {
    const candidates = [
      ...gears.map((g) => (motor.nBase * g.ratio) / 4),
      ...points.map((p) => p.nSp / 2),
    ].filter((v) => v > 0)
    return candidates.length ? Math.min(...candidates) : 1
  }, [motor, gears, points])

  const clamp = (pts: { n: number; T: number }[]) =>
    logX ? pts.map((p) => ({ ...p, n: Math.max(p.n, minN) })) : pts

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          主軸端 T-n 覆蓋圖：曲線 = 各檔可用扭矩（含 η_k），點 = 工況需求
        </span>
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          <input type="checkbox" checked={logX} onChange={(e) => setLogX(e.target.checked)} />
          轉速對數座標
        </label>
      </div>
      <ResponsiveContainer width="100%" height={460}>
        <ComposedChart margin={{ top: 10, right: 20, bottom: 24, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="n"
            type="number"
            scale={logX ? 'log' : 'linear'}
            domain={logX ? [minN, maxN * 1.05] : [0, maxN * 1.05]}
            allowDataOverflow
            tickFormatter={(v: number) => fmt(v, 0)}
            label={{ value: '主軸轉速 n_sp [rpm]', position: 'insideBottom', offset: -18, fontSize: 12 }}
            fontSize={11}
          />
          <YAxis
            dataKey="T"
            type="number"
            tickFormatter={(v: number) => fmt(v, 0)}
            label={{ value: 'T [N·m]', angle: -90, position: 'insideLeft', fontSize: 12 }}
            fontSize={11}
          />
          <Tooltip
            formatter={(value) => [`${fmt(Number(value), 1)} N·m`, '']}
            labelFormatter={(v) => `n_sp = ${fmt(Number(v), 1)} rpm`}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 26 }} />
          {/* 各檔終點：垂直虛線 + 橫軸轉速值；最大扭矩值標於縱軸位置 */}
          {curves.map((_, k) => {
            const nEnd = motor.nMax * gears[k].ratio
            return (
              <ReferenceLine
                key={`end-${GEAR_COLORS[k]}`}
                x={logX ? Math.max(nEnd, minN) : nEnd}
                stroke={GEAR_COLORS[k]}
                strokeDasharray="4 3"
                strokeOpacity={0.55}
                label={{
                  value: fmt(nEnd, 0),
                  position: 'insideTop',
                  fill: GEAR_COLORS[k],
                  fontSize: 10,
                  dy: -2,
                }}
              />
            )
          })}
          {curves.map((data, k) => {
            const tMax = data.length ? Math.max(...data.map((p) => p.T)) : 0
            return (
              <ReferenceLine
                key={`tmax-${GEAR_COLORS[k]}`}
                y={tMax}
                stroke="none"
                label={{
                  value: fmt(tMax, 0),
                  position: 'insideLeft',
                  fill: GEAR_COLORS[k],
                  fontSize: 10,
                  dy: -6,
                }}
              />
            )
          })}
          {gaps.map((gap) => (
            <ReferenceArea
              key={`${gap.from}-${gap.to}`}
              x1={logX ? Math.max(gap.from, minN) : gap.from}
              x2={gap.to}
              fill="#f59e0b"
              fillOpacity={0.12}
              stroke="#f59e0b"
              strokeOpacity={0.4}
              strokeDasharray="4 4"
            />
          ))}
          {curves.map((data, k) => (
            <Line
              key={GEAR_COLORS[k]}
              data={clamp(data)}
              dataKey="T"
              name={`第 ${k + 1} 檔 (i=${fmt(gears[k].ratio, 4)})`}
              stroke={GEAR_COLORS[k]}
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
          <Scatter
            data={covered.map((p) => ({ n: logX ? Math.max(p.nSp, minN) : p.nSp, T: p.TSp, name: p.name }))}
            name="工況點（已覆蓋）"
            fill="#16a34a"
            shape="circle"
            isAnimationActive={false}
          />
          <Scatter
            data={uncovered.map((p) => ({ n: logX ? Math.max(p.nSp, minN) : p.nSp, T: p.TSp, name: p.name }))}
            name="工況點（未覆蓋）"
            fill="#dc2626"
            shape="diamond"
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      {gaps.length > 0 && (
        <p className="mt-1 text-xs text-amber-700">
          黃色帶 = 相鄰檔位恆功率帶盲區（
          {gaps.map((g) => `${fmt(g.from, 0)}–${fmt(g.to, 0)} rpm`).join('、')}
          ）：縮小齒比間距或選 R_cp 更大的馬達。
        </p>
      )}
    </div>
  )
}

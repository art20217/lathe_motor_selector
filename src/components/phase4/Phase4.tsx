import {
  accelTime,
  cylinderMass,
  hollowCylinderInertia,
  reflectedInertia,
  solidCylinderInertia,
} from '../../engine/dynamics'
import { ratedTorque } from '../../engine/motorSelection'
import { fmt } from '../../lib/format'
import { useProjectStore, type CheckItem } from '../../store/projectStore'
import { getSelectedMotor } from '../../store/selectors'
import { Badge, Field, NumInput, Section } from '../ui'

function Checklist({
  title,
  items,
  listKey,
}: {
  title: string
  items: CheckItem[]
  listKey: 'driver' | 'thermal'
}) {
  const setCheckItem = useProjectStore((s) => s.setCheckItem)
  return (
    <Section title={title}>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => setCheckItem(listKey, item.id, { checked: e.target.checked })}
              />
              <span className={item.checked ? 'text-slate-700' : 'text-slate-500'}>{item.label}</span>
            </label>
            <input
              value={item.note}
              onChange={(e) => setCheckItem(listKey, item.id, { note: e.target.value })}
              placeholder="備註"
              className="min-w-40 flex-1 rounded border border-slate-200 px-1.5 py-0.5 text-xs focus:border-blue-500 focus:outline-none"
            />
          </li>
        ))}
      </ul>
    </Section>
  )
}

export function Phase4() {
  const s = useProjectStore()
  const motor = getSelectedMotor(s)
  const d = s.dynamics
  const gear = s.gears[d.gearIndex]

  // mm → m
  const rOuter = d.wpOuterDia / 2000
  const rInner = d.wpInnerDia / 2000
  const length = d.wpLength / 1000
  const mass = cylinderMass(d.wpDensity, length, rOuter, d.workpieceType === 'hollow' ? rInner : 0)
  const jWp =
    d.workpieceType === 'hollow'
      ? hollowCylinderInertia(mass, rOuter, rInner)
      : solidCylinderInertia(mass, rOuter)

  const jLoad = d.jSpindle + d.jChuck + jWp
  const jMotor = motor?.inertia ?? null
  const jTotal = jMotor !== null && gear ? reflectedInertia(jMotor, jLoad, gear.ratio, d.jGears) : null

  const tRated = motor ? ratedTorque(motor.powerS1, motor.nBase) : null
  const tFriction = tRated !== null ? (tRated * d.frictionPct) / 100 : null
  const tAccTorque = tRated !== null && tFriction !== null ? tRated - tFriction : null
  const deltaNMotor = gear ? d.deltaNSp / gear.ratio : null
  const tAcc =
    jTotal !== null && deltaNMotor !== null && tAccTorque !== null && tAccTorque > 0
      ? accelTime(jTotal, deltaNMotor, tAccTorque)
      : null

  return (
    <div className="space-y-4">
      <Section title="Step 4.1 加減速時間驗證（巨型工件場景）">
        {!motor && (
          <p className="mb-3 text-sm text-amber-700">尚未選定馬達（Phase 2），以下僅計算負載側慣量。</p>
        )}
        {motor && motor.inertia === null && (
          <p className="mb-3 text-sm text-amber-700">
            選定馬達（{motor.model}）未填轉子慣量，無法折算 J_total，請回 Phase 2 補齊。
          </p>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-600">工件慣量 J_wp</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="工件型式">
                <select
                  value={d.workpieceType}
                  onChange={(e) => s.setDynamics({ workpieceType: e.target.value as 'solid' | 'hollow' })}
                  className="w-full rounded border border-slate-300 px-1 py-1 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="solid">實心圓柱</option>
                  <option value="hollow">空心圓柱</option>
                </select>
              </Field>
              <Field label="密度 ρ" unit="kg/m³">
                <NumInput value={d.wpDensity} onChange={(v) => s.setDynamics({ wpDensity: v })} step={50} min={1} />
              </Field>
              <Field label="外徑" unit="mm">
                <NumInput value={d.wpOuterDia} onChange={(v) => s.setDynamics({ wpOuterDia: v })} step={50} min={1} />
              </Field>
              <Field label="內徑" unit="mm">
                <NumInput
                  value={d.wpInnerDia}
                  onChange={(v) => s.setDynamics({ wpInnerDia: v })}
                  step={50}
                  min={0}
                  disabled={d.workpieceType === 'solid'}
                />
              </Field>
              <Field label="長度" unit="mm">
                <NumInput value={d.wpLength} onChange={(v) => s.setDynamics({ wpLength: v })} step={100} min={1} />
              </Field>
            </div>
            <div className="mt-3 rounded bg-slate-50 p-2 text-sm">
              <div>工件質量 m = <span className="font-medium tabular-nums">{fmt(mass, 0)} kg</span>（{fmt(mass / 1000, 1)} t）</div>
              <div>工件慣量 J_wp = <span className="font-medium tabular-nums">{fmt(jWp, 1)} kg·m²</span></div>
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-600">系統慣量與加速條件</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="主軸本體慣量 J_spindle" unit="kg·m²">
                <NumInput value={d.jSpindle} onChange={(v) => s.setDynamics({ jSpindle: v })} step={5} min={0} />
              </Field>
              <Field label="卡盤慣量 J_chuck" unit="kg·m²">
                <NumInput value={d.jChuck} onChange={(v) => s.setDynamics({ jChuck: v })} step={5} min={0} />
              </Field>
              <Field label="齒輪等效慣量 J_gears（馬達端）" unit="kg·m²">
                <NumInput value={d.jGears} onChange={(v) => s.setDynamics({ jGears: v })} step={0.05} min={0} />
              </Field>
              <Field label="使用檔位">
                <select
                  value={d.gearIndex}
                  onChange={(e) => s.setDynamics({ gearIndex: Number(e.target.value) })}
                  className="w-full rounded border border-slate-300 px-1 py-1 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {s.gears.map((g, k) => (
                    <option key={`g${k + 1}`} value={k}>
                      第 {k + 1} 檔（i = {fmt(g.ratio, 4)}）
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="主軸端轉速變化 Δn_sp" unit="rpm">
                <NumInput value={d.deltaNSp} onChange={(v) => s.setDynamics({ deltaNSp: v })} step={10} min={0} />
              </Field>
              <Field label="摩擦扭矩比例（假設值）" unit="% of T_rated">
                <NumInput value={d.frictionPct} onChange={(v) => s.setDynamics({ frictionPct: v })} step={1} min={0} max={50} />
              </Field>
              <Field label="規格要求加速時間（無要求留空）" unit="s">
                <NumInput
                  value={d.requiredTime ?? NaN}
                  onChange={(v) => s.setDynamics({ requiredTime: Number.isFinite(v) ? v : null })}
                  step={0.5}
                  min={0}
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded bg-blue-50 p-3">
          <table className="text-sm">
            <tbody>
              <tr>
                <td className="pr-6 text-slate-500">負載側慣量（主軸端）J_sp + J_chuck + J_wp</td>
                <td className="text-right font-medium tabular-nums">{fmt(jLoad, 1)} kg·m²</td>
              </tr>
              <tr>
                <td className="pr-6 text-slate-500">折算至馬達端 J_total = J_m + J_load·i² + J_gears</td>
                <td className="text-right font-medium tabular-nums">{jTotal === null ? '—' : `${fmt(jTotal, 3)} kg·m²`}</td>
              </tr>
              <tr>
                <td className="pr-6 text-slate-500">可用加速扭矩 T_acc = T_rated − T_friction（{fmt(d.frictionPct, 0)}% 假設值）</td>
                <td className="text-right font-medium tabular-nums">{tAccTorque === null ? '—' : `${fmt(tAccTorque, 1)} N·m`}</td>
              </tr>
              <tr>
                <td className="pr-6 text-slate-500">馬達端轉速變化 Δn = Δn_sp / i</td>
                <td className="text-right font-medium tabular-nums">{deltaNMotor === null ? '—' : `${fmt(deltaNMotor, 0)} rpm`}</td>
              </tr>
              <tr>
                <td className="pr-6 pt-1 text-slate-700">加速時間 t_acc = J_total·Δω / T_acc</td>
                <td className="pt-1 text-right text-lg font-bold tabular-nums text-blue-700">
                  {tAcc === null ? '—' : `${fmt(tAcc, 2)} s`}
                </td>
              </tr>
            </tbody>
          </table>
          {tAcc !== null && d.requiredTime !== null && (
            <div className="mt-2">
              {tAcc <= d.requiredTime ? (
                <Badge kind="ok">✓ 符合規格要求（≤ {fmt(d.requiredTime, 1)} s）</Badge>
              ) : (
                <Badge kind="error">✗ 超出規格要求（≤ {fmt(d.requiredTime, 1)} s）→ 檢討馬達扭矩或加減速規格</Badge>
              )}
            </div>
          )}
          <p className="mt-2 text-xs text-slate-500">
            i &lt; 1（減速）使負載慣量折算後大幅縮小，慣量通常非決定性約束；45 噸級巨型工件仍須檢查。
          </p>
        </div>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Checklist title="Step 4.2 驅動器匹配查核（查表驗證）" items={s.driverChecklist} listKey="driver" />
        <Checklist title="Step 4.3 熱負載驗證查核" items={s.thermalChecklist} listKey="thermal" />
      </div>
    </div>
  )
}

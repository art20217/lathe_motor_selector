/** 共用小型 UI 元件 */
import type { ReactNode } from 'react'

/** 卡片區塊 */
export function Section({
  title,
  children,
  aside,
}: {
  title: ReactNode
  children: ReactNode
  aside?: ReactNode
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-700">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

/** 數值輸入：空白/非法輸入回傳 NaN，由呼叫端決定如何處理 */
export function NumInput({
  value,
  onChange,
  step,
  min,
  max,
  className = '',
  disabled,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  className?: string
  disabled?: boolean
}) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : ''}
      step={step}
      min={min}
      max={max}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
      className={`w-full rounded border border-slate-300 px-1.5 py-1 text-right text-sm tabular-nums focus:border-blue-500 focus:outline-none disabled:bg-slate-100 ${className}`}
    />
  )
}

/** 帶標籤的欄位容器 */
export function Field({ label, unit, children }: { label: ReactNode; unit?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-0.5 block text-xs text-slate-500">
        {label}
        {unit && <span className="ml-1 text-slate-400">[{unit}]</span>}
      </span>
      {children}
    </label>
  )
}

/** 警示徽章：未核對資料 / 假設值 */
export function Badge({
  kind,
  children,
}: {
  kind: 'warn' | 'ok' | 'error' | 'info'
  children: ReactNode
}) {
  const styles = {
    warn: 'bg-amber-100 text-amber-800 border-amber-300',
    ok: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    error: 'bg-red-100 text-red-800 border-red-300',
    info: 'bg-sky-100 text-sky-800 border-sky-300',
  }[kind]
  return (
    <span className={`inline-block whitespace-nowrap rounded border px-1.5 py-0.5 text-xs font-medium ${styles}`}>
      {children}
    </span>
  )
}

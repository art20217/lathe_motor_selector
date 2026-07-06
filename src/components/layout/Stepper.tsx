import { useProjectStore } from '../../store/projectStore'
import { getDutyResults, getMotorList, getPMin } from '../../store/selectors'

const STEPS = [
  { phase: 1, label: 'Phase 1 工況定義' },
  { phase: 2, label: 'Phase 2 馬達篩選' },
  { phase: 3, label: 'Phase 3 齒比與 T-n 驗證' },
  { phase: 4, label: 'Phase 4 系統驗證' },
  { phase: 5, label: '選型報告' },
]

export function Stepper() {
  const s = useProjectStore()
  const results = getDutyResults(s.cases)
  const pMin = getPMin(s, results)
  const candidateCount = getMotorList(s).filter((m) => m.powerS1 >= pMin).length

  const hint = (phase: number): string => {
    switch (phase) {
      case 1:
        return s.cases.length ? `${s.cases.length} 個工況` : '尚無工況'
      case 2:
        return s.cases.length ? `${candidateCount} 個候選` : '—'
      case 3:
        return s.selectedMotorId ? '馬達已選定' : '未選馬達'
      default:
        return ''
    }
  }

  return (
    <nav className="border-b border-slate-200 bg-white px-4 print:hidden">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto">
        {STEPS.map((step) => {
          const active = s.activePhase === step.phase
          return (
            <button
              key={step.phase}
              type="button"
              onClick={() => s.setActivePhase(step.phase)}
              className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm transition-colors ${
                active
                  ? 'border-blue-600 font-semibold text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {step.label}
              {hint(step.phase) && (
                <span className="ml-2 text-xs text-slate-400">{hint(step.phase)}</span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

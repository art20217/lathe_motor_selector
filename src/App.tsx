import { Header } from './components/layout/Header'
import { Stepper } from './components/layout/Stepper'
import { Phase1 } from './components/phase1/Phase1'
import { Phase2 } from './components/phase2/Phase2'
import { Phase3 } from './components/phase3/Phase3'
import { Phase4 } from './components/phase4/Phase4'
import { ReportView } from './components/report/ReportView'
import { useProjectStore } from './store/projectStore'

function App() {
  const activePhase = useProjectStore((s) => s.activePhase)

  return (
    <div className="min-h-screen">
      <Header />
      <Stepper />
      <main className="mx-auto max-w-7xl px-4 py-5 print:max-w-none print:p-0">
        {activePhase === 1 && <Phase1 />}
        {activePhase === 2 && <Phase2 />}
        {activePhase === 3 && <Phase3 />}
        {activePhase === 4 && <Phase4 />}
        {activePhase === 5 && <ReportView />}
      </main>
    </div>
  )
}

export default App

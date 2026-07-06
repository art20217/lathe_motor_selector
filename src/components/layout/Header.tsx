import { useRef } from 'react'
import { Download, FileUp, RotateCcw } from 'lucide-react'
import { serializeProject, useProjectStore, type ProjectState } from '../../store/projectStore'

/** 下載文字內容為檔案 */
export function downloadText(filename: string, content: string, mime = 'application/json') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function Header() {
  const store = useProjectStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const exportProject = () => {
    const data = serializeProject(store)
    downloadText(`${store.projectName}.json`, JSON.stringify(data, null, 2))
  }

  const importProject = (file: File) => {
    file.text().then((text) => {
      try {
        const data = JSON.parse(text) as ProjectState
        if (typeof data.schemaVersion !== 'number' || !Array.isArray(data.cases)) {
          alert('檔案格式不符：非本工具的專案檔')
          return
        }
        store.importProject(data)
      } catch {
        alert('JSON 解析失敗，請確認檔案內容')
      }
    })
  }

  return (
    <header className="border-b border-slate-200 bg-white px-4 py-3 print:hidden">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800">車床主軸馬達選型工具</h1>
          <p className="text-xs text-slate-400">AC 主軸馬達 + 四檔變速箱 · 依選型 SOP v1.0</p>
        </div>
        <input
          value={store.projectName}
          onChange={(e) => store.setProjectName(e.target.value)}
          className="ml-auto w-56 rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="選型案名稱"
        />
        <button
          type="button"
          onClick={exportProject}
          className="flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          <Download size={15} /> 匯出專案
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          <FileUp size={15} /> 匯入專案
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm('確定要重置整個選型案？未匯出的資料將遺失。')) store.resetProject()
          }}
          className="flex items-center gap-1.5 rounded border border-red-200 bg-white px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
        >
          <RotateCcw size={15} /> 重置
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) importProject(f)
            e.target.value = ''
          }}
        />
      </div>
    </header>
  )
}

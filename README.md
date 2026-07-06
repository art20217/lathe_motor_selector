# 車床主軸馬達選型工具

依據《AC 主軸馬達選型 SOP v1.0》開發的 Web 工程工具，供臥式車床（含巨型車床）
「AC 感應式主軸馬達 + 四檔齒輪變速箱」架構的選型計算與驗證。

**線上使用**：https://art20217.github.io/lathe_motor_selector/

## 功能：四 Phase 選型推理鏈

| Phase | 內容 |
|:---:|:---|
| 1 | 工況定義：設計工況矩陣 → 切削力 / 淨功率 → 主軸端 (n, T) 座標 |
| 2 | 馬達候選篩選：P_min = max(Pc)/η × SF，以 S1 連續額定篩選 |
| 3 | 齒比設計 + T-n 覆蓋驗證：四檔映射曲線 vs 工況點、恆功率帶盲區檢查 |
| 4 | 系統驗證：慣量折算與加減速時間、驅動器匹配與熱負載查核清單 |

另含：選型報告（列印 / PDF / Markdown 匯出）、JSON 專案檔匯出匯入、
瀏覽器自動保存（localStorage）、馬達庫與材料庫管理。

## ⚠ 資料正確性聲明

- 內建**馬達範例**（FANUC αiI 命名）之規格數值為示意，未經型錄核對
  （`verified: false`），正式選型前務必以 FANUC B-65272EN 核對。
- 內建**材料 kc1/mc** 為 Sandvik 參考條件（h=1mm、γref=6°）之常見引用值，
  使用前須核對現行刀具廠商手冊。
- 所有估算值（變速箱效率估算、摩擦扭矩比例）於 UI 與報告中標記「假設值」。

## 技術架構

- Vite + React + TypeScript、Tailwind CSS v4
- zustand（persist）狀態管理、Recharts 圖表
- 計算引擎為純 TypeScript 函式（`src/engine/`），與 UI 完全分離，Vitest 單元測試
  涵蓋 SOP 內建之數學交叉驗證式
- GitHub Actions 自動部署 GitHub Pages

## 開發

```bash
npm install
npm run dev     # 開發伺服器
npm test        # 引擎單元測試
npm run build   # 型別檢查 + 產線建置
```

SOP 原文見 [docs/SOP.md](docs/SOP.md)。

## 擴充路線（SOP 待補模組）

- 帶域分割方法論（齒比自動建議）
- 工作範例（walked example）
- C/CF 軸選型（獨立文件）

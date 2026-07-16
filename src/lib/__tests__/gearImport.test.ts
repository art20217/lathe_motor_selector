import { describe, expect, it } from 'vitest'
import { parseGearFile } from '../gearImport'

const valid = {
  formatVersion: 1,
  gears: [
    { ratio: 0.05, efficiency: 0.85 },
    { ratio: 0.12, efficiency: 0.88 },
    { ratio: 0.28, efficiency: 0.91 },
    { ratio: 0.65, efficiency: 0.94 },
  ],
}

describe('齒比 JSON 匯入解析', () => {
  it('標準格式與純陣列皆可', () => {
    expect(parseGearFile(JSON.stringify(valid)).gears).toHaveLength(4)
    expect(parseGearFile(JSON.stringify(valid.gears)).gears).toHaveLength(4)
    expect(parseGearFile(JSON.stringify(valid)).errors).toEqual([])
  })

  it('筆數不足 / 超過 4 筆整檔拒收', () => {
    const three = valid.gears.slice(0, 3)
    const r = parseGearFile(JSON.stringify(three))
    expect(r.gears).toEqual([])
    expect(r.errors[0]).toContain('4 筆')
  })

  it('任一檔驗證失敗即整檔拒收（避免檔位錯位）', () => {
    const bad = [...valid.gears.slice(0, 3), { ratio: -1, efficiency: 0.9 }]
    const r = parseGearFile(JSON.stringify(bad))
    expect(r.gears).toEqual([])
    expect(r.errors[0]).toContain('第 4 檔')
  })

  it('efficiency 超出 (0,1] 拒收', () => {
    const bad = [...valid.gears.slice(0, 3), { ratio: 0.5, efficiency: 1.2 }]
    expect(parseGearFile(JSON.stringify(bad)).errors).toHaveLength(1)
  })

  it('無效 JSON / 缺 gears 統一以 errors 回報', () => {
    expect(parseGearFile('oops').errors).toHaveLength(1)
    expect(parseGearFile('{"foo":[]}').errors).toHaveLength(1)
  })
})

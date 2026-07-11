import { describe, expect, it } from 'vitest'
import { parseMaterialLibrary } from '../materialImport'

const valid = {
  formatVersion: 1,
  materials: [
    { name: '低合金鋼 HB300', kc1: 1725, mc: 0.24, isoGroup: 'P', gammaRef: 0 },
    { name: 'SNCM439 調質', kc1: 2100, mc: 0.25, ffRatio: 0.4, fpRatio: 0.3 },
  ],
}

describe('材料庫 JSON 匯入解析', () => {
  it('標準格式：materials 陣列', () => {
    const r = parseMaterialLibrary(JSON.stringify(valid))
    expect(r.errors).toEqual([])
    expect(r.materials).toHaveLength(2)
    expect(r.materials[0].gammaRef).toBe(0)
    expect(r.materials[0].verified).toBe(false)
    expect(r.materials[1].isoGroup).toBe('P')
    expect(r.materials[1].id).toBeTruthy()
  })

  it('亦接受純陣列', () => {
    const r = parseMaterialLibrary(JSON.stringify(valid.materials))
    expect(r.materials).toHaveLength(2)
  })

  it('無效 JSON / 缺 materials 統一以 errors 回報', () => {
    expect(parseMaterialLibrary('not json').errors).toHaveLength(1)
    expect(parseMaterialLibrary('{"foo":1}').errors).toHaveLength(1)
  })

  it('逐筆驗證：壞筆略過、好筆保留，錯誤含列號與名稱', () => {
    const mixed = [
      { name: 'OK 材料', kc1: 1500, mc: 0.25 },
      { name: '', kc1: 1500, mc: 0.25 },
      { name: '負 kc1', kc1: -5, mc: 0.25 },
      { name: 'mc 超界', kc1: 1500, mc: 1.5 },
      'not-an-object',
    ]
    const r = parseMaterialLibrary(JSON.stringify(mixed))
    expect(r.materials).toHaveLength(1)
    expect(r.errors).toHaveLength(4)
    expect(r.errors[1]).toContain('負 kc1')
  })

  it('isoGroup 非法值回退 P；gammaRef 未給不寫入（引擎缺省 6）', () => {
    const r = parseMaterialLibrary(
      JSON.stringify([{ name: 'X', kc1: 1000, mc: 0.2, isoGroup: 'Z' }]),
    )
    expect(r.materials[0].isoGroup).toBe('P')
    expect(r.materials[0].gammaRef).toBeUndefined()
  })
})

/**
 * 工件撓曲 / 支撐方式檢核
 *
 * 支撐模型（切削力作用於最壞位置）：
 *   chuck        僅夾頭（懸臂）      δ = F·L³ / (3·E·I)   （力在自由端）
 *   chuck_tail   夾頭＋尾座頂心      δ = F·L³ / (110·E·I) （力在中央，固定-簡支）
 *   centers      兩頂心之間          δ = F·L³ / (48·E·I)  （力在中央，簡支-簡支）
 *
 * 彎曲合力取 √(Fc² + Fp²)（主切削力與背分力的徑向合成）。
 */

export type SupportType = 'chuck' | 'chuck_tail' | 'centers'

export const SUPPORT_FACTOR: Record<SupportType, { k: number; name: string }> = {
  chuck: { k: 3, name: '僅夾頭（懸臂）' },
  chuck_tail: { k: 110, name: '夾頭＋尾座頂心' },
  centers: { k: 48, name: '兩頂心之間' },
}

export interface DeflectionResult {
  supportName: string
  /** 彎曲合力 √(Fc²+Fp²) [N] */
  fBend: number
  ldRatio: number
  /** 最大撓曲量 [mm] */
  deflection: number
  limit: number
  ok: boolean
  advice: string[]
}

/**
 * 工件在切削合力下的最大撓曲量。
 *
 * @param diameter 工件直徑 [mm]（取切削處最小斷面較保守）
 * @param length   懸伸長 / 支撐跨距 [mm]
 * @param fc, fp   主切削力、背分力 [N]
 * @param E        楊氏模數 [Pa]
 * @param limit    允許撓曲量 [mm]
 * @param bore     內孔徑 [mm]
 */
export function deflectionCheck(
  support: SupportType,
  diameter: number,
  length: number,
  fc: number,
  fp: number,
  E: number,
  limit = 0.02,
  bore = 0,
): DeflectionResult {
  const sup = SUPPORT_FACTOR[support]
  const fBend = Math.hypot(fc, fp)
  const dM = diameter / 1000
  const lM = length / 1000
  const boreM = bore / 1000
  const inertia = (Math.PI * (dM ** 4 - boreM ** 4)) / 64
  const deflection = ((fBend * lM ** 3) / (sup.k * E * inertia)) * 1000 // mm

  const ldRatio = length / diameter
  const advice: string[] = []
  if (support === 'chuck' && ldRatio > 4)
    advice.push('L/D > 4：懸臂夾持剛性不足，建議加尾座頂心')
  if (ldRatio > 8) advice.push('L/D > 8：建議加裝中心架（steady rest）')
  if (deflection > limit)
    advice.push(
      `撓曲 ${deflection.toFixed(4)} mm 超過允許值 ${limit} mm：降低切深/進給、改變支撐方式或分段加工`,
    )

  return {
    supportName: sup.name,
    fBend,
    ldRatio,
    deflection,
    limit,
    ok: deflection <= limit,
    advice,
  }
}

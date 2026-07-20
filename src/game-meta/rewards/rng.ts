/**
 * 掉落随机数：mulberry32 种子 PRNG。
 * 掉落结算需要「可注入、可复现」的随机源——测试与数值验证传固定种子；
 * 真实游戏每次胜利用新种子（见 CampaignDirector）。
 */

/** 随机源：返回 [0, 1) 的浮点数（与 Math.random 同契约）。 */
export type Rng = () => number;

/** mulberry32：以 32 位整数为种子的确定性 PRNG。同种子必产出同序列。 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 按权重从条目中抽一个下标（weights[i] ≤ 0 视为不可抽）。
 * 总权重 ≤ 0 时返回 -1（调用方决定跳过还是回退）。
 */
export function weightedIndex(weights: readonly number[], rng: Rng): number {
  let total = 0;
  for (const w of weights) if (w > 0) total += w;
  if (total <= 0) return -1;
  let roll = rng() * total;
  let lastPickable = -1;
  for (let i = 0; i < weights.length; i++) {
    const w = weights[i];
    if (w <= 0) continue;
    lastPickable = i;
    roll -= w;
    if (roll < 0) return i;
  }
  return lastPickable; // 浮点边界兜底：落到最后一个可抽项
}

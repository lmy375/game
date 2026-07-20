import { describe, it, expect } from "vitest";
import { loadMetaTables } from "@data/metaIndex";
import {
  mulberry32,
  weightedIndex,
  rollRandomDrops,
  dropPoolsByRarity,
  RARITIES,
  rarityRank,
  isSkillItem,
  RandomDropSpec,
} from "@meta/index";

const tables = loadMetaTables();

describe("mulberry32 种子 PRNG", () => {
  it("同种子产出同序列；输出落在 [0,1)", () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = Array.from({ length: 8 }, () => a());
    const seqB = Array.from({ length: 8 }, () => b());
    expect(seqA).toEqual(seqB);
    for (const v of seqA) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("异种子序列分化", () => {
    const a = Array.from({ length: 8 }, mulberry32(1));
    const b = Array.from({ length: 8 }, mulberry32(2));
    expect(a).not.toEqual(b);
  });
});

describe("weightedIndex 按权重抽取", () => {
  it("权重为 0 的项永不抽中", () => {
    const rng = mulberry32(7);
    const weights = [0, 5, 0, 5, 0];
    const counts = [0, 0, 0, 0, 0];
    for (let i = 0; i < 2000; i++) counts[weightedIndex(weights, rng)]++;
    expect(counts[0]).toBe(0);
    expect(counts[2]).toBe(0);
    expect(counts[4]).toBe(0);
    expect(counts[1]).toBeGreaterThan(0);
    expect(counts[3]).toBeGreaterThan(0);
  });

  it("总权重 ≤ 0 返回 -1", () => {
    expect(weightedIndex([0, 0, 0], mulberry32(1))).toBe(-1);
    expect(weightedIndex([], mulberry32(1))).toBe(-1);
  });

  it("频率与权重大致成比例（大数）", () => {
    const rng = mulberry32(99);
    const weights = [10, 30, 60];
    const counts = [0, 0, 0];
    const N = 30000;
    for (let i = 0; i < N; i++) counts[weightedIndex(weights, rng)]++;
    expect(counts[0] / N).toBeCloseTo(0.1, 1);
    expect(counts[1] / N).toBeCloseTo(0.3, 1);
    expect(counts[2] / N).toBeCloseTo(0.6, 1);
  });
});

describe("掉落池按稀有度分组", () => {
  it("只含装备/消耗品，不含任何秘卷", () => {
    const pools = dropPoolsByRarity(tables.items);
    for (const rarity of RARITIES) {
      for (const id of pools[rarity]) {
        expect(tables.items[id].rarity).toBe(rarity);
        expect(isSkillItem(tables.items[id])).toBe(false);
      }
    }
    // 五档都有非空池（数据完整性：保证权重不会长期落空回退）。
    for (const rarity of RARITIES) {
      expect(pools[rarity].length, `${rarity} 池不应为空`).toBeGreaterThan(0);
    }
  });
});

describe("rollRandomDrops", () => {
  it("抽取数量等于 rolls；结果确定性", () => {
    const spec: RandomDropSpec = { rolls: 5, weights: { blue: 1 } };
    const a = rollRandomDrops(spec, tables.items, mulberry32(3));
    const b = rollRandomDrops(spec, tables.items, mulberry32(3));
    expect(a).toHaveLength(5);
    expect(a).toEqual(b);
  });

  it("单一稀有度权重只产出该档（池非空时不回退）", () => {
    const drops = rollRandomDrops({ rolls: 20, weights: { orange: 1 } }, tables.items, mulberry32(5));
    for (const id of drops) expect(tables.items[id].rarity).toBe("orange");
  });

  it("rolls=0 或权重全 0 返回空数组", () => {
    expect(rollRandomDrops({ rolls: 0, weights: { gray: 1 } }, tables.items, mulberry32(1))).toEqual([]);
    expect(rollRandomDrops({ rolls: 3, weights: {} }, tables.items, mulberry32(1))).toEqual([]);
  });
});

describe("关卡随机掉落规格（数据）", () => {
  it("每关 rolls > 0，权重非负且至少一档 > 0", () => {
    for (const reward of Object.values(tables.levelRewards)) {
      const spec = reward.randomDrops;
      if (!spec) continue;
      expect(spec.rolls).toBeGreaterThan(0);
      const values = RARITIES.map((r) => spec.weights[r] ?? 0);
      for (const w of values) expect(w).toBeGreaterThanOrEqual(0);
      expect(values.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    }
  });

  it("高关平均掉落稀有度高于低关（难度曲线）", () => {
    const avgRank = (levelId: string, seed: number) => {
      const spec = tables.levelRewards[levelId].randomDrops!;
      // 放大 rolls 求稳定均值。
      const drops = rollRandomDrops({ ...spec, rolls: 400 }, tables.items, mulberry32(seed));
      const sum = drops.reduce((acc, id) => acc + rarityRank(tables.items[id].rarity), 0);
      return sum / drops.length;
    };
    expect(avgRank("level_010", 1)).toBeGreaterThan(avgRank("level_001", 1));
  });
});

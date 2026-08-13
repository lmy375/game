import { describe, expect, it } from "vitest";
import { EffectOp } from "@core/index";
import {
  GameDataValidationError,
  bundledGameData,
  collectGameDataIssues,
  validateGameData,
} from "@data/index";

function damageOp(ops: EffectOp[]): Extract<EffectOp, { type: "damage" }> {
  const op = ops.find((o): o is Extract<EffectOp, { type: "damage" }> => o.type === "damage");
  if (!op) throw new Error("效果列表中缺少伤害操作");
  return op;
}

describe("validateGameData", () => {
  it("内置游戏数据通过集中校验", () => {
    expect(() => validateGameData()).not.toThrow();
  });

  it("一次收集重复 ID、跨表未知引用和非法数值", () => {
    const data = structuredClone(bundledGameData());
    data.patterns.push({ ...data.patterns[0] });
    data.skills[0].patternId = "missing_pattern";
    data.units[0].stats.speed = 0;
    data.levels[0].playerUnits[0].unitId = "missing_unit";
    data.items.find((item) => item.kind === "skill")!.skillId = "missing_skill";
    data.story.nodes[data.story.startId].next = "missing_node";

    const issues = collectGameDataIssues(data);
    expect(issues.length).toBeGreaterThanOrEqual(6);
    expect(issues.some((issue) => issue.message.includes("重复 ID"))).toBe(true);
    expect(issues.some((issue) => issue.path.includes("patternId") && issue.message.includes("missing_pattern"))).toBe(true);
    expect(issues.some((issue) => issue.path.includes("stats.speed"))).toBe(true);
    expect(issues.some((issue) => issue.path.includes("playerUnits") && issue.message.includes("missing_unit"))).toBe(true);
    expect(issues.some((issue) => issue.path.includes("skillId") && issue.message.includes("missing_skill"))).toBe(true);
    expect(issues.some((issue) => issue.path.includes("story") && issue.message.includes("missing_node"))).toBe(true);
  });

  it("AOE 收益不变式：中心倍率过高（2×边缘 < 1.2×中心）被拒绝", () => {
    const data = structuredClone(bundledGameData());
    const crossFire = data.skills.find((s) => s.id === "cross_fire")!;
    // 回退到旧数值：中心 1.5 / 边缘 0.8 —— 打 2 个边缘(1.6)只比 1 个中心(1.5)多 6.7%，
    // 扣防御后必然反超，玩家最优解退化为点射单体。
    damageOp(crossFire.cellEffects.center).multiplier = 1.5;
    damageOp(crossFire.cellEffects.arm).multiplier = 0.8;

    const issues = collectGameDataIssues(data);
    expect(issues.some((i) => i.path.includes("cross_fire") && i.message.includes("AOE 收益不变式"))).toBe(true);
  });

  it("AOE 收益不变式：伤害档位状态不一致被拒绝", () => {
    const data = structuredClone(bundledGameData());
    const crossFire = data.skills.find((s) => s.id === "cross_fire")!;
    crossFire.cellEffects.arm = crossFire.cellEffects.arm.filter((op) => op.type !== "apply_status");

    const issues = collectGameDataIssues(data);
    expect(issues.some((i) => i.path.includes("cross_fire") && i.message.includes("附带状态必须一致"))).toBe(true);
  });

  it("AOE 收益不变式：低面板持有者扣防御后收益反转被拒绝", () => {
    const data = structuredClone(bundledGameData());
    const rangedShot = data.skills.find((s) => s.id === "ranged_shot")!;
    // 远程兵攻击 16、玩家防御中位数 8：边缘 0.5 时 2×max(1, 16*0.5-8)=2，低于中心 8。
    damageOp(rangedShot.cellEffects.arm).multiplier = 0.5;

    const issues = collectGameDataIssues(data);
    expect(issues.some((i) => i.path.includes("ranged_shot") && i.message.includes("AOE 收益不变式"))).toBe(true);
  });

  it("抛出的聚合错误包含全部问题及可定位路径", () => {
    const data = structuredClone(bundledGameData());
    data.levelRewards.level_001.guaranteedDrops.push("missing_item");
    data.levelRewards.level_001.randomDrops!.rolls = -1;

    let thrown: unknown;
    try {
      validateGameData(data);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(GameDataValidationError);
    const error = thrown as GameDataValidationError;
    expect(error.issues.length).toBeGreaterThanOrEqual(2);
    expect(error.message).toContain("levelRewards.level_001.guaranteedDrops");
    expect(error.message).toContain("levelRewards.level_001.randomDrops.rolls");
  });
});

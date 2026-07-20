import { describe, expect, it } from "vitest";
import {
  GameDataValidationError,
  bundledGameData,
  collectGameDataIssues,
  validateGameData,
} from "@data/index";

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

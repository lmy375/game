import { describe, it, expect } from "vitest";
import { createRegistry, getLevel } from "@data/index";
import { loadMetaTables, initialSaveData } from "@data/metaIndex";
import { buildBattleState, processCombatXp } from "@meta/index";
import { BattleEvent, BattleState, skillPower } from "@core/index";

const registry = createRegistry();
const tables = loadMetaTables();

/** 装配含风术士的战斗态（level_002：火法师 + 风术士），返回 profile 与 state。 */
function setup() {
  const save = initialSaveData();
  const state = buildBattleState(save.profile, getLevel("level_002"), registry, tables);
  return { profile: save.profile, state };
}

function playerUnit(state: BattleState, defId: string) {
  return state.units.find((u) => u.faction === "player" && u.defId === defId)!;
}
function enemyUnit(state: BattleState) {
  return state.units.find((u) => u.faction === "enemy")!;
}

describe("skillPower：技能等级倍率", () => {
  it("1 级=1.0；每级按 powerPerLevel 递增；缺省 powerPerLevel=0 不变", () => {
    const scaling = { powerPerLevel: 0.1 } as any;
    expect(skillPower(1, scaling)).toBe(1);
    expect(skillPower(3, scaling)).toBeCloseTo(1.2, 5);
    const flat = {} as any;
    expect(skillPower(5, flat)).toBe(1); // 无 powerPerLevel → 恒为 1（回归保护）
  });
});

describe("processCombatXp：贡献即得经验（伤害/治疗/状态，无需击杀）", () => {
  const rates = tables.progression.combatXp;

  it("对敌造成伤害即得经验（按伤害量计，敌人未死也给）", () => {
    const { profile, state } = setup();
    const wind = playerUnit(state, "wind_mage");
    const enemy = enemyUnit(state);
    const before = wind.xp;
    // 敌人仍存活，只是掉血。
    enemy.hp = enemy.maxHp - 40;
    const events: BattleEvent[] = [
      { type: "skill_cast", casterId: wind.instanceId, skillId: "wind_blade" },
      { type: "unit_damaged", unitId: enemy.instanceId, amount: 40, hpAfter: enemy.hp, source: "skill:wind_blade" },
    ];
    const extra = processCombatXp(events, state, profile, registry, tables);
    expect(wind.xp).toBe(before + Math.round(40 * rates.perDamage));
    expect(enemy.hp).toBeGreaterThan(0); // 未击杀
    expect(extra.length).toBe(0); // 单次不足以升级
  });

  it("施加状态（Buff/Debuff）也给经验", () => {
    const { profile, state } = setup();
    const wind = playerUnit(state, "wind_mage");
    const enemy = enemyUnit(state);
    const before = wind.xp;
    const events: BattleEvent[] = [
      { type: "skill_cast", casterId: wind.instanceId, skillId: "cross_fire" },
      { type: "unit_status_applied", unitId: enemy.instanceId, statusId: "burn", duration: 2 },
    ];
    processCombatXp(events, state, profile, registry, tables);
    expect(wind.xp).toBe(before + rates.perStatus);
  });

  it("累计贡献足够则当场升级：属性重算 + 解锁技能 + level_up 事件", () => {
    const { profile, state } = setup();
    const wind = playerUnit(state, "wind_mage");
    const enemy = enemyUnit(state);
    const base = registry.unit("wind_mage").stats;

    // 顶到 2 级阈值前 1 点，再造成 1 点伤害即跨级（perDamage>0）。
    wind.xp = tables.progression.xpCurve.xpToReach[2] - 1;
    const events: BattleEvent[] = [
      { type: "skill_cast", casterId: wind.instanceId, skillId: "wind_blade" },
      { type: "unit_damaged", unitId: enemy.instanceId, amount: 20, hpAfter: enemy.hp, source: "skill:wind_blade" },
    ];
    const extra = processCombatXp(events, state, profile, registry, tables);

    expect(wind.level).toBe(2);
    expect(wind.stats.magic).toBe(base.magic + 4); // 2 级 magic +4
    expect(wind.maxHp).toBe(base.hp + 8); // 2 级 hp +8
    expect(wind.skills).toContain("push_wave"); // 2 级解锁
    const lvlUp = extra.find((e) => e.type === "unit_level_up");
    expect(lvlUp).toMatchObject({ unitId: wind.instanceId, fromLevel: 1, toLevel: 2 });
  });

  it("敌方施法不给敌方经验（施法者非玩家）", () => {
    const { profile, state } = setup();
    const wind = playerUnit(state, "wind_mage");
    const enemy = enemyUnit(state);
    const events: BattleEvent[] = [
      { type: "skill_cast", casterId: enemy.instanceId, skillId: "cleave" },
      { type: "unit_damaged", unitId: wind.instanceId, amount: 30, hpAfter: wind.hp, source: "skill:cleave" },
    ];
    const extra = processCombatXp(events, state, profile, registry, tables);
    expect(extra.length).toBe(0);
    expect(enemy.xp).toBe(0);
  });

  it("无 skill_cast 的批次（如灼烧 DoT 跳伤）不给经验，避免重复结算", () => {
    const { profile, state } = setup();
    const wind = playerUnit(state, "wind_mage");
    const enemy = enemyUnit(state);
    const before = wind.xp;
    // 敌方回合结束时的灼烧跳伤：无 skill_cast。
    const events: BattleEvent[] = [
      { type: "unit_damaged", unitId: enemy.instanceId, amount: 10, hpAfter: enemy.hp - 10, source: "status:burn" },
      { type: "unit_died", unitId: enemy.instanceId, killerId: wind.instanceId },
    ];
    const extra = processCombatXp(events, state, profile, registry, tables);
    expect(extra.length).toBe(0);
    expect(wind.xp).toBe(before);
  });

  it("只造成位移（无伤害/治疗/状态）不给经验", () => {
    const { profile, state } = setup();
    const wind = playerUnit(state, "wind_mage");
    const enemy = enemyUnit(state);
    const before = wind.xp;
    const events: BattleEvent[] = [
      { type: "skill_cast", casterId: wind.instanceId, skillId: "gale_gather" },
      { type: "unit_displaced", unitId: enemy.instanceId, from: { x: 1, y: 1 }, to: { x: 2, y: 2 }, reason: "gather" },
    ];
    const extra = processCombatXp(events, state, profile, registry, tables);
    expect(extra.length).toBe(0);
    expect(wind.xp).toBe(before);
  });
});

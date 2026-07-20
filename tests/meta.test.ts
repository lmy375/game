import { describe, it, expect } from "vitest";
import { createRegistry, getLevel, levels } from "@data/index";
import { loadMetaTables, initialSaveData } from "@data/metaIndex";
import {
  buildBattleState,
  computeRewards,
  applyRewards,
  unitProgress,
  serialize,
  deserialize,
  advance,
  nodeById,
  isTerminal,
  cloneProfile,
  isSkillItem,
  skillIdsOf,
  SKILL_SLOT_COUNT,
  SAVE_VERSION,
  mulberry32,
  isEquip,
  isConsumable,
} from "@meta/index";
import { loadLevel, resolveBoardData, UnitStats } from "@core/index";
import { runToOutcome } from "./helpers";

const registry = createRegistry();
const tables = loadMetaTables();

/** 用真实 loadout 装配某关，再确定性地标记为玩家胜利（杀光敌方）——用于稳定测试奖励逻辑，
 *  不依赖朴素 bot 是否打赢（朴素 bot 可能输，见 battle.test「完整对局可推进」只断言有结果）。 */
function wonState(profile: ReturnType<typeof initialSaveData>["profile"], levelId: string) {
  const s = buildBattleState(profile, getLevel(levelId), registry, tables);
  for (const u of s.units) if (u.faction === "enemy") u.hp = 0;
  s.outcome = "player_win";
  return s;
}

describe("起始档案", () => {
  it("各角色技能栏预装基础秘卷；wind_mage 无横向推击（第一关掉落）", () => {
    const save = initialSaveData();
    expect(save.version).toBe(SAVE_VERSION);

    const wind = unitProgress(save.profile, "wind_mage")!;
    expect(wind.skillSlots).toHaveLength(SKILL_SLOT_COUNT);
    expect(skillIdsOf(wind.skillSlots, tables.items)).toEqual(["wind_blade", "gale_gather"]);
    expect(skillIdsOf(wind.skillSlots, tables.items)).not.toContain("push_wave");

    // lancer 登场即会招牌技 pierce_shot，否则第 3 战贯穿教学无法完成。
    expect(skillIdsOf(unitProgress(save.profile, "lancer")!.skillSlots, tables.items)).toEqual(["sweep", "pierce_shot"]);
    // 剑客起手带破甲刺（第 4 战破甲教学）；冰法师仅基础技。
    expect(skillIdsOf(unitProgress(save.profile, "swordsman")!.skillSlots, tables.items)).toEqual(["crescent_slash", "guard_break"]);
    expect(skillIdsOf(unitProgress(save.profile, "ice_mage")!.skillSlots, tables.items)).toEqual(["frost_bolt"]);

    // 起始背包预置装备与消耗品（开箱即用）。
    expect(save.profile.inventory).toEqual(["iron_sword", "leather_armor", "minor_potion", "minor_potion", "purify_herb"]);
    expect(save.profile.storyNodeId).toBe("n_title");
  });
});

describe("loadout：buildBattleState 复用 loadLevel + 按档案打补丁", () => {
  it("玩家单位 skills 来自技能栏；敌方与 loadLevel 基线一致；满血", () => {
    const save = initialSaveData();
    const built = buildBattleState(save.profile, getLevel("level_001"), registry, tables);
    const baseline = loadLevel(getLevel("level_001"), registry);

    // level_001 火法师单人出战。
    const fireBuilt = built.units.find((u) => u.defId === "fire_mage")!;
    expect(fireBuilt.skills).toEqual(["fire_bolt", "cross_fire"]);
    expect(fireBuilt.hp).toBe(fireBuilt.maxHp);
    expect(fireBuilt.hp).toBe(fireBuilt.stats.hp);

    // 敌方单位 stats/skills 与基线深等
    const enemyBuilt = built.units.filter((u) => u.faction === "enemy").map((u) => ({ defId: u.defId, stats: u.stats, skills: u.skills }));
    const enemyBase = baseline.units.filter((u) => u.faction === "enemy").map((u) => ({ defId: u.defId, stats: u.stats, skills: u.skills }));
    expect(enemyBuilt).toEqual(enemyBase);

    expect(built.board.width).toBe(resolveBoardData(getLevel("level_001").board).width);
  });

  it("装备加成生效：疾风护符 +速度；活力宝石 +生命上限", () => {
    const save = initialSaveData();
    const fire = unitProgress(save.profile, "fire_mage")!;
    const base = registry.unit("fire_mage").stats;
    fire.equipped.accessory = "swift_charm";
    const built = buildBattleState(save.profile, getLevel("level_001"), registry, tables);
    const fireBuilt = built.units.find((u) => u.defId === "fire_mage")!;
    expect(fireBuilt.stats.speed).toBe(base.speed + 15);

    fire.equipped.armor = "vitality_gem";
    const built2 = buildBattleState(save.profile, getLevel("level_001"), registry, tables);
    const fireBuilt2 = built2.units.find((u) => u.defId === "fire_mage")!;
    expect(fireBuilt2.maxHp).toBe(base.hp + 20);
    expect(fireBuilt2.hp).toBe(fireBuilt2.maxHp);
  });

  it("整备换技能反映到装配：卸下十字火焰后战斗中不再拥有", () => {
    const save = initialSaveData();
    const fire = unitProgress(save.profile, "fire_mage")!;
    fire.skillSlots[1] = null; // 卸下 tome_cross_fire（测试直接改档案，UI 路径见 campaign.test）
    const built = buildBattleState(save.profile, getLevel("level_001"), registry, tables);
    expect(built.units.find((u) => u.defId === "fire_mage")!.skills).toEqual(["fire_bolt"]);
  });

  it("不修改传入的 profile，也不污染 registry 的共享 def", () => {
    const save = initialSaveData();
    const snapshot = JSON.stringify(save.profile);
    const defBefore = JSON.stringify(registry.unit("wind_mage").stats);
    buildBattleState(save.profile, getLevel("level_001"), registry, tables);
    expect(JSON.stringify(save.profile)).toBe(snapshot);
    expect(JSON.stringify(registry.unit("wind_mage").stats)).toBe(defBefore);
  });
});

describe("敌人固定属性（enemyStatOverrides 烘焙）", () => {
  it("level_004 起敌人吃覆盖值；level_001 用基础值", () => {
    const save = initialSaveData();
    const baseSoldier = registry.unit("enemy_soldier").stats;

    const built4 = buildBattleState(save.profile, getLevel("level_004"), registry, tables);
    const soldier4 = built4.units.find((u) => u.faction === "enemy" && u.defId === "enemy_soldier")!;
    expect(soldier4.stats.hp).toBe(88);
    expect(soldier4.stats.attack).toBe(20);
    expect(soldier4.stats.defense).toBe(7);
    expect(soldier4.maxHp).toBe(88);
    expect(soldier4.hp).toBe(soldier4.maxHp);
    // 未覆盖的字段保持基础值。
    expect(soldier4.stats.moveRange).toBe(baseSoldier.moveRange);

    const built1 = buildBattleState(save.profile, getLevel("level_001"), registry, tables);
    const soldier1 = built1.units.find((u) => u.faction === "enemy" && u.defId === "enemy_soldier")!;
    expect(soldier1.stats).toEqual(baseSoldier);
  });

  it("loadLevel 直连（调试模式）同样生效", () => {
    const direct = loadLevel(getLevel("level_004"), registry);
    const soldier = direct.units.find((u) => u.faction === "enemy" && u.defId === "enemy_soldier")!;
    expect(soldier.stats.hp).toBe(88);
    // 玩家单位不受 enemyStatOverrides 影响。
    for (const u of direct.units.filter((x) => x.faction === "player")) {
      expect(u.stats).toEqual(registry.unit(u.defId).stats);
    }
  });
});

describe("loadout 可实战", () => {
  it("buildBattleState 生成的状态能被驱动到分出胜负（不卡死）", () => {
    const save = initialSaveData();
    const final = runToOutcome(buildBattleState(save.profile, getLevel("level_001"), registry, tables), registry);
    expect(final.outcome).not.toBeNull();
  });
});

describe("奖励结算（确定性胜利态）", () => {
  it("computeRewards：固定掉落必得 + 随机掉落按 rolls 数量；失败无掉落", () => {
    const save = initialSaveData();
    const final = wonState(save.profile, "level_001");
    const spec = tables.levelRewards["level_001"];
    const rewards = computeRewards(getLevel("level_001"), final, tables.levelRewards, tables.items, mulberry32(1));
    expect(rewards.win).toBe(true);
    // 固定掉落（秘卷）在最前，且必然包含。
    expect(rewards.itemDrops.slice(0, spec.guaranteedDrops.length)).toEqual(spec.guaranteedDrops);
    // 随机掉落追加 rolls 件，全部是有效物品 id。
    expect(rewards.itemDrops.length).toBe(spec.guaranteedDrops.length + spec.randomDrops!.rolls);
    for (const id of rewards.itemDrops) expect(tables.items[id]).toBeTruthy();

    const lost = wonState(save.profile, "level_001");
    lost.outcome = "enemy_win";
    const noRewards = computeRewards(getLevel("level_001"), lost, tables.levelRewards, tables.items, mulberry32(1));
    expect(noRewards.win).toBe(false);
    expect(noRewards.itemDrops).toEqual([]);
  });

  it("computeRewards：同种子结果完全一致，异种子结果分化（可复现的随机）", () => {
    const save = initialSaveData();
    const final = wonState(save.profile, "level_008");
    const a = computeRewards(getLevel("level_008"), final, tables.levelRewards, tables.items, mulberry32(42));
    const b = computeRewards(getLevel("level_008"), final, tables.levelRewards, tables.items, mulberry32(42));
    const c = computeRewards(getLevel("level_008"), final, tables.levelRewards, tables.items, mulberry32(43));
    expect(a.itemDrops).toEqual(b.itemDrops);
    // 高稀有度关卡多次抽取，几乎不可能与另一种子完全相同。
    expect(a.itemDrops).not.toEqual(c.itemDrops);
  });

  it("随机掉落只产出装备/消耗品，从不产出秘卷（秘卷全走固定掉落）", () => {
    const save = initialSaveData();
    const final = wonState(save.profile, "level_009");
    const spec = tables.levelRewards["level_009"];
    for (let seed = 0; seed < 40; seed++) {
      const rewards = computeRewards(getLevel("level_009"), final, tables.levelRewards, tables.items, mulberry32(seed));
      const randomPart = rewards.itemDrops.slice(spec.guaranteedDrops.length);
      for (const id of randomPart) {
        const def = tables.items[id];
        expect(isEquip(def) || isConsumable(def), `${id} 不应出现在随机掉落`).toBe(true);
        expect(isSkillItem(def)).toBe(false);
      }
    }
  });

  it("applyRewards：掉落入背包；技能秘卷自动装备到风术士空格并记录", () => {
    const save = initialSaveData();
    const final = wonState(save.profile, "level_001");
    const rewards = computeRewards(getLevel("level_001"), final, tables.levelRewards, tables.items, mulberry32(1));
    const { profile, autoEquipped } = applyRewards(save.profile, rewards, tables.items);

    // 秘卷（固定掉落）装走后不在背包；随机掉落的装备/消耗品留在背包。
    expect(profile.inventory).not.toContain("tome_push_wave");
    const randomPart = rewards.itemDrops.slice(rewards.itemDrops.indexOf("tome_push_wave") + 1);
    for (const id of randomPart) expect(profile.inventory).toContain(id);

    const wind = unitProgress(profile, "wind_mage")!;
    expect(wind.skillSlots).toContain("tome_push_wave");
    expect(skillIdsOf(wind.skillSlots, tables.items)).toContain("push_wave");
    expect(autoEquipped).toEqual([{ itemId: "tome_push_wave", defId: "wind_mage" }]);

    // 不改入参。
    expect(unitProgress(save.profile, "wind_mage")!.skillSlots).not.toContain("tome_push_wave");
    expect(save.profile.inventory).not.toContain("tome_push_wave");
  });
});

describe("两场可观测：新技能 + 装备在下一场生效", () => {
  it("打完第一关，第二关 wind_mage 拥有横向推击且装备生效", () => {
    const save = initialSaveData();
    const final = wonState(save.profile, "level_001");
    const rewards = computeRewards(getLevel("level_001"), final, tables.levelRewards, tables.items, mulberry32(1));
    const { profile: profile2 } = applyRewards(save.profile, rewards, tables.items);
    unitProgress(profile2, "wind_mage")!.equipped.accessory = "swift_charm"; // 手动装上疾风护符验证加成

    const built2 = buildBattleState(profile2, getLevel("level_002"), registry, tables);
    const windBuilt = built2.units.find((u) => u.defId === "wind_mage")!;
    expect(windBuilt.skills).toContain("push_wave");
    expect(windBuilt.stats.speed).toBe(registry.unit("wind_mage").stats.speed + 15);
  });
});

describe("数据一致性：技能秘卷 / 掉落表 / 敌人覆盖表", () => {
  const playerDefIds = ["wind_mage", "fire_mage", "lancer", "swordsman", "ice_mage"];
  const skillItems = Object.values(tables.items).filter(isSkillItem);

  it("每个技能秘卷的 skillId 存在于注册表，usableBy 与 UnitDef.skills 一致", () => {
    expect(skillItems.length).toBeGreaterThan(0);
    for (const it of skillItems) {
      expect(it.skillId, it.id).toBeTruthy();
      expect(registry.hasSkill(it.skillId!), `${it.id} 的技能 ${it.skillId} 不存在`).toBe(true);
      expect(it.usableBy?.length, `${it.id} 缺 usableBy`).toBeTruthy();
      for (const defId of it.usableBy!) {
        expect(registry.unit(defId).skills, `${defId} 的技能全集不含 ${it.skillId}`).toContain(it.skillId);
      }
    }
  });

  it("玩家全部技能恰好各有一个秘卷（不多不少）", () => {
    const allSkills = new Set(playerDefIds.flatMap((id) => registry.unit(id).skills));
    const tomeSkills = skillItems.map((it) => it.skillId!);
    expect(new Set(tomeSkills).size).toBe(tomeSkills.length); // 每技能唯一秘卷
    expect(new Set(tomeSkills)).toEqual(allSkills);
  });

  it("起始预装 ∪ 关卡掉落 ⊇ 全部技能（21 技全可获得），掉落 id 全部存在", () => {
    const save = initialSaveData();
    const obtainable = new Set<string>();
    for (const up of save.profile.units) {
      for (const s of skillIdsOf(up.skillSlots, tables.items)) obtainable.add(s);
    }
    for (const reward of Object.values(tables.levelRewards)) {
      for (const id of reward.guaranteedDrops) {
        const def = tables.items[id];
        expect(def, `掉落 ${id} 不存在于物品表`).toBeTruthy();
        if (isSkillItem(def)) obtainable.add(def.skillId!);
      }
    }
    const allSkills = new Set(playerDefIds.flatMap((id) => registry.unit(id).skills));
    expect(obtainable).toEqual(allSkills);
  });

  it("破甲刺秘卷共 2 份（剑客起手 + 第 6 关掉落给枪兵）", () => {
    const save = initialSaveData();
    const startCount = save.profile.units.flatMap((u) => u.skillSlots).filter((id) => id === "tome_guard_break").length;
    const dropCount = Object.values(tables.levelRewards)
      .flatMap((r) => r.guaranteedDrops)
      .filter((id) => id === "tome_guard_break").length;
    expect(startCount + dropCount).toBe(2);
  });

  it("levels.json 的 enemyStatOverrides 只覆盖本关真实出现的敌方 defId", () => {
    for (const lv of levels) {
      if (!lv.enemyStatOverrides) continue;
      const present = new Set(lv.enemyUnits.map((u) => u.unitId));
      for (const defId of Object.keys(lv.enemyStatOverrides)) {
        expect(registry.unit(defId).faction, `${lv.id} 覆盖了非敌方单位 ${defId}`).toBe("enemy");
        expect(present.has(defId), `${lv.id} 覆盖了未出场的 ${defId}`).toBe(true);
      }
    }
  });
});

describe("剧情发展树", () => {
  it("线性推进直达结局", () => {
    const graph = tables.story;
    expect(advance(graph, "n_title")).toBe("n_cut_1");
    let id: string | null = graph.startId;
    const seen: string[] = [];
    let guard = 0;
    while (id && guard++ < 50) {
      seen.push(id);
      id = advance(graph, id);
    }
    expect(seen).toContain("n_battle_1");
    expect(seen).toContain("n_battle_2");
    expect(seen[seen.length - 1]).toBe("n_ending");
    expect(isTerminal(graph, "n_ending")).toBe(true);
  });

  it("nodeById 未知节点抛错", () => {
    expect(() => nodeById(tables.story, "nope")).toThrow();
  });
});

describe("存档序列化", () => {
  it("往返一致；坏版本抛错（含旧版 v3）", () => {
    const save = initialSaveData();
    const round = deserialize(serialize(save));
    expect(round).toEqual(save);
    expect(() => deserialize('{"version":99,"profile":{}}')).toThrow();
    expect(() => deserialize('{"version":3,"profile":{"units":[]}}')).toThrow(); // 旧档不迁移
    expect(() => deserialize("not json")).toThrow();
  });

  it("cloneProfile 深拷贝不共享引用", () => {
    const p = initialSaveData().profile;
    const c = cloneProfile(p);
    c.units[0].skillSlots[4] = "tome_cyclone";
    c.inventory.push("x");
    expect(p.units[0].skillSlots[4]).toBeNull();
    expect(p.inventory).not.toContain("x");
  });
});

// 触达 UnitStats 类型导出，确保 barrel 暴露（编译期校验）。
const _statsKeys: (keyof UnitStats)[] = ["hp", "attack", "magic", "defense", "moveRange", "speed"];
void _statsKeys;

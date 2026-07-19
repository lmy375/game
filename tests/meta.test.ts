import { describe, it, expect } from "vitest";
import { createRegistry, getLevel } from "@data/index";
import { loadMetaTables, initialSaveData, migrateLegacySave } from "@data/metaIndex";
import {
  buildBattleState,
  computeRewards,
  applyRewards,
  gainXp,
  levelForXp,
  statsForLevel,
  applyLevelUps,
  allocatePoint,
  levelUpNewcomers,
  unitProgress,
  serialize,
  deserialize,
  advance,
  nodeById,
  isTerminal,
  cloneProfile,
} from "@meta/index";
import { loadLevel, livingUnits, UnitStats } from "@core/index";
import { runToOutcome } from "./helpers";

const registry = createRegistry();
const tables = loadMetaTables();

/** 用真实 loadout 装配某关，再确定性地标记为玩家胜利（杀光敌方）——用于稳定测试奖励/升级逻辑，
 *  不依赖朴素 bot 是否打赢（朴素 bot 可能输，见 battle.test「完整对局可推进」只断言有结果）。 */
function wonState(profile: ReturnType<typeof initialSaveData>["profile"], levelId: string) {
  const s = buildBattleState(profile, getLevel(levelId), registry, tables);
  for (const u of s.units) if (u.faction === "enemy") u.hp = 0;
  s.outcome = "player_win";
  return s;
}

describe("起始档案", () => {
  it("wind_mage 起手仅 wind_blade/gale_gather（无 push_wave），lancer 起手 sweep/pierce_shot", () => {
    const save = initialSaveData();
    const wind = unitProgress(save.profile, "wind_mage")!;
    expect(wind.learnedSkills).toEqual(["wind_blade", "gale_gather"]);
    expect(wind.learnedSkills).not.toContain("push_wave");
    // lancer 登场即会招牌技 pierce_shot（与另两名角色的招牌技预置对齐），否则第 3 战贯穿教学无法完成。
    expect(unitProgress(save.profile, "lancer")!.learnedSkills).toEqual(["sweep", "pierce_shot"]);
    // 起始背包预置装备与消耗品（开箱即用）。
    expect(save.profile.inventory).toEqual(["iron_sword", "leather_armor", "minor_potion", "minor_potion", "purify_herb"]);
    expect(save.profile.storyNodeId).toBe("n_title");
    expect(save.version).toBe(3);
  });
});

describe("等级体系", () => {
  it("levelForXp 边界（20 级曲线）", () => {
    const curve = tables.progression.xpCurve;
    expect(curve.maxLevel).toBe(20);
    expect(levelForXp(0, curve)).toBe(1);
    expect(levelForXp(curve.xpToReach[2] - 1, curve)).toBe(1);
    expect(levelForXp(curve.xpToReach[2], curve)).toBe(2);
    expect(levelForXp(curve.xpToReach[3], curve)).toBe(3);
    expect(levelForXp(curve.xpToReach[20], curve)).toBe(20);
    expect(levelForXp(999999, curve)).toBe(20); // 封顶不越界
  });

  it("gainXp 累加且不改入参", () => {
    const up = unitProgress(initialSaveData().profile, "wind_mage")!;
    const next = gainXp(up, 120);
    expect(next.xp).toBe(120);
    expect(up.xp).toBe(0); // 入参不变
  });

  it("statsForLevel：1 级=基础，升级按成长叠加", () => {
    const base = registry.unit("wind_mage").stats;
    expect(statsForLevel(base, "wind_mage", 1, tables.progression.growth)).toEqual(base);
    const lv2 = statsForLevel(base, "wind_mage", 2, tables.progression.growth);
    expect(lv2.magic).toBe(base.magic + 4);
    expect(lv2.hp).toBe(base.hp + 8);
    expect(lv2.speed).toBe(base.speed + 1);
  });

  it("applyLevelUps 解锁技能（含一次跨多级）", () => {
    const wind = gainXp(unitProgress(initialSaveData().profile, "wind_mage")!, 120);
    const r = applyLevelUps(wind, tables.progression);
    expect(r.fromLevel).toBe(1);
    expect(r.toLevel).toBe(2);
    expect(r.unlockedSkills).toContain("push_wave");
    expect(r.progress.learnedSkills).toContain("push_wave");

    // lancer 起手已预置 sweep/pierce_shot，跨级升到 5 级 → 仅新解锁 swap_skill(L3)，
    // 而已会的技能不应被重复解锁。
    const lancer = gainXp(unitProgress(initialSaveData().profile, "lancer")!, 540);
    const lr = applyLevelUps(lancer, tables.progression);
    expect(lr.toLevel).toBe(5);
    expect(lr.unlockedSkills).toEqual(["swap_skill"]);
    expect(lr.progress.learnedSkills).toContain("swap_skill");
  });

  it("applyLevelUps：升级授予属性点 + 技能升级（fire_mage 升到 5 级 cross_fire +1）", () => {
    const curve = tables.progression.xpCurve;
    // fire_mage 升到 5 级：跨 4 级 → 4 * pointsPerLevel 点。
    const fire = gainXp(unitProgress(initialSaveData().profile, "fire_mage")!, curve.xpToReach[5]);
    const r = applyLevelUps(fire, tables.progression);
    expect(r.toLevel).toBe(5);
    expect(r.pointsGranted).toBe(4 * tables.progression.pointsPerLevel);
    expect(r.progress.unspentPoints).toBe(4 * tables.progression.pointsPerLevel);
    // skillGrowth: fire_mage 在 5 级给 cross_fire +1。
    expect(r.skillLevelUps).toContain("cross_fire");
    expect(r.progress.skillLevels["cross_fire"]).toBe(2);
    // unlocks: fire_bolt 为起手基础技；6 级 flame_wall 未到。
    expect(r.progress.learnedSkills).toContain("fire_bolt");
    expect(r.progress.learnedSkills).not.toContain("flame_wall");
  });

  it("allocatePoint：消耗点数、写入 allocated；无点数原样返回", () => {
    const base = unitProgress(initialSaveData().profile, "wind_mage")!;
    const withPoints = { ...cloneProfileUnit(base), unspentPoints: 2 };
    const once = allocatePoint(withPoints, "attack");
    expect(once.unspentPoints).toBe(1);
    expect(once.allocated.attack).toBe(1);
    const twice = allocatePoint(once, "attack");
    expect(twice.allocated.attack).toBe(2);
    expect(twice.unspentPoints).toBe(0);
    // 无点数：原样返回同引用。
    expect(allocatePoint(twice, "attack")).toBe(twice);
    // 不改入参。
    expect(withPoints.unspentPoints).toBe(2);
  });
});

/** 小工具：克隆一个 UnitProgress（避免直接改档案）。 */
function cloneProfileUnit<T>(u: T): T {
  return JSON.parse(JSON.stringify(u)) as T;
}

describe("loadout：buildBattleState 复用 loadLevel + 按档案打补丁", () => {
  it("玩家单位 skills==learnedSkills；敌方与 loadLevel 基线一致；满血", () => {
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

    expect(built.board.width).toBe(getLevel("level_001").board.width);
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

  it("不修改传入的 profile，也不污染 registry 的共享 def", () => {
    const save = initialSaveData();
    const snapshot = JSON.stringify(save.profile);
    const defBefore = JSON.stringify(registry.unit("wind_mage").stats);
    buildBattleState(save.profile, getLevel("level_001"), registry, tables);
    expect(JSON.stringify(save.profile)).toBe(snapshot);
    expect(JSON.stringify(registry.unit("wind_mage").stats)).toBe(defBefore);
  });
});

describe("loadout：新机制装配", () => {
  it("敌人按关卡 enemyLevel 缩放（level_002 enemyLevel=2）", () => {
    const save = initialSaveData();
    const baseSoldier = registry.unit("enemy_soldier").stats;
    const built = buildBattleState(save.profile, getLevel("level_002"), registry, tables);
    const soldier = built.units.find((u) => u.faction === "enemy" && u.defId === "enemy_soldier")!;
    // enemyGrowth.enemy_soldier.hp=8 → 2 级 = base + 8。
    expect(soldier.level).toBe(2);
    expect(soldier.stats.hp).toBe(baseSoldier.hp + 8);
    expect(soldier.maxHp).toBe(baseSoldier.hp + 8);
    expect(soldier.hp).toBe(soldier.maxHp);
    // level_001 无 enemyLevel → 不缩放。
    const built1 = buildBattleState(save.profile, getLevel("level_001"), registry, tables);
    const soldier1 = built1.units.find((u) => u.faction === "enemy" && u.defId === "enemy_soldier")!;
    expect(soldier1.level).toBe(1);
    expect(soldier1.stats.hp).toBe(baseSoldier.hp);
  });

  it("玩家手动加点叠加在等级成长之上；skillLevels 注入战斗单位", () => {
    const save = initialSaveData();
    const fire = unitProgress(save.profile, "fire_mage")!;
    const base = registry.unit("fire_mage").stats;
    fire.allocated = { attack: 5 };
    fire.skillLevels = { fire_bolt: 3 };
    const built = buildBattleState(save.profile, getLevel("level_001"), registry, tables);
    const fireBuilt = built.units.find((u) => u.defId === "fire_mage")!;
    expect(fireBuilt.stats.attack).toBe(base.attack + 5); // 1 级成长为 0，仅加点
    expect(fireBuilt.skillLevels.fire_bolt).toBe(3);
    expect(fireBuilt.level).toBe(1);
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
  it("computeRewards：胜利掉落 swift_charm + 每个幸存者 120 经验", () => {
    const save = initialSaveData();
    const final = wonState(save.profile, "level_001");
    const rewards = computeRewards(getLevel("level_001"), final, tables.levelRewards);
    expect(rewards.win).toBe(true);
    expect(rewards.itemDrops).toEqual(["swift_charm", "minor_potion"]);
    const survivors = livingUnits(final, "player").map((u) => u.defId);
    expect(survivors.length).toBeGreaterThan(0);
    for (const defId of survivors) expect(rewards.xpByDefId[defId]).toBe(120);
  });

  it("applyRewards 端到端：wind_mage 升 2 级 + 解锁 push_wave + 掉落入背包", () => {
    const save = initialSaveData();
    // 第二关火法师 + 风术士出战，胜利后风术士升级解锁 push_wave。
    const final = wonState(save.profile, "level_002");
    const rewards = computeRewards(getLevel("level_002"), final, tables.levelRewards);
    const { profile, levelUps } = applyRewards(save.profile, rewards, final, tables);

    const wind = unitProgress(profile, "wind_mage")!;
    expect(wind.level).toBe(2);
    expect(wind.learnedSkills).toContain("push_wave");
    expect(profile.inventory).toContain("oak_staff");
    expect(levelUps.length).toBeGreaterThan(0);
    expect(unitProgress(save.profile, "wind_mage")!.level).toBe(1); // 不改入参
  });
});

describe("两场可观测：新技能 + 装备在下一场生效", () => {
  it("打完第二关、装备掉落后，第三关 wind_mage 拥有 push_wave 且速度更高", () => {
    const save = initialSaveData();
    const final = wonState(save.profile, "level_002");
    const rewards = computeRewards(getLevel("level_002"), final, tables.levelRewards);
    const { profile: profile2 } = applyRewards(save.profile, rewards, final, tables);
    unitProgress(profile2, "wind_mage")!.equipped.accessory = "swift_charm"; // 装备疾风护符

    const built3 = buildBattleState(profile2, getLevel("level_003"), registry, tables);
    const windBuilt = built3.units.find((u) => u.defId === "wind_mage")!;
    expect(windBuilt.skills).toContain("push_wave");
    expect(windBuilt.stats.speed).toBeGreaterThan(registry.unit("wind_mage").stats.speed);
  });
});

describe("新成员入队按平均等级补齐（技能自然解锁、留成长空间）", () => {
  it("冰法师入队被拉到老兵平均级，解锁至该级、高级技能仍锁", () => {
    const save = initialSaveData();
    const curve = tables.progression.xpCurve;
    // 老兵：火法师 5 级、风术士 3 级；冰法师仍是未出战的 1 级。
    const fire = unitProgress(save.profile, "fire_mage")!;
    Object.assign(fire, applyLevelUps(gainXp(fire, curve.xpToReach[5]), tables.progression).progress);
    const wind = unitProgress(save.profile, "wind_mage")!;
    Object.assign(wind, applyLevelUps(gainXp(wind, curve.xpToReach[3]), tables.progression).progress);

    const bumped = levelUpNewcomers(save.profile, getLevel("level_005"), tables.progression);
    const ice = unitProgress(bumped, "ice_mage")!;
    expect(ice.level).toBe(4); // round((5+3)/2)=4
    expect(ice.learnedSkills).toContain("freeze"); // freeze@3 ≤ 4，自然解锁
    expect(ice.learnedSkills).not.toContain("blizzard"); // blizzard@6 仍锁 → 成长空间
    expect(ice.learnedSkills).not.toContain("frost_nova"); // frost_nova@10 仍锁
    expect(ice.unspentPoints).toBe((4 - 1) * tables.progression.pointsPerLevel);
    expect(unitProgress(save.profile, "ice_mage")!.level).toBe(1); // 不改入参
  });

  it("首关无老兵（无 xp>0 单位）时不补偿", () => {
    const save = initialSaveData();
    expect(levelUpNewcomers(save.profile, getLevel("level_001"), tables.progression)).toBe(save.profile);
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
  it("往返一致；坏版本抛错", () => {
    const save = initialSaveData();
    const round = deserialize(serialize(save));
    expect(round).toEqual(save);
    expect(() => deserialize('{"version":99,"profile":{}}')).toThrow();
    expect(() => deserialize("not json")).toThrow();
  });

  it("v2 存档迁移：剔除普攻、补入基础技、普攻技能等级转移到基础技", () => {
    const legacy = JSON.parse(JSON.stringify(initialSaveData())) as { version: number; profile: { units: Array<{ defId: string; learnedSkills: string[]; skillLevels: Record<string, number> }> } };
    legacy.version = 2;
    const wind = legacy.profile.units.find((u) => u.defId === "wind_mage")!;
    wind.learnedSkills = ["normal_attack", "gale_gather", "push_wave"];
    wind.skillLevels = { normal_attack: 3, gale_gather: 2 };
    const lancer = legacy.profile.units.find((u) => u.defId === "lancer")!;
    lancer.learnedSkills = ["normal_attack", "pierce_shot", "sweep"]; // 旧档已解锁 sweep：不应重复补入

    const migrated = migrateLegacySave(legacy)!;
    expect(migrated.version).toBe(3);
    const w = unitProgress(migrated.profile, "wind_mage")!;
    expect(w.learnedSkills).toEqual(["wind_blade", "gale_gather", "push_wave"]);
    expect(w.skillLevels).toEqual({ wind_blade: 3, gale_gather: 2 }); // 普攻等级转移到基础技
    const l = unitProgress(migrated.profile, "lancer")!;
    expect(l.learnedSkills).toEqual(["pierce_shot", "sweep"]);
    // 迁移产物可直接装配战斗（所有技能 id 均有效）。
    const built = buildBattleState(migrated.profile, getLevel("level_003"), registry, tables);
    for (const u of built.units) for (const id of u.skills) expect(registry.hasSkill(id)).toBe(true);
  });

  it("migrateLegacySave 对非 v2 结构返回 null", () => {
    expect(migrateLegacySave(null)).toBeNull();
    expect(migrateLegacySave({ version: 1, profile: {} })).toBeNull();
    expect(migrateLegacySave({ version: 3, profile: { units: [] } })).toBeNull();
  });

  it("cloneProfile 深拷贝不共享引用", () => {
    const p = initialSaveData().profile;
    const c = cloneProfile(p);
    c.units[0].learnedSkills.push("x");
    expect(p.units[0].learnedSkills).not.toContain("x");
  });
});

// 触达 UnitStats 类型导出，确保 barrel 暴露（编译期校验）。
const _statsKeys: (keyof UnitStats)[] = ["hp", "attack", "magic", "defense", "moveRange", "speed"];
void _statsKeys;

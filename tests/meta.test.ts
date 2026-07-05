import { describe, it, expect } from "vitest";
import { createRegistry, getLevel } from "@data/index";
import { loadMetaTables, initialSaveData } from "@data/metaIndex";
import {
  buildBattleState,
  computeRewards,
  applyRewards,
  gainXp,
  levelForXp,
  statsForLevel,
  applyLevelUps,
  allocatePoint,
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
  it("wind_mage 起手仅 normal_attack/gale_gather（无 push_wave），lancer 起手 normal_attack/pierce_shot", () => {
    const save = initialSaveData();
    const wind = unitProgress(save.profile, "wind_mage")!;
    expect(wind.learnedSkills).toEqual(["normal_attack", "gale_gather"]);
    expect(wind.learnedSkills).not.toContain("push_wave");
    // lancer 登场即会招牌技 pierce_shot（与另两名角色的招牌技预置对齐），否则第 2 战贯穿教学无法完成。
    expect(unitProgress(save.profile, "lancer")!.learnedSkills).toEqual(["normal_attack", "pierce_shot"]);
    // 起始背包预置装备与消耗品（开箱即用）。
    expect(save.profile.inventory).toEqual(["iron_sword", "leather_armor", "minor_potion", "minor_potion", "purify_herb"]);
    expect(save.profile.storyNodeId).toBe("n_title");
    expect(save.version).toBe(2);
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

    // lancer 起手已预置 pierce_shot（L2 技能），跨级升到 5 级 → 新解锁 swap_skill(L3)+sweep(L5)，
    // 而已会的 pierce_shot 不应被重复解锁。
    const lancer = gainXp(unitProgress(initialSaveData().profile, "lancer")!, 540);
    const lr = applyLevelUps(lancer, tables.progression);
    expect(lr.toLevel).toBe(5);
    expect(lr.unlockedSkills).toEqual(expect.arrayContaining(["swap_skill", "sweep"]));
    expect(lr.unlockedSkills).not.toContain("pierce_shot");
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
    // unlocks: 3 级 fire_bolt、6 级 flame_wall（未到）。
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

    const windBuilt = built.units.find((u) => u.defId === "wind_mage")!;
    expect(windBuilt.skills).toEqual(["normal_attack", "gale_gather"]);
    expect(windBuilt.hp).toBe(windBuilt.maxHp);
    expect(windBuilt.hp).toBe(windBuilt.stats.hp);

    // 敌方单位 stats/skills 与基线深等
    const enemyBuilt = built.units.filter((u) => u.faction === "enemy").map((u) => ({ defId: u.defId, stats: u.stats, skills: u.skills }));
    const enemyBase = baseline.units.filter((u) => u.faction === "enemy").map((u) => ({ defId: u.defId, stats: u.stats, skills: u.skills }));
    expect(enemyBuilt).toEqual(enemyBase);

    expect(built.board.width).toBe(getLevel("level_001").board.width);
  });

  it("装备加成生效：疾风护符 +速度；活力宝石 +生命上限", () => {
    const save = initialSaveData();
    const wind = unitProgress(save.profile, "wind_mage")!;
    wind.equipped.accessory = "swift_charm";
    const base = registry.unit("wind_mage").stats;
    const built = buildBattleState(save.profile, getLevel("level_001"), registry, tables);
    const windBuilt = built.units.find((u) => u.defId === "wind_mage")!;
    expect(windBuilt.stats.speed).toBe(base.speed + 15);

    const fire = unitProgress(save.profile, "fire_mage")!;
    fire.equipped.armor = "vitality_gem";
    const built2 = buildBattleState(save.profile, getLevel("level_001"), registry, tables);
    const fireBuilt = built2.units.find((u) => u.defId === "fire_mage")!;
    expect(fireBuilt.maxHp).toBe(registry.unit("fire_mage").stats.hp + 20);
    expect(fireBuilt.hp).toBe(fireBuilt.maxHp);
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
    const wind = unitProgress(save.profile, "wind_mage")!;
    const base = registry.unit("wind_mage").stats;
    wind.allocated = { attack: 5 };
    wind.skillLevels = { normal_attack: 3 };
    const built = buildBattleState(save.profile, getLevel("level_001"), registry, tables);
    const windBuilt = built.units.find((u) => u.defId === "wind_mage")!;
    expect(windBuilt.stats.attack).toBe(base.attack + 5); // 1 级成长为 0，仅加点
    expect(windBuilt.skillLevels.normal_attack).toBe(3);
    expect(windBuilt.level).toBe(1);
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

  it("applyRewards 端到端：wind_mage 升 2 级 + 解锁 push_wave + swift_charm 入背包", () => {
    const save = initialSaveData();
    const final = wonState(save.profile, "level_001");
    const rewards = computeRewards(getLevel("level_001"), final, tables.levelRewards);
    const { profile, levelUps } = applyRewards(save.profile, rewards, final, tables);

    const wind = unitProgress(profile, "wind_mage")!;
    expect(wind.level).toBe(2);
    expect(wind.learnedSkills).toContain("push_wave");
    expect(profile.inventory).toContain("swift_charm");
    expect(levelUps.length).toBeGreaterThan(0);
    expect(unitProgress(save.profile, "wind_mage")!.level).toBe(1); // 不改入参
  });
});

describe("两场可观测：新技能 + 装备在第二场生效", () => {
  it("打完第一关、装备掉落后，第二关 wind_mage 拥有 push_wave 且速度更高", () => {
    const save = initialSaveData();
    const final = wonState(save.profile, "level_001");
    const rewards = computeRewards(getLevel("level_001"), final, tables.levelRewards);
    const { profile: profile2 } = applyRewards(save.profile, rewards, final, tables);
    unitProgress(profile2, "wind_mage")!.equipped.accessory = "swift_charm"; // 装备掉落的疾风护符

    const built2 = buildBattleState(profile2, getLevel("level_002"), registry, tables);
    const windBuilt = built2.units.find((u) => u.defId === "wind_mage")!;
    expect(windBuilt.skills).toContain("push_wave");
    expect(windBuilt.stats.speed).toBeGreaterThan(registry.unit("wind_mage").stats.speed);
  });
});

describe("剧情发展树", () => {
  it("线性推进直达结局", () => {
    const graph = tables.story;
    expect(advance(graph, "n_title")).toBe("n_cut_intro");
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

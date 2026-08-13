/**
 * 全量游戏数据校验：在 JSON 被注册表/字典吞掉重复项之前，集中检查结构、数值与跨表引用。
 * 默认校验仓库内置数据；测试和工具也可传入自定义数据包。
 */
import {
  GridBoard,
  LevelDef,
  PatternDef,
  SkillDef,
  UnitDef,
  resolveBoardData,
} from "@core/index";
import {
  ItemDef,
  LevelReward,
  RARITIES,
  RewardTable,
  StoryGraph,
} from "@meta/index";
import patternsRaw from "./patterns.json";
import skillsRaw from "./skills.json";
import unitsRaw from "./units.json";
import levelsRaw from "./levels.json";
import itemsRaw from "./items.json";
import levelRewardsRaw from "./levelRewards.json";
import storyRaw from "./story.json";

export interface GameDataValidationInput {
  patterns: PatternDef[];
  skills: SkillDef[];
  units: UnitDef[];
  levels: LevelDef[];
  items: ItemDef[];
  levelRewards: RewardTable;
  story: StoryGraph;
}

export interface GameDataIssue {
  path: string;
  message: string;
}

export class GameDataValidationError extends Error {
  constructor(readonly issues: readonly GameDataIssue[]) {
    super(`游戏数据校验失败（${issues.length} 项）:\n${issues.map((i) => `- ${i.path}: ${i.message}`).join("\n")}`);
    this.name = "GameDataValidationError";
  }
}

let bundledValidationComplete = false;

/** 返回内置 JSON 的强类型视图。校验器会在运行时检查断言无法保证的约束。 */
export function bundledGameData(): GameDataValidationInput {
  return {
    patterns: patternsRaw as unknown as PatternDef[],
    skills: skillsRaw as unknown as SkillDef[],
    units: unitsRaw as unknown as UnitDef[],
    levels: levelsRaw as unknown as LevelDef[],
    items: itemsRaw as unknown as ItemDef[],
    levelRewards: levelRewardsRaw as unknown as RewardTable,
    story: storyRaw as unknown as StoryGraph,
  };
}

/** 校验并在存在任意问题时一次性抛出聚合错误。 */
export function validateGameData(input?: GameDataValidationInput): void {
  const validatesBundledData = input === undefined;
  if (validatesBundledData && bundledValidationComplete) return;
  const issues = collectGameDataIssues(input ?? bundledGameData());
  if (issues.length > 0) throw new GameDataValidationError(issues);
  if (validatesBundledData) bundledValidationComplete = true;
}

/** 收集全部问题而不抛错，适合测试、编辑器和构建报告。 */
export function collectGameDataIssues(data: GameDataValidationInput): GameDataIssue[] {
  const issues: GameDataIssue[] = [];
  const add = (path: string, message: string) => issues.push({ path, message });
  const patternIds = collectIds(data.patterns, "patterns", add);
  const skillIds = collectIds(data.skills, "skills", add);
  const unitIds = collectIds(data.units, "units", add);
  const levelIds = collectIds(data.levels, "levels", add);
  const itemIds = collectIds(data.items, "items", add);

  for (const [index, pattern] of data.patterns.entries()) {
    const path = `patterns[${index}](${pattern.id || "?"})`;
    if (!Array.isArray(pattern.cells) || pattern.cells.length === 0) add(`${path}.cells`, "至少需要一个命中格");
    const coords = new Set<string>();
    for (const [cellIndex, cell] of (pattern.cells ?? []).entries()) {
      const cellPath = `${path}.cells[${cellIndex}]`;
      finite(cell.dx, `${cellPath}.dx`, add);
      finite(cell.dy, `${cellPath}.dy`, add);
      if (!cell.effectKey) add(`${cellPath}.effectKey`, "不能为空");
      const key = `${cell.dx},${cell.dy}`;
      if (coords.has(key)) add(cellPath, `坐标 ${key} 重复`);
      coords.add(key);
    }
  }

  for (const [index, skill] of data.skills.entries()) {
    const path = `skills[${index}](${skill.id || "?"})`;
    if (!patternIds.has(skill.patternId)) add(`${path}.patternId`, `引用未知 Pattern "${skill.patternId}"`);
    nonNegativeInteger(skill.cooldown, `${path}.cooldown`, add);
    if (skill.castRange.type === "distance") {
      nonNegativeInteger(skill.castRange.min, `${path}.castRange.min`, add);
      nonNegativeInteger(skill.castRange.max, `${path}.castRange.max`, add);
      if (skill.castRange.min > skill.castRange.max) add(`${path}.castRange`, "min 不能大于 max");
    }
    if (skill.targetType === "direction" && skill.castRange.type !== "direction") {
      add(`${path}.targetType`, "direction 目标必须搭配 direction 施法范围");
    }
    if (skill.castRange.type === "direction" && skill.targetType !== "direction") {
      add(`${path}.castRange`, "direction 施法范围必须搭配 direction 目标");
    }
    const pattern = data.patterns.find((p) => p.id === skill.patternId);
    const effectKeys = new Set(pattern?.cells.map((c) => c.effectKey) ?? []);
    for (const [effectKey, ops] of Object.entries(skill.cellEffects ?? {})) {
      if (effectKey !== "all" && !effectKeys.has(effectKey)) {
        add(`${path}.cellEffects.${effectKey}`, "Pattern 中不存在对应 effectKey");
      }
      if (!Array.isArray(ops) || ops.length === 0) add(`${path}.cellEffects.${effectKey}`, "效果列表不能为空");
      for (const [opIndex, op] of (ops ?? []).entries()) validateEffectOp(op, `${path}.cellEffects.${effectKey}[${opIndex}]`, add);
    }
  }

  for (const [index, unit] of data.units.entries()) {
    const path = `units[${index}](${unit.id || "?"})`;
    positive(unit.stats?.hp, `${path}.stats.hp`, add);
    positive(unit.stats?.speed, `${path}.stats.speed`, add);
    for (const stat of ["attack", "magic", "defense", "moveRange"] as const) {
      nonNegative(unit.stats?.[stat], `${path}.stats.${stat}`, add);
    }
    const seenSkills = new Set<string>();
    for (const [skillIndex, skillId] of (unit.skills ?? []).entries()) {
      if (!skillIds.has(skillId)) add(`${path}.skills[${skillIndex}]`, `引用未知技能 "${skillId}"`);
      if (seenSkills.has(skillId)) add(`${path}.skills[${skillIndex}]`, `技能 "${skillId}" 重复`);
      seenSkills.add(skillId);
    }
  }

  for (const [index, item] of data.items.entries()) {
    const path = `items[${index}](${item.id || "?"})`;
    if (!RARITIES.includes(item.rarity)) add(`${path}.rarity`, `未知稀有度 "${item.rarity}"`);
    if (item.kind === "equip") {
      if (!item.slot) add(`${path}.slot`, "装备必须声明槽位");
      for (const [bonusIndex, bonus] of (item.bonus ?? []).entries()) finite(bonus.amount, `${path}.bonus[${bonusIndex}].amount`, add);
    } else if (item.kind === "consumable") {
      if (!item.effect) add(`${path}.effect`, "消耗品必须声明效果");
      nonNegativeInteger(item.range ?? 0, `${path}.range`, add);
    } else if (item.kind === "skill") {
      if (!item.skillId || !skillIds.has(item.skillId)) add(`${path}.skillId`, `引用未知技能 "${item.skillId ?? ""}"`);
      if (!item.usableBy?.length) add(`${path}.usableBy`, "技能道具至少需要一个可装备单位");
      for (const [unitIndex, unitId] of (item.usableBy ?? []).entries()) {
        if (!unitIds.has(unitId)) add(`${path}.usableBy[${unitIndex}]`, `引用未知单位 "${unitId}"`);
      }
    } else {
      add(`${path}.kind`, `未知物品类型 "${String(item.kind)}"`);
    }
  }

  validateLevels(data.levels, unitIds, data.units, add);
  validateRewards(data.levelRewards, levelIds, itemIds, add);
  validateStory(data.story, levelIds, add);
  validateAoeIncentive(data, add);
  return issues;
}

/**
 * AOE 收益不变式：用 AOE 同时命中多个敌人是本作核心玩法来源（见 CLAUDE.md 与 PRD §6.1）。
 * 对任何伤害分档的 AOE 技能，「打中 2 个最低档格」必须明显优于「打中 1 个最高档格」，
 * 否则玩家的最优解退化为拿 AOE 点射单体，违背聚敌成杀的设计目标。三条规则：
 * 1) 倍率：2 × 最低档伤害倍率 ≥ 1.2 × 最高档伤害倍率；
 * 2) 状态一致：各伤害档位附带的状态效果必须完全相同，防止独占状态抵消倍率约束；
 * 3) 实战：对每个持有该技能的单位，按 computeDamage 公式（攻/法 × 倍率 − 防御，
 *    四舍五入、下限 1）以敌对阵营防御中位数验算，2 × 最低档 > 1 × 最高档。
 */
function validateAoeIncentive(data: GameDataValidationInput, add: AddIssue): void {
  const ownersBySkill = new Map<string, Set<UnitDef>>();
  const unitById = new Map(data.units.map((u) => [u.id, u]));
  const own = (skillId: string, unit: UnitDef | undefined) => {
    if (!unit) return;
    const set = ownersBySkill.get(skillId) ?? new Set<UnitDef>();
    set.add(unit);
    ownersBySkill.set(skillId, set);
  };
  for (const unit of data.units) for (const skillId of unit.skills ?? []) own(skillId, unit);
  for (const item of data.items) {
    if (item.kind === "skill" && item.skillId) for (const unitId of item.usableBy ?? []) own(item.skillId, unitById.get(unitId));
  }
  const medianDefense = (faction: "player" | "enemy"): number | null => {
    const values = data.units
      .filter((u) => u.faction === faction)
      .map((u) => u.stats?.defense)
      .filter((v): v is number => Number.isFinite(v))
      .sort((a, b) => a - b);
    return values.length ? values[Math.floor(values.length / 2)] : null;
  };

  for (const [index, skill] of data.skills.entries()) {
    const path = `skills[${index}](${skill.id || "?"})`;
    const allOps = skill.cellEffects?.["all"] ?? [];
    // 伤害档位：pattern 中每个 effectKey 结算 keyOps + allOps（与 resolveSkill 一致），只比较含伤害的档位。
    const zones = Object.entries(skill.cellEffects ?? {})
      .filter(([key]) => key !== "all")
      .map(([key, ops]) => ({ key, ops: [...(ops ?? []), ...allOps] }))
      .map((zone) => ({
        ...zone,
        damageOps: zone.ops.filter(
          (op): op is Extract<SkillDef["cellEffects"][string][number], { type: "damage" }> => op.type === "damage"
        ),
        statusSignature: JSON.stringify(
          zone.ops
            .filter((op) => op.type === "apply_status")
            .map((op) => JSON.stringify(op))
            .sort()
        ),
      }))
      .filter((zone) => zone.damageOps.length > 0);
    if (zones.length < 2) continue;

    const multiplierOf = (zone: (typeof zones)[number]) => zone.damageOps.reduce((acc, op) => acc + op.multiplier, 0);
    const lowest = zones.reduce((a, b) => (multiplierOf(a) <= multiplierOf(b) ? a : b));
    const highest = zones.reduce((a, b) => (multiplierOf(a) >= multiplierOf(b) ? a : b));
    if (multiplierOf(lowest) === multiplierOf(highest)) continue;

    if (2 * multiplierOf(lowest) < 1.2 * multiplierOf(highest)) {
      add(
        `${path}.cellEffects`,
        `AOE 收益不变式：2 × 最低档倍率(${lowest.key}=${multiplierOf(lowest)}) 必须 ≥ 1.2 × 最高档倍率(${highest.key}=${multiplierOf(highest)})`
      );
    }
    for (const zone of zones) {
      if (zone.statusSignature !== highest.statusSignature) {
        add(
          `${path}.cellEffects.${zone.key}`,
          `AOE 收益不变式：伤害档位 "${zone.key}" 与 "${highest.key}" 的附带状态必须一致`
        );
        break;
      }
    }

    // 实战验算：按持有者面板与敌对阵营防御中位数复算（与 combat.ts computeDamage 同公式）。
    const zoneDamage = (zone: (typeof zones)[number], caster: UnitDef, defense: number) =>
      zone.damageOps.reduce((acc, op) => {
        const stat = op.element === "physical" ? caster.stats.attack : caster.stats.magic;
        return acc + Math.max(1, Math.round(stat * op.multiplier - defense));
      }, 0);
    for (const caster of ownersBySkill.get(skill.id) ?? []) {
      const defense = medianDefense(caster.faction === "player" ? "enemy" : "player");
      if (defense === null) continue;
      const two = 2 * zoneDamage(lowest, caster, defense);
      const one = zoneDamage(highest, caster, defense);
      if (two <= one) {
        add(
          `${path}.cellEffects`,
          `AOE 收益不变式：${caster.id} 使用时，2 × 最低档伤害(${two}) 必须 > 1 × 最高档伤害(${one})（防御按 ${defense} 验算）`
        );
      }
    }
  }
}

type AddIssue = (path: string, message: string) => void;

function collectIds<T extends { id: string }>(rows: T[], path: string, add: AddIssue): Set<string> {
  const ids = new Set<string>();
  for (const [index, row] of rows.entries()) {
    if (!row.id) add(`${path}[${index}].id`, "不能为空");
    else if (ids.has(row.id)) add(`${path}[${index}].id`, `重复 ID "${row.id}"`);
    ids.add(row.id);
  }
  return ids;
}

function validateLevels(levels: LevelDef[], unitIds: Set<string>, units: UnitDef[], add: AddIssue): void {
  const factionByUnit = new Map(units.map((u) => [u.id, u.faction]));
  for (const [index, level] of levels.entries()) {
    const path = `levels[${index}](${level.id || "?"})`;
    let board: GridBoard | null = null;
    try {
      board = GridBoard.from(resolveBoardData(level.board));
      if (board.width <= 0 || board.height <= 0) add(`${path}.board`, "棋盘宽高必须大于 0");
    } catch (error) {
      add(`${path}.board`, error instanceof Error ? error.message : "棋盘无法解析");
    }
    const occupied = new Set<string>();
    const validateSpawns = (spawns: LevelDef["playerUnits"], expected: "player" | "enemy", field: string) => {
      for (const [spawnIndex, spawn] of (spawns ?? []).entries()) {
        const spawnPath = `${path}.${field}[${spawnIndex}]`;
        if (!unitIds.has(spawn.unitId)) add(`${spawnPath}.unitId`, `引用未知单位 "${spawn.unitId}"`);
        else if (factionByUnit.get(spawn.unitId) !== expected) add(`${spawnPath}.unitId`, `单位阵营不是 ${expected}`);
        const key = `${spawn.x},${spawn.y}`;
        if (occupied.has(key)) add(spawnPath, `出生点 ${key} 重叠`);
        occupied.add(key);
        if (board && !board.isWalkable(spawn)) add(spawnPath, `出生点 ${key} 不可站立`);
      }
    };
    validateSpawns(level.playerUnits, "player", "playerUnits");
    validateSpawns(level.enemyUnits, "enemy", "enemyUnits");
    for (const unitId of Object.keys(level.enemyStatOverrides ?? {})) {
      if (!unitIds.has(unitId)) add(`${path}.enemyStatOverrides.${unitId}`, "引用未知单位");
      else if (factionByUnit.get(unitId) !== "enemy") add(`${path}.enemyStatOverrides.${unitId}`, "只能覆盖敌方单位属性");
      const override = level.enemyStatOverrides?.[unitId];
      for (const [stat, value] of Object.entries(override ?? {})) {
        if (stat === "hp" || stat === "speed") positive(value, `${path}.enemyStatOverrides.${unitId}.${stat}`, add);
        else nonNegative(value, `${path}.enemyStatOverrides.${unitId}.${stat}`, add);
      }
    }
  }
}

function validateRewards(table: RewardTable, levelIds: Set<string>, itemIds: Set<string>, add: AddIssue): void {
  for (const levelId of levelIds) {
    if (!table[levelId]) add(`levelRewards.${levelId}`, "缺少该关卡的奖励配置");
  }
  for (const [key, reward] of Object.entries(table) as [string, LevelReward][]) {
    const path = `levelRewards.${key}`;
    if (reward.levelId !== key) add(`${path}.levelId`, `必须与表键 "${key}" 一致`);
    if (!levelIds.has(reward.levelId)) add(`${path}.levelId`, `引用未知关卡 "${reward.levelId}"`);
    for (const [index, itemId] of (reward.guaranteedDrops ?? []).entries()) {
      if (!itemIds.has(itemId)) add(`${path}.guaranteedDrops[${index}]`, `引用未知物品 "${itemId}"`);
    }
    if (reward.randomDrops) {
      nonNegativeInteger(reward.randomDrops.rolls, `${path}.randomDrops.rolls`, add);
      let total = 0;
      for (const rarity of RARITIES) {
        const weight = reward.randomDrops.weights[rarity] ?? 0;
        nonNegative(weight, `${path}.randomDrops.weights.${rarity}`, add);
        if (Number.isFinite(weight) && weight > 0) total += weight;
      }
      if (reward.randomDrops.rolls > 0 && total <= 0) add(`${path}.randomDrops.weights`, "抽取次数大于 0 时至少需要一个正权重");
    }
  }
}

function validateStory(story: StoryGraph, levelIds: Set<string>, add: AddIssue): void {
  const nodes = story?.nodes ?? {};
  if (!nodes[story?.startId]) add("story.startId", `引用未知节点 "${story?.startId ?? ""}"`);
  for (const [key, node] of Object.entries(nodes)) {
    const path = `story.nodes.${key}`;
    if (node.id !== key) add(`${path}.id`, `必须与表键 "${key}" 一致`);
    if (node.next !== null && !nodes[node.next]) add(`${path}.next`, `引用未知节点 "${node.next}"`);
    if (node.kind === "battle" && !levelIds.has(node.levelId)) add(`${path}.levelId`, `引用未知关卡 "${node.levelId}"`);
  }
  const reachable = new Set<string>();
  let cursor: string | null = story?.startId ?? null;
  while (cursor && nodes[cursor] && !reachable.has(cursor)) {
    reachable.add(cursor);
    cursor = nodes[cursor].next;
  }
  if (cursor && reachable.has(cursor)) add("story", `从 startId 出发存在循环，重复节点 "${cursor}"`);
  for (const key of Object.keys(nodes)) if (!reachable.has(key)) add(`story.nodes.${key}`, "从 startId 不可达");
}

function validateEffectOp(op: SkillDef["cellEffects"][string][number], path: string, add: AddIssue): void {
  switch (op.type) {
    case "damage":
    case "heal":
      positive(op.multiplier, `${path}.multiplier`, add);
      break;
    case "apply_status":
      positiveInteger(op.duration, `${path}.duration`, add);
      if (op.magnitude !== undefined) nonNegative(op.magnitude, `${path}.magnitude`, add);
      break;
    case "push":
    case "pull":
      positiveInteger(op.distance, `${path}.distance`, add);
      break;
    case "pull_to_center":
      positiveInteger(op.maxDistance, `${path}.maxDistance`, add);
      if (op.stopRadius !== undefined) nonNegativeInteger(op.stopRadius, `${path}.stopRadius`, add);
      break;
    case "gather_damage":
      positive(op.movedMultiplier, `${path}.movedMultiplier`, add);
      positive(op.stayedMultiplier, `${path}.stayedMultiplier`, add);
      break;
    case "knockback":
      positiveInteger(op.distance, `${path}.distance`, add);
      nonNegative(op.collisionDamage, `${path}.collisionDamage`, add);
      break;
    case "arrange_line":
      positiveInteger(op.maxUnits, `${path}.maxUnits`, add);
      break;
    case "swap":
      break;
  }
}

function finite(value: number, path: string, add: AddIssue): void {
  if (!Number.isFinite(value)) add(path, "必须是有限数字");
}
function nonNegative(value: number, path: string, add: AddIssue): void {
  if (!Number.isFinite(value) || value < 0) add(path, "必须是非负有限数字");
}
function positive(value: number, path: string, add: AddIssue): void {
  if (!Number.isFinite(value) || value <= 0) add(path, "必须是正有限数字");
}
function nonNegativeInteger(value: number, path: string, add: AddIssue): void {
  if (!Number.isInteger(value) || value < 0) add(path, "必须是非负整数");
}
function positiveInteger(value: number, path: string, add: AddIssue): void {
  if (!Number.isInteger(value) || value <= 0) add(path, "必须是正整数");
}

/**
 * 等级体系：纯函数。经验曲线 + 每级属性成长 + 技能解锁表。
 * 所有函数返回新对象，不修改入参。
 */
import { UnitStats } from "@core/index";
import { UnitProgress, cloneUnitProgress } from "../profile/Profile";

/** xpToReach[L] = 「成为 L 级」所需累计总经验；index 0 占位，level 1 = 0。 */
export interface XpCurve {
  maxLevel: number;
  xpToReach: number[];
}

/** 每级升级时叠加到 UnitDef.stats 基础值上的属性增量（按 defId）。 */
export type GrowthTable = Record<string, Partial<UnitStats>>;

/** 技能解锁表：defId -> { level, skill }[]。也复用作技能升级表（含义=「到该级则该技能 +1 级」）。 */
export type SkillUnlockSchedule = Record<string, { level: number; skill: string }[]>;

export interface ProgressionTables {
  xpCurve: XpCurve;
  growth: GrowthTable;
  unlocks: SkillUnlockSchedule;
  /** 每升一级授予的属性点。 */
  pointsPerLevel: number;
  /** 技能升级表：到达某级时该技能 +1 级（结构同 unlocks）。 */
  skillGrowth: SkillUnlockSchedule;
  /** 敌方每级属性成长（按 enemyDefId，供 enemyLevel 缩放，复用 statsForLevel）。 */
  enemyGrowth: GrowthTable;
  /** 战斗内「贡献经验」费率：对敌每点伤害、对友每点治疗、每次施加状态。 */
  combatXp: { perDamage: number; perHeal: number; perStatus: number };
}

/** 累计经验对应的等级（在 [1, maxLevel] 间钳制）。 */
export function levelForXp(xp: number, curve: XpCurve): number {
  let level = 1;
  for (let l = 2; l <= curve.maxLevel; l++) {
    if (xp >= (curve.xpToReach[l] ?? Infinity)) level = l;
    else break;
  }
  return level;
}

/** 纯函数：返回经验增加后的新 UnitProgress（不重算等级，交给 applyLevelUps）。 */
export function gainXp(up: UnitProgress, amount: number): UnitProgress {
  const next = cloneUnitProgress(up);
  next.xp = up.xp + Math.max(0, amount);
  return next;
}

/** 基础值 + 成长增量×(level-1)。纯函数，不含装备加成。 */
export function statsForLevel(
  baseStats: UnitStats,
  defId: string,
  level: number,
  growth: GrowthTable
): UnitStats {
  const out: UnitStats = { ...baseStats };
  const g = growth[defId];
  if (g) {
    const times = Math.max(0, level - 1);
    (Object.keys(g) as (keyof UnitStats)[]).forEach((k) => {
      const inc = g[k];
      if (typeof inc === "number") out[k] = out[k] + inc * times;
    });
  }
  return out;
}

export interface LevelUpResult {
  progress: UnitProgress;
  fromLevel: number;
  toLevel: number;
  /** 本次（可能跨多级）新解锁并加入 learnedSkills 的技能。 */
  unlockedSkills: string[];
  /** 本次授予的属性点。 */
  pointsGranted: number;
  /** 本次因升级而 +1 级的技能 id（可能重复出现表示多次 +1）。 */
  skillLevelUps: string[];
}

/**
 * 计算 fromLevel→toLevel 跨越各级触发的技能解锁与技能升级（返回原始 schedule 条目，不做「已拥有」去重）。
 * 纯函数。战斗内（processCombatXp，作用于运行时 Unit）与战后（applyLevelUps，作用于 UnitProgress）共用，
 * 各自按自己的 skills/learnedSkills 集合去重，避免步进逻辑双份实现。
 */
export function skillStepsForLevelUp(
  defId: string,
  fromLevel: number,
  toLevel: number,
  tables: ProgressionTables
): { unlocks: string[]; skillLevelUps: string[] } {
  const unlocks: string[] = [];
  const skillLevelUps: string[] = [];
  if (toLevel > fromLevel) {
    for (const e of tables.unlocks[defId] ?? []) {
      if (e.level > fromLevel && e.level <= toLevel) unlocks.push(e.skill);
    }
    for (const e of tables.skillGrowth[defId] ?? []) {
      if (e.level > fromLevel && e.level <= toLevel) skillLevelUps.push(e.skill);
    }
  }
  return { unlocks, skillLevelUps };
}

/**
 * 根据累计经验把等级推进到位（可一次跨多级），追加沿途解锁的技能、技能升级与属性点。
 * 纯函数：返回新 progress + 变化摘要。
 */
export function applyLevelUps(up: UnitProgress, tables: ProgressionTables): LevelUpResult {
  const fromLevel = up.level;
  const toLevel = levelForXp(up.xp, tables.xpCurve);

  const next = cloneUnitProgress(up);
  next.level = toLevel;

  const steps = skillStepsForLevelUp(up.defId, fromLevel, toLevel, tables);
  const unlockedSkills: string[] = [];
  for (const skill of steps.unlocks) {
    if (!next.learnedSkills.includes(skill)) {
      next.learnedSkills.push(skill);
      unlockedSkills.push(skill);
    }
  }
  for (const skill of steps.skillLevelUps) {
    next.skillLevels[skill] = (next.skillLevels[skill] ?? 1) + 1;
  }
  const pointsGranted = toLevel > fromLevel ? tables.pointsPerLevel * (toLevel - fromLevel) : 0;
  next.unspentPoints += pointsGranted;

  return { progress: next, fromLevel, toLevel, unlockedSkills, pointsGranted, skillLevelUps: steps.skillLevelUps };
}

/** 花 1 点属性点加到某属性上。纯函数：无点数时原样返回。 */
export function allocatePoint(up: UnitProgress, stat: keyof UnitStats): UnitProgress {
  if (up.unspentPoints <= 0) return up;
  const next = cloneUnitProgress(up);
  next.allocated[stat] = (next.allocated[stat] ?? 0) + 1;
  next.unspentPoints -= 1;
  return next;
}

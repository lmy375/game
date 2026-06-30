// ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
/**
 * 等级体系：纯函数。经验曲线 + 每级属性成长 + 技能解锁表。
 * 所有函数返回新对象，不修改入参。
 */
import { UnitStats } from "../../game-core/index";
import { UnitProgress, cloneUnitProgress } from "../profile/Profile";

/** xpToReach[L] = 「成为 L 级」所需累计总经验；index 0 占位，level 1 = 0。 */
export interface XpCurve {
  maxLevel: number;
  xpToReach: number[];
}

/** 每级升级时叠加到 UnitDef.stats 基础值上的属性增量（按 defId）。 */
export type GrowthTable = Record<string, Partial<UnitStats>>;

/** 技能解锁表：defId -> { level, skill }[]。 */
export type SkillUnlockSchedule = Record<string, { level: number; skill: string }[]>;

export interface ProgressionTables {
  xpCurve: XpCurve;
  growth: GrowthTable;
  unlocks: SkillUnlockSchedule;
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
}

/**
 * 根据累计经验把等级推进到位（可一次跨多级），追加沿途解锁的技能。
 * 纯函数：返回新 progress + 变化摘要。
 */
export function applyLevelUps(up: UnitProgress, tables: ProgressionTables): LevelUpResult {
  const fromLevel = up.level;
  const toLevel = levelForXp(up.xp, tables.xpCurve);

  const next = cloneUnitProgress(up);
  next.level = toLevel;

  const unlockedSkills: string[] = [];
  if (toLevel > fromLevel) {
    const schedule = tables.unlocks[up.defId] ?? [];
    for (const entry of schedule) {
      if (entry.level > fromLevel && entry.level <= toLevel && !next.learnedSkills.includes(entry.skill)) {
        next.learnedSkills.push(entry.skill);
        unlockedSkills.push(entry.skill);
      }
    }
  }
  return { progress: next, fromLevel, toLevel, unlockedSkills };
}

/**
 * 出战装配：复用 loadLevel 生成基础 BattleState，再按档案给「玩家单位」打补丁
 * （等级成长 + 已学技能 + 装备加成）；敌方按关卡 enemyLevel 缩放。纯函数（在 loadLevel 的全新对象上原地改）。
 */
import { BattleState, LevelDef, ContentRegistry, UnitStats, loadLevel } from "@core/index";
import { PlayerProfile, unitProgress } from "../profile/Profile";
import { statsForLevel, GrowthTable } from "../leveling/Leveling";
import { equipBonusesFor, StatBonus } from "../items/Items";
import { MetaTables } from "../save/MetaTables";

/**
 * 组合单位最终属性：等级成长基线 + 手动加点 + 装备加成。纯函数。
 * buildBattleState / processCombatXp / 结算屏加点面板共用同一公式，避免多处漂移。
 */
export function composeUnitStats(
  base: UnitStats,
  defId: string,
  level: number,
  growth: GrowthTable,
  allocated: Partial<UnitStats> = {},
  equipBonuses: StatBonus[] = []
): UnitStats {
  const out = statsForLevel(base, defId, level, growth);
  for (const [stat, amount] of Object.entries(allocated)) {
    if (typeof amount === "number") out[stat as keyof UnitStats] += amount;
  }
  for (const b of equipBonuses) out[b.stat] += b.amount;
  return out;
}

export function buildBattleState(
  profile: PlayerProfile,
  levelDef: LevelDef,
  registry: ContentRegistry,
  tables: MetaTables
): BattleState {
  const state = loadLevel(levelDef, registry); // 全新 Unit 对象，原地改安全
  const enemyLevel = levelDef.enemyLevel ?? 1;

  for (const u of state.units) {
    // 始终以 def 的权威基础值起算（绝不改 registry 里的共享 def）。
    const base = registry.unit(u.defId).stats;

    if (u.faction === "enemy") {
      // 敌人按关卡 enemyLevel 缩放（复用 enemyGrowth，无加点/装备）。
      if (enemyLevel > 1) {
        const scaled = composeUnitStats(base, u.defId, enemyLevel, tables.progression.enemyGrowth);
        u.stats = scaled;
        u.maxHp = scaled.hp;
        u.hp = scaled.hp;
      }
      u.level = enemyLevel;
      continue;
    }

    const progress = unitProgress(profile, u.defId);
    if (!progress) continue;

    const leveled = composeUnitStats(
      base,
      u.defId,
      progress.level,
      tables.progression.growth,
      progress.allocated,
      equipBonusesFor(progress.equipped, tables.items)
    );

    u.stats = leveled;
    u.maxHp = leveled.hp;
    u.hp = leveled.hp; // 出战满血，与 loadLevel 一致
    u.level = progress.level;
    u.xp = progress.xp;
    u.skillLevels = { ...progress.skillLevels };
    if (progress.learnedSkills.length > 0) u.skills = [...progress.learnedSkills];
  }

  return state;
}

// ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
/**
 * 出战装配：复用 loadLevel 生成基础 BattleState，再按档案给「玩家单位」打补丁
 * （等级成长 + 已学技能 + 装备加成）。敌方单位完全不动。纯函数（在 loadLevel 的全新对象上原地改）。
 */
import { BattleState, LevelDef, ContentRegistry, UnitStats, loadLevel } from "../../game-core/index";
import { PlayerProfile, unitProgress } from "../profile/Profile";
import { statsForLevel } from "../leveling/Leveling";
import { equipBonusFor } from "../items/Items";
import { MetaTables } from "../save/MetaTables";

export function buildBattleState(
  profile: PlayerProfile,
  levelDef: LevelDef,
  registry: ContentRegistry,
  tables: MetaTables
): BattleState {
  const state = loadLevel(levelDef, registry); // 全新 Unit 对象，原地改安全

  for (const u of state.units) {
    if (u.faction !== "player") continue;
    const progress = unitProgress(profile, u.defId);
    if (!progress) continue;

    // 始终以 def 的权威基础值起算（绝不改 registry 里的共享 def）。
    const base = registry.unit(u.defId).stats;
    const leveled = statsForLevel(base, u.defId, progress.level, tables.progression.growth);

    // 叠加装备加成；hp 加成同时抬高 maxHp。
    for (const b of equipBonusFor(progress.equipped, tables.items)) {
      leveled[b.stat as keyof UnitStats] = leveled[b.stat as keyof UnitStats] + b.amount;
    }

    u.stats = leveled;
    u.maxHp = leveled.hp;
    u.hp = leveled.hp; // 出战满血，与 loadLevel 一致
    if (progress.learnedSkills.length > 0) u.skills = [...progress.learnedSkills];
  }

  return state;
}

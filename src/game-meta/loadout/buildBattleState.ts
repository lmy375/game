/**
 * 出战装配：复用 loadLevel 生成基础 BattleState，再按档案给「玩家单位」打补丁
 * （装备加成 + 技能栏技能）。敌方属性由 loadLevel 按关卡 enemyStatOverrides 决定。
 * 纯函数（在 loadLevel 的全新对象上原地改）。
 */
import { BattleState, LevelDef, ContentRegistry, UnitStats, loadLevel } from "@core/index";
import { PlayerProfile, unitProgress } from "../profile/Profile";
import { equipBonusesFor, skillIdsOf, StatBonus } from "../items/Items";
import { MetaTables } from "../save/MetaTables";

/**
 * 组合单位最终属性：基础值 + 装备加成。纯函数。
 * buildBattleState / 整备界面属性预览 / 战斗中休整回写共用同一公式，避免多处漂移。
 */
export function composeUnitStats(base: UnitStats, equipBonuses: StatBonus[]): UnitStats {
  const out = { ...base };
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

  for (const u of state.units) {
    if (u.faction !== "player") continue;
    const progress = unitProgress(profile, u.defId);
    if (!progress) continue;

    // 始终以 def 的权威基础值起算（绝不改 registry 里的共享 def）。
    const base = registry.unit(u.defId).stats;
    const composed = composeUnitStats(base, equipBonusesFor(progress.equipped, tables.items));

    u.stats = composed;
    u.maxHp = composed.hp;
    u.hp = composed.hp; // 出战满血，与 loadLevel 一致
    u.skills = skillIdsOf(progress.skillSlots, tables.items);
  }

  return state;
}

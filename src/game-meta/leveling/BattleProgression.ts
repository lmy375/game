/**
 * 战斗内进度：纯函数。玩家单位「造成伤害 / 治疗 / 施加状态（Buff/Debuff）」即当场获得经验，
 * 无需击杀；越过阈值则当场升级（就地提属性 / 解锁技能 / 技能升级）。
 * 由交互层在每次 simulate 后调用，返回追加的 unit_level_up 事件并入事件流。
 *
 * 就地修改传入 state 的单位；不改档案。属性点不在战斗内发放——统一由战后 applyRewards
 * 依「最终 xp 推出的等级」补齐。
 */
import { BattleState, BattleEvent, ContentRegistry, unitById, isAlive } from "@core/index";
import { PlayerProfile, unitProgress } from "../profile/Profile";
import { MetaTables } from "../save/MetaTables";
import { levelForXp, skillStepsForLevelUp } from "./Leveling";
import { equipBonusesFor } from "../items/Items";
import { composeUnitStats } from "../loadout/buildBattleState";

/**
 * 处理一段事件里的「贡献经验」与战斗内升级。
 * 一批事件来自单次技能施放（由 skill_cast 定位施法者）：对敌造成伤害、对友治疗、施加任意状态均计入。
 * 无 skill_cast（移动 / 结束回合 / 灼烧等 DoT 跳伤）→ 不结算（这些效果的经验已在施放当时给过）。
 * 返回新增的 unit_level_up 事件（原有 events 不改）。
 */
export function processCombatXp(
  events: BattleEvent[],
  state: BattleState,
  profile: PlayerProfile,
  registry: ContentRegistry,
  tables: MetaTables
): BattleEvent[] {
  const prog = tables.progression;
  const rates = prog.combatXp;

  const cast = events.find((e) => e.type === "skill_cast");
  if (!cast || cast.type !== "skill_cast") return [];
  const caster = unitById(state, cast.casterId);
  if (!caster || caster.faction !== "player" || !isAlive(caster)) return [];

  // 累计本次技能的贡献经验：对敌伤害、对友治疗、施加的任意状态。
  let xp = 0;
  for (const e of events) {
    if (e.type === "unit_damaged" || e.type === "collision_damage") {
      const t = unitById(state, e.unitId);
      if (t && t.faction !== caster.faction) xp += e.amount * rates.perDamage;
    } else if (e.type === "unit_healed") {
      const t = unitById(state, e.unitId);
      if (t && t.faction === caster.faction) xp += e.amount * rates.perHeal;
    } else if (e.type === "unit_status_applied") {
      xp += rates.perStatus;
    }
  }
  const gained = Math.round(xp);
  if (gained <= 0) return [];

  caster.xp += gained;
  const fromLevel = caster.level;
  const toLevel = levelForXp(caster.xp, prog.xpCurve);
  if (toLevel <= fromLevel) return [];

  const progress = unitProgress(profile, caster.defId);

  // 技能解锁 / 升级：与战后 applyLevelUps 共用 skillStepsForLevelUp，按 caster 自己的 skills 集合去重。
  const steps = skillStepsForLevelUp(caster.defId, fromLevel, toLevel, prog);
  const unlocked: string[] = [];
  for (const skill of steps.unlocks) {
    if (!caster.skills.includes(skill)) {
      caster.skills.push(skill);
      unlocked.push(skill);
    }
  }
  for (const skill of steps.skillLevelUps) {
    caster.skillLevels[skill] = (caster.skillLevels[skill] ?? 1) + 1;
  }

  // 就地重算属性：与 buildBattleState 同一公式（等级成长 + 手动加点 + 装备）。
  const leveled = composeUnitStats(
    registry.unit(caster.defId).stats,
    caster.defId,
    toLevel,
    prog.growth,
    progress?.allocated ?? {},
    progress ? equipBonusesFor(progress.equipped, tables.items) : []
  );
  const hpDelta = leveled.hp - caster.maxHp;
  caster.stats = leveled;
  caster.level = toLevel;
  caster.maxHp = leveled.hp;
  if (hpDelta > 0) caster.hp += hpDelta; // 升级当场回血差值

  return [{ type: "unit_level_up", unitId: caster.instanceId, fromLevel, toLevel, unlockedSkills: unlocked }];
}

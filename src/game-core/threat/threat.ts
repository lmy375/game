/**
 * 威胁范围计算（danger zone）：某一阵营全体单位「可达格 ∪ 从可达站位能命中的格」。
 * 供 UI 在玩家走位时渲染敌方威胁区。纯函数，不修改 state。
 *
 * 攻击覆盖不使用 getCastableCells（它对 direction 型只返回代表格、对 distance 型返回施法点
 * 而非命中格），而是镜像 resolveTargeting 的语义，把每个技能展开为「相对施法者的可命中偏移集」。
 */
import {
  Position,
  Direction,
  ALL_DIRECTIONS,
  DIRECTION_VECTOR,
  add,
  key,
  clone,
  directionTo,
} from "../board/geometry";
import { BattleState } from "../state/BattleState";
import { Unit, Faction, isAlive } from "../unit/Unit";
import { SkillDef } from "../skill/Skill";
import { resolvePattern } from "../pattern/Pattern";
import { ContentRegistry } from "../content/Registry";
import { computeMoveRange } from "../pathfinding/pathfinding";

export interface ThreatCells {
  /** 该阵营全体存活单位的 当前格 ∪ 可达格。 */
  moveCells: Position[];
  /** 从任一可站位格出发、任一进攻技能可命中，且不在 moveCells 内的攻击延伸格。 */
  attackCells: Position[];
}

/** 偏移集缓存：SkillDef 静态不变，按定义对象缓存展开结果。 */
const offsetsCache = new WeakMap<SkillDef, Position[]>();

/**
 * 一个技能相对施法者(0,0)的可命中偏移全集（去重）。
 * 与实际结算同源：枚举 castRange 的全部目标点，逐个走 resolveTargeting 同款的
 * 方向/原点推导，再用 resolvePattern 展开。施法者朝向不可预测的分支（自身格目标
 * 且 pattern 可旋转）取四方向并集，宁可高估不低估。
 *
 * 已知的轻微高估：偏移集与棋盘无关，棋盘边缘「目标点出界但 AOE 臂回到界内」的
 * 情况会被计入（实际不可施放）。威胁展示以不漏报为先，可接受。
 */
export function skillThreatOffsets(skill: SkillDef, registry: ContentRegistry): Position[] {
  const cached = offsetsCache.get(skill);
  if (cached) return cached;

  const pattern = registry.pattern(skill.patternId);
  const out = new Map<string, Position>();
  const collect = (origin: Position, dir: Direction) => {
    for (const c of resolvePattern(pattern, origin, dir)) {
      out.set(key(c.pos), c.pos);
    }
  };
  // 目标点 target 相对施法者的偏移；origin 与 resolveTargeting 一致：
  // anchor=caster_direction → 施法者格(0,0)，否则目标格本身。
  const originOf = (target: Position) => (pattern.anchor === "caster_direction" ? { x: 0, y: 0 } : target);

  switch (skill.castRange.type) {
    case "direction":
      for (const dir of ALL_DIRECTIONS) {
        collect(originOf(DIRECTION_VECTOR[dir]), dir);
      }
      break;
    case "self":
      collectForTarget({ x: 0, y: 0 });
      break;
    case "distance": {
      const { min, max } = skill.castRange;
      for (let dx = -max; dx <= max; dx++) {
        for (let dy = -max; dy <= max; dy++) {
          const d = Math.abs(dx) + Math.abs(dy);
          if (d < min || d > max) continue;
          collectForTarget({ x: dx, y: dy });
        }
      }
      break;
    }
  }

  function collectForTarget(target: Position): void {
    if (!pattern.rotatable) {
      collect(originOf(target), "up");
    } else if (target.x === 0 && target.y === 0) {
      // 目标为自身格时方向取决于施法瞬间的 facing，不可预测 → 四方向并集。
      for (const dir of ALL_DIRECTIONS) collect(originOf(target), dir);
    } else {
      collect(originOf(target), directionTo({ x: 0, y: 0 }, target));
    }
  }

  const offsets = [...out.values()];
  offsetsCache.set(skill, offsets);
  return offsets;
}

/** 进攻性技能：命中格效果会作用于对方阵营的技能才构成威胁（治疗/增益不计）。 */
function isOffensive(skill: SkillDef): boolean {
  const filter = skill.targetFilter ?? "enemy";
  return filter === "enemy" || filter === "any";
}

/**
 * 计算 faction（默认敌方）全阵营威胁区。
 * 冷却中的技能也计入（威胁展示宁可高估）；攻击格已裁剪出界并扣除 moveCells。
 */
export function computeThreatCells(
  state: BattleState,
  registry: ContentRegistry,
  faction: Faction = "enemy"
): ThreatCells {
  const moveSet = new Map<string, Position>();
  const attackSet = new Map<string, Position>();

  for (const unit of state.units) {
    if (unit.faction !== faction || !isAlive(unit)) continue;
    const stands: Position[] = [clone(unit.pos), ...computeMoveRange(state, unit.instanceId)];
    for (const p of stands) moveSet.set(key(p), p);

    const offsets = unitThreatOffsets(unit, registry);
    for (const stand of stands) {
      for (const off of offsets) {
        const p = add(stand, off);
        if (!state.board.inBounds(p)) continue;
        attackSet.set(key(p), p);
      }
    }
  }

  const attackCells = [...attackSet.entries()]
    .filter(([k]) => !moveSet.has(k))
    .map(([, p]) => p);
  return { moveCells: [...moveSet.values()], attackCells };
}

/** 单个单位全部进攻技能的偏移并集（去重）。 */
function unitThreatOffsets(unit: Unit, registry: ContentRegistry): Position[] {
  const out = new Map<string, Position>();
  for (const skillId of unit.skills) {
    if (!registry.hasSkill(skillId)) continue;
    const skill = registry.skill(skillId);
    if (!isOffensive(skill)) continue;
    for (const off of skillThreatOffsets(skill, registry)) out.set(key(off), off);
  }
  return [...out.values()];
}

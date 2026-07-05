/**
 * 单位定义与运行时实例。
 */
import { Position, Direction } from "../board/geometry";

export type Faction = "player" | "enemy";

export interface UnitStats {
  hp: number;
  attack: number;
  magic: number;
  defense: number;
  moveRange: number;
  /** 速度：决定行动频率。速度越高，充能越快、行动轮数越多。 */
  speed: number;
}

/** 静态配置（来自 units.json）。 */
export interface UnitDef {
  id: string;
  name: string;
  faction: Faction;
  stats: UnitStats;
  skills: string[];
  /** 敌方 AI 行为档案；玩家单位忽略。 */
  aiProfile?: "melee" | "ranged" | "tank";
}

export type StatusId = "burn" | "stun" | "vulnerable";

export interface ActiveStatus {
  id: StatusId;
  /** 剩余回合数；在该单位所属阵营回合开始时递减。 */
  duration: number;
  /** 施加时记录的强度（如燃烧伤害），可选。 */
  magnitude?: number;
}

/** 运行时单位实例（出现在 BattleState 中）。 */
export interface Unit {
  /** 战场内唯一实例 id，例如 "p_wind_mage_0"。 */
  instanceId: string;
  /** 指向 UnitDef.id。 */
  defId: string;
  name: string;
  faction: Faction;
  pos: Position;
  facing: Direction;
  hp: number;
  maxHp: number;
  stats: UnitStats;
  skills: string[];
  statuses: ActiveStatus[];
  /** 本回合是否已移动。 */
  movedThisTurn: boolean;
  /** 本回合是否已使用主动技能。 */
  actedThisTurn: boolean;
  /** 技能冷却：skillId -> 剩余回合。 */
  cooldowns: Record<string, number>;
  /** 行动充能值（charge time）。达到阈值即可行动，行动后扣除阈值。 */
  ct: number;
  /** 当前等级（出战由档案/关卡 enemyLevel 注入；战斗内击杀升级会就地提升）。 */
  level: number;
  /** 累计总经验（战斗内击杀累加，战后回填档案）。 */
  xp: number;
  /** 每个技能的等级（默认视为 1；缺省即 1）。影响伤害/治疗倍率。 */
  skillLevels: Record<string, number>;
  aiProfile?: "melee" | "ranged" | "tank";
}

export function cloneUnit(u: Unit): Unit {
  return {
    instanceId: u.instanceId,
    defId: u.defId,
    name: u.name,
    faction: u.faction,
    pos: { x: u.pos.x, y: u.pos.y },
    facing: u.facing,
    hp: u.hp,
    maxHp: u.maxHp,
    stats: { ...u.stats },
    skills: [...u.skills],
    statuses: u.statuses.map((s) => ({ ...s })),
    movedThisTurn: u.movedThisTurn,
    actedThisTurn: u.actedThisTurn,
    cooldowns: { ...u.cooldowns },
    ct: u.ct,
    level: u.level,
    xp: u.xp,
    skillLevels: { ...u.skillLevels },
    aiProfile: u.aiProfile,
  };
}

export function isAlive(u: Unit): boolean {
  return u.hp > 0;
}

export function hasStatus(u: Unit, id: StatusId): boolean {
  return u.statuses.some((s) => s.id === id);
}

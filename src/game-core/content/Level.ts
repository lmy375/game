/**
 * 关卡定义与加载。loadLevel 是纯函数：LevelDef + Registry -> 初始 BattleState。
 */
import { GridBoard } from "../board/GridBoard";
import { TerrainType } from "../board/terrain";
import { BattleState } from "../state/BattleState";
import { Unit, UnitStats } from "../unit/Unit";
import { ContentRegistry } from "./Registry";
import { CT_THRESHOLD, initInitiative } from "../turn/turn";

export interface LevelUnitPlacement {
  unitId: string;
  x: number;
  y: number;
}

export interface LevelDef {
  id: string;
  name: string;
  /** 表现层背景资源 ID；核心逻辑不依赖该字段。 */
  backgroundId?: string;
  teach?: string;
  /** 教学关卡可指定玩家先手；后续行动仍由 CT 速度系统接管。 */
  playerFirst?: boolean;
  board: {
    width: number;
    height: number;
    tiles?: { x: number; y: number; terrain: TerrainType }[];
  };
  playerUnits: LevelUnitPlacement[];
  enemyUnits: LevelUnitPlacement[];
  /** 本关敌方属性覆盖（按 defId 覆盖部分字段，烘焙固定难度曲线）。缺省=units.json 基础值。 */
  enemyStatOverrides?: Record<string, Partial<UnitStats>>;
  winCondition: { type: "defeat_all_enemies" };
}

export function loadLevel(level: LevelDef, registry: ContentRegistry): BattleState {
  const board = GridBoard.from(level.board);
  const units: Unit[] = [];

  const place = (p: LevelUnitPlacement, idx: number) => {
    const def = registry.unit(p.unitId);
    // 敌方按关卡覆盖表烘焙固定属性（玩家属性由装备系统在装配层决定）。
    const stats: UnitStats =
      def.faction === "enemy" ? { ...def.stats, ...level.enemyStatOverrides?.[def.id] } : { ...def.stats };
    const unit: Unit = {
      instanceId: `${def.faction === "player" ? "p" : "e"}_${def.id}_${idx}`,
      defId: def.id,
      name: def.name,
      faction: def.faction,
      pos: { x: p.x, y: p.y },
      facing: def.faction === "player" ? "right" : "left",
      hp: stats.hp,
      maxHp: stats.hp,
      stats,
      skills: [...def.skills],
      statuses: [],
      movedThisTurn: false,
      actedThisTurn: false,
      cooldowns: {},
      ct: 0,
      aiProfile: def.aiProfile,
    };
    units.push(unit);
  };

  level.playerUnits.forEach((p, i) => place(p, i));
  level.enemyUnits.forEach((p, i) => place(p, i));

  const state: BattleState = {
    board,
    units,
    turn: "player",
    activeUnitId: null,
    turnCount: 0,
    outcome: null,
  };
  if (level.playerFirst) {
    for (const u of units) u.ct = u.faction === "player" ? CT_THRESHOLD : 0;
  }
  // 按速度选出首个行动单位
  initInitiative(state);
  return state;
}

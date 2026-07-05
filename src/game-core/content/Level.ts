/**
 * 关卡定义与加载。loadLevel 是纯函数：LevelDef + Registry -> 初始 BattleState。
 */
import { GridBoard } from "../board/GridBoard";
import { TerrainType } from "../board/terrain";
import { BattleState } from "../state/BattleState";
import { Unit } from "../unit/Unit";
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
  /** 敌方等级：按 enemyGrowth 缩放敌人属性（缺省=1，不缩放）。体现「敌人随进度成长」。 */
  enemyLevel?: number;
  winCondition: { type: "defeat_all_enemies" };
}

export function loadLevel(level: LevelDef, registry: ContentRegistry): BattleState {
  const board = GridBoard.from(level.board);
  const units: Unit[] = [];

  const place = (p: LevelUnitPlacement, idx: number) => {
    const def = registry.unit(p.unitId);
    const unit: Unit = {
      instanceId: `${def.faction === "player" ? "p" : "e"}_${def.id}_${idx}`,
      defId: def.id,
      name: def.name,
      faction: def.faction,
      pos: { x: p.x, y: p.y },
      facing: def.faction === "player" ? "right" : "left",
      hp: def.stats.hp,
      maxHp: def.stats.hp,
      stats: { ...def.stats },
      skills: [...def.skills],
      statuses: [],
      movedThisTurn: false,
      actedThisTurn: false,
      cooldowns: {},
      ct: 0,
      level: 1,
      xp: 0,
      skillLevels: {},
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

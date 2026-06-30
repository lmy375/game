/**
 * 关卡定义与加载。loadLevel 是纯函数：LevelDef + Registry -> 初始 BattleState。
 */
import { GridBoard } from "../board/GridBoard";
import { TerrainType } from "../board/terrain";
import { BattleState } from "../state/BattleState";
import { Unit } from "../unit/Unit";
import { ContentRegistry } from "./Registry";
import { initInitiative } from "../turn/turn";

export interface LevelUnitPlacement {
  unitId: string;
  x: number;
  y: number;
}

export interface LevelDef {
  id: string;
  name: string;
  teach?: string;
  board: {
    width: number;
    height: number;
    tiles?: { x: number; y: number; terrain: TerrainType }[];
  };
  playerUnits: LevelUnitPlacement[];
  enemyUnits: LevelUnitPlacement[];
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
  // 按速度选出首个行动单位
  initInitiative(state);
  return state;
}

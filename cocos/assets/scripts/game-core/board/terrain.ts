// ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
/**
 * 地形定义。MVP 实现：普通地面、墙体、障碍物、火焰地形、陷阱格。
 */

export type TerrainType = "ground" | "wall" | "obstacle" | "fire" | "trap";

export interface TerrainProfile {
  type: TerrainType;
  /** 是否阻挡移动（无法穿过/停留） */
  blocksMove: boolean;
  /** 是否可被单位站立 */
  walkable: boolean;
  /** 是否阻挡位移（推/拉到此格会停下） */
  blocksDisplacement: boolean;
  /** 进入或停留时是否触发地形效果（火焰、陷阱） */
  triggersOnEnter: boolean;
  /** 是否可被技能破坏（障碍物） */
  destructible: boolean;
}

export const TERRAIN: Record<TerrainType, TerrainProfile> = {
  ground: {
    type: "ground",
    blocksMove: false,
    walkable: true,
    blocksDisplacement: false,
    triggersOnEnter: false,
    destructible: false,
  },
  wall: {
    type: "wall",
    blocksMove: true,
    walkable: false,
    blocksDisplacement: true,
    triggersOnEnter: false,
    destructible: false,
  },
  obstacle: {
    type: "obstacle",
    blocksMove: true,
    walkable: false,
    blocksDisplacement: true,
    triggersOnEnter: false,
    destructible: true,
  },
  fire: {
    type: "fire",
    blocksMove: false,
    walkable: true,
    blocksDisplacement: false,
    triggersOnEnter: true,
    destructible: false,
  },
  trap: {
    type: "trap",
    blocksMove: false,
    walkable: true,
    blocksDisplacement: false,
    triggersOnEnter: true,
    destructible: false,
  },
};

/** 地形进入/停留时造成的固定伤害（MVP 简化）。 */
export const TERRAIN_DAMAGE: Partial<Record<TerrainType, number>> = {
  fire: 20,
  trap: 35,
};

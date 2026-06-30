// ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
/**
 * 玩家档案：跨战斗存活的养成数据。纯数据 + 纯拷贝/查询函数，零引擎依赖。
 * xp 存「累计总经验」，等级由经验曲线推导（见 leveling），避免余量记账 bug。
 */

/** 单个玩家单位的持久进度。 */
export interface UnitProgress {
  /** 指向 UnitDef.id，如 "wind_mage"。 */
  defId: string;
  level: number;
  /** 累计总经验。 */
  xp: number;
  /** 已学会的技能（UnitDef.skills 的子集，出战时写入单位 skills）。 */
  learnedSkills: string[];
  /** 已装备的物品 id；null = 未装备。 */
  equipped: string | null;
}

export interface PlayerProfile {
  units: UnitProgress[];
  /** 背包中的物品 id（未装备的，可含消耗品）。 */
  inventory: string[];
  /** 当前剧情节点 id。 */
  storyNodeId: string;
}

/** 带版本号的存档根，便于将来迁移。 */
export interface SaveData {
  version: 1;
  profile: PlayerProfile;
}

export function unitProgress(p: PlayerProfile, defId: string): UnitProgress | undefined {
  return p.units.find((u) => u.defId === defId);
}

export function cloneUnitProgress(up: UnitProgress): UnitProgress {
  return {
    defId: up.defId,
    level: up.level,
    xp: up.xp,
    learnedSkills: [...up.learnedSkills],
    equipped: up.equipped,
  };
}

export function cloneProfile(p: PlayerProfile): PlayerProfile {
  return {
    units: p.units.map(cloneUnitProgress),
    inventory: [...p.inventory],
    storyNodeId: p.storyNodeId,
  };
}

export function cloneSaveData(s: SaveData): SaveData {
  return { version: s.version, profile: cloneProfile(s.profile) };
}

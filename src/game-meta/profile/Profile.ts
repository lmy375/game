/**
 * 玩家档案：跨战斗存活的养成数据。纯数据 + 纯拷贝/查询函数，零引擎依赖。
 * 单位没有等级/经验：属性 = 基础值 + 装备加成；技能来自技能栏里的技能道具（秘卷）。
 */
import { EquippedSlots } from "../items/Items";

/** 单个玩家单位的持久进度。 */
export interface UnitProgress {
  /** 指向 UnitDef.id，如 "wind_mage"。 */
  defId: string;
  /** 三槽已装备物品 id（武器/护甲/饰品），null=空。 */
  equipped: EquippedSlots;
  /** 技能栏：SKILL_SLOT_COUNT 格，存技能道具 itemId（同 equipped 的模式），null=空。 */
  skillSlots: (string | null)[];
}

export interface PlayerProfile {
  units: UnitProgress[];
  /** 背包中的物品 id（未装备的，可含消耗品）。 */
  inventory: string[];
  /** 当前剧情节点 id。 */
  storyNodeId: string;
}

/**
 * 存档版本。version 2 起装备为三槽；version 3 起移除普攻、技能全面 AOE 化；
 * version 4 起移除等级/经验/加点，技能改为技能道具（旧档不迁移，视同无存档）。
 */
export const SAVE_VERSION = 4 as const;

/** 带版本号的存档根。 */
export interface SaveData {
  version: typeof SAVE_VERSION;
  profile: PlayerProfile;
}

export function unitProgress(p: PlayerProfile, defId: string): UnitProgress | undefined {
  return p.units.find((u) => u.defId === defId);
}

export function cloneUnitProgress(up: UnitProgress): UnitProgress {
  return {
    defId: up.defId,
    equipped: { ...up.equipped },
    skillSlots: [...up.skillSlots],
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

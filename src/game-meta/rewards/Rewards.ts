/**
 * 战斗奖励：从「最终 BattleState」推导（只读 outcome + 幸存单位，不依赖事件流），再回填档案。
 * 掉落入背包；技能道具随后自动装备到合适单位（装不上留背包）。纯函数。
 */
import { BattleState, LevelDef, livingUnits } from "@core/index";
import { PlayerProfile, cloneProfile } from "../profile/Profile";
import { ItemTable } from "../items/Items";
import { AutoEquipRecord, autoEquipSkillItems } from "../items/Inventory";

/** 每关奖励声明（数据）。 */
export interface LevelReward {
  levelId: string;
  /** 胜利时加入背包的物品 id（确定性，不随机；可含技能道具）。 */
  itemDrops: string[];
}

export type RewardTable = Record<string, LevelReward>;

/** 一场战斗实际结算出的奖励。 */
export interface Rewards {
  levelId: string;
  win: boolean;
  /** 胜利掉落（失败为空）。 */
  itemDrops: string[];
  survivingDefIds: string[];
}

/** 仅凭最终状态推导奖励。win = outcome==="player_win"。 */
export function computeRewards(levelDef: LevelDef, finalState: BattleState, table: RewardTable): Rewards {
  const reward = table[levelDef.id];
  const win = finalState.outcome === "player_win";
  return {
    levelId: levelDef.id,
    win,
    itemDrops: win && reward ? [...reward.itemDrops] : [],
    survivingDefIds: livingUnits(finalState, "player").map((u) => u.defId),
  };
}

export interface ApplyRewardsResult {
  profile: PlayerProfile;
  /** 掉落中被自动装备出去的技能道具（供结算界面标注「已装备给 ×××」）。 */
  autoEquipped: AutoEquipRecord[];
}

/** 把奖励回填到档案：掉落全部入背包，再把技能道具自动装备到合适单位。纯函数。 */
export function applyRewards(profile: PlayerProfile, rewards: Rewards, items: ItemTable): ApplyRewardsResult {
  const next = cloneProfile(profile);
  for (const itemId of rewards.itemDrops) next.inventory.push(itemId);
  const { profile: equippedProfile, equipped } = autoEquipSkillItems(next, rewards.itemDrops, items);
  return { profile: equippedProfile, autoEquipped: equipped };
}

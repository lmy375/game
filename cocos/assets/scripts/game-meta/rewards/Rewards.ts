// ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
/**
 * 战斗奖励：从「最终 BattleState」推导（只读 outcome + 幸存单位，不依赖事件流），再回填档案。
 * 纯函数。
 */
import { BattleState, LevelDef, livingUnits } from "../../game-core/index";
import { PlayerProfile, cloneProfile, unitProgress } from "../profile/Profile";
import { gainXp, applyLevelUps, LevelUpResult } from "../leveling/Leveling";
import { MetaTables } from "../save/MetaTables";

/** 每关奖励声明（数据）。 */
export interface LevelReward {
  levelId: string;
  /** 发给每个「该单位存活」的玩家单位的经验。 */
  xpPerSurvivingUnit: number;
  /** 不论存活、发给全部单位的经验（可选）。 */
  xpFlat?: number;
  /** 胜利时加入背包的物品 id（确定性，不随机）。 */
  itemDrops: string[];
}

export type RewardTable = Record<string, LevelReward>;

/** 一场战斗实际结算出的奖励。 */
export interface Rewards {
  levelId: string;
  win: boolean;
  /** defId -> 获得经验。 */
  xpByDefId: Record<string, number>;
  /** 胜利掉落（失败为空）。 */
  itemDrops: string[];
  survivingDefIds: string[];
}

/** 仅凭最终状态推导奖励。win = outcome==="player_win"。 */
export function computeRewards(levelDef: LevelDef, finalState: BattleState, table: RewardTable): Rewards {
  const reward = table[levelDef.id];
  const win = finalState.outcome === "player_win";
  const survivingDefIds = livingUnits(finalState, "player").map((u) => u.defId);

  const xpByDefId: Record<string, number> = {};
  if (win && reward) {
    // 参战的玩家 defId（含阵亡者，用于发放保底经验）。
    const allPlayerDefIds = new Set(finalState.units.filter((u) => u.faction === "player").map((u) => u.defId));
    for (const defId of allPlayerDefIds) {
      const survived = survivingDefIds.includes(defId);
      const xp = (reward.xpFlat ?? 0) + (survived ? reward.xpPerSurvivingUnit : 0);
      if (xp > 0) xpByDefId[defId] = xp;
    }
  }

  return {
    levelId: levelDef.id,
    win,
    xpByDefId,
    itemDrops: win && reward ? [...reward.itemDrops] : [],
    survivingDefIds,
  };
}

export interface ApplyRewardsResult {
  profile: PlayerProfile;
  /** 发生等级变化的单位（供结算界面展示）。 */
  levelUps: LevelUpResult[];
}

/** 把奖励回填到档案：加经验 → 升级 → 掉落入背包。纯函数。 */
export function applyRewards(profile: PlayerProfile, rewards: Rewards, tables: MetaTables): ApplyRewardsResult {
  const next = cloneProfile(profile);
  const levelUps: LevelUpResult[] = [];

  for (const [defId, xp] of Object.entries(rewards.xpByDefId)) {
    const up = unitProgress(next, defId);
    if (!up) continue;
    const gained = gainXp(up, xp);
    const result = applyLevelUps(gained, tables.progression);
    // 写回该单位的进度。
    const idx = next.units.findIndex((u) => u.defId === defId);
    next.units[idx] = result.progress;
    if (result.toLevel > result.fromLevel) levelUps.push(result);
  }

  for (const itemId of rewards.itemDrops) next.inventory.push(itemId);

  return { profile: next, levelUps };
}

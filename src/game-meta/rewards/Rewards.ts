/**
 * 战斗奖励：从「最终 BattleState」推导（只读 outcome + 幸存单位，不依赖事件流），再回填档案。
 * 掉落 = 固定掉落（剧情/教学关键秘卷，确定性）+ 随机掉落（肉鸽：按本关稀有度权重先抽品质、
 * 再从该品质掉落池均匀抽物品）。随机源可注入（Rng），测试与数值验证传固定种子即可复现。
 * 掉落入背包；技能道具随后自动装备到合适单位（装不上留背包）。纯函数。
 */
import { BattleState, LevelDef, livingUnits } from "@core/index";
import { PlayerProfile, cloneProfile } from "../profile/Profile";
import { ItemTable, Rarity, RARITIES, isEquip, isConsumable } from "../items/Items";
import { AutoEquipRecord, autoEquipSkillItems } from "../items/Inventory";
import { Rng, weightedIndex } from "./rng";

/** 各稀有度的抽取权重（缺省档位视为 0，即不可抽出）。 */
export type RarityWeights = Partial<Record<Rarity, number>>;

/** 一关的随机掉落规格：抽取次数 + 稀有度权重。 */
export interface RandomDropSpec {
  /** 胜利后随机抽取的次数（每次独立抽稀有度→抽物品）。 */
  rolls: number;
  /** 稀有度权重（相对值，无需归一）。 */
  weights: RarityWeights;
}

/** 每关奖励声明（数据）。 */
export interface LevelReward {
  levelId: string;
  /** 胜利时必定入包的物品 id（剧情/教学秘卷走这里，确定性）。 */
  guaranteedDrops: string[];
  /** 随机掉落（缺省 = 本关无随机掉落）。 */
  randomDrops?: RandomDropSpec;
}

export type RewardTable = Record<string, LevelReward>;

/** 一场战斗实际结算出的奖励。 */
export interface Rewards {
  levelId: string;
  win: boolean;
  /** 胜利掉落（失败为空）：固定掉落在前，随机掉落在后。 */
  itemDrops: string[];
  survivingDefIds: string[];
}

/**
 * 随机掉落池：按稀有度分组的可掉落物品 id。
 * 只收装备与消耗品——秘卷承担剧情/教学推进，全部走固定掉落，不进随机池
 * （随机重复秘卷无法装备，只会淤积背包）。结果顺序与 ItemTable 键序一致，保证确定性。
 */
export function dropPoolsByRarity(items: ItemTable): Record<Rarity, string[]> {
  const pools: Record<Rarity, string[]> = { gray: [], green: [], blue: [], red: [], orange: [] };
  for (const def of Object.values(items)) {
    if (isEquip(def) || isConsumable(def)) pools[def.rarity].push(def.id);
  }
  return pools;
}

/**
 * 目标稀有度的池为空时的回退：先逐档向下找非空池，再逐档向上找。
 * 全部为空返回 null（本次抽取作废）。
 */
function fallbackRarity(target: Rarity, pools: Record<Rarity, string[]>): Rarity | null {
  const at = RARITIES.indexOf(target);
  for (let i = at; i >= 0; i--) if (pools[RARITIES[i]].length > 0) return RARITIES[i];
  for (let i = at + 1; i < RARITIES.length; i++) if (pools[RARITIES[i]].length > 0) return RARITIES[i];
  return null;
}

/**
 * 执行一关的随机掉落：rolls 次独立抽取，每次按权重抽稀有度、再从该稀有度池均匀抽一件。
 * 权重全部 ≤ 0 或全部池为空时返回空数组（数据错误由测试兜底，运行时不抛）。
 */
export function rollRandomDrops(spec: RandomDropSpec, items: ItemTable, rng: Rng): string[] {
  if (spec.rolls <= 0) return [];
  const pools = dropPoolsByRarity(items);
  const weights = RARITIES.map((r) => spec.weights[r] ?? 0);
  const out: string[] = [];
  for (let i = 0; i < spec.rolls; i++) {
    const idx = weightedIndex(weights, rng);
    if (idx < 0) break; // 权重全 0：整个规格不可抽，直接结束
    const rarity = fallbackRarity(RARITIES[idx], pools);
    if (!rarity) break; // 所有池为空
    const pool = pools[rarity];
    out.push(pool[Math.min(Math.floor(rng() * pool.length), pool.length - 1)]);
  }
  return out;
}

/**
 * 仅凭最终状态推导奖励。win = outcome==="player_win"。
 * 胜利掉落 = 固定掉落 + 随机掉落（顺序固定：先固定后随机，结算屏按此展示）。
 */
export function computeRewards(
  levelDef: LevelDef,
  finalState: BattleState,
  table: RewardTable,
  items: ItemTable,
  rng: Rng
): Rewards {
  const reward = table[levelDef.id];
  const win = finalState.outcome === "player_win";
  const itemDrops: string[] = [];
  if (win && reward) {
    itemDrops.push(...reward.guaranteedDrops);
    if (reward.randomDrops) itemDrops.push(...rollRandomDrops(reward.randomDrops, items, rng));
  }
  return {
    levelId: levelDef.id,
    win,
    itemDrops,
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

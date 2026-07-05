/**
 * 背包操作：装备穿脱、消耗品扣减、背包聚合。纯函数（返回新 PlayerProfile，不改入参）。
 * 背包 inventory 是玩家共享的物品 id 列表（重复即堆叠）；装备穿在单位的三槽上。
 */
import { PlayerProfile, cloneProfile, unitProgress } from "../profile/Profile";
import { EquipSlot, ItemTable, itemById, slotOf } from "./Items";

/** 背包某物品聚合数量。 */
export interface InventoryStack {
  itemId: string;
  count: number;
}

/**
 * 给某单位穿上背包里的一件装备。校验物品为装备且有槽位；该槽原有装备退回背包；itemId 出背包入槽。
 * itemId 不在背包则原样返回。
 */
export function equipItem(profile: PlayerProfile, defId: string, itemId: string, items: ItemTable): PlayerProfile {
  const def = itemById(itemId, items);
  const slot = slotOf(def);
  if (!slot) return profile; // 非装备
  const idx = profile.inventory.indexOf(itemId);
  if (idx < 0) return profile; // 背包里没有

  const next = cloneProfile(profile);
  const up = unitProgress(next, defId);
  if (!up) return profile;

  next.inventory.splice(idx, 1);
  const prev = up.equipped[slot];
  if (prev) next.inventory.push(prev); // 原装备退回背包
  up.equipped[slot] = itemId;
  return next;
}

/** 卸下某单位某槽的装备，退回背包。空槽原样返回。 */
export function unequipItem(profile: PlayerProfile, defId: string, slot: EquipSlot): PlayerProfile {
  const next = cloneProfile(profile);
  const up = unitProgress(next, defId);
  if (!up) return profile;
  const cur = up.equipped[slot];
  if (!cur) return profile;
  up.equipped[slot] = null;
  next.inventory.push(cur);
  return next;
}

/** 从背包移除一个指定物品（消耗品使用/战后结算）。不存在则原样返回。 */
export function consumeItem(profile: PlayerProfile, itemId: string): PlayerProfile {
  const idx = profile.inventory.indexOf(itemId);
  if (idx < 0) return profile;
  const next = cloneProfile(profile);
  next.inventory.splice(idx, 1);
  return next;
}

/** 背包按 itemId 聚合成堆叠（保持首次出现顺序）。 */
export function inventoryStacks(profile: PlayerProfile): InventoryStack[] {
  const order: string[] = [];
  const counts = new Map<string, number>();
  for (const id of profile.inventory) {
    if (!counts.has(id)) order.push(id);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return order.map((itemId) => ({ itemId, count: counts.get(itemId)! }));
}

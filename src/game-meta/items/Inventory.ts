/**
 * 背包操作：装备穿脱、技能道具装卸、消耗品扣减、背包聚合。纯函数（返回新 PlayerProfile，不改入参）。
 * 背包 inventory 是玩家共享的物品 id 列表（重复即堆叠）；装备穿在单位的三槽上，技能道具装在技能栏。
 */
import { PlayerProfile, UnitProgress, cloneProfile, unitProgress } from "../profile/Profile";
import { EquipSlot, ItemDef, ItemTable, isSkillItem, itemById, slotOf } from "./Items";

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

/** 某单位是否已装备了授予同一 skillId 的技能道具（同技能不同来源也算重复）。 */
function hasSkillEquipped(up: UnitProgress, skillId: string, items: ItemTable): boolean {
  return up.skillSlots.some((id) => id !== null && items[id]?.skillId === skillId);
}

/** 技能道具能否装给该单位：kind==="skill" 且 usableBy 包含 defId 且该单位未装同一技能。 */
function canEquipSkill(up: UnitProgress, def: ItemDef, items: ItemTable): boolean {
  if (!isSkillItem(def) || !def.skillId) return false;
  if (!def.usableBy?.includes(up.defId)) return false;
  return !hasSkillEquipped(up, def.skillId, items);
}

/**
 * 给某单位的技能栏装上背包里的一件技能道具。
 * 校验：物品为技能道具、usableBy 含该单位、道具在背包、该单位未装同一技能。
 * slotIndex 缺省 = 第一个空格（无空格则原样返回）；指定且被占用 = 替换（旧道具退回背包）。
 */
export function equipSkillItem(
  profile: PlayerProfile,
  defId: string,
  itemId: string,
  items: ItemTable,
  slotIndex?: number
): PlayerProfile {
  const def = itemById(itemId, items);
  const idx = profile.inventory.indexOf(itemId);
  if (idx < 0) return profile; // 背包里没有

  const current = unitProgress(profile, defId);
  if (!current || !canEquipSkill(current, def, items)) return profile;

  const target = slotIndex ?? current.skillSlots.findIndex((s) => s === null);
  if (target < 0 || target >= current.skillSlots.length) return profile; // 无空格 / 非法槽位

  const next = cloneProfile(profile);
  const up = unitProgress(next, defId)!;
  next.inventory.splice(idx, 1);
  const prev = up.skillSlots[target];
  if (prev) next.inventory.push(prev); // 原技能道具退回背包
  up.skillSlots[target] = itemId;
  return next;
}

/** 卸下某单位技能栏某格的技能道具，退回背包。空格/非法槽位原样返回。 */
export function unequipSkillItem(profile: PlayerProfile, defId: string, slotIndex: number): PlayerProfile {
  const current = unitProgress(profile, defId);
  if (!current) return profile;
  const cur = current.skillSlots[slotIndex];
  if (!cur) return profile;
  const next = cloneProfile(profile);
  const up = unitProgress(next, defId)!;
  up.skillSlots[slotIndex] = null;
  next.inventory.push(cur);
  return next;
}

/** 一次自动装备的记录（供结算屏展示「已装备给 ×××」）。 */
export interface AutoEquipRecord {
  itemId: string;
  defId: string;
}

/**
 * 掉落自动装备：对每件技能道具，按 profile.units 顺序找第一个
 * 「usableBy 允许 && 未装同一技能 && 技能栏有空格」的单位装上（道具须已在背包）。
 * 装不上则留在背包，玩家可在整备界面手动处理。
 */
export function autoEquipSkillItems(
  profile: PlayerProfile,
  itemIds: string[],
  items: ItemTable
): { profile: PlayerProfile; equipped: AutoEquipRecord[] } {
  let next = profile;
  const equipped: AutoEquipRecord[] = [];
  for (const itemId of itemIds) {
    const def = items[itemId];
    if (!def || !isSkillItem(def)) continue;
    const host = next.units.find(
      (up) => canEquipSkill(up, def, items) && up.skillSlots.includes(null)
    );
    if (!host) continue;
    const after = equipSkillItem(next, host.defId, itemId, items);
    if (after !== next) {
      next = after;
      equipped.push({ itemId, defId: host.defId });
    }
  }
  return { profile: next, equipped };
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

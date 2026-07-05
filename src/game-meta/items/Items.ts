/**
 * 道具体系：装备（三槽：武器/护甲/饰品）影响属性；消耗品可在战斗中使用（heal / cleanse）。
 * 战斗效果类型 ItemEffect 由 game-core 定义（core 只认「补血/净化」，本层负责物品元数据）。
 */
import { UnitStats, ItemEffect } from "@core/index";

export type ItemKind = "equip" | "consumable";

/** 装备槽位。 */
export type EquipSlot = "weapon" | "armor" | "accessory";

/** 全部槽位（渲染/遍历用固定顺序）。 */
export const EQUIP_SLOTS: readonly EquipSlot[] = ["weapon", "armor", "accessory"];

/** 单位已装备的三槽（null=空）。装备状态的权威形状，Profile 引用之。 */
export type EquippedSlots = Record<EquipSlot, string | null>;

/** 空装备（三槽全空）。 */
export function emptyEquipped(): EquippedSlots {
  return { weapon: null, armor: null, accessory: null };
}

/** 对某项属性的加成。hp 加成同时抬高 maxHp（见 loadout）。 */
export interface StatBonus {
  stat: keyof UnitStats;
  amount: number;
}

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  description: string;
  /** kind==="equip" 时存在：所属槽位。 */
  slot?: EquipSlot;
  /** kind==="equip" 时存在：属性加成。 */
  bonus?: StatBonus[];
  /** kind==="consumable" 时存在：战斗效果。 */
  effect?: ItemEffect;
  /** kind==="consumable" 时存在：目标射程（0=仅自身，缺省 0）。 */
  range?: number;
}

export type ItemTable = Record<string, ItemDef>;

export function isEquip(item: ItemDef): boolean {
  return item.kind === "equip";
}

export function isConsumable(item: ItemDef): boolean {
  return item.kind === "consumable";
}

export function itemById(id: string, items: ItemTable): ItemDef {
  const def = items[id];
  if (!def) throw new Error(`未知物品: ${id}`);
  return def;
}

/** 装备物品的槽位（非装备或缺 slot 返回 undefined）。 */
export function slotOf(item: ItemDef): EquipSlot | undefined {
  return isEquip(item) ? item.slot : undefined;
}

/** 单件装备的属性加成（未装备或非装备类返回空）。 */
export function bonusOf(equippedId: string | null, items: ItemTable): StatBonus[] {
  if (!equippedId) return [];
  const def = items[equippedId];
  if (!def || !isEquip(def) || !def.bonus) return [];
  return def.bonus;
}

/** 三槽已装备物品的属性加成合计。 */
export function equipBonusesFor(equipped: EquippedSlots, items: ItemTable): StatBonus[] {
  const out: StatBonus[] = [];
  for (const id of Object.values(equipped)) out.push(...bonusOf(id, items));
  return out;
}

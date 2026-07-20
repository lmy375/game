/**
 * 道具体系：装备（三槽：武器/护甲/饰品）影响属性；消耗品可在战斗中使用（heal / cleanse）；
 * 技能道具（秘卷）装入单位的技能栏，出战时决定该单位可用技能。
 * 战斗效果类型 ItemEffect 由 game-core 定义（core 只认「补血/净化」，本层负责物品元数据）。
 */
import { UnitStats, ItemEffect } from "@core/index";

export type ItemKind = "equip" | "consumable" | "skill";

/** 稀有度：五档，由低到高（灰/绿/蓝/红/橙）。 */
export type Rarity = "gray" | "green" | "blue" | "red" | "orange";

/** 全部稀有度（由低到高的固定顺序，权重表与降档回退都依赖此序）。 */
export const RARITIES: readonly Rarity[] = ["gray", "green", "blue", "red", "orange"];

/** 稀有度中文名（UI 展示）。 */
export const RARITY_LABELS: Record<Rarity, string> = {
  gray: "普通",
  green: "优良",
  blue: "稀有",
  red: "史诗",
  orange: "传说",
};

/** 稀有度序号（gray=0 … orange=4），用于排序与比较。 */
export function rarityRank(r: Rarity): number {
  return RARITIES.indexOf(r);
}

/** 每个单位的技能栏格数。 */
export const SKILL_SLOT_COUNT = 5;

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
  /** 稀有度（掉落权重与 UI 配色都用它）。 */
  rarity: Rarity;
  description: string;
  /** kind==="equip" 时存在：所属槽位。 */
  slot?: EquipSlot;
  /** kind==="equip" 时存在：属性加成。 */
  bonus?: StatBonus[];
  /** kind==="consumable" 时存在：战斗效果。 */
  effect?: ItemEffect;
  /** kind==="consumable" 时存在：目标射程（0=仅自身，缺省 0）。 */
  range?: number;
  /** kind==="skill" 时存在：装入技能栏后授予的技能 id。 */
  skillId?: string;
  /** kind==="skill" 时存在：可装备该技能的单位 defId 列表（显式声明，数据一致性由测试保证）。 */
  usableBy?: string[];
}

export type ItemTable = Record<string, ItemDef>;

export function isEquip(item: ItemDef): boolean {
  return item.kind === "equip";
}

export function isConsumable(item: ItemDef): boolean {
  return item.kind === "consumable";
}

export function isSkillItem(item: ItemDef): boolean {
  return item.kind === "skill";
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

/** 技能栏（技能道具 itemId 列表）映射为技能 id 列表，跳过空格与非法项。出战装配与 VM 共用。 */
export function skillIdsOf(skillSlots: readonly (string | null)[], items: ItemTable): string[] {
  const out: string[] = [];
  for (const itemId of skillSlots) {
    if (!itemId) continue;
    const def = items[itemId];
    if (def && isSkillItem(def) && def.skillId) out.push(def.skillId);
  }
  return out;
}

// ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
/**
 * 道具体系：装备影响属性（本期实装）；消耗品仅预留数据模型，战斗中使用未实装。
 */
import { UnitStats } from "../../game-core/index";

export type ItemKind = "equip" | "consumable";

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
  /** kind==="equip" 时存在。 */
  bonus?: StatBonus[];
  /** kind==="consumable" 时存在（数据模型支持，使用未实装）。 */
  effect?: { type: "heal"; amount: number } | { type: "cleanse" };
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

/** 已装备物品的属性加成（未装备或非装备类返回空）。 */
export function equipBonusFor(equippedId: string | null, items: ItemTable): StatBonus[] {
  if (!equippedId) return [];
  const def = items[equippedId];
  if (!def || !isEquip(def) || !def.bonus) return [];
  return def.bonus;
}

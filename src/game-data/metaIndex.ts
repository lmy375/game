/**
 * 元数据出口：导入养成/剧情 JSON，构建强类型 MetaTables 与起始存档。
 * 与 index.ts（战斗内容）平行、互不影响；meta 数据按需引入。
 */
import { MetaTables, SaveData, SAVE_VERSION, SKILL_SLOT_COUNT, ItemDef, ItemTable, RewardTable, StoryGraph } from "@meta/index";
import itemsRaw from "./items.json";
import levelRewardsRaw from "./levelRewards.json";
import storyRaw from "./story.json";

// JSON 字面量会被推断得过宽（string / number[]），断言为强类型（结构由测试保证）。
const itemList = itemsRaw as unknown as ItemDef[];
const levelRewards = levelRewardsRaw as unknown as RewardTable;
const story = storyRaw as unknown as StoryGraph;

export function loadMetaTables(): MetaTables {
  const items: ItemTable = {};
  for (const it of itemList) items[it.id] = it;
  return { items, levelRewards, story };
}

/**
 * 起始存档（深拷贝返回，调用方可安全改）。
 * 每人起手 = 基础技（cd0 AOE）+ 招牌技的秘卷（预装技能栏）。关键节奏：wind_mage 缺 push_wave ——
 * 第一关掉落其秘卷并自动装备，第二关可用。lancer 起手 sweep/pierce_shot（换位术秘卷第 2 关掉）；
 * ice_mage 仅 frost_bolt（冰封秘卷第 4 关掉，入队即赶上教学）。
 */
export function initialSaveData(): SaveData {
  const equipSlots = () => ({ weapon: null, armor: null, accessory: null });
  const skillSlots = (...tomes: string[]) =>
    [...tomes, ...Array(SKILL_SLOT_COUNT - tomes.length).fill(null)] as (string | null)[];
  return {
    version: SAVE_VERSION,
    profile: {
      units: [
        { defId: "wind_mage", equipped: equipSlots(), skillSlots: skillSlots("tome_wind_blade", "tome_gale_gather") },
        { defId: "fire_mage", equipped: equipSlots(), skillSlots: skillSlots("tome_fire_bolt", "tome_cross_fire") },
        { defId: "lancer", equipped: equipSlots(), skillSlots: skillSlots("tome_sweep", "tome_pierce_shot") },
        { defId: "swordsman", equipped: equipSlots(), skillSlots: skillSlots("tome_crescent_slash", "tome_guard_break") },
        { defId: "ice_mage", equipped: equipSlots(), skillSlots: skillSlots("tome_frost_bolt") },
      ],
      // 起始背包：装备与消耗品各若干，功能开箱即用。
      inventory: ["iron_sword", "leather_armor", "minor_potion", "minor_potion", "purify_herb"],
      storyNodeId: story.startId,
    },
  };
}

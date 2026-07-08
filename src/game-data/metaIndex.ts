/**
 * 元数据出口：导入养成/剧情 JSON，构建强类型 MetaTables 与起始存档。
 * 与 index.ts（战斗内容）平行、互不影响；meta 数据按需引入。
 */
import {
  MetaTables,
  SaveData,
  ProgressionTables,
  ItemDef,
  ItemTable,
  RewardTable,
  StoryGraph,
} from "@meta/index";
import progressionRaw from "./progression.json";
import itemsRaw from "./items.json";
import levelRewardsRaw from "./levelRewards.json";
import storyRaw from "./story.json";

// JSON 字面量会被推断得过宽（string / number[]），断言为强类型（结构由测试保证）。
const progression = progressionRaw as unknown as ProgressionTables;
const itemList = itemsRaw as unknown as ItemDef[];
const levelRewards = levelRewardsRaw as unknown as RewardTable;
const story = storyRaw as unknown as StoryGraph;

export function loadMetaTables(): MetaTables {
  const items: ItemTable = {};
  for (const it of itemList) items[it.id] = it;
  return { progression, items, levelRewards, story };
}

/**
 * 起始存档（深拷贝返回，调用方可安全改）。
 * 关键：wind_mage 仅 [normal_attack, gale_gather]，缺 push_wave —— 打完第一关升到 2 级才解锁，
 * 第二关 buildBattleState 中可见。lancer 起手仅 normal_attack（pierce_shot@2, swap_skill@3）。
 */
export function initialSaveData(): SaveData {
  const slots = () => ({ weapon: null, armor: null, accessory: null });
  return {
    version: 2,
    profile: {
      units: [
        { defId: "wind_mage", level: 1, xp: 0, learnedSkills: ["normal_attack", "gale_gather"], equipped: slots(), unspentPoints: 0, allocated: {}, skillLevels: {} },
        { defId: "fire_mage", level: 1, xp: 0, learnedSkills: ["normal_attack", "cross_fire"], equipped: slots(), unspentPoints: 0, allocated: {}, skillLevels: {} },
        { defId: "lancer", level: 1, xp: 0, learnedSkills: ["normal_attack", "pierce_shot"], equipped: slots(), unspentPoints: 0, allocated: {}, skillLevels: {} },
        { defId: "swordsman", level: 1, xp: 0, learnedSkills: ["normal_attack", "guard_break"], equipped: slots(), unspentPoints: 0, allocated: {}, skillLevels: {} },
        { defId: "ice_mage", level: 1, xp: 0, learnedSkills: ["normal_attack", "frost_bolt"], equipped: slots(), unspentPoints: 0, allocated: {}, skillLevels: {} },
      ],
      // 起始背包：装备与消耗品各若干，功能开箱即用。
      inventory: ["iron_sword", "leather_armor", "minor_potion", "minor_potion", "purify_herb"],
      storyNodeId: story.startId,
    },
  };
}

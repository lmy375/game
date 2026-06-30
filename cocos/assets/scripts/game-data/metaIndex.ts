// ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
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
} from "../game-meta/index";
import progressionRaw from "./progression";
import itemsRaw from "./items";
import levelRewardsRaw from "./levelRewards";
import storyRaw from "./story";

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
  return {
    version: 1,
    profile: {
      units: [
        { defId: "wind_mage", level: 1, xp: 0, learnedSkills: ["normal_attack", "gale_gather"], equipped: null },
        { defId: "fire_mage", level: 1, xp: 0, learnedSkills: ["normal_attack", "cross_fire"], equipped: null },
        { defId: "lancer", level: 1, xp: 0, learnedSkills: ["normal_attack"], equipped: null },
      ],
      inventory: [],
      storyNodeId: story.startId,
    },
  };
}

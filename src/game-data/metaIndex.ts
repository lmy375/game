/**
 * 元数据出口：导入养成/剧情 JSON，构建强类型 MetaTables 与起始存档。
 * 与 index.ts（战斗内容）平行、互不影响；meta 数据按需引入。
 */
import {
  MetaTables,
  SaveData,
  PlayerProfile,
  ProgressionTables,
  ItemDef,
  ItemTable,
  RewardTable,
  StoryGraph,
  cloneProfile,
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
 * 每人起手 = 基础技（cd0 AOE）+ 招牌技。关键节奏：wind_mage 缺 push_wave ——
 * 打完第一关升到 2 级才解锁，第二关 buildBattleState 中可见。lancer 起手
 * sweep/pierce_shot（swap_skill@3）；ice_mage 仅 frost_bolt（freeze@3 入队时自然解锁）。
 */
export function initialSaveData(): SaveData {
  const slots = () => ({ weapon: null, armor: null, accessory: null });
  return {
    version: 3,
    profile: {
      units: [
        { defId: "wind_mage", level: 1, xp: 0, learnedSkills: ["wind_blade", "gale_gather"], equipped: slots(), unspentPoints: 0, allocated: {}, skillLevels: {} },
        { defId: "fire_mage", level: 1, xp: 0, learnedSkills: ["fire_bolt", "cross_fire"], equipped: slots(), unspentPoints: 0, allocated: {}, skillLevels: {} },
        { defId: "lancer", level: 1, xp: 0, learnedSkills: ["sweep", "pierce_shot"], equipped: slots(), unspentPoints: 0, allocated: {}, skillLevels: {} },
        { defId: "swordsman", level: 1, xp: 0, learnedSkills: ["crescent_slash", "guard_break"], equipped: slots(), unspentPoints: 0, allocated: {}, skillLevels: {} },
        { defId: "ice_mage", level: 1, xp: 0, learnedSkills: ["frost_bolt"], equipped: slots(), unspentPoints: 0, allocated: {}, skillLevels: {} },
      ],
      // 起始背包：装备与消耗品各若干，功能开箱即用。
      inventory: ["iron_sword", "leather_armor", "minor_potion", "minor_potion", "purify_herb"],
      storyNodeId: story.startId,
    },
  };
}

/** v3 移除普攻后，各单位顶替它的基础技（cd0 AOE），迁移旧档时补入。 */
const LEGACY_BASIC_SKILL: Record<string, string> = {
  wind_mage: "wind_blade",
  fire_mage: "fire_bolt",
  lancer: "sweep",
  swordsman: "crescent_slash",
  ice_mage: "frost_bolt",
};

/**
 * 迁移 v2 存档到 v3：剔除已删除的 normal_attack，补入该单位的新基础技，
 * 并把 normal_attack 上已投入的技能等级转移到基础技（不低于其现有等级）。
 * 非 v2 结构返回 null（调用方按无存档处理）。
 */
export function migrateLegacySave(raw: unknown): SaveData | null {
  const parsed = raw as { version?: number; profile?: PlayerProfile } | null;
  if (!parsed || parsed.version !== 2 || !parsed.profile || !Array.isArray(parsed.profile.units)) return null;

  const profile = cloneProfile(parsed.profile);
  for (const unit of profile.units) {
    const basic = LEGACY_BASIC_SKILL[unit.defId];
    const kept = unit.learnedSkills.filter((id) => id !== "normal_attack");
    if (basic && !kept.includes(basic)) kept.unshift(basic);
    unit.learnedSkills = [...new Set(kept)];

    const legacyLevel = unit.skillLevels["normal_attack"];
    delete unit.skillLevels["normal_attack"];
    if (basic && legacyLevel !== undefined) {
      unit.skillLevels[basic] = Math.max(unit.skillLevels[basic] ?? 1, legacyLevel);
    }
  }
  return { version: 3, profile };
}

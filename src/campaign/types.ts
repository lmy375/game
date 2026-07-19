/**
 * 流程编排层公共类型：屏幕 ViewModel（纯数据）与 CampaignHost（表现层实现的呈现钩子）。
 * 引擎无关：只认识 game-core / game-meta 的数据，不认识 DOM / 引擎。镜像 interaction 的 ViewModel/Host 形状。
 */
import { BattleState, LevelDef, UnitStats } from "@core/index";
import { EquipSlot } from "@meta/index";
import { BattleItem, UnitStatPatch } from "../interaction";

/** 立绘 token：复用「圆盘 + 字形」单位视觉语言，无图片资源。 */
export interface PortraitVM {
  glyph: string;
  faction: "player" | "enemy" | "neutral";
  role?: "tank" | "ranged" | "melee" | "mage";
  name?: string;
}

export interface TitleVM {
  title: string;
  subtitle?: string;
  hasSave: boolean;
  buttons: { id: "new" | "continue" | "loadout"; label: string; enabled: boolean }[];
}

export interface CutsceneLineVM {
  portrait?: PortraitVM;
  speaker?: string;
  text: string;
}

export interface CutsceneVM {
  nodeId: string;
  /** 全部台词；表现层只显示前 cursor+1 行（逐行揭示）。 */
  lines: CutsceneLineVM[];
  cursor: number;
  continueLabel: string;
  /** 「跳过」按钮文案：一键跳过整段剧情，直接进入下一节点。 */
  skipLabel: string;
}

export interface ResultItemVM {
  name: string;
  description: string;
  /** 技能道具被自动装备时：接收单位的名字（供结算屏标注「已装备给 ×××」）。 */
  equippedTo?: string;
}

/** 单条属性的展示行（整备界面属性预览）。 */
export interface StatRowVM {
  key: keyof UnitStats;
  label: string;
  value: number;
}

export interface ResultVM {
  win: boolean;
  title: string;
  itemsGained: ResultItemVM[];
  /** 胜利=继续推进；失败=重试本战。 */
  primary: { id: "advance" | "retry"; label: string };
  /** 次要按钮：进入整备界面（仅胜利时提供）。 */
  secondary?: { id: "loadout"; label: string };
}

// ---------- 整备界面 ----------

/** 一条属性加成的展示（如「攻击 +4」）。 */
export interface StatBonusVM {
  label: string;
  amount: number;
}

/** 背包中一件物品的展示（装备/技能道具/消耗品通用）。 */
export interface InventoryItemVM {
  itemId: string;
  name: string;
  description: string;
  /** 装备槽位（非装备为 undefined）。 */
  slot?: EquipSlot;
  /** 装备的属性加成（非装备为 undefined）。 */
  bonuses?: StatBonusVM[];
  /** 技能道具的可装备单位 defId 列表（非技能道具为 undefined，供整备界面按单位过滤）。 */
  usableBy?: string[];
  count: number;
}

/** 单位一个装备槽的展示。 */
export interface LoadoutSlotVM {
  slot: EquipSlot;
  label: string;
  /** 已装备物品（空槽为 undefined）。 */
  item?: { itemId: string; name: string; description: string; bonuses?: StatBonusVM[] };
}

/** 单位技能栏一格的展示。 */
export interface SkillSlotVM {
  index: number;
  /** 已装入的技能道具（空格为 undefined）。 */
  item?: { itemId: string; name: string; description: string };
}

/** 整备界面里一个单位的面板。 */
export interface LoadoutUnitVM {
  defId: string;
  name: string;
  portrait: PortraitVM;
  slots: LoadoutSlotVM[];
  /** 技能栏（固定 SKILL_SLOT_COUNT 格）。 */
  skillSlots: SkillSlotVM[];
  /** 属性预览（含装备加成）。 */
  stats: StatRowVM[];
}

export interface LoadoutVM {
  units: LoadoutUnitVM[];
  /** 背包中的装备（可穿）。 */
  equipInventory: InventoryItemVM[];
  /** 背包中的技能道具（可装入技能栏）。 */
  skillInventory: InventoryItemVM[];
  /** 背包中的消耗品（只读展示，战斗中使用）。 */
  consumables: InventoryItemVM[];
  back: { id: "back"; label: string };
}

export interface EndingVM {
  title: string;
  lines: string[];
  buttons: { id: "toTitle"; label: string }[];
}

/**
 * 表现层实现的屏幕呈现面。镜像 SessionHost：纯数据进，意图回调出（回调由 Director 提供，平台按钮触发）。
 * 所有 show* 同步渲染；战斗交给已有的战斗层（startBattle）。
 */
/**
 * startBattle 的战斗钩子（表现层原样转交给交互层 BattleSessionHooks）。
 * onEnd=分出胜负回调；battleItems/onItemConsumed=消耗品池与扣减；
 * onOpenLoadout=战斗中点「休整」时打开整备界面。
 */
export interface CampaignBattleHooks {
  onEnd(outcome: BattleState["outcome"], finalState: BattleState): void;
  battleItems: BattleItem[];
  onItemConsumed(itemId: string): void;
  onOpenLoadout(): void;
}

export interface CampaignHost {
  showTitle(vm: TitleVM): void;
  showCutscene(vm: CutsceneVM): void;
  showResult(vm: ResultVM): void;
  showEnding(vm: EndingVM): void;
  showLoadout(vm: LoadoutVM): void;
  /** 隐藏全部剧情屏幕，露出底下可交互的战斗棋盘。 */
  hideScreens(): void;
  /** 把一场「预先装配好的」战斗交给战斗层。战斗结束时 host 需回调 hooks.onEnd（接到 Director）。 */
  startBattle(state: BattleState, level: LevelDef, hooks: CampaignBattleHooks): void;
  /** 战斗中整备（休整）关闭后：把按档案重算的我方属性补丁应用到进行中的战斗。 */
  updateBattleUnitStats(patches: UnitStatPatch[]): void;
}

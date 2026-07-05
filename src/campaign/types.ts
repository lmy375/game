/**
 * 流程编排层公共类型：屏幕 ViewModel（纯数据）与 CampaignHost（表现层实现的呈现钩子）。
 * 引擎无关：只认识 game-core / game-meta 的数据，不认识 DOM / 引擎。镜像 interaction 的 ViewModel/Host 形状。
 */
import { BattleState, BattleEvent, LevelDef, UnitStats } from "@core/index";
import { EquipSlot } from "@meta/index";
import { BattleItem } from "../interaction";

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
}

export interface ResultLevelUpVM {
  portrait: PortraitVM;
  name: string;
  fromLevel: number;
  toLevel: number;
  unlockedSkills: string[];
}

export interface ResultItemVM {
  name: string;
  description: string;
}

/** 单条可加点属性（展示当前值 + 加点按钮）。 */
export interface StatRowVM {
  key: keyof UnitStats;
  label: string;
  value: number;
}

/** 一个单位的加点面板（仅在该单位有未分配点数时出现）。 */
export interface StatAllocationVM {
  defId: string;
  name: string;
  portrait: PortraitVM;
  unspentPoints: number;
  stats: StatRowVM[];
}

export interface ResultVM {
  win: boolean;
  title: string;
  xpGained: number;
  levelUps: ResultLevelUpVM[];
  itemsGained: ResultItemVM[];
  /** 有未分配属性点的单位加点面板（无则省略）。 */
  allocations?: StatAllocationVM[];
  /** 胜利=继续推进；失败=重试本战。 */
  primary: { id: "advance" | "retry"; label: string };
  /** 次要按钮：进入整备界面（仅胜利时提供）。 */
  secondary?: { id: "loadout"; label: string };
}

// ---------- 整备界面 ----------

/** 背包中一件物品的展示（装备与消耗品通用）。 */
export interface InventoryItemVM {
  itemId: string;
  name: string;
  description: string;
  /** 装备槽位（消耗品为 undefined）。 */
  slot?: EquipSlot;
  count: number;
}

/** 单位一个装备槽的展示。 */
export interface LoadoutSlotVM {
  slot: EquipSlot;
  label: string;
  /** 已装备物品（空槽为 undefined）。 */
  item?: { itemId: string; name: string; description: string };
}

/** 整备界面里一个单位的面板。 */
export interface LoadoutUnitVM {
  defId: string;
  name: string;
  portrait: PortraitVM;
  slots: LoadoutSlotVM[];
  /** 属性预览（含装备加成）。 */
  stats: StatRowVM[];
}

export interface LoadoutVM {
  units: LoadoutUnitVM[];
  /** 背包中的装备（可穿）。 */
  equipInventory: InventoryItemVM[];
  /** 背包中的消耗品（只读展示，战斗中使用）。 */
  consumables: InventoryItemVM[];
  /** 有未分配属性点的单位加点面板（无则省略）——让攒下的点数随时可分配。 */
  allocations?: StatAllocationVM[];
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
export interface CampaignHost {
  showTitle(vm: TitleVM): void;
  showCutscene(vm: CutsceneVM): void;
  showResult(vm: ResultVM): void;
  showEnding(vm: EndingVM): void;
  showLoadout(vm: LoadoutVM): void;
  /** 隐藏全部剧情屏幕，露出底下可交互的战斗棋盘。 */
  hideScreens(): void;
  /**
   * 把一场「预先装配好的」战斗交给战斗层。战斗结束时 host 需回调 onEnd（接到 Director）。
   * battleItems=本场可用消耗品（从背包装配）；onItemConsumed=用掉一件时回调（扣背包+存档）。
   */
  startBattle(
    state: BattleState,
    level: LevelDef,
    onEnd: (outcome: BattleState["outcome"], finalState: BattleState) => void,
    onEvents: (events: BattleEvent[], state: BattleState) => BattleEvent[],
    battleItems: BattleItem[],
    onItemConsumed: (itemId: string) => void
  ): void;
}

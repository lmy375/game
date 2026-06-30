// ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
/**
 * 流程编排层公共类型：屏幕 ViewModel（纯数据）与 CampaignHost（表现层实现的呈现钩子）。
 * 引擎无关：只认识 game-core / game-meta 的数据，不认识 DOM / 引擎。镜像 interaction 的 ViewModel/Host 形状。
 */
import { BattleState, LevelDef } from "../game-core/index";

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
  buttons: { id: "new" | "continue"; label: string; enabled: boolean }[];
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

export interface ResultVM {
  win: boolean;
  title: string;
  xpGained: number;
  levelUps: ResultLevelUpVM[];
  itemsGained: ResultItemVM[];
  /** 胜利=继续推进；失败=重试本战。 */
  primary: { id: "advance" | "retry"; label: string };
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
  /** 隐藏全部剧情屏幕，露出底下可交互的战斗棋盘。 */
  hideScreens(): void;
  /**
   * 把一场「预先装配好的」战斗交给战斗层。战斗结束时 host 需回调 onEnd（接到 Director）。
   */
  startBattle(
    state: BattleState,
    level: LevelDef,
    onEnd: (outcome: BattleState["outcome"], finalState: BattleState) => void
  ): void;
}

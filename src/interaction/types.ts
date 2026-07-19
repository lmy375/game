/**
 * 交互层公共类型：ViewModel（纯数据，给任意表现层渲染）与 SessionHost（表现层需实现的钩子）。
 * 该层零引擎依赖：只认识 game-core 的状态/事件，不认识 DOM、Canvas、Pixi 或其它渲染实现。
 */
import { BattleState, Position, BattleEvent, LevelDef, ItemEffect } from "@core/index";

/**
 * 战斗内可用的一件消耗品（战役从背包装配后传入）。引擎无关：effect 为 core 级类型。
 * count 可变（用一件减一件）；count 归零后从菜单移除。
 */
export interface BattleItem {
  itemId: string;
  name: string;
  description: string;
  effect: ItemEffect;
  /** 目标射程（0=仅自身）。 */
  range: number;
  count: number;
}

/** 战斗结果（与 BattleState.outcome 同型）。 */
export type Outcome = BattleState["outcome"];

/** 叠加层（高亮/预览）数据，各表现层据此绘制；与各渲染器原有的 Overlay 结构一致。 */
export interface OverlayVM {
  selectedUnitId?: string;
  hoverCell?: Position;
  moveCells?: Position[];
  castCells?: Position[];
  hitCenter?: Position[];
  hitArm?: Position[];
  finalBoxes?: Position[];
  arrows?: { from: Position; to: Position }[];
  damage?: { pos: Position; amount: number; lethal: boolean; kind: "damage" | "heal" }[];
  hazardWarn?: Position[];
  /** 暂定移动时单位的起点标记。 */
  originCell?: Position;
  /** 我方回合：全体存活敌人的 当前格∪可达格（威胁区移动层，垫底渲染）。 */
  threatMoveCells?: Position[];
  /** 我方回合：敌人从可达站位能命中、但不在 threatMoveCells 内的攻击延伸格（更淡一档）。 */
  threatAttackCells?: Position[];
  /** 敌方回合：当前行动敌人移动前的移动范围预告。 */
  enemyMoveCells?: Position[];
}

export interface SkillButtonVM {
  id: string;
  name: string;
  /** 短描述（菜单按钮里显示）。 */
  short: string;
  /** 完整描述（tooltip）。 */
  full: string;
  cooldown: number;
  disabled: boolean;
}

/** 「调息」按钮：恢复少量生命并结束该单位行动（无事可做时的选项）。 */
export interface RestButtonVM {
  disabled: boolean;
  /** 按钮短描述（可用时显示恢复量；不可用时显示原因）。 */
  short: string;
}

export interface MenuVM {
  visible: boolean;
  unitName: string;
  /** 菜单锚定的逻辑格（具体像素定位由表现层换算）。 */
  anchorCell: Position;
  skills: SkillButtonVM[];
  showUndo: boolean;
  rest: RestButtonVM;
  /** 是否显示「休整」按钮（流程层提供整备钩子时出现）。 */
  showLoadout: boolean;
}

export interface ItemButtonVM {
  itemId: string;
  name: string;
  /** 短描述（数量等）。 */
  short: string;
  /** 完整描述（tooltip）。 */
  full: string;
  count: number;
  disabled: boolean;
}

/** 战斗内道具菜单（挂在技能菜单下方）。 */
export interface ItemMenuVM {
  visible: boolean;
  items: ItemButtonVM[];
}

export interface ConfirmVM {
  visible: boolean;
  skillName: string;
  desc: string;
  /** 是否可释放（决定「释放」按钮是否可点）。 */
  canRelease: boolean;
}

export interface OrderChipVM {
  name: string;
  kind: "now" | "player" | "enemy";
}

export interface UnitRowVM {
  name: string;
  faction: "player" | "enemy";
  dead: boolean;
  selected: boolean;
  speed: number;
  hp: number;
  maxHp: number;
  /** 当前等级（侧栏展示）。 */
  level: number;
}

export interface InfoVM {
  order: OrderChipVM[];
  players: UnitRowVM[];
  enemies: UnitRowVM[];
}

/** 一帧完整的可渲染视图模型。表现层只读它即可画出全部画面与 HUD。 */
export interface ViewModel {
  state: BattleState;
  overlay: OverlayVM;
  menu: MenuVM;
  /** 战斗内可用道具（消耗品）。 */
  items: ItemMenuVM;
  confirm: ConfirmVM;
  turnText: string;
  hint: string;
  info: InfoVM;
  /** 非空时显示胜负横幅。 */
  banner: Outcome | null;
  /** 是否处于「播放动画/敌方行动」中：带动画的表现层据此暂不快照单位位置（交由动画接管）。 */
  busy: boolean;
}

/** applyEvents 的上下文：表现层据此决定动画/节奏。 */
export interface ApplyOpts {
  /** move=玩家走位，skill=玩家技能，ai=敌方行动。 */
  kind: "move" | "skill" | "ai";
  /** 走位动画前，需把该单位的精灵重置回本回合起点再播放。 */
  resetActor?: { id: string; fromPos: Position };
}

/**
 * 表现层需实现的钩子。BattleSession 通过它把「呈现」交给具体引擎，自身不碰任何引擎 API。
 */
export interface SessionHost {
  /** 该表现层是否带动画（带动画时 Session 会在播放期间锁定输入）。 */
  readonly animates: boolean;
  /** 加载关卡：重建渲染器/场景。返回后 Session 接管驱动。 */
  setupLevel(level: LevelDef, state: BattleState): void;
  /** 用 ViewModel 刷新画面与 HUD（同步）。 */
  render(vm: ViewModel): void;
  /**
   * 呈现一段事件：无动画层可空实现；动画层在此串行播放，播放结束后把单位视觉同步到 state。
   * @param state 事件结算后的最终状态（动画层据此 sync 单位与血条）。
   */
  applyEvents(events: BattleEvent[], opts: ApplyOpts, state: BattleState): Promise<void> | void;
  /** 可选：等待 sec 秒（用于敌方行动预告的节奏停顿）。无动画表现层可不实现。 */
  delay?(sec: number): Promise<void>;
  log(msg: string): void;
  clearLog(): void;
}

/** 视为「对目标产生了实际效果」的事件类型（用于禁止空放技能）。 */
export const EFFECT_EVENTS: ReadonlySet<BattleEvent["type"]> = new Set<BattleEvent["type"]>([
  "unit_damaged",
  "unit_displaced",
  "unit_healed",
  "unit_status_applied",
  "collision_damage",
  "terrain_triggered",
  "obstacle_destroyed",
  "unit_died",
]);

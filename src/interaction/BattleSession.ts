/**
 * 交互状态机（引擎无关）：所有「玩家怎么操作」的规则集中在这里，四套表现层共用，行为天然一致。
 *
 * 行动顺序：速度初动（CT）系统，同一时刻只有一个单位行动（state.activeUnitId）。
 *   - 轮到我方单位：自动选中，显示移动范围；技能菜单默认收起。
 *   - 技能菜单在「移动之后」或「点击该单位自身」时展开（避免遮挡棋盘）。
 *   - 移动与技能顺序自由（先移后攻或先攻后移）；技能后仍可移动。
 *   - 移动为暂定，可撤销重选；释放技能即提交移动。
 *   - 技能瞄准：第一次点击锁定范围（不随指针移动），第二次点击释放；取消可退出瞄准。
 *   - 技能必须命中有效目标才能释放（禁止空放）。
 *   - 单位行动完毕（移动+技能用尽，或主动结束）即自动轮到下一个单位。
 *
 * 本类不碰任何引擎 API：呈现/动画/日志全部委托给 SessionHost；产出纯数据 ViewModel。
 */
import {
  BattleState,
  BattleSimulator,
  EnemyAI,
  ContentRegistry,
  LevelDef,
  SkillDef,
  loadLevel,
  cloneState,
  activeUnit,
  computeMoveRange,
  getCastableCells,
  canCast,
  previewSkill,
  describePreview,
  predictTurnOrder,
  directionTo,
  eq,
  Position,
  Direction,
  Unit,
  unitById,
  isAlive,
  BattleAction,
  BattleEvent,
  chebyshev,
  restHealAmount,
  UnitStats,
  computeThreatCells,
  ThreatCells,
} from "@core/index";
import {
  SessionHost,
  ViewModel,
  OverlayVM,
  MenuVM,
  ConfirmVM,
  InfoVM,
  SkillButtonVM,
  ItemMenuVM,
  BattleItem,
  ApplyOpts,
  EFFECT_EVENTS,
} from "./types";

type Pending = { cell?: Position; direction?: Direction; unitId?: string } | null;

/** 敌方行动预告的停顿时长（秒）：先亮范围再动，给玩家读盘时间。 */
const TELEGRAPH_MOVE_SEC = 0.5;
const TELEGRAPH_SKILL_SEC = 0.65;

/** 流程编排用的可选钩子。都不传 = 独立单场战斗（行为与原先完全一致）。 */
export interface BattleSessionHooks {
  /** 从关卡构建初始状态。默认 loadLevel(level, registry)。 */
  buildState?: (level: LevelDef) => BattleState;
  /** 战斗分出胜负时回调一次（带最终状态）。提供后，结算 UX 交由调用方（如战役结算屏）。 */
  onEnd?: (outcome: BattleState["outcome"], finalState: BattleState) => void;
  /**
   * 每次 simulate 后处理事件（如战斗内经验/升级）。可就地改 state 并返回追加事件，
   * 追加事件会并入日志与呈现。不传 = 无战斗内养成。引擎无关：只见 BattleEvent。
   */
  onEvents?: (events: BattleEvent[], state: BattleState) => BattleEvent[];
  /** 本场可用的消耗品池（从玩家背包装配）。不传/空 = 无道具，道具菜单隐藏。 */
  battleItems?: BattleItem[];
  /** 使用掉一件消耗品时回调（供战役从背包扣减并存档）。 */
  onItemConsumed?: (itemId: string) => void;
  /** 玩家在行动菜单点「休整」时回调（流程层打开整备界面）。不传 = 菜单不显示休整。 */
  onOpenLoadout?: () => void;
}

/** 整备后重算出的单位属性补丁（按 defId 应用到我方单位）。 */
export interface UnitStatPatch {
  defId: string;
  stats: UnitStats;
  maxHp: number;
}

export class BattleSession {
  private state!: BattleState;
  private level!: LevelDef;
  private readonly sim: BattleSimulator;
  private readonly ai: EnemyAI;
  private endNotified = false;

  private activeSkill: string | null = null;
  /** 当前选中的消耗品 id（与 activeSkill 互斥）。 */
  private activeItem: string | null = null;
  /** 本场消耗品池（count 可变）。 */
  private items: BattleItem[] = [];
  private pending: Pending = null;
  private hover: Position | null = null;
  private busy = false;
  private menuOpen = false;
  /** 技能瞄准：第一次点击后锁定范围（不再随指针移动），第二次点击释放。 */
  private aimLocked = false;
  /** 暂定移动：base 为可回退状态，unitId 为该单位。 */
  private preMove: { base: BattleState; unitId: string } | null = null;
  /** 敌方行动预告（移动范围/命中格），仅在 AI 回合动作播放前后短暂存在。 */
  private aiTelegraph: Pick<OverlayVM, "enemyMoveCells" | "hitCenter" | "hitArm"> | null = null;
  /** 威胁区缓存：state 引用变化（每次 simulate/undo 都换新对象）即失效重算。 */
  private threatCache: { state: BattleState; cells: ThreatCells } | null = null;

  constructor(
    private readonly registry: ContentRegistry,
    private readonly host: SessionHost,
    private readonly hooks: BattleSessionHooks = {}
  ) {
    this.sim = new BattleSimulator(registry);
    this.ai = new EnemyAI(registry, this.sim);
  }

  /** 供调试/测试读取当前状态。 */
  getState(): BattleState {
    return this.state;
  }

  // ---------- 关卡 ----------
  load(level: LevelDef): void {
    this.level = level;
    // 拷入道具池（count 可变，勿改调用方数组）。
    this.items = (this.hooks.battleItems ?? []).map((it) => ({ ...it }));
    this.state = this.hooks.buildState ? this.hooks.buildState(level) : loadLevel(level, this.registry);
    this.host.setupLevel(level, this.state);
    this.clearSel();
    this.busy = false;
    this.endNotified = false;
    this.host.clearLog();
    this.log(`关卡「${level.name}」开始。`);
    this.render();
    void this.processTurn();
  }

  restart(): void {
    this.load(this.level);
  }

  private clearSel(): void {
    this.activeSkill = null;
    this.activeItem = null;
    this.pending = null;
    this.preMove = null;
    this.menuOpen = false;
    this.aimLocked = false;
  }

  /** 当前正在瞄准（技能或道具）。 */
  private aiming(): boolean {
    return this.activeSkill !== null || this.activeItem !== null;
  }

  private activeItemDef(): BattleItem | undefined {
    return this.activeItem ? this.items.find((i) => i.itemId === this.activeItem) : undefined;
  }

  /** 道具的合法目标格：存活我方单位且在射程内（射程 0 = 仅自身）。 */
  private itemTargetCells(item: BattleItem, user: Unit): Position[] {
    return this.state.units
      .filter((u) => u.faction === "player" && isAlive(u) && chebyshev(u.pos, user.pos) <= item.range)
      .map((u) => u.pos);
  }

  // ---------- 查询工具 ----------
  private active(): Unit | undefined {
    return activeUnit(this.state);
  }
  private isPlayerTurn(): boolean {
    const a = this.active();
    return !!a && a.faction === "player" && !this.state.outcome && !this.busy;
  }
  /** 单位本回合是否已结束行动（移动+技能都用过，或无法再动）。 */
  private finished(u: Unit): boolean {
    if (u.movedThisTurn && u.actedThisTurn) return true;
    if (u.actedThisTurn && computeMoveRange(this.state, u.instanceId).length === 0) return true;
    return false;
  }
  private canMove(u: Unit): boolean {
    if (this.preMove?.unitId === u.instanceId) return true;
    return !u.movedThisTurn;
  }
  private moveBase(u: Unit): BattleState {
    return this.preMove?.unitId === u.instanceId ? this.preMove.base : this.state;
  }
  private findUnitAt(cell: Position): Unit | undefined {
    return this.state.units.find((u) => isAlive(u) && eq(u.pos, cell));
  }
  private hasEffect(events: BattleEvent[]): boolean {
    return events.some((e) => EFFECT_EVENTS.has(e.type));
  }

  // ---------- 输入意图（表现层把引擎事件翻译成这些调用）----------
  /** 指针悬停到某格（瞄准未锁定时同步更新预览）。 */
  hoverCell(cell: Position | null): void {
    if (this.busy) return;
    this.hover = cell;
    if (this.aiming() && !this.aimLocked && cell) this.updatePendingFromCell(cell);
    this.render();
  }

  /** 点到某逻辑格。 */
  tapCell(cell: Position): void {
    if (!this.isPlayerTurn()) return;
    const active = this.active()!;

    // 技能/道具瞄准中：第一次点击锁定范围，第二次点击释放；取消由 cancel() 负责。
    if (this.aiming()) {
      if (this.aimLocked) {
        void this.confirm();
      } else {
        this.updatePendingFromCell(cell);
        if (this.canReleasePending()) this.aimLocked = true;
        this.render();
      }
      return;
    }

    const clicked = this.findUnitAt(cell);

    // 点击当前行动单位自身 → 展开/收起技能菜单。
    if (clicked && clicked.instanceId === active.instanceId) {
      this.menuOpen = !this.menuOpen;
      this.render();
      return;
    }

    // 点击可达格 → 暂定移动。
    if (this.canMove(active)) {
      const range = computeMoveRange(this.moveBase(active), active.instanceId);
      if (range.some((p) => eq(p, cell))) {
        void this.tentativeMove(cell);
        return;
      }
    }

    // 点其它地方：收起菜单。
    this.menuOpen = false;
    this.render();
  }

  selectSkill(skillId: string): void {
    const active = this.active();
    if (!active || active.actedThisTurn) return;
    if ((active.cooldowns[skillId] ?? 0) > 0) return;
    this.activeSkill = skillId;
    this.activeItem = null;
    this.pending = null;
    this.aimLocked = false;
    this.render();
  }

  /** 选中消耗品进入瞄准（占技能行动：已行动则不可用）。 */
  selectItem(itemId: string): void {
    const active = this.active();
    if (!active || active.actedThisTurn) return;
    const item = this.items.find((i) => i.itemId === itemId);
    if (!item || item.count <= 0) return;
    this.activeItem = itemId;
    this.activeSkill = null;
    // 默认目标为自身（总在射程内），确认条立即可用；点友军可改目标。射程 0 直接锁定。
    this.pending = { unitId: active.instanceId, cell: active.pos };
    this.aimLocked = item.range === 0 && this.canReleasePending();
    this.render();
  }

  async confirm(): Promise<void> {
    if (this.activeItem) return this.confirmItem();
    const active = this.active();
    if (!active || !this.activeSkill || !this.pending) return;
    const skill = this.registry.skill(this.activeSkill);
    if (!canCast(this.state, active, skill, this.pending)) return;

    const preview = previewSkill(this.state, this.sim, this.registry, active.instanceId, this.activeSkill, this.pending);
    if (!preview.ok || !this.hasEffect(preview.events)) {
      this.log("⚠ 该技能未命中任何有效目标，无法释放");
      return;
    }

    const action: BattleAction = {
      type: "skill",
      actorId: active.instanceId,
      skillId: this.activeSkill,
      targetCell: this.pending.cell,
      targetUnitId: this.pending.unitId,
      direction: this.pending.direction,
    };
    // 提交：清掉瞄准与暂定移动，先同步刷新 HUD（确认条收起），再呈现事件。
    this.preMove = null;
    this.activeSkill = null;
    this.pending = null;
    this.aimLocked = false;
    this.menuOpen = false;
    await this.exec(action, "skill");
    await this.afterPlayerAction();
  }

  /** 释放消耗品：构造 use_item，呈现事件；仅在真正生效后才扣减 count 与回调消耗。 */
  private async confirmItem(): Promise<void> {
    const active = this.active();
    const item = this.activeItemDef();
    if (!active || !item || !this.pending?.unitId) return;
    if (!this.canReleasePending()) return;

    const action: BattleAction = {
      type: "use_item",
      actorId: active.instanceId,
      targetUnitId: this.pending.unitId,
      itemId: item.itemId,
      effect: item.effect,
    };
    this.preMove = null;
    this.activeItem = null;
    this.pending = null;
    this.aimLocked = false;
    this.menuOpen = false;
    const applied = await this.exec(action, "skill");
    if (applied) {
      item.count -= 1;
      if (item.count <= 0) this.items = this.items.filter((i) => i.itemId !== item.itemId);
      this.hooks.onItemConsumed?.(item.itemId);
    }
    await this.afterPlayerAction();
  }

  /** 取消（右键/取消按钮）：瞄准中退出瞄准；否则收起行动菜单。 */
  cancel(): void {
    if (this.aiming()) {
      this.activeSkill = null;
      this.activeItem = null;
      this.pending = null;
      this.aimLocked = false;
      this.render();
      return;
    }
    if (this.menuOpen) {
      this.menuOpen = false;
      this.render();
    }
  }

  /** 调息：恢复少量生命并结束该单位行动（占技能行动，等同待机+回复）。 */
  rest(): void {
    if (!this.isPlayerTurn()) return;
    const active = this.active()!;
    if (active.actedThisTurn || active.hp >= active.maxHp) return;
    void this.doRest(active);
  }

  private async doRest(active: Unit): Promise<void> {
    const healed = Math.min(restHealAmount(active.maxHp), active.maxHp - active.hp);
    // 调息提交暂定移动并清空瞄准（与释放技能一致）。
    this.preMove = null;
    this.activeSkill = null;
    this.activeItem = null;
    this.pending = null;
    this.aimLocked = false;
    this.menuOpen = false;
    this.log(`🧘 ${active.name} 调息，恢复 ${healed} 点生命`);
    await this.exec({ type: "rest", actorId: active.instanceId }, "skill");
    await this.afterPlayerAction();
  }

  /** 休整：请求流程层打开整备界面（仅我方行动时可用）。 */
  openLoadout(): void {
    if (!this.isPlayerTurn()) return;
    this.hooks.onOpenLoadout?.();
  }

  /**
   * 应用整备后的属性补丁（等级成长+加点+装备重算）：按 defId 改我方存活单位，
   * 保持已受伤害不变（最低留 1 血，卸装不致死）；暂定移动的回退基态同步打补丁，
   * 否则「休整后撤销移动」会把属性一并回滚。
   */
  applyStatPatches(patches: UnitStatPatch[]): void {
    const applyTo = (state: BattleState): void => {
      for (const p of patches) {
        for (const u of state.units) {
          if (u.faction !== "player" || u.defId !== p.defId || !isAlive(u)) continue;
          const damageTaken = u.maxHp - u.hp;
          u.stats = { ...p.stats };
          u.maxHp = p.maxHp;
          u.hp = Math.max(1, p.maxHp - damageTaken);
        }
      }
    };
    applyTo(this.state);
    if (this.preMove) applyTo(this.preMove.base);
    this.render();
  }

  undoMove(): void {
    if (!this.preMove || this.preMove.unitId !== this.active()?.instanceId) return;
    this.state = this.preMove.base;
    this.preMove = null;
    this.menuOpen = false;
    this.log("↩ 撤销移动");
    this.render();
  }

  /** 主动结束当前行动单位的回合（待机/跳过）。 */
  endActiveUnit(): void {
    if (!this.isPlayerTurn()) return;
    void this.advanceTurn();
  }

  // ---------- 内部流程 ----------
  private async tentativeMove(cell: Position): Promise<void> {
    const active = this.active()!;
    const id = active.instanceId;
    const base = this.preMove?.unitId === id ? this.preMove.base : cloneState(this.state);
    const start = unitById(base, id);
    const res = this.sim.simulate(base, { type: "move", actorId: id, moveTo: cell });
    if (!res.ok) {
      this.log(`⚠ ${res.error ?? "无法移动"}`);
      return;
    }
    this.preMove = { base, unitId: id };
    this.state = res.nextState;
    this.menuOpen = true; // 移动后展开技能菜单
    await this.present(res.events, { kind: "move", resetActor: start ? { id, fromPos: start.pos } : undefined });
    await this.afterPlayerAction();
  }

  private updatePendingFromCell(cell: Position): void {
    const active = this.active();
    if (!active) return;
    if (this.activeItem) {
      // 道具目标：点到的存活我方单位（含自身）。
      const target = this.findUnitAt(cell);
      this.pending = target && target.faction === "player" ? { unitId: target.instanceId, cell } : null;
      return;
    }
    if (!this.activeSkill) return;
    const skill = this.registry.skill(this.activeSkill);
    if (skill.targetType === "direction") {
      const dir = eq(cell, active.pos) ? active.facing : directionTo(active.pos, cell);
      this.pending = { direction: dir };
    } else if (skill.targetType === "unit") {
      const target = this.findUnitAt(cell);
      this.pending = target ? { unitId: target.instanceId, cell } : null;
    } else {
      this.pending = { cell };
    }
  }

  /** 当前 pending 是否可释放（合法且命中有效目标）。 */
  private canReleasePending(): boolean {
    const active = this.active();
    if (!active || !this.pending) return false;
    if (this.activeItem) {
      const item = this.activeItemDef();
      const target = this.pending.unitId ? unitById(this.state, this.pending.unitId) : undefined;
      return !!item && !!target && target.faction === "player" && isAlive(target) && chebyshev(target.pos, active.pos) <= item.range;
    }
    if (!this.activeSkill) return false;
    const skill = this.registry.skill(this.activeSkill);
    if (!canCast(this.state, active, skill, this.pending)) return false;
    const pv = previewSkill(this.state, this.sim, this.registry, active.instanceId, this.activeSkill, this.pending);
    return pv.ok && this.hasEffect(pv.events);
  }

  /** 执行一个行动；返回是否真正生效（simulate ok）。 */
  private async exec(action: BattleAction, kind: "move" | "skill"): Promise<boolean> {
    const res = this.sim.simulate(this.state, action);
    if (!res.ok) {
      this.log(`⚠ ${res.error ?? "行动无效"}`);
      this.render();
      return false;
    }
    this.state = res.nextState;
    const events = this.withProgression(res.events);
    this.logEvents(events);
    await this.present(events, { kind });
    return true;
  }

  /** 应用战斗内养成钩子（如击杀升级）：就地改 state，返回「原事件 + 追加事件」。 */
  private withProgression(events: BattleEvent[]): BattleEvent[] {
    if (!this.hooks.onEvents) return events;
    const extra = this.hooks.onEvents(events, this.state) ?? [];
    return extra.length ? [...events, ...extra] : events;
  }

  /**
   * 呈现一段事件：先同步刷新 HUD（带动画层在此期间锁输入），再交给表现层播放，最后再刷新。
   * 无动画层（如 Web Canvas）整段同步完成，保证测试可在同一 tick 内断言。
   */
  private async present(events: BattleEvent[], opts: ApplyOpts): Promise<void> {
    const anim = this.host.animates;
    if (anim) this.busy = true;
    this.render();
    await this.host.applyEvents(events, opts, this.state);
    if (anim) this.busy = false;
    this.render();
  }

  /** 玩家行动后：分胜负则结束；该单位行动完毕则自动推进。 */
  private async afterPlayerAction(): Promise<void> {
    if (this.checkEnd()) return;
    const active = this.active();
    if (active && active.faction === "player" && this.finished(active)) {
      await this.advanceTurn();
    } else {
      this.render();
    }
  }

  /** 推进初动到下一个行动单位。 */
  private async advanceTurn(): Promise<void> {
    this.clearSel();
    const res = this.sim.simulate(this.state, { type: "end_turn" });
    this.state = res.nextState;
    this.logEvents(res.events);
    this.render();
    await this.processTurn();
  }

  /** 驱动行动循环：敌方由 AI 自动行动，直到轮到我方或分出胜负。 */
  private async processTurn(): Promise<void> {
    while (!this.state.outcome) {
      const active = this.active();
      if (!active) break;

      if (active.faction === "player") {
        // 被眩晕等导致无法行动 → 直接跳过。
        if (this.finished(active)) {
          const res = this.sim.simulate(this.state, { type: "end_turn" });
          this.state = res.nextState;
          this.logEvents(res.events);
          continue;
        }
        this.busy = false;
        this.activeSkill = null;
        this.activeItem = null;
        this.pending = null;
        this.preMove = null;
        this.menuOpen = !this.canMove(active); // 无法移动则直接展开技能菜单
        this.render();
        return; // 等待玩家输入
      }

      // 敌方单位：AI 行动（带动画/节奏）。
      this.busy = true;
      this.render();
      const actions = this.ai.planTurn(this.state);
      for (const act of actions) {
        await this.telegraphAiAction(act);
        const res = this.sim.simulate(this.state, act);
        if (res.ok) {
          this.state = res.nextState;
          const events = this.withProgression(res.events);
          this.logEvents(events);
          if (act.type !== "end_turn") {
            await this.host.applyEvents(events, { kind: "ai" }, this.state);
          }
        }
        this.aiTelegraph = null;
        if (act.type !== "end_turn") this.render();
        if (this.state.outcome) break;
      }
      this.aiTelegraph = null;
      this.busy = false;
    }
    this.busy = false;
    this.render();
    this.checkEnd();
  }

  /**
   * 敌方动作预告：动画播放前先亮出范围并停顿，给玩家读盘时间。
   * move → 该敌人的移动范围（基于移动前 state）；skill → 实际命中格；其余动作不预告。
   */
  private async telegraphAiAction(act: BattleAction): Promise<void> {
    if (act.type === "move") {
      this.aiTelegraph = { enemyMoveCells: computeMoveRange(this.state, act.actorId) };
      this.render();
      await this.aiPause(TELEGRAPH_MOVE_SEC);
    } else if (act.type === "skill") {
      const preview = previewSkill(this.state, this.sim, this.registry, act.actorId, act.skillId, {
        cell: act.targetCell,
        direction: act.direction,
        unitId: act.targetUnitId,
      });
      if (!preview.ok) return;
      this.aiTelegraph = {
        hitCenter: preview.hitCells.filter((c) => c.effectKey === "center").map((c) => c.pos),
        hitArm: preview.hitCells.filter((c) => c.effectKey !== "center").map((c) => c.pos),
      };
      this.render();
      await this.aiPause(TELEGRAPH_SKILL_SEC);
    }
  }

  /** 预告停顿：只有带动画且实现了 delay 的表现层才真正等待（测试 host 零延时）。 */
  private aiPause(sec: number): Promise<void> {
    return this.host.animates && this.host.delay ? this.host.delay(sec) : Promise.resolve();
  }

  /** 敌方威胁区（按 state 引用缓存；我方暂定移动会换 state，威胁随之重算）。 */
  private threat(): ThreatCells {
    if (this.threatCache?.state !== this.state) {
      this.threatCache = { state: this.state, cells: computeThreatCells(this.state, this.registry) };
    }
    return this.threatCache.cells;
  }

  private checkEnd(): boolean {
    if (!this.state.outcome) return false;
    this.render();
    if (this.hooks.onEnd && !this.endNotified) {
      this.endNotified = true;
      this.hooks.onEnd(this.state.outcome, this.state);
    }
    return true;
  }

  // ---------- ViewModel 构建（纯数据）----------
  private render(): void {
    this.host.render(this.buildViewModel());
  }

  private buildViewModel(): ViewModel {
    const active = this.active();
    const myTurn = this.isPlayerTurn();
    const overlay = this.buildOverlay(active, myTurn);
    const menu = this.buildMenu(active, myTurn);
    return {
      state: this.state,
      overlay,
      menu,
      items: this.buildItemMenu(active, menu.visible),
      confirm: this.buildConfirm(active, myTurn),
      turnText: this.buildTurnText(),
      hint: this.level ? `🎯 ${this.level.name}：${this.level.teach ?? ""}` : "",
      info: this.buildInfo(),
      banner: this.state.outcome,
      busy: this.busy,
    };
  }

  private buildOverlay(active: Unit | undefined, myTurn: boolean): OverlayVM {
    const overlay: OverlayVM = { hoverCell: this.hover ?? undefined };
    if (active) overlay.selectedUnitId = active.instanceId;
    if (!active || !myTurn) {
      // 敌方回合：叠加行动预告（移动范围/命中格）。
      if (this.aiTelegraph) Object.assign(overlay, this.aiTelegraph);
      return overlay;
    }

    if (this.preMove?.unitId === active.instanceId) {
      const start = unitById(this.preMove.base, active.instanceId);
      if (start) overlay.originCell = start.pos;
    }
    if (this.activeItem) {
      const item = this.activeItemDef();
      if (item) {
        overlay.castCells = this.itemTargetCells(item, active);
        this.applyItemPreview(overlay, item);
      }
    } else if (this.activeSkill) {
      overlay.castCells = getCastableCells(this.state, active, this.registry.skill(this.activeSkill));
      this.applyPreview(overlay);
    } else if (this.canMove(active)) {
      overlay.moveCells = computeMoveRange(this.moveBase(active), active.instanceId);
    }
    // 非瞄准状态（移动/菜单阶段）常显敌方威胁区；瞄准时隐藏，避免与施法高亮糊在一起。
    if (!this.activeSkill && !this.activeItem) {
      const threat = this.threat();
      overlay.threatMoveCells = threat.moveCells;
      overlay.threatAttackCells = threat.attackCells;
    }
    return overlay;
  }

  private applyPreview(overlay: OverlayVM): void {
    const active = this.active();
    if (!active || !this.activeSkill || !this.pending) return;
    const preview = previewSkill(this.state, this.sim, this.registry, active.instanceId, this.activeSkill, this.pending);
    if (!preview.ok) return;

    overlay.hitCenter = preview.hitCells.filter((c) => c.effectKey === "center").map((c) => c.pos);
    overlay.hitArm = preview.hitCells.filter((c) => c.effectKey !== "center").map((c) => c.pos);

    const arrows: OverlayVM["arrows"] = [];
    const boxes: Position[] = [];
    const dmgMap = new Map<string, { dmg: number; heal: number }>();
    const hazard: Position[] = [];

    for (const e of preview.events) {
      if (e.type === "unit_displaced") {
        arrows.push({ from: e.from, to: e.to });
        boxes.push(e.to);
      } else if (e.type === "unit_damaged" || e.type === "collision_damage") {
        const m = dmgMap.get(e.unitId) ?? { dmg: 0, heal: 0 };
        m.dmg += e.amount;
        dmgMap.set(e.unitId, m);
      } else if (e.type === "unit_healed") {
        const m = dmgMap.get(e.unitId) ?? { dmg: 0, heal: 0 };
        m.heal += e.amount;
        dmgMap.set(e.unitId, m);
      } else if (e.type === "terrain_triggered") {
        hazard.push(e.position);
      }
    }

    const labels: NonNullable<OverlayVM["damage"]> = [];
    for (const [uid, m] of dmgMap) {
      const finalUnit = unitById(preview.resultState, uid);
      const pos = finalUnit?.pos ?? unitById(this.state, uid)?.pos;
      if (!pos) continue;
      const lethal = !finalUnit || finalUnit.hp <= 0;
      if (m.dmg > 0) labels.push({ pos, amount: m.dmg, lethal, kind: "damage" });
      else if (m.heal > 0) labels.push({ pos, amount: m.heal, lethal: false, kind: "heal" });
    }

    overlay.arrows = arrows;
    overlay.finalBoxes = boxes;
    overlay.damage = labels;
    overlay.hazardWarn = hazard;
  }

  /** 道具预览：在克隆态跑 use_item，标记目标格并显示回血数字。 */
  private applyItemPreview(overlay: OverlayVM, item: BattleItem): void {
    const active = this.active();
    if (!active || !this.pending?.unitId) return;
    const target = unitById(this.state, this.pending.unitId);
    if (!target) return;
    overlay.hitCenter = [target.pos];
    const res = this.sim.simulate(cloneState(this.state), {
      type: "use_item",
      actorId: active.instanceId,
      targetUnitId: this.pending.unitId,
      itemId: item.itemId,
      effect: item.effect,
    });
    if (!res.ok) return;
    const labels: NonNullable<OverlayVM["damage"]> = [];
    for (const e of res.events) {
      if (e.type === "unit_healed") labels.push({ pos: target.pos, amount: e.amount, lethal: false, kind: "heal" });
    }
    overlay.damage = labels;
  }

  private buildMenu(active: Unit | undefined, myTurn: boolean): MenuVM {
    const visible = !!active && myTurn && this.menuOpen && !this.aiming() && !this.finished(active);
    if (!active || !visible) {
      return {
        visible: false,
        unitName: "",
        anchorCell: { x: 0, y: 0 },
        skills: [],
        showUndo: false,
        rest: { disabled: true, short: "" },
        showLoadout: false,
      };
    }
    const skills: SkillButtonVM[] = active.skills.map((skillId) => {
      const skill = this.registry.skill(skillId);
      const cd = active.cooldowns[skillId] ?? 0;
      return {
        id: skillId,
        name: skill.name,
        short: cd > 0 ? `冷却 ${cd}` : skill.shortDescription ?? this.compactSkillDescription(skill.description),
        full: skill.description,
        cooldown: cd,
        disabled: active.actedThisTurn || cd > 0,
      };
    });
    return {
      visible: true,
      unitName: active.name,
      anchorCell: active.pos,
      skills,
      showUndo: this.preMove?.unitId === active.instanceId,
      rest: this.buildRestButton(active),
      showLoadout: !!this.hooks.onOpenLoadout,
    };
  }

  /** 调息按钮：已行动/满血时禁用并说明原因，可用时显示恢复量。 */
  private buildRestButton(active: Unit): MenuVM["rest"] {
    if (active.actedThisTurn) return { disabled: true, short: "本回合已行动" };
    if (active.hp >= active.maxHp) return { disabled: true, short: "生命已满" };
    const healed = Math.min(restHealAmount(active.maxHp), active.maxHp - active.hp);
    return { disabled: false, short: `恢复 ${healed} 生命，结束行动` };
  }

  /** 道具菜单：随技能菜单一同显示；消耗品占技能行动，故已行动则禁用。 */
  private buildItemMenu(active: Unit | undefined, menuVisible: boolean): ItemMenuVM {
    if (!active || !menuVisible || this.items.length === 0) return { visible: false, items: [] };
    return {
      visible: true,
      items: this.items
        .filter((it) => it.count > 0)
        .map((it) => ({
          itemId: it.itemId,
          name: it.name,
          short: `×${it.count}`,
          full: it.description,
          count: it.count,
          disabled: active.actedThisTurn,
        })),
    };
  }

  private compactSkillDescription(text: string): string {
    return text.length > 16 ? `${text.slice(0, 15)}…` : text;
  }

  private buildConfirm(active: Unit | undefined, myTurn: boolean): ConfirmVM {
    if (myTurn && active && this.activeItem) {
      const item = this.activeItemDef();
      if (!item) return { visible: false, skillName: "", desc: "", canRelease: false };
      const can = this.canReleasePending();
      const desc = this.pending?.unitId ? item.description : "选择自身或射程内友军";
      return { visible: true, skillName: item.name, desc, canRelease: can };
    }
    if (!(myTurn && active && this.activeSkill && this.pending)) {
      return { visible: false, skillName: "", desc: "", canRelease: false };
    }
    const skill = this.registry.skill(this.activeSkill);
    const can = canCast(this.state, active, skill, this.pending);
    let effect = false;
    let desc: string;
    if (can) {
      const preview = previewSkill(this.state, this.sim, this.registry, active.instanceId, this.activeSkill, this.pending);
      effect = this.hasEffect(preview.events);
      const lines = describePreview(this.state, preview.events).filter((l) => !l.includes("施放"));
      desc = effect ? lines.join("　·　") : "未命中有效目标，无法释放";
    } else {
      desc = this.pendingOutOfRange(active, skill) ? "超出施法范围" : "无法在此处施放";
    }
    return { visible: true, skillName: skill.name, desc, canRelease: can && effect };
  }

  /** pending 的目标格是否落在施法范围之外（方向类技能无格子目标，返回 false）。 */
  private pendingOutOfRange(active: Unit, skill: SkillDef): boolean {
    const cell = this.pending?.cell;
    if (!cell) return false;
    return !getCastableCells(this.state, active, skill).some((c) => eq(c, cell));
  }

  private buildTurnText(): string {
    const active = this.active();
    // 阵营决定文案，而非 busy —— 播放我方自己动作动画时 busy 也为真，
    // 若按 busy 判断会把「我方行动」错标成「敌方行动」。
    if (active) return `${active.faction === "player" ? "我方" : "敌方"}行动：${active.name}`;
    if (this.busy) return "敌方行动…";
    return "";
  }

  private buildInfo(): InfoVM {
    const order = predictTurnOrder(this.state, 6)
      .map((id, i): InfoVM["order"][number] | null => {
        const u = unitById(this.state, id);
        if (!u) return null;
        const kind = i === 0 ? "now" : u.faction === "player" ? "player" : "enemy";
        return { name: u.name, kind };
      })
      .filter((c): c is InfoVM["order"][number] => c !== null);

    const row = (u: Unit): InfoVM["players"][number] => ({
      name: u.name,
      faction: u.faction,
      dead: u.hp <= 0,
      selected: u.instanceId === this.state.activeUnitId,
      speed: u.stats.speed,
      hp: Math.max(0, u.hp),
      maxHp: u.maxHp,
      level: u.level,
    });
    return {
      order,
      players: this.state.units.filter((u) => u.faction === "player").map(row),
      enemies: this.state.units.filter((u) => u.faction === "enemy").map(row),
    };
  }

  // ---------- 日志 ----------
  private logEvents(events: BattleEvent[]): void {
    for (const line of describePreview(this.state, events)) this.log(line);
    for (const e of events) {
      if (e.type === "turn_started") {
        const u = e.unitId ? unitById(this.state, e.unitId) : undefined;
        this.log(`— 轮到 ${u?.name ?? (e.faction === "player" ? "我方" : "敌方")} 行动 —`);
      }
      if (e.type === "item_used") {
        const u = unitById(this.state, e.userId);
        const name = this.hooks.battleItems?.find((it) => it.itemId === e.itemId)?.name ?? e.itemId;
        this.log(`🧪 ${u?.name ?? e.userId} 使用了「${name}」`);
      }
      if (e.type === "battle_ended") this.log(e.outcome === "player_win" ? "🎉 我方胜利" : "💀 我方战败");
      if (e.type === "unit_level_up") {
        const u = unitById(this.state, e.unitId);
        const skills = e.unlockedSkills.length ? `，习得「${e.unlockedSkills.join("、")}」` : "";
        this.log(`⬆ ${u?.name ?? e.unitId} 升级 Lv.${e.fromLevel} → Lv.${e.toLevel}${skills}`);
      }
    }
  }
  private log(msg: string): void {
    this.host.log(msg);
  }
}

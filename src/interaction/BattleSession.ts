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
} from "@core/index";
import {
  SessionHost,
  ViewModel,
  OverlayVM,
  MenuVM,
  ConfirmVM,
  InfoVM,
  SkillButtonVM,
  ApplyOpts,
  EFFECT_EVENTS,
} from "./types";

type Pending = { cell?: Position; direction?: Direction; unitId?: string } | null;

/** 流程编排用的可选钩子。两者都不传 = 独立单场战斗（行为与原先完全一致）。 */
export interface BattleSessionHooks {
  /** 从关卡构建初始状态。默认 loadLevel(level, registry)。 */
  buildState?: (level: LevelDef) => BattleState;
  /** 战斗分出胜负时回调一次（带最终状态）。提供后，结算 UX 交由调用方（如战役结算屏）。 */
  onEnd?: (outcome: BattleState["outcome"], finalState: BattleState) => void;
}

export class BattleSession {
  private state!: BattleState;
  private level!: LevelDef;
  private readonly sim: BattleSimulator;
  private readonly ai: EnemyAI;
  private endNotified = false;

  private activeSkill: string | null = null;
  private pending: Pending = null;
  private hover: Position | null = null;
  private busy = false;
  private menuOpen = false;
  /** 技能瞄准：第一次点击后锁定范围（不再随指针移动），第二次点击释放。 */
  private aimLocked = false;
  /** 暂定移动：base 为可回退状态，unitId 为该单位。 */
  private preMove: { base: BattleState; unitId: string } | null = null;

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
    this.pending = null;
    this.preMove = null;
    this.menuOpen = false;
    this.aimLocked = false;
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
    if (this.activeSkill && !this.aimLocked && cell) this.updatePendingFromCell(cell);
    this.render();
  }

  /** 点到某逻辑格。 */
  tapCell(cell: Position): void {
    if (!this.isPlayerTurn()) return;
    const active = this.active()!;

    // 技能瞄准中：第一次点击锁定范围，第二次点击释放；取消由 cancel() 负责。
    if (this.activeSkill) {
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
    this.pending = null;
    this.aimLocked = false;
    this.render();
  }

  async confirm(): Promise<void> {
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

  cancel(): void {
    if (!this.activeSkill) return;
    this.activeSkill = null;
    this.pending = null;
    this.aimLocked = false;
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
    if (!active || !this.activeSkill) return;
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
    if (!active || !this.activeSkill || !this.pending) return false;
    const skill = this.registry.skill(this.activeSkill);
    if (!canCast(this.state, active, skill, this.pending)) return false;
    const pv = previewSkill(this.state, this.sim, this.registry, active.instanceId, this.activeSkill, this.pending);
    return pv.ok && this.hasEffect(pv.events);
  }

  private async exec(action: BattleAction, kind: "move" | "skill"): Promise<void> {
    const res = this.sim.simulate(this.state, action);
    if (!res.ok) {
      this.log(`⚠ ${res.error ?? "行动无效"}`);
      this.render();
      return;
    }
    this.state = res.nextState;
    this.logEvents(res.events);
    await this.present(res.events, { kind });
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
        const res = this.sim.simulate(this.state, act);
        if (res.ok) {
          this.state = res.nextState;
          this.logEvents(res.events);
          if (act.type !== "end_turn") {
            await this.host.applyEvents(res.events, { kind: "ai" }, this.state);
            this.render();
          }
        }
        if (this.state.outcome) break;
      }
      this.busy = false;
    }
    this.busy = false;
    this.render();
    this.checkEnd();
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
    return {
      state: this.state,
      overlay,
      menu: this.buildMenu(active, myTurn),
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
    if (!active || !myTurn) return overlay;

    if (this.preMove?.unitId === active.instanceId) {
      const start = unitById(this.preMove.base, active.instanceId);
      if (start) overlay.originCell = start.pos;
    }
    if (this.activeSkill) {
      overlay.castCells = getCastableCells(this.state, active, this.registry.skill(this.activeSkill));
      this.applyPreview(overlay);
    } else if (this.canMove(active)) {
      overlay.moveCells = computeMoveRange(this.moveBase(active), active.instanceId);
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

  private buildMenu(active: Unit | undefined, myTurn: boolean): MenuVM {
    const visible = !!active && myTurn && this.menuOpen && !this.activeSkill && !this.finished(active);
    if (!active || !visible) {
      return { visible: false, unitName: "", anchorCell: { x: 0, y: 0 }, skills: [], showUndo: false };
    }
    const skills: SkillButtonVM[] = active.skills.map((skillId) => {
      const skill = this.registry.skill(skillId);
      const cd = active.cooldowns[skillId] ?? 0;
      return {
        id: skillId,
        name: skill.name,
        short: cd > 0 ? `冷却 ${cd}` : skill.description.slice(0, 12),
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
    };
  }

  private buildConfirm(active: Unit | undefined, myTurn: boolean): ConfirmVM {
    if (!(myTurn && active && this.activeSkill && this.pending)) {
      return { visible: false, skillName: "", desc: "", canRelease: false };
    }
    const skill = this.registry.skill(this.activeSkill);
    const can = canCast(this.state, active, skill, this.pending);
    let effect = false;
    let desc = "无效目标";
    if (can) {
      const preview = previewSkill(this.state, this.sim, this.registry, active.instanceId, this.activeSkill, this.pending);
      effect = this.hasEffect(preview.events);
      const lines = describePreview(this.state, preview.events).filter((l) => !l.includes("施放"));
      desc = effect ? lines.join("　·　") : "未命中有效目标，无法释放";
    }
    return { visible: true, skillName: skill.name, desc, canRelease: can && effect };
  }

  private buildTurnText(): string {
    const active = this.active();
    if (this.busy) return active ? `敌方行动：${active.name}` : "敌方行动…";
    if (active) return `${active.faction === "player" ? "我方" : "敌方"}行动：${active.name}`;
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
      if (e.type === "battle_ended") this.log(e.outcome === "player_win" ? "🎉 我方胜利" : "💀 我方战败");
    }
  }
  private log(msg: string): void {
    this.host.log(msg);
  }
}

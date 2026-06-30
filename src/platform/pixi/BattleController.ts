/**
 * PixiJS 2D 表现层适配器：把交互层 BattleSession 接到 Pixi 场景 + DOM HUD + 事件动画。
 *
 * 「玩家怎么操作」的全部规则都在 src/interaction/BattleSession（四套表现层共用）；
 * 本文件只负责 Pixi 特有的事：像素拾取格、用 Pixi 渲染叠加层、EventAnimator 串行播放动画、
 * 复用共用 DomHud 画 HUD。带动画 → applyEvents 中 await 播放，播放期间由 Session 锁定输入。
 */
import { BattleState, LevelDef, Position, BattleEvent, ContentRegistry } from "@core/index";
import { BattleSession, SessionHost, ViewModel, ApplyOpts } from "../../interaction";
import { DomHud } from "../_shared/DomHud";
import { Text } from "pixi.js";
import { Grid } from "./Grid";
import { GameStage } from "./GameStage";
import { BoardView } from "./BoardView";
import { OverlayView } from "./OverlayView";
import { UnitView } from "./UnitView";
import { Effects } from "./Effects";
import { EventAnimator } from "./EventAnimator";
import { Animator } from "./Anim";

export interface ControllerEls {
  menu: HTMLElement;
  info: HTMLElement;
  log: HTMLElement;
  hint: HTMLElement;
  turn: HTMLElement;
  confirmBar: HTMLElement;
  banner: HTMLElement;
}

export class BattleController implements SessionHost {
  readonly animates = true;

  private session: BattleSession;
  private hud: DomHud;
  private animator: Animator;

  private grid!: Grid;
  private board!: BoardView;
  private overlay!: OverlayView;
  private units!: UnitView;
  private effects!: Effects;
  private events!: EventAnimator;
  private previewLabels: Text[] = [];
  /** 战役模式：抑制战斗自带 banner，结算交给 CampaignDirector。 */
  private campaign = false;

  constructor(private readonly registry: ContentRegistry, private stage: GameStage, els: ControllerEls) {
    this.animator = new Animator(this.stage.app.ticker);
    this.session = new BattleSession(registry, this);
    this.hud = new DomHud(
      els,
      {
        selectSkill: (id) => this.session.selectSkill(id),
        undoMove: () => this.session.undoMove(),
        endTurn: () => this.session.endActiveUnit(),
        confirm: () => void this.session.confirm(),
        cancel: () => this.session.cancel(),
        restart: () => this.session.restart(),
      },
      (menu, anchor) => this.positionMenu(menu, anchor)
    );
    this.bindInput();
  }

  get state(): BattleState {
    return this.session.getState();
  }

  // ---------- 公共 API ----------
  load(level: LevelDef): void {
    this.campaign = false;
    this.session = new BattleSession(this.registry, this);
    this.session.load(level);
  }

  /** 战役模式：用预装配状态开战，结束回调给 Director。 */
  loadCampaignBattle(
    state: BattleState,
    level: LevelDef,
    onEnd: (outcome: BattleState["outcome"], finalState: BattleState) => void
  ): void {
    this.campaign = true;
    this.session = new BattleSession(this.registry, this, { buildState: () => state, onEnd });
    this.session.load(level);
  }
  tapCell(cell: Position): void {
    this.session.tapCell(cell);
  }
  selectSkill(skillId: string): void {
    this.session.selectSkill(skillId);
  }
  confirm(): void {
    void this.session.confirm();
  }
  undoMove(): void {
    this.session.undoMove();
  }
  endActiveUnit(): void {
    this.session.endActiveUnit();
  }

  // ---------- SessionHost 实现 ----------
  setupLevel(level: LevelDef, state: BattleState): void {
    this.grid = new Grid(level.board.width, level.board.height, 72);
    this.stage.resize(this.grid.pxWidth, this.grid.pxHeight);
    this.stage.world.position.set(0, 0);
    this.stage.clear();

    this.board = new BoardView();
    this.board.build(state, this.grid, this.stage.board);
    this.overlay = new OverlayView();
    this.overlay.build(this.grid, this.stage.overlay);
    this.units = new UnitView();
    this.units.build(this.grid, this.stage.units);
    this.effects = new Effects(this.stage.fx, this.stage.world, this.grid, this.animator);
    this.events = new EventAnimator(this.grid, this.units, this.board, this.effects, this.animator);
    this.units.sync(state);
  }

  render(vm: ViewModel): void {
    if (!this.overlay) return;
    this.clearPreviewLabels();
    this.overlay.show(vm.overlay);
    this.units.setSelected(vm.overlay.selectedUnitId);
    if (!vm.busy) this.units.sync(vm.state);
    this.drawPreviewLabels(vm.overlay.damage ?? []);
    this.hud.render(this.campaign && vm.banner ? { ...vm, banner: null } : vm);
  }

  async applyEvents(events: BattleEvent[], opts: ApplyOpts, state: BattleState): Promise<void> {
    if (opts.resetActor) {
      const s = this.units.get(opts.resetActor.id);
      if (s) {
        const c = this.grid.center(opts.resetActor.fromPos);
        s.container.position.set(c.x, c.y); // 从本回合起点走起
      }
    }
    await this.events.play(events);
    this.units.sync(state);
  }

  log(msg: string): void {
    this.hud.log(msg);
  }
  clearLog(): void {
    this.hud.clearLog();
  }

  // ---------- 输入 ----------
  private bindInput(): void {
    const canvas = this.stage.canvas;
    canvas.addEventListener("mousemove", (e) => {
      this.session.hoverCell(this.pick(e.clientX, e.clientY));
    });
    canvas.addEventListener("click", (e) => {
      const cell = this.pick(e.clientX, e.clientY);
      if (cell) this.session.tapCell(cell);
    });
    canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.session.cancel();
    });
    canvas.addEventListener(
      "touchend",
      (e) => {
        const t = e.changedTouches[0];
        if (!t) return;
        const cell = this.pick(t.clientX, t.clientY);
        if (cell) this.session.tapCell(cell);
      },
      { passive: true }
    );
  }

  private displayScale(): number {
    const rect = this.stage.canvas.getBoundingClientRect();
    return rect.width > 0 ? this.grid.pxWidth / rect.width : 1;
  }

  private pick(clientX: number, clientY: number): Position | null {
    const rect = this.stage.canvas.getBoundingClientRect();
    const scale = this.displayScale();
    return this.grid.pixelToCell((clientX - rect.left) * scale, (clientY - rect.top) * scale);
  }

  /** 把浮动菜单定位到行动单位旁（贴右，越界翻左/夹紧）。 */
  private positionMenu(menu: HTMLElement, anchor: Position): void {
    const scale = 1 / this.displayScale();
    const c = this.grid.center(anchor);
    const ax = c.x * scale;
    const ay = c.y * scale;
    const rect = this.stage.canvas.getBoundingClientRect();
    const menuW = menu.offsetWidth || 150;
    const menuH = menu.offsetHeight || 0;
    let left = ax + 30;
    if (left + menuW > rect.width) left = ax - 30 - menuW;
    left = Math.max(0, Math.min(left, rect.width - menuW));
    let top = ay - menuH / 2;
    top = Math.max(0, Math.min(top, rect.height - menuH));
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  // ---------- 预览伤害飘标（静态 Pixi 文本，随刷新清空）----------
  private clearPreviewLabels(): void {
    for (const t of this.previewLabels) t.destroy();
    this.previewLabels = [];
  }
  private drawPreviewLabels(labels: NonNullable<ViewModel["overlay"]["damage"]>): void {
    for (const l of labels) {
      const c = this.grid.center(l.pos);
      const color = l.kind === "heal" ? "#5fcf6a" : l.lethal ? "#ff5a45" : "#ffd24a";
      const t = new Text({
        text: `${l.kind === "heal" ? "+" : "-"}${l.amount}`,
        style: { fontSize: 20, fill: color, fontWeight: "bold", stroke: { color: 0x000000, width: 4 } },
      });
      t.anchor.set(0.5);
      t.position.set(c.x, c.y - 26);
      this.stage.fx.addChild(t);
      this.previewLabels.push(t);
    }
  }
}

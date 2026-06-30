/**
 * Three.js 2.5D 表现层适配器：把交互层 BattleSession 接到 3D 场景 + DOM 单位/HUD + 事件动画。
 *
 * 「玩家怎么操作」的全部规则都在 src/interaction/BattleSession（四套表现层共用）；
 * 本文件只负责 Three 特有的事：相机射线拾取格、用 Three 渲染叠加层、EventAnimator 串行播放动画、
 * 复用共用 DomHud 画 HUD。带动画 → applyEvents 中 await 播放，播放期间由 Session 锁定输入。
 */
import { BattleState, LevelDef, Position, BattleEvent, ContentRegistry } from "@core/index";
import { BattleSession, SessionHost, ViewModel, ApplyOpts } from "../../interaction";
import { DomHud } from "../_shared/DomHud";
import { CoordMap } from "./CoordMap";
import { SceneRig } from "./SceneRig";
import { BoardView } from "./BoardView";
import { OverlayView } from "./OverlayView";
import { UnitLayer } from "./UnitLayer";
import { Effects3D } from "./Effects3D";
import { EventAnimator } from "./EventAnimator";
import { Ticker } from "./Ticker";

export interface ControllerEls {
  canvas: HTMLCanvasElement;
  units: HTMLElement;
  fx: HTMLElement;
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

  private coord!: CoordMap;
  private rig!: SceneRig;
  private effects!: Effects3D;
  private ticker = new Ticker();
  private board!: BoardView;
  private units!: UnitLayer;
  private overlay!: OverlayView;
  private animator!: EventAnimator;
  private previewLabelEls: HTMLElement[] = [];
  /** 战役模式：抑制战斗自带 banner，结算交给 CampaignDirector。 */
  private campaign = false;

  constructor(private readonly registry: ContentRegistry, private els: ControllerEls) {
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
    this.coord = new CoordMap(level.board.width, level.board.height, 1);
    if (!this.rig) {
      this.rig = new SceneRig(this.els.canvas);
      this.effects = new Effects3D(this.rig.scene, this.ticker);
      this.ticker.onFrame(() => {
        this.units?.project();
        this.rig.render();
      });
      this.ticker.start();
    }
    this.rig.reframe(this.coord);
    this.rig.clearBoard();

    this.board = new BoardView();
    this.board.build(state, this.coord, this.rig.boardRoot);
    this.units = new UnitLayer(this.coord, this.rig);
    this.units.build(this.els.units);
    this.overlay = new OverlayView(this.coord);
    this.overlay.build(this.rig.boardRoot);
    this.animator = new EventAnimator(
      this.coord,
      this.rig,
      this.units,
      this.board,
      this.effects,
      this.ticker,
      this.els.fx
    );
    this.units.sync(state);
  }

  render(vm: ViewModel): void {
    if (!this.overlay) return;
    this.clearPreviewLabels();
    this.overlay.show(vm.overlay);
    this.units.setSelected(vm.overlay.selectedUnitId);
    // 播放动画期间单位位置由动画接管，不快照；其余时刻据最终态对齐。
    if (!vm.busy) this.units.sync(vm.state);
    this.showPreviewLabels(vm.overlay.damage ?? []);
    this.hud.render(this.campaign && vm.banner ? { ...vm, banner: null } : vm);
  }

  async applyEvents(events: BattleEvent[], opts: ApplyOpts, state: BattleState): Promise<void> {
    if (opts.resetActor) {
      const e = this.units.get(opts.resetActor.id);
      if (e) e.world.copy(this.coord.posToWorld(opts.resetActor.fromPos, 0)); // 从本回合起点走起
    }
    await this.animator.play(events);
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
    const canvas = this.els.canvas;
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

  /** 屏幕坐标 → 棋盘格（相机射线 ∩ 地面）。 */
  private pick(clientX: number, clientY: number): Position | null {
    const rect = this.els.canvas.getBoundingClientRect();
    const world = this.rig.pickWorld(clientX - rect.left, clientY - rect.top);
    return world ? this.coord.worldToCell(world) : null;
  }

  /** 把浮动菜单定位到行动单位旁（投影到屏幕后贴右，越界翻左/夹紧）。 */
  private positionMenu(menu: HTMLElement, anchor: Position): void {
    const boardW = this.els.canvas.clientWidth;
    const boardH = this.els.canvas.clientHeight;
    const p = this.rig.project(this.coord.posToWorld(anchor, 0.3));
    const menuW = menu.offsetWidth || 150;
    const menuH = menu.offsetHeight || 0;
    let left = p.x + 36;
    if (left + menuW > boardW) left = p.x - 36 - menuW;
    left = Math.max(0, Math.min(left, boardW - menuW));
    let top = p.y - menuH / 2;
    top = Math.max(0, Math.min(top, boardH - menuH));
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  // ---------- 预览伤害飘标（静态 DOM，随刷新清空）----------
  private clearPreviewLabels(): void {
    for (const el of this.previewLabelEls) el.remove();
    this.previewLabelEls = [];
  }
  private showPreviewLabels(labels: NonNullable<ViewModel["overlay"]["damage"]>): void {
    for (const d of labels) {
      const world = this.coord.posToWorld(d.pos, 0.7);
      const s = this.rig.project(world);
      const div = document.createElement("div");
      div.className = `dmg-float ${d.kind === "heal" ? "heal" : d.lethal ? "lethal" : "dmg"}`;
      div.style.animation = "none";
      div.style.opacity = "1";
      div.textContent = `${d.kind === "heal" ? "+" : "-"}${d.amount}`;
      div.style.left = `${s.x}px`;
      div.style.top = `${s.y}px`;
      this.els.fx.appendChild(div);
      this.previewLabelEls.push(div);
    }
  }
}

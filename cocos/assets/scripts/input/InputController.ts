import { Component, Input, input, EventMouse, EventTouch, Camera, Vec3, geometry } from "cc";
import { BattleState, ContentRegistry, LevelDef, Position, BattleEvent } from "../game-core/index";
import { BattleSession, SessionHost, ViewModel, ApplyOpts } from "../interaction/index";
import { CoordMap } from "../core/CoordMap";
import { SceneRig } from "../view/SceneRig";
import { BoardView } from "../view/BoardView";
import { UnitView } from "../view/UnitView";
import { OverlayView } from "../view/OverlayView";
import { HudView, RosterRow, MenuItem } from "../view/HudView";
import { EventAnimator } from "../anim/EventAnimator";

/**
 * 战斗控制器(Cocos 版):把交互层 BattleSession 接到 3D 场景 + HudView + EventAnimator。
 *
 * 「玩家怎么操作」的全部规则都在 interaction/BattleSession(四套表现层共用,与 web/three/pixi 完全一致);
 * 本文件只负责 Cocos 特有的事:相机射线拾取格、把 ViewModel 喂给各 View / HudView、EventAnimator 播放动画。
 * Cocos 非 DOM,不复用 DomHud —— 直接把 ViewModel 翻译成 HudView 的命令式调用。
 */
export class InputController implements SessionHost {
  readonly animates = true;

  private session: BattleSession;
  private bannerShown = false;
  /** 战役模式:抑制战斗自带 banner,结算交给 CampaignDirector。 */
  private campaign = false;

  constructor(
    _host: Component,
    private readonly registry: ContentRegistry,
    private coord: CoordMap,
    private rig: SceneRig,
    private board: BoardView,
    private units: UnitView,
    private overlay: OverlayView,
    private hud: HudView,
    private animator: EventAnimator
  ) {
    void this.board; // 地形由 Bootstrap 构建并保留引用,这里不直接使用
    this.session = new BattleSession(this.registry, this);
    this.bindInput();
  }

  // ---------- 公共 API(供 Bootstrap 调用)----------
  load(level: LevelDef): void {
    this.campaign = false;
    this.session = new BattleSession(this.registry, this);
    this.session.load(level);
  }

  /** 战役模式:用预装配状态开战,结束回调给 Director。 */
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
  endActiveUnit(): void {
    this.session.endActiveUnit();
  }

  // ---------- SessionHost 实现 ----------
  setupLevel(_level: LevelDef, state: BattleState): void {
    // 棋盘/单位骨架由 Bootstrap 构建;切关只需把单位重置到新状态。
    this.bannerShown = false;
    this.units.sync(state);
  }

  render(vm: ViewModel): void {
    this.overlay.show(vm.overlay);
    this.units.setSelected(vm.overlay.selectedUnitId);
    // 播放动画期间单位位置由动画接管,不快照;其余时刻据最终态对齐。
    if (!vm.busy) this.units.sync(vm.state);

    this.hud.setHint(vm.hint);
    this.hud.setTurn(vm.turnText);
    this.hud.renderOrder(vm.info.order);
    this.renderRoster(vm);
    this.renderMenu(vm);
    this.renderConfirm(vm);
    this.renderBanner(vm);
  }

  async applyEvents(events: BattleEvent[], opts: ApplyOpts, state: BattleState): Promise<void> {
    if (opts.resetActor) {
      const s = this.units.get(opts.resetActor.id);
      if (s) this.coord.posToWorld(opts.resetActor.fromPos, 0, s.world); // 从本回合起点走起
    }
    this.overlay.clear();
    this.hud.hideMenu();
    await this.animator.play(events);
    this.units.sync(state);
  }

  log(msg: string): void {
    this.hud.log(msg);
  }
  clearLog(): void {
    this.hud.clearLog();
  }

  // ---------- ViewModel → HudView ----------
  private renderRoster(vm: ViewModel): void {
    const rows: RosterRow[] = vm.state.units.map((u) => ({
      name: u.name,
      speed: u.stats.speed,
      hp: u.hp,
      maxHp: u.maxHp,
      faction: u.faction,
      dead: u.hp <= 0,
      sel: u.instanceId === vm.state.activeUnitId,
    }));
    this.hud.renderRoster(rows);
  }

  private renderMenu(vm: ViewModel): void {
    if (!vm.menu.visible) {
      this.hud.hideMenu();
      return;
    }
    const items: MenuItem[] = vm.menu.skills.map((s) => ({
      skillId: s.id,
      name: s.name,
      desc: s.full,
      disabled: s.disabled,
    }));
    const uiPos = this.rig.worldToUI(this.coord.posToWorld(vm.menu.anchorCell, 0.4));
    this.hud.showMenu(vm.menu.unitName, items, vm.menu.showUndo, new Vec3(uiPos.x, uiPos.y, 0), {
      onSkill: (id) => this.session.selectSkill(id),
      onUndo: () => this.session.undoMove(),
      onEnd: () => this.session.endActiveUnit(),
    });
  }

  private renderConfirm(vm: ViewModel): void {
    if (!vm.confirm.visible) {
      this.hud.hideConfirm();
      return;
    }
    this.hud.showConfirm(vm.confirm.skillName, vm.confirm.desc, vm.confirm.canRelease, {
      onConfirm: () => void this.session.confirm(),
      onCancel: () => this.session.cancel(),
    });
  }

  private renderBanner(vm: ViewModel): void {
    if (this.campaign) return; // 战役模式由 Director 的结算屏负责
    if (vm.banner) {
      if (this.bannerShown) return; // 避免每帧重建
      this.bannerShown = true;
      this.hud.showBanner(vm.banner === "player_win", () => this.session.restart());
    } else if (this.bannerShown) {
      this.bannerShown = false;
      this.hud.hideBanner();
    }
  }

  // ---------- 输入:屏幕 → 逻辑格 ----------
  private bindInput(): void {
    input.on(Input.EventType.MOUSE_MOVE, (e: EventMouse) => {
      this.session.hoverCell(this.pick(e.getLocationX(), e.getLocationY()));
    });
    input.on(Input.EventType.MOUSE_DOWN, (e: EventMouse) => {
      if (e.getButton() === EventMouse.BUTTON_RIGHT) {
        this.session.cancel();
        return;
      }
      const cell = this.pick(e.getLocationX(), e.getLocationY());
      if (cell) this.session.tapCell(cell);
    });
    input.on(Input.EventType.TOUCH_END, (e: EventTouch) => {
      const cell = this.pick(e.getLocationX(), e.getLocationY());
      if (cell) this.session.tapCell(cell);
    });
  }

  /** 相机射线 ∩ 地面(y=0)→ 逻辑格。 */
  private pick(sx: number, sy: number): Position | null {
    const cam: Camera = this.rig.world3DCamera;
    const ray = new geometry.Ray();
    cam.screenPointToRay(sx, sy, ray);
    if (Math.abs(ray.d.y) < 1e-6) return null;
    const t = -ray.o.y / ray.d.y;
    if (t < 0) return null;
    const hit = new Vec3(ray.o.x + ray.d.x * t, 0, ray.o.z + ray.d.z * t);
    return this.coord.worldToCell(hit);
  }
}

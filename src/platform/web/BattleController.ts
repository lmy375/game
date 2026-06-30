/**
 * Web Canvas 表现层适配器：把交互层 BattleSession 接到 CanvasRenderer + 共用 DomHud。
 *
 * 「玩家怎么操作」的全部规则都在 src/interaction/BattleSession（四套表现层共用）；
 * 本文件只负责 Web 特有的三件事：
 *   1. 把鼠标事件翻译成 session 的输入意图（tapCell / hoverCell / cancel）。
 *   2. 实现 SessionHost：用 CanvasRenderer 画棋盘叠加层，用 DomHud 画 HUD。
 *   3. Web 无动画 —— applyEvents 为空实现，整段流程同步完成（render 即呈现最终态）。
 */
import { BattleState, LevelDef, Position, BattleEvent, ContentRegistry } from "@core/index";
import { BattleSession, SessionHost, ViewModel, ApplyOpts } from "../../interaction";
import { DomHud, HudEls } from "../_shared/DomHud";
import { CanvasRenderer } from "./CanvasRenderer";

export type ControllerEls = HudEls;

export class BattleController implements SessionHost {
  readonly animates = false;

  private session: BattleSession;
  private hud: DomHud;
  private renderer?: CanvasRenderer;
  /** 战役模式：结算屏由 CampaignDirector 负责，抑制战斗自带 banner。 */
  private campaign = false;

  constructor(
    private readonly registry: ContentRegistry,
    private canvas: HTMLCanvasElement,
    els: ControllerEls
  ) {
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
    this.bindCanvas();
  }

  /** 调试/测试入口：当前战斗状态。 */
  get state(): BattleState {
    return this.session.getState();
  }

  // ---------- 公共 API（供 main.ts 与测试调用）----------
  /** 独立单场（关卡选择/测试）：原路径，显示自带 banner。 */
  load(level: LevelDef): void {
    this.campaign = false;
    this.session = new BattleSession(this.registry, this);
    this.session.load(level);
  }

  /** 战役模式：用预装配好的状态开战，结束回调给 Director；自带 banner 被抑制。 */
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
  setupLevel(_level: LevelDef, state: BattleState): void {
    this.renderer = new CanvasRenderer(this.canvas, state);
  }

  render(vm: ViewModel): void {
    if (!this.renderer) return;
    // 战役模式下结算交给 Director，抑制战斗自带 banner，避免双重 UI。
    const v = this.campaign && vm.banner ? { ...vm, banner: null } : vm;
    this.renderer.setState(v.state);
    this.renderer.render(v.overlay);
    this.hud.render(v);
  }

  /** Web 无动画：状态已在 render 中呈现；仅为敌方行动留出可观看的节奏。 */
  async applyEvents(_events: BattleEvent[], opts: ApplyOpts, _state: BattleState): Promise<void> {
    if (opts.kind === "ai") await new Promise((r) => setTimeout(r, 420));
  }

  log(msg: string): void {
    this.hud.log(msg);
  }
  clearLog(): void {
    this.hud.clearLog();
  }

  // ---------- 输入 ----------
  private bindCanvas(): void {
    this.canvas.addEventListener("mousemove", (e) => {
      this.session.hoverCell(this.renderer?.cellFromPixel(e.clientX, e.clientY) ?? null);
    });
    this.canvas.addEventListener("click", (e) => {
      const cell = this.renderer?.cellFromPixel(e.clientX, e.clientY);
      if (cell) this.session.tapCell(cell);
    });
    this.canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.session.cancel();
    });
  }

  /** 把浮动菜单定位到行动单位旁（贴右，越界翻左/夹紧）。 */
  private positionMenu(menu: HTMLElement, anchor: Position): void {
    if (!this.renderer) return;
    const rect = this.renderer.cellRectCss(anchor);
    const menuW = menu.offsetWidth || 150;
    let left = rect.left + rect.width + 8;
    if (left + menuW > rect.boardWidth) left = rect.left - menuW - 8;
    if (left < 0) left = Math.min(rect.left, rect.boardWidth - menuW);
    let top = rect.top;
    const menuH = menu.offsetHeight || 0;
    if (top + menuH > rect.boardHeight) top = Math.max(0, rect.boardHeight - menuH);
    menu.style.left = `${Math.max(0, left)}px`;
    menu.style.top = `${Math.max(0, top)}px`;
  }
}

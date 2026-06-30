import { Node, Vec3, Color, Label, Button, UITransform, view } from "cc";
import { SceneRig } from "./SceneRig";
import { uiNode, uiLabel, uiSolid } from "./Factory";
import { UI, hex } from "./Palette";

export interface RosterRow {
  name: string;
  speed: number;
  hp: number;
  maxHp: number;
  faction: "player" | "enemy";
  dead: boolean;
  sel: boolean;
}
export interface MenuItem {
  skillId: string;
  name: string;
  desc: string;
  disabled: boolean;
}
export interface MenuCallbacks {
  onSkill: (id: string) => void;
  onUndo?: () => void;
  onEnd: () => void;
}
export interface ConfirmCallbacks {
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * HUD:回合提示、行动顺序、双方名册、战斗日志、浮动技能菜单、确认条、结算横幅。
 * 纯展示层:所有数据由 InputController 计算后喂入,按钮回调回传给控制器。
 */
export class HudView {
  private root!: Node;
  private turnLabel!: Label;
  private hintLabel!: Label;
  private orderLabel!: Label;
  private rosterLabel!: Label;
  private logLabel!: Label;
  private menu!: Node;
  private confirm!: Node;
  private banner!: Node;
  private logLines: string[] = [];

  constructor(private rig: SceneRig) {}

  build(): void {
    this.root = uiNode("HUD", this.rig.canvas);
    const size = view.getVisibleSize();
    const halfW = size.width / 2;
    const halfH = size.height / 2;

    this.turnLabel = uiLabel(this.root, "", { size: 24, color: UI.text, bold: true, outline: hex("#000", 200) });
    this.turnLabel.node.setPosition(new Vec3(0, halfH - 30, 0));

    this.hintLabel = uiLabel(this.root, "", { size: 16, color: UI.accent, outline: hex("#000", 180) });
    this.hintLabel.node.setPosition(new Vec3(0, halfH - 60, 0));
    this.hintLabel.horizontalAlign = Label.HorizontalAlign.CENTER;

    const orderPanel = uiSolid(this.root, 230, 64, UI.panel).node;
    orderPanel.setPosition(new Vec3(-halfW + 125, halfH - 50, 0));
    this.orderLabel = uiLabel(orderPanel, "", { size: 14, color: UI.text });
    this.orderLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
    this.orderLabel.verticalAlign = Label.VerticalAlign.TOP;
    this.orderLabel.node.getComponent(UITransform)!.setContentSize(210, 56);

    const rosterPanel = uiSolid(this.root, 230, 220, UI.panel).node;
    rosterPanel.setPosition(new Vec3(-halfW + 125, halfH - 185, 0));
    this.rosterLabel = uiLabel(rosterPanel, "", { size: 15, color: UI.text });
    this.rosterLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
    this.rosterLabel.verticalAlign = Label.VerticalAlign.TOP;
    this.rosterLabel.node.getComponent(UITransform)!.setContentSize(210, 200);

    const logPanel = uiSolid(this.root, 300, 180, UI.panel).node;
    logPanel.setPosition(new Vec3(-halfW + 160, -halfH + 100, 0));
    this.logLabel = uiLabel(logPanel, "", { size: 13, color: UI.textDim });
    this.logLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
    this.logLabel.verticalAlign = Label.VerticalAlign.TOP;
    this.logLabel.node.getComponent(UITransform)!.setContentSize(280, 164);

    this.menu = uiNode("SkillMenu", this.root);
    this.menu.active = false;

    this.confirm = uiNode("ConfirmBar", this.root);
    this.confirm.setPosition(new Vec3(0, -halfH + 60, 0));
    this.confirm.active = false;

    this.banner = uiNode("Banner", this.root);
    this.banner.active = false;
  }

  setTurn(text: string): void {
    this.turnLabel.string = text;
  }
  setHint(text: string): void {
    this.hintLabel.string = text;
  }

  log(msg: string): void {
    this.logLines.unshift(msg);
    if (this.logLines.length > 12) this.logLines.length = 12;
    this.logLabel.string = this.logLines.join("\n");
  }
  clearLog(): void {
    this.logLines = [];
    this.logLabel.string = "";
  }

  renderOrder(chips: { name: string; kind: "now" | "player" | "enemy" }[]): void {
    this.orderLabel.string = "行动顺序\n" + chips.map((c) => (c.kind === "now" ? `▶${c.name}` : c.name)).join(" › ");
  }

  renderRoster(rows: RosterRow[]): void {
    const fmt = (r: RosterRow) =>
      `${r.sel ? "▶ " : "  "}${r.dead ? "☠ " : ""}${r.name}  速${r.speed}  ${Math.max(0, r.hp)}/${r.maxHp}`;
    const players = rows.filter((r) => r.faction === "player");
    const enemies = rows.filter((r) => r.faction === "enemy");
    this.rosterLabel.string =
      "【我方】\n" + players.map(fmt).join("\n") + "\n\n【敌方】\n" + enemies.map(fmt).join("\n");
  }

  // ── 浮动技能菜单 ─────────────────────────────────────────────────
  showMenu(title: string, items: MenuItem[], showUndo: boolean, uiPos: Vec3, cbs: MenuCallbacks): void {
    for (const c of [...this.menu.children]) c.destroy();
    this.menu.active = true;

    const btnH = 34;
    const gap = 6;
    const rows = items.length + (showUndo ? 1 : 0) + 1; // + 结束行动
    const panelH = 28 + rows * (btnH + gap);
    const panelW = 168;
    const bg = uiSolid(this.menu, panelW, panelH, UI.panel).node;

    const titleLab = uiLabel(bg, title, { size: 15, color: UI.accent, bold: true });
    titleLab.node.setPosition(new Vec3(0, panelH / 2 - 16, 0));

    let y = panelH / 2 - 36;
    for (const it of items) {
      this.button(bg, `${it.name}`, panelW - 20, btnH, new Vec3(0, y, 0), it.disabled, UI.accent, () =>
        cbs.onSkill(it.skillId)
      );
      y -= btnH + gap;
    }
    if (showUndo && cbs.onUndo) {
      this.button(bg, "↩ 撤销移动", panelW - 20, btnH, new Vec3(0, y, 0), false, UI.textDim, cbs.onUndo);
      y -= btnH + gap;
    }
    this.button(bg, "✔ 结束行动", panelW - 20, btnH, new Vec3(0, y, 0), false, UI.textDim, cbs.onEnd);

    // 贴近单位放在其右侧,越界则翻到左侧 / 夹紧
    const size = view.getVisibleSize();
    let px = uiPos.x + 70 + panelW / 2;
    if (px + panelW / 2 > size.width / 2) px = uiPos.x - 70 - panelW / 2;
    let py = uiPos.y;
    py = Math.max(-size.height / 2 + panelH / 2, Math.min(size.height / 2 - panelH / 2, py));
    this.menu.setPosition(new Vec3(px, py, 0));
  }
  hideMenu(): void {
    this.menu.active = false;
  }

  // ── 确认条 ───────────────────────────────────────────────────────
  showConfirm(skillName: string, desc: string, canFire: boolean, cbs: ConfirmCallbacks): void {
    for (const c of [...this.confirm.children]) c.destroy();
    this.confirm.active = true;
    const w = 560;
    const bg = uiSolid(this.confirm, w, 56, UI.panel).node;
    const text = uiLabel(bg, `${skillName}　${desc}`, { size: 15, color: canFire ? UI.text : UI.textDim });
    text.node.setPosition(new Vec3(-60, 0, 0));
    text.node.getComponent(UITransform)!.setContentSize(360, 48);
    this.button(bg, "✓ 释放", 90, 36, new Vec3(w / 2 - 150, 0, 0), !canFire, UI.hpFull, cbs.onConfirm);
    this.button(bg, "✕ 取消", 90, 36, new Vec3(w / 2 - 50, 0, 0), false, UI.danger, cbs.onCancel);
  }
  hideConfirm(): void {
    this.confirm.active = false;
  }

  // ── 结算横幅 ─────────────────────────────────────────────────────
  showBanner(win: boolean, onNext: () => void): void {
    for (const c of [...this.banner.children]) c.destroy();
    this.banner.active = true;
    const bg = uiSolid(this.banner, 360, 180, UI.panel).node;
    const lab = uiLabel(bg, win ? "🎉 胜利!" : "💀 战败", {
      size: 36,
      color: win ? UI.hpFull : UI.danger,
      bold: true,
    });
    lab.node.setPosition(new Vec3(0, 36, 0));
    this.button(bg, win ? "继续" : "重试", 140, 44, new Vec3(0, -40, 0), false, UI.accent, onNext);
  }
  hideBanner(): void {
    this.banner.active = false;
  }

  private button(
    parent: Node,
    text: string,
    w: number,
    h: number,
    pos: Vec3,
    disabled: boolean,
    color: Color,
    onClick: () => void
  ): Node {
    const { node } = uiSolid(parent, w, h, disabled ? hex("#2a3142", 200) : color.clone());
    node.setPosition(pos);
    const lab = uiLabel(node, text, { size: 15, color: disabled ? UI.textDim : hex("#0d0f15"), bold: true });
    lab.node.setPosition(Vec3.ZERO as Vec3);
    const btn = node.addComponent(Button);
    btn.interactable = !disabled;
    if (!disabled) node.on(Button.EventType.CLICK, onClick);
    return node;
  }
}

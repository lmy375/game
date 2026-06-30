import { Node, Vec3, Color, Label, Button, UITransform, view } from "cc";
import { SceneRig } from "./SceneRig";
import { uiNode, uiLabel, uiSolid } from "./Factory";
import { UI, hex } from "./Palette";
import { TitleVM, CutsceneVM, ResultVM, EndingVM } from "../campaign";

export interface ScreenHandlers {
  title: (id: "new" | "continue") => void;
  cutsceneNext: () => void;
  resultPrimary: () => void;
  endingToTitle: () => void;
}

/**
 * Cocos 节点版战役屏幕（标题/过场/结算/结局），是共享 DomScreens 的非 DOM 等价物。
 * 全屏覆盖在 3D/HUD 之上；从 campaign 的 ViewModel 渲染，按钮回调接到 Director。
 */
export class CampaignScreens {
  private root!: Node;
  private panel!: Node;

  constructor(private rig: SceneRig, private handlers: ScreenHandlers) {}

  build(): void {
    this.root = uiNode("CampaignScreens", this.rig.canvas);
    const size = view.getVisibleSize();
    uiSolid(this.root, size.width, size.height, hex("#080a0f", 235)); // 全屏暗底
    this.panel = uiNode("ScreenPanel", this.root);
    this.root.active = false;
  }

  hide(): void {
    this.root.active = false;
  }

  private open(): Node {
    for (const c of [...this.panel.children]) c.destroy();
    this.root.active = true;
    const bg = uiSolid(this.panel, 600, 420, UI.panel).node;
    return bg;
  }

  showTitle(vm: TitleVM): void {
    const bg = this.open();
    const t = uiLabel(bg, vm.title, { size: 40, color: UI.text, bold: true });
    t.node.setPosition(new Vec3(0, 120, 0));
    if (vm.subtitle) {
      const s = uiLabel(bg, vm.subtitle, { size: 16, color: UI.textDim });
      s.node.setPosition(new Vec3(0, 76, 0));
    }
    let x = vm.buttons.length > 1 ? -90 : 0;
    for (const b of vm.buttons) {
      this.button(bg, b.label, new Vec3(x, -20, 0), !b.enabled, UI.accent, () => this.handlers.title(b.id));
      x += 180;
    }
  }

  showCutscene(vm: CutsceneVM): void {
    const bg = this.open();
    const visible = vm.lines.slice(0, vm.cursor + 1);
    const text = visible.map((l) => (l.speaker ? `【${l.speaker}】${l.text}` : l.text)).join("\n\n");
    const lab = uiLabel(bg, text, { size: 17, color: UI.text });
    lab.horizontalAlign = Label.HorizontalAlign.LEFT;
    lab.verticalAlign = Label.VerticalAlign.CENTER;
    lab.node.getComponent(UITransform)!.setContentSize(520, 280);
    lab.node.setPosition(new Vec3(0, 40, 0));
    this.button(bg, vm.continueLabel, new Vec3(0, -160, 0), false, UI.accent, () => this.handlers.cutsceneNext());
  }

  showResult(vm: ResultVM): void {
    const bg = this.open();
    const title = uiLabel(bg, vm.title, { size: 34, color: vm.win ? UI.hpFull : UI.danger, bold: true });
    title.node.setPosition(new Vec3(0, 150, 0));

    const rows: string[] = [];
    if (vm.win) rows.push(`获得经验 +${vm.xpGained}`);
    for (const u of vm.levelUps) {
      rows.push(
        `${u.name} 升级 Lv.${u.fromLevel} → Lv.${u.toLevel}` +
          (u.unlockedSkills.length ? `  习得「${u.unlockedSkills.join("、")}」` : "")
      );
    }
    for (const it of vm.itemsGained) rows.push(`🎁 ${it.name}　${it.description}`);
    const body = uiLabel(bg, rows.join("\n\n"), { size: 16, color: UI.text });
    body.node.getComponent(UITransform)!.setContentSize(540, 220);
    body.node.setPosition(new Vec3(0, 0, 0));

    this.button(bg, vm.primary.label, new Vec3(0, -160, 0), false, UI.accent, () => this.handlers.resultPrimary());
  }

  showEnding(vm: EndingVM): void {
    const bg = this.open();
    const title = uiLabel(bg, vm.title, { size: 34, color: UI.text, bold: true });
    title.node.setPosition(new Vec3(0, 150, 0));
    const body = uiLabel(bg, vm.lines.join("\n\n"), { size: 16, color: UI.text });
    body.node.getComponent(UITransform)!.setContentSize(540, 220);
    const btn = vm.buttons[0];
    if (btn) this.button(bg, btn.label, new Vec3(0, -160, 0), false, UI.accent, () => this.handlers.endingToTitle());
  }

  private button(parent: Node, text: string, pos: Vec3, disabled: boolean, color: Color, onClick: () => void): Node {
    const { node } = uiSolid(parent, 150, 46, disabled ? hex("#2a3142", 200) : color.clone());
    node.setPosition(pos);
    const lab = uiLabel(node, text, { size: 16, color: disabled ? UI.textDim : hex("#0d0f15"), bold: true });
    lab.node.setPosition(Vec3.ZERO as Vec3);
    const btn = node.addComponent(Button);
    btn.interactable = !disabled;
    if (!disabled) node.on(Button.EventType.CLICK, onClick);
    return node;
  }
}

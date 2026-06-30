import { Node, Vec3, Color, Label } from "cc";
import { Position } from "../game-core/index";
import { CoordMap } from "../core/CoordMap";
import { Overlay } from "../core/types";
import { SceneRig } from "./SceneRig";
import { planeMesh, boxMesh, unlitMat, meshNode, uiNode, uiLabel } from "./Factory";
import { OVERLAY, UI } from "./Palette";

/**
 * 叠加层:把控制器算出的 Overlay 画在棋盘上。
 *  - 3D 贴地高亮:移动/施法范围、AOE 命中、落点、危险地形、悬停、起点。
 *  - 3D 位移箭头:预览技能会把谁推/拉到哪。
 *  - UI 预览数字:命中后的伤害/治疗预估(投影到屏幕,瞄准时静态展示)。
 */
export class OverlayView {
  private deco!: Node; // 3D 贴地装饰
  private labels!: Node; // UI 预览数字

  constructor(
    private coord: CoordMap,
    private rig: SceneRig
  ) {}

  build(boardRoot: Node): void {
    this.deco = new Node("Overlay3D");
    boardRoot.addChild(this.deco);
    this.labels = uiNode("OverlayLabels", this.rig.canvas);
  }

  show(o: Overlay): void {
    this.clear();
    this.cells(o.moveCells, OVERLAY.move);
    this.cells(o.castCells, OVERLAY.cast);
    this.cells(o.hazardWarn, OVERLAY.hazard);
    this.cells(o.hitArm, OVERLAY.hitArm);
    this.cells(o.hitCenter, OVERLAY.hitCenter);
    this.cells(o.finalBoxes, OVERLAY.finalBox, 0.09);
    if (o.originCell) this.cells([o.originCell], OVERLAY.origin);
    if (o.hoverCell) this.cells([o.hoverCell], OVERLAY.hover, 0.1);
    for (const a of o.arrows ?? []) this.arrow(a.from, a.to);
    for (const d of o.damage ?? []) this.previewLabel(d.pos, d.amount, d.kind, d.lethal);
  }

  clear(): void {
    for (const c of [...this.deco.children]) c.destroy();
    for (const c of [...this.labels.children]) c.destroy();
  }

  private cells(cells: Position[] | undefined, color: Color, y = 0.05): void {
    if (!cells) return;
    const size = this.coord.cell * 0.9;
    for (const p of cells) {
      const n = meshNode(`hl`, this.deco, planeMesh(size, size), unlitMat(color, true));
      n.setPosition(this.coord.posToWorld(p, y));
    }
  }

  private arrow(from: Position, to: Position): void {
    const a = this.coord.posToWorld(from, 0.08);
    const b = this.coord.posToWorld(to, 0.08);
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    if (len < 1e-3) return;
    const shaft = meshNode("arrow", this.deco, boxMesh(0.12, 0.04, len), unlitMat(OVERLAY.finalBox, true));
    shaft.setPosition(new Vec3((a.x + b.x) / 2, 0.08, (a.z + b.z) / 2));
    shaft.setRotationFromEuler(0, (Math.atan2(dx, -dz) * 180) / Math.PI, 0);
  }

  private previewLabel(p: Position, amount: number, kind: "damage" | "heal", lethal: boolean): void {
    const color = kind === "heal" ? UI.heal : lethal ? UI.danger : UI.good;
    const l = uiLabel(this.labels, `${kind === "heal" ? "+" : "-"}${amount}`, {
      size: 22,
      color,
      bold: true,
      outline: UI.hpBack,
    });
    const w = this.coord.posToWorld(p, 0.6);
    l.node.setPosition(this.rig.worldToUI(w));
  }
}

import { Container, Graphics } from "pixi.js";
import { Position } from "@core/index";
import { Grid } from "./Grid";
import { Overlay } from "./types";

interface Style {
  color: number;
  alpha: number;
  /** 可选的每格描边，用于在同色地形上拉开对比（如蓝色地砖上的移动范围）。 */
  edge?: number;
  edgeAlpha?: number;
}
const HL: Record<string, Style> = {
  // 移动范围叠在偏蓝的地砖上，用更亮的天蓝 + 亮边描边保证可读性。
  move: { color: 0x6cc4ff, alpha: 0.42, edge: 0xd4efff, edgeAlpha: 0.7 },
  cast: { color: 0xe8c840, alpha: 0.24 },
  hazard: { color: 0xff5030, alpha: 0.4 },
  hitArm: { color: 0xe8843f, alpha: 0.44 },
  hitCenter: { color: 0xe8503f, alpha: 0.58 },
  origin: { color: 0x9fb4d0, alpha: 0.3 },
  hover: { color: 0xffffff, alpha: 0.16 },
  // 敌方威胁区（我方回合常显）：玫红两档，垫在所有高亮之下，alpha 必须低于 hazard。
  threatAttack: { color: 0xd8486e, alpha: 0.12 },
  threatMove: { color: 0xd8486e, alpha: 0.2 },
  // 敌方回合移动预告：橙色，与我方天蓝移动范围区分。
  enemyMove: { color: 0xff9a4d, alpha: 0.38, edge: 0xffd9ad, edgeAlpha: 0.6 },
};

/** 贴合等距菱形的高亮 + 落点虚框 + 位移箭头。每次刷新整体重建。 */
export class OverlayView {
  private layer!: Container;
  private grid!: Grid;

  build(grid: Grid, layer: Container): void {
    this.grid = grid;
    this.layer = layer;
  }

  show(o: Overlay): void {
    this.clear();
    this.cells(o.threatAttackCells, HL.threatAttack);
    this.cells(o.threatMoveCells, HL.threatMove);
    this.cells(o.moveCells, HL.move);
    this.cells(o.enemyMoveCells, HL.enemyMove);
    this.cells(o.castCells, HL.cast);
    this.cells(o.hazardWarn, HL.hazard);
    this.cells(o.hitArm, HL.hitArm);
    this.cells(o.hitCenter, HL.hitCenter);
    if (o.originCell) this.cells([o.originCell], HL.origin);
    if (o.hoverCell) this.cells([o.hoverCell], HL.hover);
    for (const b of o.finalBoxes ?? []) this.box(b);
    for (const a of o.arrows ?? []) this.arrow(a.from, a.to);
  }

  clear(): void {
    this.layer.removeChildren().forEach((c) => c.destroy());
  }

  /** 菱形顶面顶点(略微内缩),相对格中心。 */
  private diamond(inset = 0.86): number[] {
    const hw = this.grid.halfW * inset;
    const hh = this.grid.halfH * inset;
    return [0, -hh, hw, 0, 0, hh, -hw, 0];
  }

  private cells(cells: Position[] | undefined, s: Style): void {
    if (!cells) return;
    const pts = this.diamond();
    const g = new Graphics();
    for (const p of cells) {
      const c = this.grid.center(p);
      g.poly(pts.map((v, i) => (i % 2 === 0 ? v + c.x : v + c.y)));
    }
    g.fill({ color: s.color, alpha: s.alpha });
    if (s.edge !== undefined) g.stroke({ width: 1, color: s.edge, alpha: s.edgeAlpha ?? 0.6 });
    this.layer.addChild(g);
  }

  private box(p: Position): void {
    const c = this.grid.center(p);
    const pts = this.diamond();
    const g = new Graphics();
    g.poly(pts.map((v, i) => (i % 2 === 0 ? v + c.x : v + c.y))).stroke({ width: 2, color: 0xffffff, alpha: 0.8 });
    this.layer.addChild(g);
  }

  private arrow(from: Position, to: Position): void {
    const a = this.grid.center(from);
    const b = this.grid.center(to);
    const g = new Graphics();
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 4, color: 0xffffff, alpha: 0.85 });
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const head = 10;
    g.moveTo(b.x, b.y)
      .lineTo(b.x - head * Math.cos(ang - 0.4), b.y - head * Math.sin(ang - 0.4))
      .moveTo(b.x, b.y)
      .lineTo(b.x - head * Math.cos(ang + 0.4), b.y - head * Math.sin(ang + 0.4))
      .stroke({ width: 4, color: 0xffffff, alpha: 0.85 });
    this.layer.addChild(g);
  }
}

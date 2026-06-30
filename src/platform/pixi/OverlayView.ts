import { Container, Graphics } from "pixi.js";
import { Position } from "@core/index";
import { Grid } from "./Grid";
import { Overlay } from "./types";

interface Style {
  color: number;
  alpha: number;
}
const HL: Record<string, Style> = {
  move: { color: 0x4a90d9, alpha: 0.3 },
  cast: { color: 0xe8c840, alpha: 0.2 },
  hazard: { color: 0xff5030, alpha: 0.38 },
  hitArm: { color: 0xe8843f, alpha: 0.42 },
  hitCenter: { color: 0xe8503f, alpha: 0.55 },
  origin: { color: 0x9fb4d0, alpha: 0.28 },
  hover: { color: 0xffffff, alpha: 0.12 },
};

/** 贴格高亮 + 落点虚框 + 位移箭头。每次刷新整体重建。 */
export class OverlayView {
  private layer!: Container;
  private grid!: Grid;

  build(grid: Grid, layer: Container): void {
    this.grid = grid;
    this.layer = layer;
  }

  show(o: Overlay): void {
    this.clear();
    this.cells(o.moveCells, HL.move);
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

  private cells(cells: Position[] | undefined, s: Style): void {
    if (!cells) return;
    const cell = this.grid.cell;
    const g = new Graphics();
    for (const p of cells) {
      const tx = p.x * cell + 4;
      const ty = (this.grid.height - 1 - p.y) * cell + 4;
      g.roundRect(tx, ty, cell - 8, cell - 8, 8);
    }
    g.fill({ color: s.color, alpha: s.alpha });
    this.layer.addChild(g);
  }

  private box(p: Position): void {
    const cell = this.grid.cell;
    const tx = p.x * cell + 4;
    const ty = (this.grid.height - 1 - p.y) * cell + 4;
    const g = new Graphics();
    g.roundRect(tx, ty, cell - 8, cell - 8, 8).stroke({ width: 2, color: 0xffffff, alpha: 0.8 });
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

import { Position } from "@core/index";

/**
 * 2D 逻辑格 ↔ 像素映射。逻辑 y 向上、原点左下;屏幕 y 向下,故纵向翻转。
 * 返回的都是格中心像素坐标(棋盘左上角为像素原点)。
 */
export class Grid {
  constructor(
    readonly width: number,
    readonly height: number,
    readonly cell = 72
  ) {}

  get pxWidth(): number {
    return this.width * this.cell;
  }
  get pxHeight(): number {
    return this.height * this.cell;
  }

  /** 格中心像素坐标。 */
  center(p: Position): { x: number; y: number } {
    return { x: p.x * this.cell + this.cell / 2, y: (this.height - 1 - p.y) * this.cell + this.cell / 2 };
  }
  cx(x: number): number {
    return x * this.cell + this.cell / 2;
  }
  cy(y: number): number {
    return (this.height - 1 - y) * this.cell + this.cell / 2;
  }

  /** 像素 → 逻辑格;越界返回 null。 */
  pixelToCell(px: number, py: number): Position | null {
    const x = Math.floor(px / this.cell);
    const y = this.height - 1 - Math.floor(py / this.cell);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return null;
    return { x, y };
  }
}

import { Position } from "@core/index";

/**
 * 等距(2.5D)投影:逻辑格 ↔ 屏幕像素。
 *
 * 逻辑坐标 y 向上(原点左下);投影后逻辑 y=0 落在画面前方(下),y 越大越靠后(上),
 * 每格渲染为宽:高 = 2:1 的菱形顶面 + 向下挤出的厚度,营造斜视立体感。
 *
 * center() 返回菱形顶面中心像素;偏移量 ox/oy 已内置,保证所有格中心与四角
 * 都落在 [0,pxWidth] × [0,pxHeight] 内(棋盘左上角为像素原点)。
 */
export class Grid {
  readonly halfW: number;
  readonly halfH: number;
  /** 瓦片厚度(向下挤出高度),制造 2.5D 立体感。 */
  readonly thickness: number;
  private readonly ox: number;
  private readonly oy: number;

  constructor(
    readonly width: number,
    readonly height: number,
    readonly tileW = 116,
    readonly tileH = 58,
    thickness = 34 // 悬崖侧壁厚度:不规则大陆的暴露崖壁,pxHeight 计入避免底边被裁
  ) {
    this.halfW = tileW / 2;
    this.halfH = tileH / 2;
    this.thickness = thickness;
    // 令 (x - depth) 的最小值 -(H-1) 映射到左边缘;两侧各留半格。
    this.ox = (height - 1) * this.halfW + this.halfW;
    this.oy = tileH; // 顶部留白,给最后一行瓦片与单位头顶余量
  }

  /** 深度:0 = 最靠后一行(逻辑 y=H-1),越大越靠前。 */
  private depth(y: number): number {
    return this.height - 1 - y;
  }

  get pxWidth(): number {
    return (this.width + this.height - 2) * this.halfW + this.tileW;
  }
  get pxHeight(): number {
    return this.oy + (this.width + this.height - 2) * this.halfH + this.halfH + this.thickness;
  }

  /** 菱形顶面中心像素坐标。 */
  center(p: Position): { x: number; y: number } {
    const d = this.depth(p.y);
    return {
      x: this.ox + (p.x - d) * this.halfW,
      y: this.oy + (p.x + d) * this.halfH,
    };
  }

  /** 顶面四角(相对中心的偏移),顺序:上→右→下→左。 */
  topDiamond(): number[] {
    return [0, -this.halfH, this.halfW, 0, 0, this.halfH, -this.halfW, 0];
  }

  /** 像素 → 逻辑格;越界返回 null。 */
  pixelToCell(px: number, py: number): Position | null {
    const X = (px - this.ox) / this.halfW; // = x - depth
    const Y = (py - this.oy) / this.halfH; // = x + depth
    const x = Math.round((X + Y) / 2);
    const d = Math.round((Y - X) / 2);
    const y = this.height - 1 - d;
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return null;
    return { x, y };
  }
}

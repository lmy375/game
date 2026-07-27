import { Container, Graphics, Sprite } from "pixi.js";
import { BattleState, GridBoard, Position, TerrainType } from "@core/index";
import { Grid } from "./Grid";
import { terrainTextureUrls } from "./AssetManifest";

/** 凸起装饰块(墙/障碍)的顶面底色。 */
const DECOR_COLOR: Partial<Record<TerrainType, number>> = {
  wall: 0x2b2f3a,
  obstacle: 0x5b4636,
};
const GLOW: Partial<Record<TerrainType, number>> = { fire: 0xff6a2a, trap: 0x9a4ad9 };
/** 额外抬升高度:墙/障碍作为立方块凸出于地面。 */
const RAISE: Partial<Record<TerrainType, number>> = { wall: 30, obstacle: 22 };
const key = (p: Position) => `${p.x},${p.y}`;

/** 按比例调暗颜色,用于侧面阴影。 */
function shade(color: number, k: number): number {
  const r = Math.round(((color >> 16) & 0xff) * k);
  const g = Math.round(((color >> 8) & 0xff) * k);
  const b = Math.round((color & 0xff) * k);
  return (r << 16) | (g << 8) | b;
}

/**
 * 2.5D 不规则大陆棋盘:所有非 void 格合并渲染成一整块平贴地面的地台——
 * 贴地接触阴影 → 半透明顶面色罩(无纹理,背景图透出) → 轮廓棱线高光。
 * 地台与背景地面平齐,不做抬升侧壁,视觉上融入背景图。
 * wall/obstacle/fire/trap 作为装饰层叠加在大陆之上,按深度排序。
 * 格子本身不可见,移动/瞄准高亮由 OverlayView 负责。
 */
export class BoardView {
  private layer!: Container;
  private grid!: Grid;
  private board!: GridBoard;
  /** 装饰层(凸起块/地形贴花),独立容器便于按深度排序与单格重建。 */
  private decorLayer = new Container();
  private decors = new Map<string, Container>();

  build(state: BattleState, grid: Grid, layer: Container): void {
    this.layer = layer;
    this.grid = grid;
    this.board = state.board;

    this.buildContinent();

    this.decorLayer.sortableChildren = true;
    this.layer.addChild(this.decorLayer);
    this.board.forEachTile((p, terrain) => this.makeDecor(p, terrain));
  }

  private isVoidAt(p: Position): boolean {
    return this.board.terrainAt(p) === "void"; // 越界也返回 void
  }

  /** 大陆暴露边(邻接 void/边界)线段集,阴影圈与轮廓棱线共用。 */
  private exposedEdges(land: Position[]): Array<[{ x: number; y: number }, { x: number; y: number }]> {
    const g = this.grid;
    const hw = g.halfW;
    const hh = g.halfH;
    const edges: Array<[{ x: number; y: number }, { x: number; y: number }]> = [];
    for (const p of land) {
      const c = g.center(p);
      const top4 = { x: c.x, y: c.y - hh };
      const right4 = { x: c.x + hw, y: c.y };
      const bottom4 = { x: c.x, y: c.y + hh };
      const left4 = { x: c.x - hw, y: c.y };
      if (this.isVoidAt({ x: p.x - 1, y: p.y })) edges.push([left4, top4]);
      if (this.isVoidAt({ x: p.x, y: p.y + 1 })) edges.push([top4, right4]);
      if (this.isVoidAt({ x: p.x + 1, y: p.y })) edges.push([right4, bottom4]);
      if (this.isVoidAt({ x: p.x, y: p.y - 1 })) edges.push([bottom4, left4]);
    }
    return edges;
  }

  /**
   * 大陆主体:接触阴影 + 顶面 + 轮廓,合并在一个容器内按不透明绘制,
   * cacheAsTexture 压平成单张纹理后整体降透明度,让背景图透出。
   * 半透明几何直接叠加会在子路径重叠处双重混合出深色接缝;压平后只在
   * 不透明像素间遮挡,不产生接缝,整体透明度也只作用一次。
   */
  private buildContinent(): void {
    const g = this.grid;
    const hw = g.halfW;
    const hh = g.halfH;
    const land: Position[] = [];
    this.board.forEachTile((p, terrain) => {
      if (terrain !== "void") land.push(p);
    });
    const edges = this.exposedEdges(land);

    // 1) 贴地接触阴影:沿暴露边描粗黑线,外侧一半露在顶面之外形成阴影圈,
    //    内侧一半被不透明顶面盖住,把地台"坐"进背景地面。
    const shadow = new Graphics();
    for (const [a, b] of edges) shadow.moveTo(a.x, a.y).lineTo(b.x, b.y);
    shadow.stroke({ width: 16, color: 0x000000, cap: "round", join: "round" });

    // 2) 连续顶面:全部陆地菱形一次填充,不做纹理,只留一层色罩;
    //    菱形略外扩消除子路径间的抗锯齿细缝(不透明下重叠不可见)。
    const top = new Graphics();
    const s = 1.03;
    for (const p of land) {
      const c = g.center(p);
      top.poly([c.x, c.y - hh * s, c.x + hw * s, c.y, c.x, c.y + hh * s, c.x - hw * s, c.y]);
    }
    top.fill({ color: 0x141a26 });

    // 3) 轮廓棱线:只勾大陆暴露边,不画内部格线。
    const rim = new Graphics();
    for (const [a, b] of edges) rim.moveTo(a.x, a.y).lineTo(b.x, b.y);
    rim.stroke({ width: 1.5, color: 0xd8cfc0 });

    const continent = new Container();
    continent.addChild(shadow, top, rim);
    continent.cacheAsTexture({ antialias: true });
    continent.alpha = 0.35;
    this.layer.addChild(continent);
  }

  /** 单格装饰:wall/obstacle 凸起立方块,fire/trap 贴花 + 辉光。ground/void 无装饰。 */
  private makeDecor(p: Position, terrain: TerrainType): void {
    if (terrain === "ground" || terrain === "void") return;
    const g = this.grid;
    const c = g.center(p);
    const hw = g.halfW;
    const hh = g.halfH;

    const container = new Container();
    container.position.set(c.x, c.y);
    container.zIndex = c.y;

    const top = { x: 0, y: -hh };
    const right = { x: hw, y: 0 };
    const bottom = { x: 0, y: hh };
    const left = { x: -hw, y: 0 };
    const raise = RAISE[terrain] ?? 0;

    if (raise > 0) {
      // 凸起立方块:顶面上移 raise,侧面向下延伸至地面(大陆顶面)。
      const base = DECOR_COLOR[terrain] ?? 0x2b2f3a;
      const shape = new Graphics();
      shape
        .poly([left.x, left.y - raise, bottom.x, bottom.y - raise, bottom.x, bottom.y, left.x, left.y])
        .fill({ color: shade(base, 0.5) });
      shape
        .poly([bottom.x, bottom.y - raise, right.x, right.y - raise, right.x, right.y, bottom.x, bottom.y])
        .fill({ color: shade(base, 0.68) });
      shape
        .poly([top.x, top.y - raise, right.x, right.y - raise, bottom.x, bottom.y - raise, left.x, left.y - raise])
        .fill({ color: base });
      container.addChild(shape);

      const tex = terrainTextureUrls[terrain as keyof typeof terrainTextureUrls] ?? terrainTextureUrls.ground;
      const sprite = Sprite.from(tex);
      sprite.anchor.set(0.5);
      sprite.width = hw * 2;
      sprite.height = hh * 2;
      sprite.position.set(0, -raise);
      sprite.alpha = 0.95;
      const mask = new Graphics()
        .poly([top.x, top.y - raise, right.x, right.y - raise, bottom.x, bottom.y - raise, left.x, left.y - raise])
        .fill(0xffffff);
      sprite.mask = mask;
      container.addChild(mask, sprite);

      const edge = new Graphics();
      edge
        .moveTo(left.x, left.y - raise)
        .lineTo(top.x, top.y - raise)
        .lineTo(right.x, right.y - raise)
        .stroke({ width: 1.5, color: 0xffffff, alpha: 0.18 });
      container.addChild(edge);
    } else {
      // 平贴地形(fire/trap):菱形贴花,不产生格线感,靠辉光提示危险。
      const tex = terrainTextureUrls[terrain as keyof typeof terrainTextureUrls] ?? terrainTextureUrls.ground;
      const sprite = Sprite.from(tex);
      sprite.anchor.set(0.5);
      sprite.width = hw * 2;
      sprite.height = hh * 2;
      sprite.alpha = 0.88;
      const mask = new Graphics().poly([top.x, top.y, right.x, right.y, bottom.x, bottom.y, left.x, left.y]).fill(0xffffff);
      sprite.mask = mask;
      container.addChild(mask, sprite);
    }

    const glow = GLOW[terrain];
    if (glow) {
      const gl = new Graphics();
      gl.ellipse(0, -raise, hw * 0.7, hh * 0.7).fill({ color: glow, alpha: 0.5 });
      gl.blendMode = "add";
      container.addChild(gl);
    }

    this.decorLayer.addChild(container);
    this.decors.set(key(p), container);
  }

  /** 运行时地形变化(如障碍被打碎):只重建该格装饰,大陆主体不变。void 不允许出现。 */
  updateTerrain(p: Position, terrain: TerrainType): void {
    if (terrain === "void") throw new Error(`updateTerrain 不接受 void(${p.x},${p.y}):空气墙不允许运行时变化`);
    const old = this.decors.get(key(p));
    if (old) {
      this.decorLayer.removeChild(old);
      old.destroy({ children: true });
      this.decors.delete(key(p));
    }
    this.makeDecor(p, terrain);
  }
}

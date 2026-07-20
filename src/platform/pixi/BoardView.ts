import { Container, Graphics, Matrix, Sprite, Texture } from "pixi.js";
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
/** 悬崖岩层配色(上层受光、下层背光),左侧面整体再调暗与旧版光向一致。 */
const CLIFF_UPPER = 0x4a4440;
const CLIFF_LOWER = 0x2c2724;
const key = (p: Position) => `${p.x},${p.y}`;

/** 按比例调暗颜色,用于侧面阴影。 */
function shade(color: number, k: number): number {
  const r = Math.round(((color >> 16) & 0xff) * k);
  const g = Math.round(((color >> 8) & 0xff) * k);
  const b = Math.round((color & 0xff) * k);
  return (r << 16) | (g << 8) | b;
}

/**
 * 2.5D 不规则大陆棋盘:所有非 void 格合并渲染成一整块悬浮地台——
 * 底部投影 → 悬崖侧壁(只在邻接 void/边界的暴露面) → 连续贴图顶面(无格线) → 轮廓棱线高光。
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

  /** 大陆主体:1 个投影 + 1 个悬崖 + 1 个顶面 + 1 个轮廓,共 4 个 Graphics。 */
  private buildContinent(): void {
    const g = this.grid;
    const hw = g.halfW;
    const hh = g.halfH;
    const T = g.thickness;
    const land: Position[] = [];
    this.board.forEachTile((p, terrain) => {
      if (terrain !== "void") land.push(p);
    });

    // 1) 底部投影:整体下移、略外扩;内部重叠区域被地台自身遮住,只露出边缘一圈。
    const shadow = new Graphics();
    for (const p of land) {
      const c = g.center(p);
      const s = 1.12;
      shadow.poly([c.x, c.y + T + 10 - hh * s, c.x + hw * s, c.y + T + 10, c.x, c.y + T + 10 + hh * s, c.x - hw * s, c.y + T + 10]);
    }
    shadow.fill({ color: 0x000000, alpha: 0.34 });

    // 2) 悬崖侧壁:只画邻接 void/边界的暴露面。上亮下暗两段岩层,左右侧面受光不同。
    const cliff = new Graphics();
    const upperH = Math.round(T * 0.45);
    for (const p of land) {
      const c = g.center(p);
      // 左下侧面(邻居 y-1 是空气)
      if (this.isVoidAt({ x: p.x, y: p.y - 1 })) {
        const a = { x: c.x - hw, y: c.y }; // left 角
        const b = { x: c.x, y: c.y + hh }; // bottom 角
        cliff.poly([a.x, a.y, b.x, b.y, b.x, b.y + upperH, a.x, a.y + upperH]).fill({ color: shade(CLIFF_UPPER, 0.72) });
        cliff.poly([a.x, a.y + upperH, b.x, b.y + upperH, b.x, b.y + T, a.x, a.y + T]).fill({ color: shade(CLIFF_LOWER, 0.72) });
      }
      // 右下侧面(邻居 x+1 是空气)
      if (this.isVoidAt({ x: p.x + 1, y: p.y })) {
        const a = { x: c.x, y: c.y + hh }; // bottom 角
        const b = { x: c.x + hw, y: c.y }; // right 角
        cliff.poly([a.x, a.y, b.x, b.y, b.x, b.y + upperH, a.x, a.y + upperH]).fill({ color: CLIFF_UPPER });
        cliff.poly([a.x, a.y + upperH, b.x, b.y + upperH, b.x, b.y + T, a.x, a.y + T]).fill({ color: CLIFF_LOWER });
      }
    }

    // 3) 连续顶面:全部陆地菱形一次填充。统一的纹理矩阵把贴图基向量对齐到等距格步进,
    //    使纹理跨格连续、无格线;菱形略外扩消除子路径间的抗锯齿细缝(重叠处采样一致,不可见)。
    const top = new Graphics();
    const tex = Texture.from(terrainTextureUrls.ground);
    tex.source.addressMode = "repeat";
    const texSize = tex.width || 144;
    const origin = g.center({ x: 0, y: 0 });
    // 一张纹理跨约 2.4 格(非整数,避免纹理重复周期与格步进对齐后拼出"格线"感)。
    const SPAN = 2.4;
    const k = (SPAN * hw) / texSize;
    const kv = (SPAN * hh) / texSize;
    const matrix = new Matrix(k, kv, -k, kv, origin.x, origin.y - hh);
    const s = 1.03;
    for (const p of land) {
      const c = g.center(p);
      top.poly([c.x, c.y - hh * s, c.x + hw * s, c.y, c.x, c.y + hh * s, c.x - hw * s, c.y]);
    }
    top.fill({ texture: tex, matrix, color: 0xb8b4ae }); // 乘色压暗,贴近战场氛围
    // 顶面整体罩一层极淡的冷色,统一色调
    for (const p of land) {
      const c = g.center(p);
      top.poly([c.x, c.y - hh * s, c.x + hw * s, c.y, c.x, c.y + hh * s, c.x - hw * s, c.y]);
    }
    top.fill({ color: 0x2a3140, alpha: 0.18 });

    // 4) 轮廓棱线:只勾大陆暴露边,不画内部格线。
    const rim = new Graphics();
    for (const p of land) {
      const c = g.center(p);
      const top4 = { x: c.x, y: c.y - hh };
      const right4 = { x: c.x + hw, y: c.y };
      const bottom4 = { x: c.x, y: c.y + hh };
      const left4 = { x: c.x - hw, y: c.y };
      if (this.isVoidAt({ x: p.x - 1, y: p.y })) rim.moveTo(left4.x, left4.y).lineTo(top4.x, top4.y);
      if (this.isVoidAt({ x: p.x, y: p.y + 1 })) rim.moveTo(top4.x, top4.y).lineTo(right4.x, right4.y);
      if (this.isVoidAt({ x: p.x + 1, y: p.y })) rim.moveTo(right4.x, right4.y).lineTo(bottom4.x, bottom4.y);
      if (this.isVoidAt({ x: p.x, y: p.y - 1 })) rim.moveTo(bottom4.x, bottom4.y).lineTo(left4.x, left4.y);
    }
    rim.stroke({ width: 1.5, color: 0xd8cfc0, alpha: 0.28 });

    this.layer.addChild(shadow, cliff, top, rim);
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

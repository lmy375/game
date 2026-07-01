import { Container, Graphics, Sprite } from "pixi.js";
import { BattleState, Position, TerrainType } from "@core/index";
import { Grid } from "./Grid";
import { terrainTextureUrls } from "./AssetManifest";

const COLOR: Record<TerrainType, number> = {
  ground: 0x39404e,
  wall: 0x2b2f3a,
  obstacle: 0x5b4636,
  fire: 0x7a2a1c,
  trap: 0x46295c,
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

/** 2.5D 等距棋盘:菱形顶面 + 左右侧面挤出 + 火/陷阱辉光。整块按深度从后往前叠加。 */
export class BoardView {
  private layer!: Container;
  private grid!: Grid;
  private tiles = new Map<string, Container>();

  build(state: BattleState, grid: Grid, layer: Container): void {
    this.layer = layer;
    this.grid = grid;
    // 收集后按屏幕 y(深度)排序,后方先画,保证近处瓦片的侧面正确压住远处。
    const list: { p: Position; terrain: TerrainType; y: number }[] = [];
    state.board.forEachTile((p, terrain) => list.push({ p, terrain, y: this.grid.center(p).y }));
    list.sort((a, b) => a.y - b.y);
    for (const t of list) this.makeTile(t.p, t.terrain);
  }

  private makeTile(p: Position, terrain: TerrainType): void {
    const g = this.grid;
    const c = g.center(p);
    const hw = g.halfW;
    const hh = g.halfH;
    const base = COLOR[terrain] ?? COLOR.ground;
    const raise = RAISE[terrain] ?? 0;
    const thickness = g.thickness + raise;

    const container = new Container();
    container.position.set(c.x, c.y - raise); // 抬升块整体上移,顶面浮在地面之上

    // 顶面四角(相对中心)
    const top = { x: 0, y: -hh };
    const right = { x: hw, y: 0 };
    const bottom = { x: 0, y: hh };
    const left = { x: -hw, y: 0 };

    const shape = new Graphics();
    // 左侧面(朝向观察者左下)
    shape
      .poly([left.x, left.y, bottom.x, bottom.y, bottom.x, bottom.y + thickness, left.x, left.y + thickness])
      .fill({ color: shade(base, 0.5) });
    // 右侧面
    shape
      .poly([bottom.x, bottom.y, right.x, right.y, right.x, right.y + thickness, bottom.x, bottom.y + thickness])
      .fill({ color: shade(base, 0.68) });
    // 顶面底色
    shape.poly([top.x, top.y, right.x, right.y, bottom.x, bottom.y, left.x, left.y]).fill({ color: base, alpha: 0.9 });
    container.addChild(shape);

    // 顶面贴图:用菱形遮罩裁出斜视效果
    const tex = terrainTextureUrls[terrain] ?? terrainTextureUrls.ground;
    const sprite = Sprite.from(tex);
    sprite.anchor.set(0.5);
    sprite.width = hw * 2;
    sprite.height = hh * 2;
    sprite.alpha = terrain === "ground" ? 0.85 : 0.95;
    const mask = new Graphics().poly([top.x, top.y, right.x, right.y, bottom.x, bottom.y, left.x, left.y]).fill(0xffffff);
    sprite.mask = mask;
    container.addChild(mask, sprite);

    // 顶面棱线高光 + 描边
    const edge = new Graphics();
    edge
      .poly([top.x, top.y, right.x, right.y, bottom.x, bottom.y, left.x, left.y])
      .stroke({ width: 1, color: 0xffffff, alpha: 0.14 });
    // 顶面近观察者的两条上棱补一道高光
    edge.moveTo(left.x, left.y).lineTo(top.x, top.y).lineTo(right.x, right.y).stroke({ width: 1.5, color: 0xffffff, alpha: 0.22 });
    container.addChild(edge);

    const glow = GLOW[terrain];
    if (glow) {
      const gl = new Graphics();
      gl.ellipse(0, 0, hw * 0.7, hh * 0.7).fill({ color: glow, alpha: 0.5 });
      gl.blendMode = "add";
      container.addChild(gl);
    }

    this.layer.addChild(container);
    this.tiles.set(key(p), container);
  }

  updateTerrain(p: Position, terrain: TerrainType): void {
    const old = this.tiles.get(key(p));
    if (old) {
      this.layer.removeChild(old);
      old.destroy({ children: true });
    }
    this.makeTile(p, terrain);
  }
}

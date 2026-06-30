import { Container, Graphics, Sprite } from "pixi.js";
import { BattleState, Position, TerrainType } from "@core/index";
import { Grid } from "./Grid";
import { terrainTextureUrls } from "./AssetManifest";

const COLOR: Record<TerrainType, number> = {
  ground: 0x39404e,
  wall: 0x191c24,
  obstacle: 0x5b4636,
  fire: 0x7a2a1c,
  trap: 0x46295c,
};
const GLOW: Partial<Record<TerrainType, number>> = { fire: 0xff6a2a, trap: 0x9a4ad9 };
const key = (p: Position) => `${p.x},${p.y}`;

/** 2D 棋盘:圆角格 + 顶部高光(伪立体)+ 火/陷阱加色辉光。 */
export class BoardView {
  private layer!: Container;
  private grid!: Grid;
  private tiles = new Map<string, Container>();

  build(state: BattleState, grid: Grid, layer: Container): void {
    this.layer = layer;
    this.grid = grid;
    state.board.forEachTile((p, terrain) => this.makeTile(p, terrain));
  }

  private makeTile(p: Position, terrain: TerrainType): void {
    const cell = this.grid.cell;
    const tx = p.x * cell;
    const ty = (this.grid.height - 1 - p.y) * cell;
    const inset = 3;
    const w = cell - inset * 2;
    const h = cell - inset * 2;

    const c = new Container();
    c.position.set(tx + inset, ty + inset);

    const g = new Graphics();
    g.roundRect(0, 0, w, h, 10).fill({ color: COLOR[terrain] ?? COLOR.ground, alpha: 0.34 });
    const tex = terrainTextureUrls[terrain] ?? terrainTextureUrls.ground;
    const sprite = Sprite.from(tex);
    sprite.width = w;
    sprite.height = h;
    sprite.alpha = terrain === "ground" ? 0.82 : 0.94;
    c.addChild(sprite);
    // 顶部高光 + 底部阴影,伪造体积感
    g.roundRect(0, 0, w, h * 0.42, 10).fill({ color: 0xffffff, alpha: 0.06 });
    if (terrain === "wall" || terrain === "obstacle") {
      g.roundRect(0, 0, w, h, 10).stroke({ width: 2, color: 0x000000, alpha: 0.5 });
    }
    c.addChild(g);

    const glow = GLOW[terrain];
    if (glow) {
      const gl = new Graphics();
      gl.circle(w / 2, h / 2, w * 0.42).fill({ color: glow, alpha: 0.5 });
      gl.blendMode = "add";
      c.addChild(gl);
    }

    this.layer.addChild(c);
    this.tiles.set(key(p), c);
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

import { Node, Vec3 } from "cc";
import { BattleState, Position, TerrainType } from "../game-core/index";
import { CoordMap } from "../core/CoordMap";
import { boxMesh, litMat, meshNode } from "./Factory";
import { TERRAIN, TERRAIN_EMISSIVE, hex } from "./Palette";

const key = (p: Position) => `${p.x},${p.y}`;

/** 每种地形的立体外观:格面高度(top)与厚度。 */
const SHAPE: Record<TerrainType, { top: number; thick: number }> = {
  ground: { top: 0, thick: 0.22 },
  fire: { top: 0.02, thick: 0.24 },
  trap: { top: 0.02, thick: 0.24 },
  obstacle: { top: 0.6, thick: 0.6 },
  wall: { top: 1.05, thick: 1.05 },
};

/**
 * 3D 棋盘:每格一块薄/高的立方体,按地形着色;墙体/障碍加高,火/陷阱自发光。
 * 单位、高亮、特效都以「格面 y=0」为基准叠在其上。
 */
export class BoardView {
  private root!: Node;
  private tiles = new Map<string, Node>();

  build(parent: Node, state: BattleState, coord: CoordMap): void {
    this.root = new Node("Tiles");
    parent.addChild(this.root);
    state.board.forEachTile((p, terrain) => this.makeTile(p, terrain, coord));
  }

  private makeTile(p: Position, terrain: TerrainType, coord: CoordMap): void {
    const shape = SHAPE[terrain] ?? SHAPE.ground;
    const size = coord.cell * 0.94;
    const mesh = boxMesh(size, shape.thick, size);
    const mat = litMat(TERRAIN[terrain] ?? TERRAIN.ground, TERRAIN_EMISSIVE[terrain]);
    const n = meshNode(`tile_${key(p)}`, this.root, mesh, mat);
    // 让立方体顶面落在 shape.top:中心 = top - thick/2
    const w = coord.posToWorld(p, shape.top - shape.thick / 2);
    n.setPosition(w);
    this.tiles.set(key(p), n);

    // 网格描边:细一圈深色边框立方体,凸显格子分界
    const edge = meshNode(
      `edge_${key(p)}`,
      this.root,
      boxMesh(coord.cell * 0.98, 0.02, coord.cell * 0.98),
      litMat(hex("#0a0c11"))
    );
    edge.setPosition(coord.posToWorld(p, shape.top + 0.001));
  }

  /** 地形改变(如障碍被摧毁 → 地面)时重建该格。 */
  updateTerrain(p: Position, terrain: TerrainType, coord: CoordMap): void {
    const old = this.tiles.get(key(p));
    if (old) old.destroy();
    this.makeTile(p, terrain, coord);
  }

  /** 某格格面的世界坐标(供其它视图对齐)。 */
  faceWorld(p: Position, coord: CoordMap, out?: Vec3): Vec3 {
    return coord.posToWorld(p, 0, out);
  }
}

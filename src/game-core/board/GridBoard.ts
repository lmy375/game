/**
 * 方格棋盘。只存地形与尺寸；单位占用由 BattleState 维护（避免双向耦合）。
 * 纯数据 + 查询，无副作用驱动。
 */
import { Position } from "./geometry";
import { TerrainType, TERRAIN, TerrainProfile } from "./terrain";

export interface TileData {
  x: number;
  y: number;
  terrain: TerrainType;
}

export interface BoardData {
  width: number;
  height: number;
  /** 仅需列出非 ground 的格子；其余默认 ground。 */
  tiles?: TileData[];
}

export class GridBoard {
  readonly width: number;
  readonly height: number;
  private readonly grid: TerrainType[][]; // grid[y][x]

  constructor(width: number, height: number, tiles: TileData[] = []) {
    this.width = width;
    this.height = height;
    this.grid = [];
    for (let y = 0; y < height; y++) {
      const row: TerrainType[] = [];
      for (let x = 0; x < width; x++) row.push("ground");
      this.grid.push(row);
    }
    for (const t of tiles) {
      if (this.inBounds(t)) this.grid[t.y][t.x] = t.terrain;
    }
  }

  static from(data: BoardData): GridBoard {
    return new GridBoard(data.width, data.height, data.tiles ?? []);
  }

  clone(): GridBoard {
    const b = new GridBoard(this.width, this.height);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) b.grid[y][x] = this.grid[y][x];
    }
    return b;
  }

  inBounds(p: Position): boolean {
    return p.x >= 0 && p.x < this.width && p.y >= 0 && p.y < this.height;
  }

  terrainAt(p: Position): TerrainType {
    if (!this.inBounds(p)) return "void"; // 边界外是空气,与不规则轮廓外的格子同语义
    return this.grid[p.y][p.x];
  }

  profileAt(p: Position): TerrainProfile {
    return TERRAIN[this.terrainAt(p)];
  }

  setTerrain(p: Position, terrain: TerrainType): void {
    if (this.inBounds(p)) this.grid[p.y][p.x] = terrain;
  }

  /** 该格本身能否被站立（不考虑单位占用）。 */
  isWalkable(p: Position): boolean {
    return this.inBounds(p) && this.profileAt(p).walkable;
  }

  /** 位移是否会在此格停止（墙/障碍/边界）。 */
  blocksDisplacement(p: Position): boolean {
    if (!this.inBounds(p)) return true;
    return this.profileAt(p).blocksDisplacement;
  }

  forEachTile(fn: (p: Position, terrain: TerrainType) => void): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) fn({ x, y }, this.grid[y][x]);
    }
  }
}

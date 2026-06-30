import { Vec3 } from "cc";
import { Position } from "../game-core/index";

/**
 * 逻辑格 ↔ 3D 世界坐标映射。
 *
 * 逻辑坐标:x 向右、y 向上(游戏内核约定),原点在左下。
 * 世界坐标:棋盘平铺在 XZ 平面(y=0 为格面),棋盘中心对齐世界原点;
 *          逻辑 +y 映射到世界 -Z(屏幕里「往里/往上」),与倾斜俯视相机一致。
 */
export class CoordMap {
  readonly cell: number;
  private readonly halfW: number;
  private readonly halfH: number;

  constructor(
    readonly width: number,
    readonly height: number,
    cellSize = 1
  ) {
    this.cell = cellSize;
    this.halfW = (width - 1) / 2;
    this.halfH = (height - 1) / 2;
  }

  /** 逻辑格中心 → 世界坐标(worldY 为格面高度,默认 0)。 */
  cellToWorld(x: number, y: number, worldY = 0, out?: Vec3): Vec3 {
    const wx = (x - this.halfW) * this.cell;
    const wz = -(y - this.halfH) * this.cell;
    return out ? out.set(wx, worldY, wz) : new Vec3(wx, worldY, wz);
  }

  posToWorld(p: Position, worldY = 0, out?: Vec3): Vec3 {
    return this.cellToWorld(p.x, p.y, worldY, out);
  }

  /** 世界坐标(XZ 平面)→ 最近逻辑格;越界返回 null。 */
  worldToCell(world: Vec3): Position | null {
    const x = Math.round(world.x / this.cell + this.halfW);
    const y = Math.round(-world.z / this.cell + this.halfH);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return null;
    return { x, y };
  }

  /** 棋盘在世界中的边长(用于相机取景)。 */
  get worldWidth(): number {
    return this.width * this.cell;
  }
  get worldDepth(): number {
    return this.height * this.cell;
  }
}

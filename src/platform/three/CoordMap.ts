import * as THREE from "three";
import { Position } from "@core/index";

/**
 * 逻辑格 ↔ 3D 世界坐标。逻辑 y 向上、原点左下;世界把棋盘平铺在 XZ 平面,
 * 棋盘中心对齐原点,逻辑 +y 映射到世界 -Z(屏幕里「往里」),与倾斜俯视相机一致。
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

  cellToWorld(x: number, y: number, worldY = 0): THREE.Vector3 {
    return new THREE.Vector3((x - this.halfW) * this.cell, worldY, -(y - this.halfH) * this.cell);
  }
  posToWorld(p: Position, worldY = 0): THREE.Vector3 {
    return this.cellToWorld(p.x, p.y, worldY);
  }

  worldToCell(world: THREE.Vector3): Position | null {
    const x = Math.round(world.x / this.cell + this.halfW);
    const y = Math.round(-world.z / this.cell + this.halfH);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return null;
    return { x, y };
  }

  get worldWidth(): number {
    return this.width * this.cell;
  }
  get worldDepth(): number {
    return this.height * this.cell;
  }
}

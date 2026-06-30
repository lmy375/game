import * as THREE from "three";
import { BattleState, Position, TerrainType } from "@core/index";
import { CoordMap } from "./CoordMap";

const COLOR: Record<TerrainType, string> = {
  ground: "#39404e",
  wall: "#191c24",
  obstacle: "#5b4636",
  fire: "#7a2a1c",
  trap: "#46295c",
};
const EMISSIVE: Partial<Record<TerrainType, string>> = { fire: "#ff5a23", trap: "#7a35c0" };
const SHAPE: Record<TerrainType, { top: number; thick: number }> = {
  ground: { top: 0, thick: 0.22 },
  fire: { top: 0.02, thick: 0.24 },
  trap: { top: 0.02, thick: 0.24 },
  obstacle: { top: 0.6, thick: 0.6 },
  wall: { top: 1.05, thick: 1.05 },
};
const key = (p: Position) => `${p.x},${p.y}`;

/** 3D 棋盘:逐格立方体,墙体/障碍加高,火/陷阱自发光;含承影底板。 */
export class BoardView {
  private group = new THREE.Group();
  private tiles = new Map<string, THREE.Mesh>();

  build(state: BattleState, coord: CoordMap, parent: THREE.Group): void {
    parent.add(this.group);

    // 承影底板
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(coord.worldWidth + 2, coord.worldDepth + 2),
      new THREE.MeshStandardMaterial({ color: "#0c0e13", roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.13;
    floor.receiveShadow = true;
    this.group.add(floor);

    state.board.forEachTile((p, terrain) => this.makeTile(p, terrain, coord));
  }

  private makeTile(p: Position, terrain: TerrainType, coord: CoordMap): void {
    const shape = SHAPE[terrain] ?? SHAPE.ground;
    const size = coord.cell * 0.94;
    const geo = new THREE.BoxGeometry(size, shape.thick, size);
    const emissive = EMISSIVE[terrain];
    const mat = new THREE.MeshStandardMaterial({
      color: COLOR[terrain] ?? COLOR.ground,
      roughness: 0.92,
      metalness: 0.0,
      emissive: emissive ? new THREE.Color(emissive) : new THREE.Color("#000000"),
      emissiveIntensity: emissive ? 0.6 : 0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const w = coord.posToWorld(p, shape.top - shape.thick / 2);
    mesh.position.copy(w);
    mesh.castShadow = terrain === "wall" || terrain === "obstacle";
    mesh.receiveShadow = true;
    this.group.add(mesh);
    this.tiles.set(key(p), mesh);
  }

  updateTerrain(p: Position, terrain: TerrainType, coord: CoordMap): void {
    const old = this.tiles.get(key(p));
    if (old) {
      this.group.remove(old);
      old.geometry.dispose();
      (old.material as THREE.Material).dispose();
    }
    this.makeTile(p, terrain, coord);
  }
}

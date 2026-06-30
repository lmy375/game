import * as THREE from "three";
import { Position } from "@core/index";
import { CoordMap } from "./CoordMap";
import { Overlay } from "./types";

interface Style {
  color: string;
  opacity: number;
}
const HL: Record<string, Style> = {
  move: { color: "#4a90d9", opacity: 0.32 },
  cast: { color: "#e8c840", opacity: 0.22 },
  hazard: { color: "#ff5030", opacity: 0.4 },
  hitArm: { color: "#e8843f", opacity: 0.42 },
  hitCenter: { color: "#e8503f", opacity: 0.55 },
  finalBox: { color: "#ffffff", opacity: 0.35 },
  origin: { color: "#9fb4d0", opacity: 0.3 },
  hover: { color: "#ffffff", opacity: 0.16 },
};

/** 贴地高亮(移动/施法/AOE/危险/落点/悬停)与位移箭头。每次刷新整体重建。 */
export class OverlayView {
  private group = new THREE.Group();

  constructor(private coord: CoordMap) {}

  build(parent: THREE.Group): void {
    parent.add(this.group);
  }

  show(o: Overlay): void {
    this.clear();
    this.cells(o.moveCells, HL.move, 0.04);
    this.cells(o.castCells, HL.cast, 0.045);
    this.cells(o.hazardWarn, HL.hazard, 0.05);
    this.cells(o.hitArm, HL.hitArm, 0.06);
    this.cells(o.hitCenter, HL.hitCenter, 0.065);
    this.cells(o.finalBoxes, HL.finalBox, 0.07);
    if (o.originCell) this.cells([o.originCell], HL.origin, 0.05);
    if (o.hoverCell) this.cells([o.hoverCell], HL.hover, 0.075);
    for (const a of o.arrows ?? []) this.arrow(a.from, a.to);
  }

  clear(): void {
    for (const c of [...this.group.children]) {
      this.group.remove(c);
      const m = c as THREE.Mesh;
      m.geometry?.dispose?.();
      (m.material as THREE.Material)?.dispose?.();
    }
  }

  private cells(cells: Position[] | undefined, style: Style, y: number): void {
    if (!cells) return;
    const size = this.coord.cell * 0.9;
    for (const p of cells) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size),
        new THREE.MeshBasicMaterial({
          color: style.color,
          transparent: true,
          opacity: style.opacity,
          depthWrite: false,
        })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.copy(this.coord.posToWorld(p, y));
      this.group.add(mesh);
    }
  }

  private arrow(from: Position, to: Position): void {
    const a = this.coord.posToWorld(from, 0.09);
    const b = this.coord.posToWorld(to, 0.09);
    const len = a.distanceTo(b);
    if (len < 1e-3) return;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.14, len),
      new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.7, depthWrite: false })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set((a.x + b.x) / 2, 0.09, (a.z + b.z) / 2);
    mesh.rotation.z = -Math.atan2(b.x - a.x, b.z - a.z);
    this.group.add(mesh);
  }
}

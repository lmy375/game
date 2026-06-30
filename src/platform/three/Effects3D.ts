import * as THREE from "three";
import { Ticker, Easing } from "./Ticker";

/** 程序化 3D 技能特效:迸射粒子 / 扩散光环 / 直线弹道。全部代码生成,无美术资源。 */
export class Effects3D {
  constructor(
    private scene: THREE.Scene,
    private ticker: Ticker
  ) {}

  /** 向外迸射的粒子团。 */
  burst(at: THREE.Vector3, color: string, count = 14, radius = 0.9): void {
    const dirs: THREE.Vector3[] = [];
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;
      dirs.push(new THREE.Vector3(Math.cos(theta) * Math.cos(phi), Math.sin(phi) + 0.3, Math.sin(theta) * Math.cos(phi)));
      positions[i * 3] = at.x;
      positions[i * 3 + 1] = at.y + 0.2;
      positions[i * 3 + 2] = at.z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color, size: 0.18, transparent: true, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    const attr = geo.getAttribute("position") as THREE.BufferAttribute;
    void this.ticker
      .animate(
        0.5,
        (t) => {
          for (let i = 0; i < count; i++) {
            const d = dirs[i];
            attr.setXYZ(
              i,
              at.x + d.x * radius * t,
              at.y + 0.2 + d.y * radius * t - t * t * 0.6,
              at.z + d.z * radius * t
            );
          }
          attr.needsUpdate = true;
          mat.opacity = 1 - t;
        },
        Easing.quadOut
      )
      .then(() => this.dispose(pts));
  }

  /** 贴地扩散的光环。 */
  ring(at: THREE.Vector3, color: string, maxR = 1.8, life = 0.45): void {
    const geo = new THREE.RingGeometry(0.36, 0.5, 32);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(at.x, 0.07, at.z);
    this.scene.add(ring);
    void this.ticker
      .animate(
        life,
        (t) => {
          const s = 0.4 + (maxR / 0.5) * t;
          ring.scale.set(s, s, s);
          mat.opacity = 0.9 * (1 - t);
        },
        Easing.quadOut
      )
      .then(() => this.dispose(ring));
  }

  /** 直线弹道,抵达后回调。 */
  projectile(from: THREE.Vector3, to: THREE.Vector3, color: string, onArrive?: () => void): void {
    const geo = new THREE.SphereGeometry(0.13, 12, 12);
    const mat = new THREE.MeshBasicMaterial({ color });
    const ball = new THREE.Mesh(geo, mat);
    const a = new THREE.Vector3(from.x, 0.45, from.z);
    const b = new THREE.Vector3(to.x, 0.45, to.z);
    ball.position.copy(a);
    this.scene.add(ball);
    const dist = a.distanceTo(b);
    void this.ticker
      .animate(Math.max(0.12, Math.min(0.4, dist / 9)), (t) => ball.position.lerpVectors(a, b, t), Easing.quadIn)
      .then(() => {
        this.dispose(ball);
        this.burst(b, color, 7, 0.5);
        onArrive?.();
      });
  }

  cast(skillId: string, caster: THREE.Vector3, target: THREE.Vector3 | null): void {
    const tgt = target ?? caster;
    if (/gale|gather|wind|聚/.test(skillId)) this.ring(tgt, "#8fe3ff", 2.2);
    else if (/pierce|line|shoot|spear|贯穿|射/.test(skillId)) this.projectile(caster, tgt, "#ffe08a");
    else if (/fire|cross|burn|火/.test(skillId)) {
      this.ring(caster, "#ff8a3a", 1.2, 0.3);
      this.burst(tgt, "#ff6a2a", 18, 1.1);
    } else if (/push|wave|knock|推/.test(skillId)) this.ring(caster, "#cfe0ff", 1.8);
    else this.ring(caster, "#ffffff", 1.0, 0.25);
  }

  private dispose(obj: THREE.Mesh | THREE.Points): void {
    this.scene.remove(obj);
    obj.geometry.dispose();
    (obj.material as THREE.Material).dispose();
  }
}

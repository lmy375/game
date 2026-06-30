import * as THREE from "three";
import { BattleState, Unit, Direction, isAlive } from "@core/index";
import { CoordMap } from "./CoordMap";
import { SceneRig } from "./SceneRig";

const DIRS: Direction[] = ["up", "down", "left", "right"];

/** 单个单位的 DOM 立绘:躯干 + 头 + 朝向 + 血条 + 状态;world 为其 3D 坐标(动画对象)。 */
class UnitEl {
  el: HTMLDivElement;
  world: THREE.Vector3;
  readonly maxHp: number;
  private av: HTMLDivElement;
  private face: HTMLDivElement;
  private hpfill: HTMLDivElement;
  private statuses: HTMLDivElement;

  constructor(parent: HTMLElement, unit: Unit, world: THREE.Vector3) {
    this.world = world.clone();
    this.maxHp = unit.maxHp;

    this.el = document.createElement("div");
    this.el.className = `unit ${unit.faction}`;

    this.statuses = document.createElement("div");
    this.statuses.className = "statuses";

    this.av = document.createElement("div");
    this.av.className = "av";
    this.av.textContent = unit.name.slice(0, 1);
    const head = document.createElement("div");
    head.className = "head";
    this.face = document.createElement("div");
    this.av.appendChild(head);
    this.el.appendChild(this.face);

    const hpbar = document.createElement("div");
    hpbar.className = "hpbar";
    this.hpfill = document.createElement("div");
    this.hpfill.className = "hpfill";
    hpbar.appendChild(this.hpfill);

    this.el.appendChild(this.statuses);
    this.el.appendChild(this.av);
    this.el.appendChild(hpbar);
    parent.appendChild(this.el);

    this.redraw(unit);
  }

  redraw(unit: Unit): void {
    this.setHp(unit.hp);
    this.setFacing(unit.facing);
    this.statuses.innerHTML = "";
    const icons: Record<string, { ch: string; color: string }> = {
      burn: { ch: "火", color: "#ff6a2a" },
      stun: { ch: "晕", color: "#e8c840" },
      vulnerable: { ch: "破", color: "#d96ad9" },
      shield: { ch: "盾", color: "#4a90d9" },
    };
    for (const s of unit.statuses ?? []) {
      const info = icons[s.id] ?? { ch: "?", color: "#aaa" };
      const sp = document.createElement("span");
      sp.className = "st";
      sp.textContent = info.ch;
      sp.style.color = info.color;
      this.statuses.appendChild(sp);
    }
    this.el.classList.toggle("dead", !isAlive(unit));
  }

  setHp(now: number): void {
    const ratio = this.maxHp > 0 ? Math.max(0, Math.min(1, now / this.maxHp)) : 0;
    this.hpfill.style.width = `${ratio * 100}%`;
    // 绿→红
    const r = Math.round(95 + (217 - 95) * (1 - ratio));
    const g = Math.round(207 * ratio + 83 * (1 - ratio));
    const b = Math.round(106 * ratio + 79 * (1 - ratio));
    this.hpfill.style.background = `rgb(${r},${g},${b})`;
  }

  setFacing(dir: Direction): void {
    this.face.className = "face " + (DIRS.includes(dir) ? dir : "right");
  }

  hit(): void {
    this.av.classList.remove("hit");
    void this.av.offsetWidth; // 重启动画
    this.av.classList.add("hit");
  }

  setSelected(on: boolean): void {
    this.el.classList.toggle("sel", on);
  }
}

/** 管理所有单位立绘:与状态同步、每帧投影。 */
export class UnitLayer {
  private map = new Map<string, UnitEl>();
  private container!: HTMLElement;

  constructor(
    private coord: CoordMap,
    private rig: SceneRig
  ) {}

  build(container: HTMLElement): void {
    this.container = container;
  }

  sync(state: BattleState): void {
    const seen = new Set<string>();
    for (const u of state.units) {
      if (!isAlive(u)) continue;
      seen.add(u.instanceId);
      let e = this.map.get(u.instanceId);
      if (!e) {
        e = new UnitEl(this.container, u, this.coord.posToWorld(u.pos, 0));
        this.map.set(u.instanceId, e);
      } else {
        e.world.copy(this.coord.posToWorld(u.pos, 0));
        e.redraw(u);
      }
    }
    for (const [id, e] of [...this.map]) {
      if (!seen.has(id)) {
        e.el.remove();
        this.map.delete(id);
      }
    }
    this.project();
  }

  project(): void {
    for (const e of this.map.values()) {
      const s = this.rig.project(e.world);
      e.el.style.left = `${s.x}px`;
      e.el.style.top = `${s.y}px`;
    }
  }

  get(id: string): UnitEl | undefined {
    return this.map.get(id);
  }
  setSelected(id: string | undefined): void {
    for (const [sid, e] of this.map) e.setSelected(sid === id);
  }
}

export { UnitEl };

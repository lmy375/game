import * as THREE from "three";
import { BattleEvent, Position, Direction, directionTo, TerrainType } from "@core/index";
import { CoordMap } from "./CoordMap";
import { SceneRig } from "./SceneRig";
import { UnitLayer } from "./UnitLayer";
import { BoardView } from "./BoardView";
import { Effects3D } from "./Effects3D";
import { Ticker, Easing } from "./Ticker";

/**
 * ★核心:把一次 simulate() 产出的 BattleEvent[] 排成时间线,串行播放补间 + 粒子,
 * 全部播完才 resolve。内核只产出事件,这里只负责把事件「演出来」。
 */
export class EventAnimator {
  constructor(
    private coord: CoordMap,
    private rig: SceneRig,
    private units: UnitLayer,
    private board: BoardView,
    private fx: Effects3D,
    private ticker: Ticker,
    private floatContainer: HTMLElement
  ) {}

  async play(events: BattleEvent[]): Promise<void> {
    for (const e of events) await this.one(e);
  }

  private async one(e: BattleEvent): Promise<void> {
    switch (e.type) {
      case "unit_moved":
        return this.move(e.unitId, e.path);
      case "skill_cast": {
        const caster = this.units.get(e.casterId)?.world.clone() ?? this.coord.posToWorld({ x: 0, y: 0 });
        const tgt = e.targetCell ? this.coord.posToWorld(e.targetCell, 0) : null;
        this.fx.cast(e.skillId, caster, tgt);
        return this.ticker.wait(0.22);
      }
      case "unit_displaced":
        return this.displace(e.unitId, e.to, e.reason);
      case "displacement_blocked":
        this.units.get(e.unitId)?.hit();
        return this.ticker.wait(0.08);
      case "unit_damaged":
      case "collision_damage":
        return this.damage(e.unitId, e.amount, e.hpAfter, false);
      case "unit_healed":
        return this.damage(e.unitId, e.amount, e.hpAfter, true);
      case "terrain_triggered":
        return this.terrain(e.position, e.terrainType);
      case "obstacle_destroyed":
        this.fx.burst(this.coord.posToWorld(e.position, 0.3), "#8b6b46", 12, 0.7);
        this.board.updateTerrain(e.position, "ground", this.coord);
        return this.ticker.wait(0.12);
      case "unit_status_applied": {
        const s = this.units.get(e.unitId);
        if (s) this.fx.ring(s.world.clone(), "#d96ad9", 1.2, 0.3);
        return this.ticker.wait(0.08);
      }
      case "unit_died":
        return this.die(e.unitId);
      default:
        return;
    }
  }

  private async move(id: string, path: Position[]): Promise<void> {
    const e = this.units.get(id);
    if (!e || path.length < 2) return;
    for (let i = 1; i < path.length; i++) {
      e.setFacing(directionTo(path[i - 1], path[i]) as Direction);
      const start = e.world.clone();
      const to = this.coord.posToWorld(path[i], 0);
      await this.ticker.animate(
        0.14,
        (t) => {
          e.world.lerpVectors(start, to, t);
          e.world.y = Math.sin(t * Math.PI) * 0.22;
        },
        Easing.smooth
      );
    }
  }

  private async displace(id: string, to: Position, reason: string): Promise<void> {
    const e = this.units.get(id);
    if (!e) return;
    const start = e.world.clone();
    const dest = this.coord.posToWorld(to, 0);
    const dur = reason === "knockback" ? 0.18 : reason === "gather" ? 0.3 : 0.24;
    const ease = reason === "gather" ? Easing.backOut : Easing.quadOut;
    await this.ticker.animate(dur, (t) => e.world.lerpVectors(start, dest, t), ease);
    this.fx.burst(dest, "#cfd6e4", 5, 0.4);
  }

  private async damage(id: string, amount: number, hpAfter: number, heal: boolean): Promise<void> {
    const e = this.units.get(id);
    if (e) {
      e.hit();
      this.fx.burst(e.world.clone(), heal ? "#5fcf6a" : "#ff5a45", heal ? 5 : 10, heal ? 0.4 : 0.7);
      this.float(e.world.clone(), `${heal ? "+" : "-"}${amount}`, heal ? "heal" : hpAfter <= 0 ? "lethal" : "dmg");
      e.setHp(hpAfter);
    }
    return this.ticker.wait(0.2);
  }

  private async terrain(p: Position, terrain: TerrainType): Promise<void> {
    const color = terrain === "fire" ? "#ff6a2a" : terrain === "trap" ? "#9a4ad9" : "#ffffff";
    this.fx.burst(this.coord.posToWorld(p, 0.1), color, 12, 0.7);
    return this.ticker.wait(0.12);
  }

  private async die(id: string): Promise<void> {
    const e = this.units.get(id);
    if (!e) return;
    this.fx.burst(e.world.clone(), "#88909e", 14, 0.8);
    e.el.classList.add("dead");
    await this.ticker.wait(0.3);
  }

  /** DOM 飘字(CSS 动画上浮淡出)。 */
  private float(world: THREE.Vector3, text: string, kind: "dmg" | "lethal" | "heal"): void {
    const raised = world.clone();
    raised.y += 0.7;
    const s = this.rig.project(raised);
    const div = document.createElement("div");
    div.className = `dmg-float ${kind}`;
    div.textContent = text;
    div.style.left = `${s.x}px`;
    div.style.top = `${s.y}px`;
    this.floatContainer.appendChild(div);
    window.setTimeout(() => div.remove(), 750);
  }
}

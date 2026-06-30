import { Component, Node, Vec3, Color, tween } from "cc";
import { BattleEvent, Position, Direction, directionTo, TerrainType } from "../game-core/index";
import { CoordMap } from "../core/CoordMap";
import { SceneRig } from "../view/SceneRig";
import { UnitView } from "../view/UnitView";
import { BoardView } from "../view/BoardView";
import { SkillEffects } from "./SkillEffects";
import { uiNode, uiLabel } from "../view/Factory";
import { UI, hex } from "../view/Palette";

/**
 * ★核心:把一次 simulate() 产出的 BattleEvent[] 排成时间线,串行播放补间 + 粒子,
 * 全部播完才 resolve(交回操作权)。内核只产出事件,这里只负责把事件「演出来」。
 */
export class EventAnimator {
  private floatLayer!: Node;

  constructor(
    private host: Component,
    private coord: CoordMap,
    private rig: SceneRig,
    private units: UnitView,
    private board: BoardView,
    private fx: SkillEffects
  ) {}

  build(): void {
    this.floatLayer = uiNode("Floaters", this.rig.canvas);
  }

  private wait(sec: number): Promise<void> {
    return new Promise((res) => this.host.scheduleOnce(res, sec));
  }

  /** 顺序播放整段事件。 */
  async play(events: BattleEvent[]): Promise<void> {
    for (const e of events) await this.one(e);
  }

  private async one(e: BattleEvent): Promise<void> {
    switch (e.type) {
      case "unit_moved":
        return this.move(e.unitId, e.path);
      case "skill_cast": {
        const w = this.units.get(e.casterId)?.world ?? this.coord.posToWorld({ x: 0, y: 0 });
        const tgt = e.targetCell ? this.coord.posToWorld(e.targetCell, 0) : null;
        this.fx.cast(e.skillId, w.clone(), tgt);
        return this.wait(0.22);
      }
      case "unit_displaced":
        return this.displace(e.unitId, e.from, e.to, e.reason);
      case "displacement_blocked": {
        this.units.get(e.unitId)?.punch(0.9, 0.06);
        return this.wait(0.08);
      }
      case "unit_damaged":
      case "collision_damage":
        return this.damage(e.unitId, e.amount, e.hpAfter, false);
      case "unit_healed":
        return this.damage(e.unitId, e.amount, e.hpAfter, true);
      case "terrain_triggered":
        return this.terrain(e.position, e.terrainType);
      case "obstacle_destroyed": {
        this.fx.burst(this.coord.posToWorld(e.position, 0.3), hex("#8b6b46"), 12, 50);
        this.board.updateTerrain(e.position, "ground", this.coord);
        return this.wait(0.12);
      }
      case "unit_status_applied": {
        const s = this.units.get(e.unitId);
        if (s) this.fx.ring(s.world.clone(), hex("#d96ad9"), 1.4, 0.3);
        return this.wait(0.08);
      }
      case "unit_died":
        return this.die(e.unitId);
      default:
        return; // turn_started / turn_ended / status_expired / battle_ended 由 HUD/控制器处理
    }
  }

  private async move(id: string, path: Position[]): Promise<void> {
    const s = this.units.get(id);
    if (!s || path.length < 2) return;
    const stepDur = 0.14;
    for (let i = 1; i < path.length; i++) {
      const prev = path[i - 1];
      const cell = path[i];
      const dir = directionTo(prev, cell) as Direction;
      s.setFacing(dir);
      const w = this.coord.posToWorld(cell, 0);
      tween(s.world).to(stepDur, { x: w.x, z: w.z }, { easing: "smooth" }).start();
      // 行走起伏
      tween(s.world)
        .to(stepDur / 2, { y: 0.22 })
        .to(stepDur / 2, { y: 0 })
        .start();
      await this.wait(stepDur);
    }
  }

  private async displace(id: string, _from: Position, to: Position, reason: string): Promise<void> {
    const s = this.units.get(id);
    if (!s) return;
    const w = this.coord.posToWorld(to, 0);
    const dur = reason === "knockback" ? 0.18 : reason === "gather" ? 0.3 : 0.24;
    const easing = reason === "knockback" ? "quadOut" : reason === "gather" ? "backOut" : "quadOut";
    tween(s.world).to(dur, { x: w.x, z: w.z }, { easing }).start();
    await this.wait(dur);
    this.fx.burst(w.clone(), hex("#cfd6e4"), 5, 28);
  }

  private async damage(id: string, amount: number, hpAfter: number, heal: boolean): Promise<void> {
    const s = this.units.get(id);
    if (s) {
      s.punch(heal ? 1.1 : 1.25);
      this.fx.burst(s.world.clone(), heal ? UI.heal : UI.danger, heal ? 5 : 9, heal ? 30 : 50);
      this.float(s.world.clone(), `${heal ? "+" : "-"}${amount}`, heal ? UI.heal : hpAfter <= 0 ? UI.danger : UI.good);
      s.setHp(hpAfter);
    }
    return this.wait(0.2);
  }

  private async terrain(p: Position, terrain: TerrainType): Promise<void> {
    const color = terrain === "fire" ? hex("#ff6a2a") : terrain === "trap" ? hex("#9a4ad9") : hex("#ffffff");
    this.fx.burst(this.coord.posToWorld(p, 0.1), color, 12, 55);
    return this.wait(0.12);
  }

  private async die(id: string): Promise<void> {
    const s = this.units.get(id);
    if (!s) return;
    this.fx.burst(s.world.clone(), hex("#88909e"), 14, 60);
    await new Promise<void>((res) => s.die(res));
  }

  /** 上浮并淡出的飘字。 */
  private float(world: Vec3, text: string, color: Color): void {
    const l = uiLabel(this.floatLayer, text, { size: 26, color, bold: true, outline: hex("#000000", 200) });
    const w = new Vec3();
    this.rig.worldToUI(new Vec3(world.x, world.y + 0.7, world.z), w);
    l.node.setPosition(new Vec3(w.x, w.y, 0));
    tween(l.node)
      .by(0.7, { position: new Vec3(0, 60, 0) }, { easing: "quadOut" })
      .start();
    tween(l.node)
      .delay(0.4)
      .to(0.3, { scale: new Vec3(0.4, 0.4, 1) })
      .call(() => l.node.destroy())
      .start();
  }
}

import { BattleEvent, Position, Direction, directionTo, TerrainType } from "@core/index";
import { Grid } from "./Grid";
import { UnitView } from "./UnitView";
import { BoardView } from "./BoardView";
import { Effects } from "./Effects";
import { Animator, Easing } from "./Anim";

/**
 * ★核心:把一次 simulate() 产出的 BattleEvent[] 排成时间线,串行播放补间 + 粒子,
 * 全部播完才 resolve。内核只产出事件,这里只负责把事件「演出来」。
 */
export class EventAnimator {
  constructor(
    private grid: Grid,
    private units: UnitView,
    private board: BoardView,
    private fx: Effects,
    private anim: Animator
  ) {}

  async play(events: BattleEvent[]): Promise<void> {
    for (const e of events) await this.one(e);
  }

  private async one(e: BattleEvent): Promise<void> {
    switch (e.type) {
      case "unit_moved":
        return this.move(e.unitId, e.path);
      case "skill_cast": {
        const caster = this.units.get(e.casterId);
        const fromCell = caster ? this.cellOf(caster.container.x, caster.container.y) : { x: 0, y: 0 };
        this.fx.cast(e.skillId, fromCell, e.targetCell ?? null);
        return this.anim.wait(0.22);
      }
      case "unit_displaced":
        return this.displace(e.unitId, e.to, e.reason);
      case "displacement_blocked":
        this.punch(e.unitId, 0.9);
        return this.anim.wait(0.08);
      case "unit_damaged":
      case "collision_damage":
        return this.damage(e.unitId, e.amount, e.hpAfter, false);
      case "unit_healed":
        return this.damage(e.unitId, e.amount, e.hpAfter, true);
      case "terrain_triggered":
        return this.terrain(e.position, e.terrainType);
      case "obstacle_destroyed": {
        const c = this.grid.center(e.position);
        this.fx.burst(c.x, c.y, 0x8b6b46, 12, 50);
        this.board.updateTerrain(e.position, "ground");
        return this.anim.wait(0.12);
      }
      case "unit_status_applied": {
        const s = this.units.get(e.unitId);
        if (s) this.fx.ring(s.container.x, s.container.y, 0xd96ad9, 40, 0.3);
        return this.anim.wait(0.08);
      }
      case "unit_died":
        return this.die(e.unitId);
      default:
        return;
    }
  }

  private cellOf(px: number, py: number): Position {
    return this.grid.pixelToCell(px, py) ?? { x: 0, y: 0 };
  }

  private async move(id: string, path: Position[]): Promise<void> {
    const s = this.units.get(id);
    if (!s || path.length < 2) return;
    for (let i = 1; i < path.length; i++) {
      s.setFacing(directionTo(path[i - 1], path[i]) as Direction);
      const a = this.grid.center(path[i - 1]);
      const b = this.grid.center(path[i]);
      await this.anim.animate(
        0.14,
        (t) => s.container.position.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * 7),
        Easing.smooth
      );
    }
  }

  private async displace(id: string, to: Position, reason: string): Promise<void> {
    const s = this.units.get(id);
    if (!s) return;
    const a = { x: s.container.x, y: s.container.y };
    const b = this.grid.center(to);
    const dur = reason === "knockback" ? 0.18 : reason === "gather" ? 0.3 : 0.24;
    const ease = reason === "gather" ? Easing.backOut : Easing.quadOut;
    await this.anim.animate(dur, (t) => s.container.position.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t), ease);
    this.fx.burst(b.x, b.y, 0xcfd6e4, 5, 26);
  }

  private async damage(id: string, amount: number, hpAfter: number, heal: boolean): Promise<void> {
    const s = this.units.get(id);
    if (s) {
      this.punch(id, heal ? 1.1 : 1.25);
      this.fx.burst(s.container.x, s.container.y, heal ? 0x5fcf6a : 0xff5a45, heal ? 5 : 10, heal ? 28 : 48);
      this.fx.float(s.container.x, s.container.y - 24, `${heal ? "+" : "-"}${amount}`, heal ? "#5fcf6a" : hpAfter <= 0 ? "#ff5a45" : "#ffd24a");
      s.setHp(hpAfter);
      if (!heal) this.fx.shake(amount >= 30 ? 9 : 5);
    }
    return this.anim.wait(0.2);
  }

  private punch(id: string, scale: number): void {
    const s = this.units.get(id);
    if (!s) return;
    void this.anim
      .animate(0.08, (t) => s.container.scale.set(1 + (scale - 1) * t))
      .then(() => this.anim.animate(0.08, (t) => s.container.scale.set(scale + (1 - scale) * t)));
  }

  private async terrain(p: Position, terrain: TerrainType): Promise<void> {
    const c = this.grid.center(p);
    const color = terrain === "fire" ? 0xff6a2a : terrain === "trap" ? 0x9a4ad9 : 0xffffff;
    if (terrain === "fire") this.fx.spriteEffect("fire_burst", c.x, c.y, 108, 0.46);
    if (terrain === "trap") this.fx.spriteEffect("trap", c.x, c.y, 112, 0.46);
    this.fx.burst(c.x, c.y, color, 12, 52);
    return this.anim.wait(0.12);
  }

  private async die(id: string): Promise<void> {
    const s = this.units.get(id);
    if (!s) return;
    this.fx.burst(s.container.x, s.container.y, 0x88909e, 14, 56);
    await this.anim.animate(0.3, (t) => {
      s.container.alpha = 1 - t;
      s.container.scale.set(1 - t * 0.6);
    });
  }
}

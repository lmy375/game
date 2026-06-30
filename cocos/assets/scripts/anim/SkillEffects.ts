import { Node, Vec3, Color, Graphics, tween } from "cc";
import { CoordMap } from "../core/CoordMap";
import { SceneRig } from "../view/SceneRig";
import { uiNode, uiGraphics } from "../view/Factory";
import { hex } from "../view/Palette";

/**
 * 程序化技能特效:全部用代码生成的 UI 粒子/光环/弹道,无需任何美术资源。
 * 坐标按世界点投影到 Canvas;相机静止,故投影一次即可。后续可在编辑器替换为正式特效。
 */
export class SkillEffects {
  private layer!: Node;

  constructor(
    private coord: CoordMap,
    private rig: SceneRig
  ) {}

  build(): void {
    this.layer = uiNode("Effects", this.rig.canvas);
  }

  private toUI(world: Vec3): Vec3 {
    const v = new Vec3();
    this.rig.worldToUI(world, v);
    return new Vec3(v.x, v.y, 0);
  }

  /** 一团向外迸射的粒子(受击/爆裂)。 */
  burst(atWorld: Vec3, color: Color, count = 10, radius = 60): void {
    const at = this.toUI(atWorld);
    for (let i = 0; i < count; i++) {
      const dot = uiGraphics(this.layer);
      const sz = 3 + Math.random() * 4;
      dot.fillColor = color;
      dot.circle(0, 0, sz);
      dot.fill();
      dot.node.setPosition(at.clone());
      const ang = Math.random() * Math.PI * 2;
      const r = radius * (0.4 + Math.random() * 0.6);
      const delta = new Vec3(Math.cos(ang) * r, Math.sin(ang) * r, 0);
      const life = 0.3 + Math.random() * 0.3;
      tween(dot.node).by(life, { position: delta }, { easing: "quadOut" }).start();
      tween(dot.node)
        .to(life, { scale: new Vec3(0, 0, 0) })
        .call(() => dot.node.destroy())
        .start();
    }
  }

  /** 一圈扩散的光环(聚拢/冲击波/施法起手)。 */
  ring(atWorld: Vec3, color: Color, maxScale = 3, life = 0.45): void {
    const at = this.toUI(atWorld);
    const g = uiGraphics(this.layer);
    g.lineWidth = 5;
    g.strokeColor = color;
    g.circle(0, 0, 26);
    g.stroke();
    g.node.setPosition(at);
    g.node.setScale(new Vec3(0.2, 0.2, 1));
    tween(g.node)
      .to(life, { scale: new Vec3(maxScale, maxScale, 1) }, { easing: "quadOut" })
      .call(() => g.node.destroy())
      .start();
  }

  /** 一道直线弹道(贯穿/远程),抵达后回调。 */
  projectile(fromWorld: Vec3, toWorld: Vec3, color: Color, onArrive?: () => void): void {
    const from = this.toUI(fromWorld);
    const to = this.toUI(toWorld);
    const dot = uiGraphics(this.layer);
    dot.fillColor = color;
    dot.circle(0, 0, 7);
    dot.fill();
    dot.node.setPosition(from);
    const dist = Vec3.distance(from, to);
    const life = Math.max(0.12, Math.min(0.4, dist / 1400));
    tween(dot.node)
      .to(life, { position: to }, { easing: "quadIn" })
      .call(() => {
        this.burst(toWorld, color, 6, 36);
        dot.node.destroy();
        onArrive?.();
      })
      .start();
  }

  /** 按技能给出差异化的施法表现(占位编排,可按 skillId 继续扩展)。 */
  cast(skillId: string, casterWorld: Vec3, targetWorld: Vec3 | null): void {
    const tgt = targetWorld ?? casterWorld;
    if (/gale|gather|wind|聚/.test(skillId)) {
      this.ring(tgt, hex("#8fe3ff"), 3.2);
    } else if (/pierce|line|shoot|spear|贯穿|射/.test(skillId)) {
      this.projectile(casterWorld, tgt, hex("#ffe08a"));
    } else if (/fire|cross|burn|火/.test(skillId)) {
      this.ring(casterWorld, hex("#ff8a3a"), 1.6, 0.3);
      this.burst(tgt, hex("#ff6a2a"), 14, 70);
    } else if (/push|wave|knock|推/.test(skillId)) {
      this.ring(casterWorld, hex("#cfe0ff"), 2.6);
    } else {
      this.ring(casterWorld, hex("#ffffff"), 1.4, 0.25);
    }
  }
}

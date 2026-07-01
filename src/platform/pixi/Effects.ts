import { Container, Graphics, Sprite, Text } from "pixi.js";
import { Grid } from "./Grid";
import { Animator, Easing } from "./Anim";
import { effectTextureUrls } from "./AssetManifest";

/** 程序化 2D 特效:加色粒子迸射 / 扩散光环 / 直线弹道 / 飘字 / 屏幕震动。 */
export class Effects {
  constructor(
    private fx: Container,
    private world: Container,
    private grid: Grid,
    private anim: Animator
  ) {}

  private pt(cellX: number, cellY: number): { x: number; y: number } {
    return this.grid.center({ x: cellX, y: cellY });
  }

  burst(px: number, py: number, color: number, count = 12, radius = 46): void {
    for (let i = 0; i < count; i++) {
      const dot = new Graphics();
      dot.circle(0, 0, 2 + Math.random() * 3).fill(color);
      dot.blendMode = "add";
      dot.position.set(px, py);
      this.fx.addChild(dot);
      const ang = Math.random() * Math.PI * 2;
      const r = radius * (0.4 + Math.random() * 0.6);
      const dx = Math.cos(ang) * r;
      const dy = Math.sin(ang) * r;
      void this.anim
        .animate(
          0.45,
          (t) => {
            dot.position.set(px + dx * t, py + dy * t);
            dot.alpha = 1 - t;
            dot.scale.set(1 - t * 0.5);
          },
          Easing.quadOut
        )
        .then(() => dot.destroy());
    }
  }

  ring(px: number, py: number, color: number, maxR = 60, life = 0.45): void {
    const g = new Graphics();
    g.circle(0, 0, 24).stroke({ width: 5, color });
    g.blendMode = "add";
    g.position.set(px, py);
    this.fx.addChild(g);
    void this.anim
      .animate(
        life,
        (t) => {
          const s = 0.4 + (maxR / 24) * t;
          g.scale.set(s);
          g.alpha = 1 - t;
        },
        Easing.quadOut
      )
      .then(() => g.destroy());
  }

  projectile(from: { x: number; y: number }, to: { x: number; y: number }, color: number, onArrive?: () => void): void {
    const g = Sprite.from(effectTextureUrls.pierce_shot);
    g.anchor.set(0.5);
    g.width = 70;
    g.height = 70;
    g.rotation = Math.atan2(to.y - from.y, to.x - from.x);
    g.blendMode = "add";
    g.position.set(from.x, from.y);
    this.fx.addChild(g);
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    void this.anim
      .animate(Math.max(0.1, Math.min(0.35, dist / 700)), (t) => g.position.set(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t), Easing.quadIn)
      .then(() => {
        g.destroy();
        this.burst(to.x, to.y, color, 7, 28);
        onArrive?.();
      });
  }

  spriteEffect(key: keyof typeof effectTextureUrls, px: number, py: number, size = 96, life = 0.5): void {
    const s = Sprite.from(effectTextureUrls[key]);
    s.anchor.set(0.5);
    s.blendMode = "add";
    s.position.set(px, py);
    s.width = size;
    s.height = size;
    this.fx.addChild(s);
    void this.anim
      .animate(
        life,
        (t) => {
          const k = t < 0.18 ? t / 0.18 : 1;
          s.alpha = k * (1 - Math.max(0, t - 0.32) / 0.68);
          s.scale.set(0.72 + t * 0.48);
          s.rotation += 0.015;
        },
        Easing.quadOut
      )
      .then(() => s.destroy());
  }

  float(px: number, py: number, text: string, color: string): void {
    const t = new Text({ text, style: { fontSize: 22, fill: color, fontWeight: "bold", stroke: { color: 0x000000, width: 4 } } });
    t.anchor.set(0.5);
    t.position.set(px, py);
    this.fx.addChild(t);
    void this.anim
      .animate(0.7, (k) => {
        t.position.set(px, py - 40 * k);
        t.alpha = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
      })
      .then(() => t.destroy());
  }

  shake(intensity = 8, dur = 0.25): void {
    void this.anim.animate(dur, (t) => {
      const k = (1 - t) * intensity;
      this.world.position.set((Math.random() - 0.5) * k, (Math.random() - 0.5) * k);
    });
  }

  cast(skillId: string, fromCell: { x: number; y: number }, toCell: { x: number; y: number } | null): void {
    const from = this.pt(fromCell.x, fromCell.y);
    const to = toCell ? this.pt(toCell.x, toCell.y) : from;
    if (/gale|gather|wind|聚/.test(skillId)) this.spriteEffect("gale_gather", to.x, to.y, 118);
    else if (/swap/.test(skillId)) this.spriteEffect("swap_skill", to.x, to.y, 112);
    else if (/pierce|line|shoot|spear|贯穿|射/.test(skillId)) this.projectile(from, to, 0xffe08a);
    else if (/fire|cross|burn|火/.test(skillId)) {
      this.spriteEffect("cross_fire", from.x, from.y, 92, 0.35);
      this.spriteEffect("fire_burst", to.x, to.y, 118, 0.55);
      this.burst(to.x, to.y, 0xff6a2a, 16, 60);
    } else if (/push|wave|knock|推/.test(skillId)) this.spriteEffect("push_wave", from.x, from.y, 118);
    else this.spriteEffect("slash", to.x, to.y, 86, 0.32);
  }
}

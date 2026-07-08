import { Container, Graphics, Rectangle, Sprite, Text, Texture } from "pixi.js";
import { Grid } from "./Grid";
import { Animator, Easing } from "./Anim";
import { effectTextureUrls, generatedEffectSheetUrls } from "./AssetManifest";

type Point = { x: number; y: number };
type EffectTextureKey = keyof typeof effectTextureUrls;
type GeneratedEffectSheetKey = keyof typeof generatedEffectSheetUrls;

/** 程序化 2D 特效 + 生图逐帧技能特效。 */
export class Effects {
  private sheetCache = new Map<GeneratedEffectSheetKey, Texture[]>();

  constructor(
    private fx: Container,
    private world: Container,
    private grid: Grid,
    private anim: Animator
  ) {}

  private pt(cellX: number, cellY: number): Point {
    return this.grid.center({ x: cellX, y: cellY });
  }

  private after(delay: number, fn: () => void): void {
    void this.anim.wait(delay).then(fn);
  }

  private angle(from: Point, to: Point): number {
    return Math.atan2(to.y - from.y, to.x - from.x);
  }

  private lineEnd(fromCell: Point, toCell: Point, tiles = 4): Point {
    const dx = Math.sign(toCell.x - fromCell.x);
    const dy = Math.sign(toCell.y - fromCell.y);
    if (dx === 0 && dy === 0) return this.pt(fromCell.x, fromCell.y);
    const end = {
      x: Math.max(0, Math.min(this.grid.width - 1, fromCell.x + dx * tiles)),
      y: Math.max(0, Math.min(this.grid.height - 1, fromCell.y + dy * tiles)),
    };
    return this.pt(end.x, end.y);
  }

  private frontRowPoints(from: Point, to: Point, spread = 38): Point[] {
    const vx = to.x - from.x;
    const vy = to.y - from.y;
    const len = Math.hypot(vx, vy) || 1;
    const nx = -vy / len;
    const ny = vx / len;
    return [-1, 0, 1].map((i) => ({ x: to.x + nx * spread * i, y: to.y + ny * spread * i }));
  }

  private sheetFrames(key: GeneratedEffectSheetKey): Texture[] {
    const cached = this.sheetCache.get(key);
    if (cached) return cached;

    const base = Texture.from(generatedEffectSheetUrls[key]);
    const frames = 8;
    const frameW = base.width / frames;
    const frameH = base.height;
    const textures = Array.from(
      { length: frames },
      (_, i) => new Texture({ source: base.source, frame: new Rectangle(i * frameW, 0, frameW, frameH) })
    );
    this.sheetCache.set(key, textures);
    return textures;
  }

  private sheetEffect(key: GeneratedEffectSheetKey, point: Point, size = 120, life = 0.45, rotation = 0, tint?: number): number {
    const frames = this.sheetFrames(key);
    const sprite = new Sprite(frames[0]);
    sprite.anchor.set(0.5);
    sprite.blendMode = "add";
    sprite.position.set(point.x, point.y);
    sprite.rotation = rotation;
    if (tint !== undefined) sprite.tint = tint;
    sprite.scale.set(size / frames[0].width);
    this.fx.addChild(sprite);

    void this.anim
      .animate(
        life,
        (t) => {
          sprite.texture = frames[Math.min(frames.length - 1, Math.floor(t * frames.length))];
          sprite.alpha = t < 0.88 ? 1 : 1 - (t - 0.88) / 0.12;
        },
        Easing.linear
      )
      .then(() => sprite.destroy());
    return life;
  }

  private sheetProjectile(key: GeneratedEffectSheetKey, from: Point, to: Point, size = 74, tint?: number): number {
    const frames = this.sheetFrames(key);
    const sprite = new Sprite(frames[0]);
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const life = Math.max(0.16, Math.min(0.42, dist / 680));
    sprite.anchor.set(0.5);
    sprite.blendMode = "add";
    sprite.position.set(from.x, from.y);
    sprite.rotation = this.angle(from, to);
    if (tint !== undefined) sprite.tint = tint;
    sprite.scale.set(size / frames[0].width);
    this.fx.addChild(sprite);

    void this.anim
      .animate(
        life,
        (t) => {
          sprite.texture = frames[Math.min(frames.length - 1, Math.floor(t * frames.length))];
          sprite.position.set(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
          sprite.alpha = t < 0.9 ? 1 : 1 - (t - 0.9) / 0.1;
        },
        Easing.quadIn
      )
      .then(() => sprite.destroy());
    return life;
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

  projectile(from: Point, to: Point, color: number, onArrive?: () => void, texture: EffectTextureKey = "pierce_shot", size = 70): number {
    const g = Sprite.from(effectTextureUrls[texture]);
    g.anchor.set(0.5);
    g.width = size;
    g.height = size;
    g.rotation = this.angle(from, to);
    g.blendMode = "add";
    g.position.set(from.x, from.y);
    this.fx.addChild(g);
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const dur = Math.max(0.1, Math.min(0.35, dist / 700));
    void this.anim
      .animate(
        dur,
        (t) => {
          g.position.set(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
          g.scale.set(0.75 + t * 0.35);
        },
        Easing.quadIn
      )
      .then(() => {
        g.destroy();
        this.burst(to.x, to.y, color, 7, 28);
        onArrive?.();
      });
    return dur;
  }

  spriteEffect(key: EffectTextureKey, px: number, py: number, size = 96, life = 0.5, rotation = 0): void {
    const s = Sprite.from(effectTextureUrls[key]);
    s.anchor.set(0.5);
    s.blendMode = "add";
    s.position.set(px, py);
    s.width = size;
    s.height = size;
    s.rotation = rotation;
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

  private slashAt(point: Point, rotation: number, size = 120, tint?: number): void {
    this.sheetEffect("slash_arc", point, size, 0.34, rotation, tint);
  }

  private frontSweep(from: Point, to: Point, tint?: number, size = 124): void {
    const rot = this.angle(from, to);
    this.frontRowPoints(from, to).forEach((p, i) => this.after(i * 0.035, () => this.slashAt(p, rot, size, tint)));
  }

  private crossBurst(center: Point, sheet: GeneratedEffectSheetKey, size = 132, tint?: number): void {
    this.sheetEffect(sheet, center, size, 0.46, 0, tint);
    const offsets = [
      { x: this.grid.halfW, y: 0 },
      { x: -this.grid.halfW, y: 0 },
      { x: 0, y: this.grid.halfH },
      { x: 0, y: -this.grid.halfH },
    ];
    offsets.forEach((o, i) => this.after(0.04 + i * 0.025, () => this.sheetEffect(sheet, { x: center.x + o.x, y: center.y + o.y }, size * 0.72, 0.34, 0, tint)));
  }

  private iceImpact(center: Point, large = false): void {
    this.sheetEffect("ice_burst", center, large ? 156 : 122, large ? 0.58 : 0.42);
  }

  private windImpact(center: Point, large = false): void {
    this.sheetEffect("wind_cyclone", center, large ? 156 : 118, large ? 0.58 : 0.42);
  }

  private fireImpact(center: Point, large = false): void {
    this.sheetEffect("fire_burst", center, large ? 156 : 122, large ? 0.58 : 0.42);
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

  cast(skillId: string, fromCell: Point, toCell: Point | null): number {
    const from = this.pt(fromCell.x, fromCell.y);
    const to = toCell ? this.pt(toCell.x, toCell.y) : from;
    const lineTo = toCell ? this.lineEnd(fromCell, toCell) : to;
    const aim = this.angle(from, to);

    switch (skillId) {
      case "normal_attack":
        this.slashAt(to, aim, 116);
        return 0.28;
      case "ranged_shot":
        this.sheetProjectile("projectile_bolt", from, to, 86);
        return 0.36;
      case "pierce_shot":
        this.sheetProjectile("projectile_bolt", from, lineTo, 104);
        return 0.4;
      case "gale_gather":
        this.windImpact(to, true);
        this.after(0.12, () => this.windImpact(to, false));
        return 0.5;
      case "push_wave":
        this.sheetEffect("push_wave", from, 170, 0.42, aim);
        this.after(0.08, () => this.sheetEffect("push_wave", to, 142, 0.34, aim));
        return 0.42;
      case "swap_skill":
        this.sheetEffect("swap_portal", from, 118, 0.42);
        this.sheetEffect("swap_portal", to, 138, 0.5);
        return 0.42;
      case "wind_blade":
        this.sheetProjectile("projectile_bolt", from, to, 84, 0x9fffd6);
        this.after(0.16, () => this.windImpact(to, false));
        return 0.42;
      case "cyclone":
        this.windImpact(to, true);
        return 0.46;
      case "tempest":
        this.crossBurst(to, "wind_cyclone", 132);
        return 0.48;
      case "cross_fire":
        this.sheetEffect("fire_burst", from, 98, 0.28);
        this.crossBurst(to, "fire_burst", 136);
        return 0.5;
      case "fire_bolt":
        this.sheetProjectile("projectile_bolt", from, to, 86, 0xff8a2a);
        this.after(0.16, () => this.fireImpact(to, false));
        return 0.42;
      case "flame_wall":
        this.frontRowPoints(from, to).forEach((p, i) => this.after(i * 0.04, () => this.fireImpact(p, false)));
        return 0.44;
      case "inferno":
        this.fireImpact(to, true);
        this.after(0.14, () => this.fireImpact(to, false));
        return 0.54;
      case "sweep":
        this.frontSweep(from, to, undefined, 120);
        return 0.34;
      case "guard_break":
        this.slashAt(to, aim, 128, 0xd96ad9);
        this.after(0.08, () => this.sheetEffect("swap_portal", to, 92, 0.28));
        return 0.34;
      case "charge_thrust":
        this.sheetProjectile("projectile_bolt", from, lineTo, 118);
        this.after(0.16, () => this.slashAt(lineTo, aim, 132));
        return 0.44;
      case "crescent_slash":
        this.frontSweep(from, to, undefined, 144);
        return 0.4;
      case "whirlwind_slash":
        [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].forEach((rot, i) => this.after(i * 0.045, () => this.slashAt(from, rot, 146)));
        return 0.44;
      case "mortal_strike":
        this.sheetEffect("slash_arc", to, 162, 0.42, aim, 0xff5a45);
        this.after(0.1, () => this.sheetEffect("fire_burst", to, 92, 0.28, 0, 0xfff2b0));
        return 0.42;
      case "frost_bolt":
        this.sheetProjectile("projectile_bolt", from, to, 84, 0x8fdcff);
        this.after(0.16, () => this.iceImpact(to, false));
        return 0.42;
      case "freeze":
        this.sheetProjectile("projectile_bolt", from, to, 82, 0xbfefff);
        this.after(0.16, () => this.iceImpact(to, false));
        this.after(0.28, () => this.sheetEffect("ice_burst", to, 96, 0.34));
        return 0.48;
      case "frost_nova":
        this.iceImpact(from, true);
        this.after(0.12, () => this.iceImpact(from, false));
        return 0.52;
      case "blizzard":
        this.iceImpact(to, true);
        this.after(0.1, () => this.windImpact(to, false));
        this.after(0.18, () => this.iceImpact(to, false));
        return 0.56;
      default:
        this.slashAt(to, aim, 116);
        return 0.28;
    }
  }
}

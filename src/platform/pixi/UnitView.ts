import { Container, Graphics, Sprite, Text } from "pixi.js";
import { BattleState, Unit, Direction, isAlive } from "@core/index";
import { Grid } from "./Grid";
import { unitSpriteUrls } from "./AssetManifest";

const FACTION: Record<string, number> = { player: 0x4a90d9, enemy: 0xd9534f };
const STATUS: Record<string, { ch: string; color: string }> = {
  burn: { ch: "火", color: "#ff6a2a" },
  stun: { ch: "晕", color: "#e8c840" },
  vulnerable: { ch: "破", color: "#d96ad9" },
  shield: { ch: "盾", color: "#4a90d9" },
};

/** 单个单位的 Pixi 立绘:阴影 + 躯干 + 头 + 朝向 + 首字 + 血条 + 状态 + 选中辉光。 */
class UnitSprite {
  container = new Container();
  readonly maxHp: number;
  private readonly factionColor: number;
  private sprite: Sprite;
  private hp = new Graphics();
  private glow = new Graphics();
  private face = new Graphics();
  private statuses = new Text({ text: "", style: { fontSize: 13, fill: "#fff", fontWeight: "bold" } });

  constructor(unit: Unit, center: { x: number; y: number }, comp = 1) {
    this.maxHp = unit.maxHp;
    this.factionColor = FACTION[unit.faction] ?? FACTION.enemy;
    this.container.position.set(center.x, center.y);
    this.container.scale.set(comp); // 大棋盘整体缩小后,放大立绘/血条保证屏显可读
    this.sprite = Sprite.from(unitSpriteUrls[unit.defId as keyof typeof unitSpriteUrls] ?? unitSpriteUrls.enemy_soldier);
    this.sprite.anchor.set(0.5, 0.72);
    this.sprite.width = 72;
    this.sprite.height = 72;

    // 选中辉光(默认隐藏)
    this.glow.circle(0, 6, 30).fill({ color: 0xffe066, alpha: 0.5 });
    this.glow.blendMode = "add";
    this.glow.visible = false;

    // 阴影(贴合等距菱形,压扁加宽;上收进格内,紧贴立绘脚下)
    const shadow = new Graphics();
    shadow.ellipse(0, 8, 26, 10).fill({ color: 0x000000, alpha: 0.42 });

    this.statuses.anchor.set(0.5);
    this.statuses.position.set(0, -62);

    this.container.addChild(this.glow, shadow, this.sprite, this.face, this.hp, this.statuses);
    this.redraw(unit);
  }

  redraw(unit: Unit): void {
    this.drawFacing(unit.facing);
    this.setHp(unit.hp);

    const list = (unit.statuses ?? []).map((s) => STATUS[s.id]?.ch ?? "?");
    this.statuses.text = list.join(" ");
    this.statuses.style.fill = unit.statuses?.length ? (STATUS[unit.statuses[0].id]?.color ?? "#fff") : "#fff";

    this.container.alpha = isAlive(unit) ? 1 : 0;
  }

  private drawFacing(dir: Direction): void {
    const g = this.face;
    g.clear();
    const pts: Record<Direction, number[]> = {
      right: [24, -26, 32, -22, 24, -18],
      left: [-24, -26, -32, -22, -24, -18],
      up: [-4, -40, 0, -47, 4, -40],
      down: [-4, 24, 0, 31, 4, 24],
    };
    const p = pts[dir] ?? pts.right;
    g.poly(p).fill({ color: this.factionColor, alpha: 0.95 }).stroke({ width: 1, color: 0x0b0d12 });
  }

  setHp(now: number): void {
    const ratio = this.maxHp > 0 ? Math.max(0, Math.min(1, now / this.maxHp)) : 0;
    const w = 40;
    const y = -50; // 头顶上方
    const g = this.hp;
    g.clear();
    g.roundRect(-w / 2, y, w, 6, 3).fill({ color: 0x11141b, alpha: 0.85 });
    if (ratio > 0) {
      const r = Math.round(95 + (217 - 95) * (1 - ratio));
      const gg = Math.round(207 * ratio + 83 * (1 - ratio));
      const b = Math.round(106 * ratio + 79 * (1 - ratio));
      g.roundRect(-w / 2 + 1, y + 1, (w - 2) * ratio, 4, 2).fill((r << 16) | (gg << 8) | b);
    }
  }

  setFacing(dir: Direction): void {
    this.drawFacing(dir);
  }
  setSelected(on: boolean): void {
    this.glow.visible = on;
  }
}

/** 管理所有单位立绘。 */
export class UnitView {
  private map = new Map<string, UnitSprite>();
  private layer!: Container;
  private grid!: Grid;
  private comp = 1;

  /** comp:立绘可读性补偿系数(随 world 缩放增大,由表现层按棋盘缩放计算)。 */
  build(grid: Grid, layer: Container, comp = 1): void {
    this.grid = grid;
    this.layer = layer;
    this.comp = comp;
  }

  sync(state: BattleState): void {
    const seen = new Set<string>();
    for (const u of state.units) {
      if (!isAlive(u)) continue;
      seen.add(u.instanceId);
      let s = this.map.get(u.instanceId);
      const c = this.grid.center(u.pos);
      if (!s) {
        s = new UnitSprite(u, c, this.comp);
        this.layer.addChild(s.container);
        this.map.set(u.instanceId, s);
      } else {
        s.container.position.set(c.x, c.y);
        s.redraw(u);
      }
      s.container.zIndex = c.y; // 靠前(下方)的单位盖住靠后的

    }
    for (const [id, s] of [...this.map]) {
      if (!seen.has(id)) {
        this.layer.removeChild(s.container);
        s.container.destroy({ children: true });
        this.map.delete(id);
      }
    }
  }

  get(id: string): UnitSprite | undefined {
    return this.map.get(id);
  }
  setSelected(id: string | undefined): void {
    for (const [sid, s] of this.map) s.setSelected(sid === id);
  }
}

export { UnitSprite };

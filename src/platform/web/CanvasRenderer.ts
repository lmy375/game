/**
 * Canvas 表现层。只负责把 BattleState + 叠加层画出来；不含任何战斗规则。
 * 逻辑坐标 y 向上为正，绘制时翻转为屏幕 y 向下。
 */
import { BattleState, Position, livingUnits } from "@core/index";

export interface DamageLabel {
  pos: Position;
  amount: number;
  lethal: boolean;
  kind: "damage" | "heal";
}

export interface Arrow {
  from: Position;
  to: Position;
}

export interface RenderOverlay {
  selectedUnitId?: string;
  hoverCell?: Position;
  moveCells?: Position[];
  castCells?: Position[];
  hitCenter?: Position[];
  hitArm?: Position[];
  finalBoxes?: Position[];
  arrows?: Arrow[];
  damage?: DamageLabel[];
  hazardWarn?: Position[];
  /** 暂定移动时，单位原始位置的标记。 */
  originCell?: Position;
}

export interface CellRect {
  left: number;
  top: number;
  width: number;
  height: number;
  boardWidth: number;
  boardHeight: number;
}

const TERRAIN_COLOR: Record<string, string> = {
  ground: "#39404e",
  wall: "#191c24",
  obstacle: "#5b4636",
  fire: "#7a2a1c",
  trap: "#46295c",
};

export class CanvasRenderer {
  readonly cell: number;
  private ctx: CanvasRenderingContext2D;

  constructor(private canvas: HTMLCanvasElement, private state: BattleState, maxPx = 640) {
    const dim = Math.max(state.board.width, state.board.height);
    this.cell = Math.floor(maxPx / dim);
    canvas.width = state.board.width * this.cell;
    canvas.height = state.board.height * this.cell;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("无法获取 2D 上下文");
    this.ctx = ctx;
  }

  setState(s: BattleState) {
    this.state = s;
  }

  /** 屏幕像素 -> 逻辑格 */
  cellFromPixel(px: number, py: number): Position | null {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = Math.floor(((px - rect.left) * scaleX) / this.cell);
    const yScreen = Math.floor(((py - rect.top) * scaleY) / this.cell);
    const y = this.state.board.height - 1 - yScreen;
    const p = { x, y };
    return this.state.board.inBounds(p) ? p : null;
  }

  private cx(x: number): number {
    return x * this.cell;
  }
  private cy(y: number): number {
    return (this.state.board.height - 1 - y) * this.cell;
  }
  private center(p: Position): [number, number] {
    return [this.cx(p.x) + this.cell / 2, this.cy(p.y) + this.cell / 2];
  }

  /** 逻辑格 → 相对 canvas 的 CSS 像素矩形（用于在棋盘上定位浮动 UI）。 */
  cellRectCss(p: Position): CellRect {
    const sx = (this.canvas.clientWidth || this.canvas.width) / this.canvas.width;
    const sy = (this.canvas.clientHeight || this.canvas.height) / this.canvas.height;
    return {
      left: this.cx(p.x) * sx,
      top: this.cy(p.y) * sy,
      width: this.cell * sx,
      height: this.cell * sy,
      boardWidth: this.canvas.clientWidth || this.canvas.width,
      boardHeight: this.canvas.clientHeight || this.canvas.height,
    };
  }

  render(overlay: RenderOverlay = {}) {
    const ctx = this.ctx;
    const c = this.cell;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 地形
    this.state.board.forEachTile((p, terrain) => {
      ctx.fillStyle = TERRAIN_COLOR[terrain] ?? "#39404e";
      ctx.fillRect(this.cx(p.x), this.cy(p.y), c, c);
      ctx.strokeStyle = "#0d0f14";
      ctx.lineWidth = 1;
      ctx.strokeRect(this.cx(p.x) + 0.5, this.cy(p.y) + 0.5, c, c);
      if (terrain === "fire") this.icon(p, "🔥");
      if (terrain === "trap") this.icon(p, "⚠");
      if (terrain === "obstacle") this.icon(p, "🪨");
    });

    // 高亮层
    this.fillCells(overlay.moveCells, "rgba(74,144,217,0.30)");
    this.fillCells(overlay.castCells, "rgba(232,200,64,0.18)");
    this.fillCells(overlay.hitArm, "rgba(232,140,40,0.45)");
    this.fillCells(overlay.hitCenter, "rgba(232,70,38,0.62)");

    // 暂定移动：原位标记
    if (overlay.originCell) {
      const ox = this.cx(overlay.originCell.x);
      const oy = this.cy(overlay.originCell.y);
      ctx.strokeStyle = "rgba(255,224,102,0.8)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(ox + 2, oy + 2, c - 4, c - 4);
      ctx.setLineDash([]);
      this.icon(overlay.originCell, "↩");
    }

    if (overlay.hoverCell) {
      const [hx, hy] = [this.cx(overlay.hoverCell.x), this.cy(overlay.hoverCell.y)];
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 2;
      ctx.strokeRect(hx + 1, hy + 1, c - 2, c - 2);
    }

    // 单位
    for (const u of livingUnits(this.state)) {
      this.drawUnit(u, overlay.selectedUnitId === u.instanceId);
    }

    // 位移最终落点框
    if (overlay.finalBoxes) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      for (const p of overlay.finalBoxes) {
        ctx.strokeRect(this.cx(p.x) + 3, this.cy(p.y) + 3, c - 6, c - 6);
      }
      ctx.setLineDash([]);
    }

    // 位移箭头
    if (overlay.arrows) for (const a of overlay.arrows) this.drawArrow(a);

    // 危险提示
    if (overlay.hazardWarn) for (const p of overlay.hazardWarn) this.icon(p, "💥");

    // 伤害/治疗数字
    if (overlay.damage) for (const d of overlay.damage) this.drawDamage(d);
  }

  private fillCells(cells: Position[] | undefined, color: string) {
    if (!cells) return;
    this.ctx.fillStyle = color;
    for (const p of cells) this.ctx.fillRect(this.cx(p.x), this.cy(p.y), this.cell, this.cell);
  }

  private drawUnit(u: import("@core/index").Unit, selected: boolean) {
    const ctx = this.ctx;
    const [x, y] = this.center(u.pos);
    const r = this.cell * 0.34;

    if (selected) {
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffe066";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = u.faction === "player" ? "#4a90d9" : u.aiProfile === "tank" ? "#8a3b38" : "#d9534f";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#0d0f14";
    ctx.stroke();

    // 朝向小三角
    this.drawFacing(u);

    // 名称首字
    ctx.fillStyle = "#fff";
    ctx.font = `${Math.floor(this.cell * 0.32)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(u.name[0], x, y);

    // 血条
    const bw = this.cell * 0.7;
    const bh = 5;
    const bx = x - bw / 2;
    const by = y + r + 3;
    ctx.fillStyle = "#000";
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = u.faction === "player" ? "#4ad991" : "#e6643c";
    ctx.fillRect(bx, by, (bw * Math.max(0, u.hp)) / u.maxHp, bh);

    // 状态标记
    if (u.statuses.length) {
      ctx.font = `${Math.floor(this.cell * 0.22)}px sans-serif`;
      ctx.fillText(u.statuses.map(statusIcon).join(""), x, by + 12);
    }
  }

  private drawFacing(u: import("@core/index").Unit) {
    const ctx = this.ctx;
    const [x, y] = this.center(u.pos);
    const r = this.cell * 0.34;
    const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[u.facing];
    ctx.beginPath();
    ctx.arc(x + v[0] * r, y + v[1] * r, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#ffe066";
    ctx.fill();
  }

  private drawArrow(a: Arrow) {
    const ctx = this.ctx;
    const [x1, y1] = this.center(a.from);
    const [x2, y2] = this.center(a.to);
    ctx.strokeStyle = "#ffffff";
    ctx.fillStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const h = 9;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - h * Math.cos(ang - 0.5), y2 - h * Math.sin(ang - 0.5));
    ctx.lineTo(x2 - h * Math.cos(ang + 0.5), y2 - h * Math.sin(ang + 0.5));
    ctx.closePath();
    ctx.fill();
  }

  private drawDamage(d: DamageLabel) {
    const ctx = this.ctx;
    const [x, y] = this.center(d.pos);
    const text = d.lethal ? `☠${d.amount}` : `${d.kind === "heal" ? "+" : "-"}${d.amount}`;
    ctx.font = `bold ${Math.floor(this.cell * 0.34)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#000";
    ctx.strokeText(text, x, y - this.cell * 0.18);
    ctx.fillStyle = d.lethal ? "#ff4d4d" : d.kind === "heal" ? "#7CFC9A" : "#ffd24d";
    ctx.fillText(text, x, y - this.cell * 0.18);
  }

  private icon(p: Position, glyph: string) {
    const ctx = this.ctx;
    const [x, y] = this.center(p);
    ctx.font = `${Math.floor(this.cell * 0.4)}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(glyph, x, y);
  }
}

function statusIcon(s: { id: string }): string {
  return s.id === "burn" ? "🔥" : s.id === "stun" ? "💫" : "🛡";
}

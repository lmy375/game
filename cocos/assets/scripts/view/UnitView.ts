import { Node, Vec3, Color, Layers, tween, MeshRenderer } from "cc";
import { BattleState, Unit, Direction, isAlive } from "../game-core/index";
import { CoordMap } from "../core/CoordMap";
import { SceneRig } from "./SceneRig";
import { cylinderMesh, sphereMesh, torusMesh, boxMesh, litMat, unlitMat, meshNode } from "./Factory";
import { FACTION, UI, hex } from "./Palette";

/** 单位头部点缀色:让同阵营不同角色可区分(无文字时用颜色区分)。 */
const ACCENT: Record<string, string> = {
  wind_mage: "#8fe3ff",
  fire_mage: "#ff8a3a",
  spear_knight: "#cfe0a0",
  lancer: "#cfe0a0",
  enemy_soldier: "#ffb0a8",
  enemy_archer: "#ffd28a",
  enemy_tank: "#d0b0ff",
};

const FACE_OFFSET: Record<Direction, [number, number]> = {
  right: [0.34, 0],
  left: [-0.34, 0],
  up: [0, -0.34], // 逻辑 +y → 世界 -z
  down: [0, 0.34],
};

/**
 * 单个单位的 3D 立绘(棋子式):底座选中环 + 圆柱躯干 + 球头 + 朝向凸起 + 悬浮血条。
 * 全部是 boardRoot 下的 3D 物件,与地块/高亮共用同一坐标与相机 —— 不存在投影错位。
 */
class UnitSprite {
  node: Node; // 位于世界坐标(由 UnitView.project 每帧从 world 同步)
  world: Vec3; // 追踪用世界坐标(EventAnimator 补间的就是它)
  readonly maxHp: number;
  private faceNode: Node;
  private hpFill: Node;
  private ring: Node;

  constructor(parent: Node, unit: Unit, world: Vec3) {
    this.world = world.clone();
    this.maxHp = unit.maxHp;
    const base = FACTION[unit.faction] ?? FACTION.enemy;
    const accent = hex(ACCENT[unit.defId] ?? (unit.faction === "player" ? "#cfe0ff" : "#ffd0c8"));

    this.node = new Node(`unit_${unit.instanceId}`);
    this.node.layer = Layers.Enum.DEFAULT;
    parent.addChild(this.node);
    this.node.setPosition(world);

    // 选中环(贴地)
    this.ring = meshNode("ring", this.node, torusMesh(0.4, 0.05), unlitMat(hex("#ffe066")), false);
    this.ring.setRotationFromEuler(-90, 0, 0);
    this.ring.setPosition(0, 0.04, 0);
    this.ring.active = false;

    // 躯干 + 头
    const body = meshNode("body", this.node, cylinderMesh(0.28, 0.52), litMat(base));
    body.setPosition(0, 0.28, 0);
    const head = meshNode("head", this.node, sphereMesh(0.17), litMat(accent));
    head.setPosition(0, 0.66, 0);

    // 朝向凸起
    this.faceNode = meshNode("face", this.node, boxMesh(0.14, 0.14, 0.2), litMat(hex("#ffffff")));
    this.faceNode.setPosition(0.34, 0.4, 0);

    // 血条(贴地朝上的薄片:底 + 填充),从上往下看可读
    const backW = 0.62;
    const hpBack = meshNode("hpb", this.node, boxMesh(backW, 0.02, 0.14), unlitMat(hex("#11141b")), false);
    hpBack.setPosition(0, 1.04, 0);
    this.hpFill = meshNode("hpf", this.node, boxMesh(0.58, 0.03, 0.1), unlitMat(UI.hpFull), false);
    this.hpFill.setPosition(0, 1.05, 0);

    this.redraw(unit);
  }

  redraw(unit: Unit): void {
    this.setHp(unit.hp);
    this.setFacing(unit.facing);
    this.node.active = isAlive(unit);
  }

  setHp(now: number): void {
    const ratio = this.maxHp > 0 ? Math.max(0, Math.min(1, now / this.maxHp)) : 0;
    const full = 0.58;
    this.hpFill.setScale(ratio, 1, 1);
    this.hpFill.setPosition(-(full * (1 - ratio)) / 2, 1.05, 0.001);
    const col = new Color();
    Color.lerp(col, UI.hpLow, UI.hpFull, ratio);
    this.hpFill.getComponent(MeshRenderer)?.material?.setProperty("mainColor", col);
  }

  setFacing(dir: Direction): void {
    const [dx, dz] = FACE_OFFSET[dir] ?? FACE_OFFSET.right;
    this.faceNode.setPosition(dx, 0.4, dz);
  }

  punch(scale = 1.25, dur = 0.08): void {
    tween(this.node)
      .to(dur, { scale: new Vec3(scale, scale, scale) })
      .to(dur, { scale: new Vec3(1, 1, 1) })
      .start();
  }

  die(onDone: () => void, dur = 0.35): void {
    tween(this.node)
      .to(dur, { scale: new Vec3(0.05, 0.05, 0.05) })
      .call(onDone)
      .start();
  }

  setSelected(on: boolean): void {
    this.ring.active = on;
  }
}

/** 管理所有单位 3D 立绘:与状态同步、每帧把 world 同步到节点位置。 */
export class UnitView {
  private sprites = new Map<string, UnitSprite>();
  private group!: Node;

  constructor(
    private coord: CoordMap,
    private rig: SceneRig
  ) {}

  build(): void {
    this.group = new Node("Units3D");
    this.group.layer = Layers.Enum.DEFAULT;
    this.rig.boardRoot.addChild(this.group);
  }

  sync(state: BattleState): void {
    const seen = new Set<string>();
    for (const u of state.units) {
      if (!isAlive(u)) continue;
      seen.add(u.instanceId);
      let s = this.sprites.get(u.instanceId);
      const world = this.coord.posToWorld(u.pos, 0);
      if (!s) {
        s = new UnitSprite(this.group, u, world);
        this.sprites.set(u.instanceId, s);
      } else {
        s.world.set(world.x, world.y, world.z);
        s.redraw(u);
      }
    }
    for (const [id, s] of [...this.sprites]) {
      if (!seen.has(id)) {
        s.node.destroy();
        this.sprites.delete(id);
      }
    }
    this.project();
  }

  /** 每帧:把追踪用 world 同步到 3D 节点位置(动画期间 world 在被补间)。 */
  project(): void {
    for (const s of this.sprites.values()) s.node.setPosition(s.world);
  }

  get(id: string): UnitSprite | undefined {
    return this.sprites.get(id);
  }

  setSelected(id: string | undefined): void {
    for (const [sid, s] of this.sprites) s.setSelected(sid === id);
  }

  redraw(unit: Unit): void {
    this.sprites.get(unit.instanceId)?.redraw(unit);
  }
}

export { UnitSprite };

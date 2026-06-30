import {
  Node,
  MeshRenderer,
  Material,
  Mesh,
  primitives,
  utils,
  Color,
  Layers,
  UITransform,
  Label,
  Graphics,
} from "cc";

/** 复用同尺寸的 primitive mesh,避免每格重建。 */
const meshCache = new Map<string, Mesh>();

export function boxMesh(w: number, h: number, l: number): Mesh {
  const key = `box:${w},${h},${l}`;
  let m = meshCache.get(key);
  if (!m) {
    m = utils.createMesh(primitives.box({ width: w, height: h, length: l }));
    meshCache.set(key, m);
  }
  return m;
}

export function planeMesh(w: number, l: number): Mesh {
  const key = `plane:${w},${l}`;
  let m = meshCache.get(key);
  if (!m) {
    m = utils.createMesh(primitives.plane({ width: w, length: l, widthSegments: 1, lengthSegments: 1 }));
    meshCache.set(key, m);
  }
  return m;
}

export function cylinderMesh(radius: number, height: number): Mesh {
  const key = `cyl:${radius},${height}`;
  let m = meshCache.get(key);
  if (!m) {
    m = utils.createMesh(primitives.cylinder(radius, radius, height, { radialSegments: 18 }));
    meshCache.set(key, m);
  }
  return m;
}

export function sphereMesh(radius: number): Mesh {
  const key = `sph:${radius}`;
  let m = meshCache.get(key);
  if (!m) {
    m = utils.createMesh(primitives.sphere(radius, { segments: 18 }));
    meshCache.set(key, m);
  }
  return m;
}

export function torusMesh(radius: number, tube: number): Mesh {
  const key = `tor:${radius},${tube}`;
  let m = meshCache.get(key);
  if (!m) {
    m = utils.createMesh(primitives.torus(radius, tube, { radialSegments: 28, tubularSegments: 12 }));
    meshCache.set(key, m);
  }
  return m;
}

/** 受光标准材质(投/接阴影),用于地形与立体物件。 */
export function litMat(color: Color, emissive?: Color): Material {
  const m = new Material();
  m.initialize({ effectName: "builtin-standard" });
  m.setProperty("mainColor", color);
  m.setProperty("roughness", 0.9);
  m.setProperty("metallic", 0.0);
  if (emissive) {
    m.setProperty("emissive", emissive);
    m.setProperty("emissiveScale", 0.6);
  }
  return m;
}

/** 无光材质;transparent=true 时走半透明 technique(用于贴地高亮)。 */
export function unlitMat(color: Color, transparent = false): Material {
  const m = new Material();
  m.initialize(transparent ? { effectName: "builtin-unlit", technique: 1 } : { effectName: "builtin-unlit" });
  m.setProperty("mainColor", color);
  return m;
}

/** 建一个挂 MeshRenderer 的 3D 节点。shadow=false 时不投/接阴影(用于薄片/血条等)。 */
export function meshNode(name: string, parent: Node, mesh: Mesh, mat: Material, shadow = true): Node {
  const n = new Node(name);
  n.layer = Layers.Enum.DEFAULT;
  parent.addChild(n);
  const mr = n.addComponent(MeshRenderer);
  mr.mesh = mesh;
  mr.setMaterial(mat, 0);
  mr.shadowCastingMode = shadow ? MeshRenderer.ShadowCastingMode.ON : MeshRenderer.ShadowCastingMode.OFF;
  mr.receiveShadow = shadow ? MeshRenderer.ShadowReceivingMode.ON : MeshRenderer.ShadowReceivingMode.OFF;
  return n;
}

// ── UI(2D)节点助手 ───────────────────────────────────────────────────

/** 建一个带 UITransform 的 UI 节点(layer = UI_2D)。 */
export function uiNode(name: string, parent: Node, w = 0, h = 0): Node {
  const n = new Node(name);
  n.layer = Layers.Enum.UI_2D;
  parent.addChild(n);
  const t = n.addComponent(UITransform);
  if (w || h) t.setContentSize(w, h);
  return n;
}

export function uiLabel(
  parent: Node,
  text: string,
  opts: { size?: number; color?: Color; bold?: boolean; outline?: Color } = {}
): Label {
  const n = uiNode("label", parent);
  const l = n.addComponent(Label);
  l.string = text;
  l.fontSize = opts.size ?? 18;
  l.lineHeight = (opts.size ?? 18) + 4;
  if (opts.color) l.color = opts.color;
  if (opts.bold) l.isBold = true;
  if (opts.outline) {
    l.enableOutline = true;
    l.outlineColor = opts.outline;
    l.outlineWidth = 2;
  }
  return l;
}

export function uiGraphics(parent: Node, w = 0, h = 0): Graphics {
  const n = uiNode("gfx", parent, w, h);
  return n.addComponent(Graphics);
}

/** 纯色圆角 UI 面板(Graphics 程序化绘制;后续可替换为图集 Sprite)。 */
export function uiSolid(parent: Node, w: number, h: number, color: Color): { node: Node; gfx: Graphics } {
  const n = uiNode("solid", parent, w, h);
  const g = n.addComponent(Graphics);
  g.fillColor = color;
  g.roundRect(-w / 2, -h / 2, w, h, 8);
  g.fill();
  return { node: n, gfx: g };
}

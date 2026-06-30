/**
 * 离线 `cc` 类型 shim —— 仅供本仓库 `tsc -p cocos/tsconfig.cocos.json` 做独立类型检查。
 *
 * 它不追求与引擎完全一致,只覆盖本工程脚本实际用到的 API 表面,用于在没有 Cocos
 * Creator 编辑器的环境里捕获自己代码里的低级错误(坐标运算、事件分发、状态机)。
 *
 * 在编辑器中打开工程时,编辑器使用它自动生成的真实 cc 类型;本 shim 位于 assets/
 * 之外,既不被编辑器编译,也不会与真实类型冲突。
 */
declare module "cc" {
  // ── 数学 ───────────────────────────────────────────────────────────
  export class Vec2 {
    x: number;
    y: number;
    constructor(x?: number, y?: number);
  }
  export class Vec3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    set(x: number | Vec3, y?: number, z?: number): this;
    clone(): Vec3;
    add(o: Vec3): this;
    multiplyScalar(s: number): this;
    static lerp(out: Vec3, a: Vec3, b: Vec3, t: number): Vec3;
    static distance(a: Vec3, b: Vec3): number;
    static ZERO: Readonly<Vec3>;
  }
  export class Quat {
    constructor(x?: number, y?: number, z?: number, w?: number);
    static fromEuler(out: Quat, x: number, y: number, z: number): Quat;
  }
  export class Color {
    r: number;
    g: number;
    b: number;
    a: number;
    constructor(r?: number, g?: number, b?: number, a?: number);
    clone(): Color;
    static WHITE: Readonly<Color>;
    static BLACK: Readonly<Color>;
    static RED: Readonly<Color>;
    static fromHEX(out: Color, hex: string): Color;
    static lerp(out: Color, a: Color, b: Color, t: number): Color;
  }
  export class Size {
    constructor(w?: number, h?: number);
    width: number;
    height: number;
  }
  export class Rect {
    constructor(x?: number, y?: number, w?: number, h?: number);
  }
  export namespace math {
    export function clamp(v: number, min: number, max: number): number;
    export function lerp(a: number, b: number, t: number): number;
    export function toRadian(deg: number): number;
  }
  export namespace geometry {
    export class Ray {
      o: Vec3;
      d: Vec3;
    }
  }

  // ── 节点 / 组件 ────────────────────────────────────────────────────
  export class Node {
    constructor(name?: string);
    name: string;
    active: boolean;
    parent: Node | null;
    children: Node[];
    position: Vec3;
    eulerAngles: Vec3;
    scale: Vec3;
    layer: number;
    addChild(child: Node): void;
    removeFromParent(): void;
    destroy(): boolean;
    setParent(parent: Node | null): void;
    setPosition(pos: Vec3): void;
    setPosition(x: number, y: number, z?: number): void;
    getPosition(out?: Vec3): Vec3;
    setScale(scale: Vec3): void;
    setScale(x: number, y: number, z?: number): void;
    setRotationFromEuler(x: number, y: number, z: number): void;
    worldPosition: Vec3;
    setWorldPosition(pos: Vec3): void;
    addComponent<T extends Component>(cls: new () => T): T;
    addComponent(cls: string): any;
    getComponent<T extends Component>(cls: new () => T): T | null;
    getComponent(cls: string): any;
    getChildByName(name: string): Node | null;
    on(type: string, cb: (...args: any[]) => void, target?: any): void;
    off(type: string, cb?: (...args: any[]) => void, target?: any): void;
  }

  export class Component {
    node: Node;
    enabled: boolean;
    addComponent<T extends Component>(cls: new () => T): T;
    getComponent<T extends Component>(cls: new () => T): T | null;
    schedule(cb: () => void, interval?: number): void;
    scheduleOnce(cb: () => void, delay?: number): void;
    unscheduleAllCallbacks(): void;
  }

  export class Scene extends Node {}

  // ── 渲染:3D ───────────────────────────────────────────────────────
  export class Mesh {}
  export class MeshRenderer extends Component {
    mesh: Mesh | null;
    setMaterial(material: Material | null, index: number): void;
    material: Material | null;
    shadowCastingMode: number;
    receiveShadow: number;
  }
  export namespace MeshRenderer {
    export enum ShadowCastingMode {
      OFF,
      ON,
    }
    export enum ShadowReceivingMode {
      OFF,
      ON,
    }
  }
  export class Material {
    initialize(info: { effectName?: string; technique?: number; defines?: Record<string, any> }): void;
    setProperty(name: string, value: any, index?: number): void;
    passes: any[];
  }
  export namespace primitives {
    export function box(opts?: { width?: number; height?: number; length?: number }): any;
    export function plane(opts?: { width?: number; length?: number; widthSegments?: number; lengthSegments?: number }): any;
    export function cylinder(radiusTop?: number, radiusBottom?: number, height?: number, opts?: any): any;
    export function sphere(radius?: number, opts?: any): any;
    export function torus(radius?: number, tube?: number, opts?: any): any;
  }
  export namespace utils {
    export function createMesh(geometry: any): Mesh;
  }

  export class Camera extends Component {
    projection: number;
    orthoHeight: number;
    fov: number;
    near: number;
    far: number;
    priority: number;
    visibility: number;
    clearFlags: number;
    clearColor: Color;
    screenPointToRay(x: number, y: number, out: geometry.Ray): geometry.Ray;
    convertToUINode(worldPos: Vec3, uiNode: Node, out?: Vec3): Vec3;
    worldToScreen(worldPos: Vec3, out?: Vec3): Vec3;
  }
  export namespace Camera {
    export enum ProjectionType {
      ORTHO,
      PERSPECTIVE,
    }
    export enum ClearFlag {
      SKYBOX,
      SOLID_COLOR,
      DEPTH_ONLY,
      DONT_CLEAR,
    }
  }
  export namespace gfx {
    export enum ClearFlagBit {
      NONE,
      COLOR,
      DEPTH,
      STENCIL,
      DEPTH_STENCIL,
      ALL,
    }
  }
  export class DirectionalLight extends Component {
    color: Color;
    illuminance: number;
    shadowEnabled: boolean;
  }
  export class AmbientLight extends Component {}

  // ── 渲染:2D / UI ──────────────────────────────────────────────────
  export class UITransform extends Component {
    width: number;
    height: number;
    contentSize: Size;
    anchorX: number;
    anchorY: number;
    setContentSize(size: Size): void;
    setContentSize(w: number, h: number): void;
    setAnchorPoint(x: number, y: number): void;
  }
  export class Canvas extends Component {
    cameraComponent: Camera | null;
    alignCanvasWithScreen: boolean;
  }
  export class Sprite extends Component {
    spriteFrame: SpriteFrame | null;
    color: Color;
    type: number;
    sizeMode: number;
  }
  export namespace Sprite {
    export enum Type {
      SIMPLE,
      SLICED,
    }
    export enum SizeMode {
      CUSTOM,
      TRIMMED,
      RAW,
    }
  }
  export class Label extends Component {
    string: string;
    fontSize: number;
    lineHeight: number;
    color: Color;
    horizontalAlign: number;
    verticalAlign: number;
    isBold: boolean;
    enableOutline: boolean;
    outlineColor: Color;
    outlineWidth: number;
  }
  export namespace Label {
    export enum HorizontalAlign {
      LEFT,
      CENTER,
      RIGHT,
    }
    export enum VerticalAlign {
      TOP,
      CENTER,
      BOTTOM,
    }
  }
  export class Graphics extends Component {
    lineWidth: number;
    strokeColor: Color;
    fillColor: Color;
    clear(): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    circle(x: number, y: number, r: number): void;
    rect(x: number, y: number, w: number, h: number): void;
    roundRect(x: number, y: number, w: number, h: number, r: number): void;
    arc(cx: number, cy: number, r: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void;
    close(): void;
    fill(): void;
    stroke(): void;
  }
  export class Widget extends Component {
    isAlignTop: boolean;
    isAlignBottom: boolean;
    isAlignLeft: boolean;
    isAlignRight: boolean;
    top: number;
    bottom: number;
    left: number;
    right: number;
    updateAlignment(): void;
  }
  export class Layout extends Component {
    type: number;
    resizeMode: number;
    spacingX: number;
    spacingY: number;
    paddingTop: number;
    paddingBottom: number;
    paddingLeft: number;
    paddingRight: number;
  }
  export namespace Layout {
    export enum Type {
      NONE,
      HORIZONTAL,
      VERTICAL,
      GRID,
    }
    export enum ResizeMode {
      NONE,
      CHILDREN,
      CONTAINER,
    }
  }
  export class Button extends Component {
    interactable: boolean;
    transition: number;
    target: Node;
  }
  export namespace Button {
    export enum EventType {
      CLICK = "click",
    }
  }
  export class SpriteFrame {
    texture: any;
    static createWithImage(img: ImageAsset | Texture2D): SpriteFrame;
  }
  export class Texture2D {
    reset(info: { width: number; height: number; format?: number }): void;
    uploadData(data: ArrayBufferView): void;
    image: ImageAsset | null;
  }
  export class ImageAsset {
    constructor(source: { width: number; height: number; _data: ArrayBufferView; format?: number } | any);
  }

  // ── 动画 ───────────────────────────────────────────────────────────
  export interface Tween<T> {
    to(duration: number, props: Partial<any>, opts?: { easing?: string | ((t: number) => number) }): Tween<T>;
    by(duration: number, props: Partial<any>, opts?: { easing?: string | ((t: number) => number) }): Tween<T>;
    delay(duration: number): Tween<T>;
    call(cb: () => void): Tween<T>;
    sequence(...args: Tween<T>[]): Tween<T>;
    parallel(...args: Tween<T>[]): Tween<T>;
    union(): Tween<T>;
    repeat(times: number, embed?: Tween<T>): Tween<T>;
    start(): Tween<T>;
    stop(): Tween<T>;
    clone(target?: T): Tween<T>;
  }
  export function tween<T>(target: T): Tween<T>;
  export namespace easing {
    export function smooth(t: number): number;
    export function quadOut(t: number): number;
    export function quadIn(t: number): number;
    export function cubicOut(t: number): number;
    export function backOut(t: number): number;
    export function sineInOut(t: number): number;
    export function expoOut(t: number): number;
  }

  // ── 输入 ───────────────────────────────────────────────────────────
  export class EventMouse {
    static BUTTON_LEFT: number;
    static BUTTON_RIGHT: number;
    getLocationX(): number;
    getLocationY(): number;
    getButton(): number;
    getLocation(out?: Vec2): Vec2;
  }
  export class EventTouch {
    getLocationX(): number;
    getLocationY(): number;
    getLocation(out?: Vec2): Vec2;
  }
  export const input: {
    on(type: string, cb: (event: any) => void, target?: any): void;
    off(type: string, cb?: (event: any) => void, target?: any): void;
  };
  export enum Input {
  }
  export namespace Input {
    export enum EventType {
      MOUSE_DOWN = "mouse-down",
      MOUSE_MOVE = "mouse-move",
      MOUSE_UP = "mouse-up",
      TOUCH_START = "touch-start",
      TOUCH_MOVE = "touch-move",
      TOUCH_END = "touch-end",
      KEY_DOWN = "key-down",
      KEY_UP = "key-up",
    }
  }

  // ── 系统 ───────────────────────────────────────────────────────────
  export const director: {
    getScene(): Scene | null;
    addPersistRootNode(node: Node): void;
  };
  export const screen: {
    windowSize: Size;
  };
  export const view: {
    getVisibleSize(): Size;
  };
  export const sys: {
    isNative: boolean;
  };
  export function find(path: string, referenceNode?: Node): Node | null;
  export function instantiate(original: Node): Node;
  export class Prefab {}
  export const Layers: {
    Enum: { DEFAULT: number; UI_2D: number; UI_3D: number; IGNORE_RAYCAST: number };
    BitMask: Record<string, number>;
    nameToLayer(name: string): number;
  };

  // ── 装饰器 ─────────────────────────────────────────────────────────
  export const _decorator: {
    ccclass(name?: string): (target: any) => void;
    property(options?: any): (target: any, propertyKey: string) => void;
    executeInEditMode: (target: any) => void;
  };
}

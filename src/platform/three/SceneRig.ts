import * as THREE from "three";
import { CoordMap } from "./CoordMap";

/**
 * Three.js 渲染骨架(整个生命周期只建一次,换关卡时 reframe):
 * WebGL 渲染器 + 倾斜俯视透视相机 + 方向光/环境光/半球光 + 阴影,
 * 以及世界点 → 屏幕像素的投影、屏幕点 → 棋盘格的反投影。
 */
export class SceneRig {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(42, 1.27, 0.1, 2000);
  readonly renderer: THREE.WebGLRenderer;
  readonly boardRoot = new THREE.Group();
  private readonly sun: THREE.DirectionalLight;
  private readonly pickPlane: THREE.Mesh;
  private readonly raycaster = new THREE.Raycaster();

  constructor(private canvas: HTMLCanvasElement) {
    this.scene.background = new THREE.Color("#0a0c11");
    this.scene.add(this.boardRoot);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.resize();

    this.scene.add(new THREE.HemisphereLight("#cdd7ff", "#202430", 0.55));
    this.scene.add(new THREE.AmbientLight("#ffffff", 0.35));
    this.sun = new THREE.DirectionalLight("#fff4e0", 2.4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.pickPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.pickPlane.rotation.x = -Math.PI / 2;
    this.scene.add(this.pickPlane);

    window.addEventListener("resize", () => this.resize());
  }

  /** 按当前关卡棋盘尺寸调整相机取景、光照与雾。 */
  reframe(coord: CoordMap): void {
    const span = Math.max(coord.worldWidth, coord.worldDepth);
    const pitch = THREE.MathUtils.degToRad(56);
    const dist = span * 1.15;
    this.camera.position.set(0, Math.sin(pitch) * dist, Math.cos(pitch) * dist);
    this.camera.lookAt(0, 0, 0);
    this.resize();

    this.sun.position.set(span * 0.6, span * 1.2, span * 0.5);
    const sc = this.sun.shadow.camera as THREE.OrthographicCamera;
    sc.left = -span;
    sc.right = span;
    sc.top = span;
    sc.bottom = -span;
    sc.near = 0.5;
    sc.far = span * 4;
    sc.updateProjectionMatrix();

    this.scene.fog = new THREE.Fog("#0a0c11", span * 1.4, span * 3.4);
  }

  /** 清空棋盘内容(换关卡)。 */
  clearBoard(): void {
    for (const c of [...this.boardRoot.children]) {
      this.boardRoot.remove(c);
      c.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose?.();
      });
    }
  }

  resize(): void {
    const w = this.canvas.clientWidth || 660;
    const h = this.canvas.clientHeight || 520;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  project(world: THREE.Vector3): { x: number; y: number } {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const v = world.clone().project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h };
  }

  pickWorld(canvasX: number, canvasY: number): THREE.Vector3 | null {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const ndc = new THREE.Vector2((canvasX / w) * 2 - 1, -(canvasY / h) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.intersectObject(this.pickPlane)[0];
    return hit ? hit.point : null;
  }
}

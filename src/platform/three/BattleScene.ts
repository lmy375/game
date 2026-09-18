import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { BattleState, LevelDef, Position } from '@core/index';
import type { OverlayVM } from '../../interaction';
import { Assets } from './Assets';
import { Character } from './Character';
import { CELL, cellWorld, worldCell, boardFitDistance } from './coordinates';
import { Timeline } from './Timeline';

const key = (p: Position): string => `${p.x},${p.y}`;
interface Floater { element: HTMLElement; point: THREE.Vector3; age: number; duration: number }
interface Fire { points: THREE.Points; origins: THREE.Vector3[]; phase: Float32Array }

export class BattleScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(36, 1, 0.1, 160);
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: OrbitControls;
  readonly timeline = new Timeline();
  readonly assets = new Assets();
  readonly actors = new Map<string, Character>();
  readonly labels = document.createElement('div');
  readonly world = new THREE.Group();
  readonly fx = new THREE.Group();
  private overlay = new THREE.Group();
  private props = new Map<string, THREE.Group>();
  private state?: BattleState;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private ao: SSAOPass;
  private environment: THREE.WebGLRenderTarget;
  private observer: ResizeObserver;
  private sun = new THREE.DirectionalLight(0xffe3b0, 3.4);
  private frame = 0;
  private previousTime = 0;
  private width = 1;
  private height = 1;
  private home = new THREE.Vector3();
  private fittedDistance = 1;
  private readonly homeDirection = new THREE.Vector3(0.43, 0.82, 0.79).normalize();
  private center = new THREE.Vector3();
  private raycaster = new THREE.Raycaster();
  private ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private ownedGeometries = new Set<THREE.BufferGeometry>();
  private ownedMaterials = new Set<THREE.Material>();
  private fires?: Fire;
  private flames: { mesh: THREE.Mesh; phase: number; height: number }[] = [];
  private floaters: Floater[] = [];
  private previews: { element: HTMLElement; point: THREE.Vector3 }[] = [];
  private gridVisible = true;
  private threatVisible = false;
  private lastOverlay?: OverlayVM;
  private disposed = false;
  private contextLost = false;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  onFrame?: () => void;

  constructor(readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.91;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.setAttribute('aria-label', '可旋转的三维战场；点击格子移动，拖动旋转，滚轮缩放');
    container.append(this.renderer.domElement);
    this.labels.className = 'world-labels';
    container.append(this.labels);
    this.scene.background = new THREE.Color(0x131e25);
    this.scene.fog = new THREE.FogExp2(0x131e25, 0.016);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.environment = pmrem.fromScene(room, 0.04);
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.42;
    room.dispose(); pmrem.dispose();
    this.sun.position.set(-8, 24, 12);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0003;
    this.sun.shadow.normalBias = 0.04;
    this.sun.shadow.radius = 3;
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 90;
    this.scene.add(this.sun, this.sun.target);
    this.scene.add(new THREE.HemisphereLight(0xbddff2, 0x534139, 1.35));
    const rim = new THREE.DirectionalLight(0x71cbdc, 2.3);
    rim.position.set(10, 12, -20);
    this.scene.add(rim, this.world, this.overlay, this.fx);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.09;
    this.controls.minPolarAngle = 0.25;
    this.controls.maxPolarAngle = Math.PI / 2.5;
    this.controls.maxDistance = 85;
    this.controls.minDistance = 8;
    this.controls.enablePan = false;
    this.controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: null as unknown as THREE.MOUSE };
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.ao = new SSAOPass(this.scene, this.camera, 1, 1, 12);
    this.ao.kernelRadius = 0.8;
    this.ao.minDistance = 0.002;
    this.ao.maxDistance = 0.15;
    this.composer.addPass(this.ao);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.24, 0.35, 1.1);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);
    this.resize();
    this.frame = requestAnimationFrame(this.draw);
  }

  get canvas(): HTMLCanvasElement { return this.renderer.domElement; }
  private handleContextLost = (event: Event): void => {
    event.preventDefault(); this.contextLost = true;
    const note = document.createElement('div'); note.className = 'context-note';
    note.textContent = '图形连接暂时中断，正在等待恢复…'; this.container.append(note);
  };
  private handleContextRestored = (): void => {
    // Recreate GPU-dependent environment/postprocessing resources through a clean reload.
    window.location.reload();
  };
  private resize(): void {
    this.width = Math.max(1, this.container.clientWidth);
    this.height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
    this.composer.setSize(this.width, this.height);
    if (this.state) {
      const direction = this.camera.position.clone().sub(this.controls.target).normalize();
      const zoom = this.camera.position.distanceTo(this.controls.target) / this.fittedDistance;
      this.fittedDistance = boardFitDistance(this.state.board.width, this.state.board.height, this.camera.aspect, this.camera.fov, direction);
      this.camera.position.copy(this.controls.target).addScaledVector(direction, this.fittedDistance * zoom);
      const homeDistance = boardFitDistance(this.state.board.width, this.state.board.height, this.camera.aspect, this.camera.fov, this.homeDirection);
      this.home.copy(this.center).addScaledVector(this.homeDirection, homeDistance);
      this.controls.maxDistance = Math.max(85, homeDistance * 1.6);
      (this.scene.fog as THREE.FogExp2).density = Math.min(0.016, 0.6 / homeDistance);
      this.controls.update();
    }
  }
  private draw = (time: number): void => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.draw);
    const delta = Math.min((time - (this.previousTime || time)) / 1000, 0.05);
    this.previousTime = time;
    if (document.hidden || this.contextLost) return;
    this.controls.update();
    this.camera.updateMatrixWorld(); // DOM labels and WebGL must use the same camera pose this frame.
    this.timeline.tick(delta);
    this.scene.updateMatrixWorld();
    for (const actor of this.actors.values()) actor.update(delta, this.camera, this.width, this.height);
    for (const preview of this.previews) this.projectLabel(preview.element, preview.point);
    for (const floater of [...this.floaters]) {
      floater.age += delta;
      const t = floater.age / floater.duration;
      this.projectLabel(floater.element, floater.point.clone().add(new THREE.Vector3(0, t * 1.6, 0)));
      floater.element.style.opacity = `${Math.min(1, (1 - t) * 3)}`;
      if (t >= 1) { floater.element.remove(); this.floaters.splice(this.floaters.indexOf(floater), 1); }
    }
    if (this.fires && !this.reducedMotion) {
      const positions = this.fires.points.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < positions.count; i++) {
        const phase = (time * 0.00065 + this.fires.phase[i]) % 1;
        const origin = this.fires.origins[Math.floor(i / 22)];
        const angle = i * 2.399 + phase;
        const radius = (1 - phase) * 0.45;
        positions.setXYZ(i, origin.x + Math.cos(angle) * radius, origin.y + 0.12 + phase * 1.15, origin.z + Math.sin(angle) * radius);
      }
      positions.needsUpdate = true;
    }
    for (const flame of this.flames) {
      const pulse = this.reducedMotion ? 1 : 0.88 + Math.sin(time * 0.008 + flame.phase) * 0.12;
      flame.mesh.scale.y = flame.height * pulse;
      flame.mesh.rotation.y = time * 0.0003 + flame.phase;
    }
    this.onFrame?.();
    this.composer.render();
  };

  private ownMesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
    this.ownedGeometries.add(geometry); this.ownedMaterials.add(material);
    const mesh = new THREE.Mesh(geometry, material); mesh.receiveShadow = true; mesh.castShadow = true; return mesh;
  }
  private clearLevel(): void {
    this.timeline.cancel();
    for (const actor of this.actors.values()) actor.dispose();
    this.actors.clear();
    this.world.clear(); this.fx.clear(); this.clearOverlay(); this.props.clear();
    this.ownedGeometries.forEach((g) => g.dispose()); this.ownedGeometries.clear();
    this.ownedMaterials.forEach((m) => m.dispose()); this.ownedMaterials.clear();
    this.floaters.forEach((f) => f.element.remove()); this.floaters = [];
    this.fires = undefined; this.flames = [];
  }

  setup(level: LevelDef, state: BattleState): void {
    this.clearLevel(); this.state = state;
    this.center.set((state.board.width - 1) * CELL / 2, 0, -(state.board.height - 1) * CELL / 2);
    const span = Math.max(state.board.width, state.board.height) * CELL;
    this.controls.target.copy(this.center);
    this.fittedDistance = boardFitDistance(state.board.width, state.board.height, this.camera.aspect, this.camera.fov, this.homeDirection);
    this.home.copy(this.center).addScaledVector(this.homeDirection, this.fittedDistance);
    this.controls.maxDistance = Math.max(85, this.fittedDistance * 1.6);
    (this.scene.fog as THREE.FogExp2).density = Math.min(0.016, 0.6 / this.fittedDistance);
    this.camera.position.copy(this.home); this.camera.lookAt(this.center); this.controls.update();
    this.sun.position.copy(this.center).add(new THREE.Vector3(-12, 24, 15));
    this.sun.target.position.copy(this.center);
    const shadow = this.sun.shadow.camera;
    shadow.left = shadow.bottom = -span * 0.8; shadow.right = shadow.top = span * 0.8;
    shadow.updateProjectionMatrix();
    const frozen = level.id === 'level_005';
    this.sun.color.set(frozen ? 0xcde8ff : 0xffe3b0);
    this.scene.background = new THREE.Color(frozen ? 0x1e303d : 0x131e25);

    // Each board cell is a real beveled masonry block, including exposed cliff sides.
    const foundationGeometry = new RoundedBoxGeometry(CELL * 0.985, 0.85, CELL * 0.985, 2, 0.06);
    this.ownedGeometries.add(foundationGeometry);
    const foundationMaterial = new THREE.MeshStandardMaterial({ color: frozen ? 0x5c717f : 0x686355, roughness: 0.95 });
    this.ownedMaterials.add(foundationMaterial);
    const cells: Position[] = [];
    state.board.forEachTile((p, terrain) => { if (terrain !== 'void') cells.push(p); });
    const foundations = new THREE.InstancedMesh(foundationGeometry, foundationMaterial, cells.length);
    foundations.receiveShadow = foundations.castShadow = true;
    const matrix = new THREE.Matrix4();
    cells.forEach((p, i) => {
      foundations.setMatrixAt(i, matrix.makeTranslation(p.x * CELL, -0.52, -p.y * CELL));
      foundations.setColorAt(i, new THREE.Color().setScalar(0.78 + this.noise(p.x, p.y) * 0.22));
    });
    this.world.add(foundations);
    const fireOrigins: THREE.Vector3[] = [];
    for (const p of cells) {
      const terrain = state.board.terrainAt(p);
      const variant = this.noise(p.x + 11, p.y + 7);
      const floor = this.assets.prop(variant > 0.92 ? 'floor_tile_small_weeds_A' : variant > 0.79 ? 'floor_tile_small_broken_A' : 'floor_tile_small', CELL * 0.976, 0.13);
      floor.position.copy(cellWorld(p, -0.12));
      floor.rotation.y = Math.floor(variant * 4) * Math.PI / 2;
      this.world.add(floor);
      if (terrain === 'wall') this.addProp('wall_broken', p, CELL * 0.96, 1.1);
      if (terrain === 'obstacle') this.addProp('barrel_large', p, 0.95, 1.05);
      if (terrain === 'trap') this.addProp('floor_tile_big_spikes', p, CELL * 0.86, 0.36);
      if (terrain === 'fire') {
        fireOrigins.push(cellWorld(p));
        const scorch = this.ownMesh(new THREE.CircleGeometry(0.57, 40), new THREE.MeshStandardMaterial({ color: 0x30201b, emissive: 0xff3700, emissiveIntensity: 0.36, roughness: 1 }));
        scorch.rotation.x = -Math.PI / 2; scorch.position.copy(cellWorld(p, 0.025)); this.world.add(scorch);
        const light = new THREE.PointLight(0xff752b, 3, 5, 2); light.position.copy(cellWorld(p, 0.7)); this.world.add(light);
      }
    }
    this.addScenery(state, fireOrigins);
    if (fireOrigins.length) this.buildFire(fireOrigins);
    const ground = this.ownMesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshStandardMaterial({ color: 0x17232b, roughness: 0.94, metalness: 0.13 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(this.center.x, -1.09, this.center.z); ground.castShadow = false;
    this.world.add(ground);
    for (const unit of state.units) {
      const actor = new Character(unit.instanceId, unit.defId, unit, this.assets, this.labels);
      this.actors.set(unit.instanceId, actor); this.world.add(actor.root);
    }
    this.sync(state);
  }

  private noise(x: number, y: number): number { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }
  private addProp(name: string, p: Position, width: number, height?: number): THREE.Group {
    const prop = this.assets.prop(name, width, height); prop.position.copy(cellWorld(p));
    this.world.add(prop); this.props.set(key(p), prop); return prop;
  }
  private addScenery(state: BattleState, fireOrigins: THREE.Vector3[]): void {
    // Ruined architecture sits outside playable cells, leaving every target readable.
    const w = state.board.width - 1, h = state.board.height - 1;
    for (const p of [{ x: -1.8, y: 1 }, { x: -1.8, y: h - 1 }, { x: w + 1.8, y: 1 }, { x: w + 1.8, y: h - 1 }]) {
      const pillar = this.assets.prop('pillar_decorated', 1.65, 3.1); pillar.position.copy(cellWorld(p, -1.06)); this.world.add(pillar);
      const torch = this.assets.prop('torch_mounted', 0.48, 0.8); torch.position.copy(cellWorld({ x: p.x, y: p.y - 0.45 }, 1.25)); this.world.add(torch);
      fireOrigins.push(cellWorld({ x: p.x, y: p.y - 0.45 }, 1.95));
      const light = new THREE.PointLight(0xffaa62, 3.5, 7, 2); light.position.copy(cellWorld({ x: p.x, y: p.y - 0.6 }, 2)); this.world.add(light);
    }
    for (let i = 0; i < 6; i++) {
      const wall = this.assets.prop(i % 3 === 0 ? 'wall_broken' : 'wall_half', CELL * 1.9, i % 3 === 0 ? 2.1 : 1.2);
      wall.position.copy(cellWorld({ x: w / 2 - 5 + i * 2, y: h + 2.4 }, -1.06));
      this.world.add(wall);
    }
    for (let i = 0; i < 7; i++) {
      const rubble = this.assets.prop('rubble_large', 1.4 + this.noise(i, 4) * 2.4);
      rubble.position.copy(cellWorld({ x: -1 + i * (w + 2) / 6, y: h + 1.6 + this.noise(i, 7) }, -1.08));
      rubble.rotation.y = this.noise(i, 3) * Math.PI * 2; this.world.add(rubble);
    }
    for (const [x, name] of [[-1.8, 'banner_blue'], [w + 1.8, 'banner_red']] as const) {
      const flag = this.assets.prop(name, 1.1, 1.7); flag.position.copy(cellWorld({ x, y: h - 0.5 }, 0.8)); this.world.add(flag);
    }
  }
  private buildFire(origins: THREE.Vector3[]): void {
    const count = origins.length * 22;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const colors = new Float32Array(count * 3); const phase = new Float32Array(count);
    for (let i = 0; i < count; i++) { const c = new THREE.Color(i % 3 === 0 ? 0xffd38c : 0xff651a); c.toArray(colors, i * 3); phase[i] = this.noise(i, 8); }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({ size: 0.17, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    // Circular soft sparks without a raster billboard asset.
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', 'float glow = max(0.0, 1.0 - length(gl_PointCoord - vec2(0.5)) * 2.0); gl_FragColor = vec4(outgoingLight * 2.0, diffuseColor.a * glow * glow);');
    };
    this.ownedGeometries.add(geometry); this.ownedMaterials.add(material);
    const points = new THREE.Points(geometry, material); points.frustumCulled = false; this.world.add(points);
    this.fires = { points, origins, phase };
    const flameGeometry = new THREE.SphereGeometry(0.28, 14, 14);
    const vertices = flameGeometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const t = (vertices.getY(i) + 0.28) / 0.56;
      vertices.setXYZ(i, vertices.getX(i) * (1 - t * 0.7) + t * t * 0.08, vertices.getY(i) + 0.28, vertices.getZ(i) * (1 - t * 0.7));
    }
    flameGeometry.computeVertexNormals(); this.ownedGeometries.add(flameGeometry);
    const outer = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff4f08).multiplyScalar(1.7), transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false });
    const inner = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc54d).multiplyScalar(2), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    this.ownedMaterials.add(outer); this.ownedMaterials.add(inner);
    for (const [index, origin] of origins.entries()) for (let layer = 0; layer < 3; layer++) {
      const flame = new THREE.Mesh(flameGeometry, layer === 1 ? inner : outer);
      const height = layer === 1 ? 1.1 : 1.45 + layer * 0.17;
      flame.position.copy(origin).add(new THREE.Vector3((layer - 1) * 0.13, 0.04, 0));
      flame.scale.set(layer === 1 ? 0.55 : 0.85, height, layer === 1 ? 0.55 : 0.85);
      this.world.add(flame); this.flames.push({ mesh: flame, phase: index * 1.71 + layer * 2.1, height });
    }
  }

  sync(state: BattleState): void {
    this.state = state;
    for (const unit of state.units) this.actors.get(unit.instanceId)?.sync(unit);
    for (const [position, prop] of this.props) {
      const [x, y] = position.split(',').map(Number);
      if (state.board.terrainAt({ x, y }) === 'ground') { prop.removeFromParent(); this.props.delete(position); }
    }
  }
  destroyObstacle(p: Position): void { this.props.get(key(p))?.removeFromParent(); this.props.delete(key(p)); }
  pick(clientX: number, clientY: number): Position | null {
    if (!this.state) return null;
    const rect = this.canvas.getBoundingClientRect();
    this.camera.updateMatrixWorld(); this.world.updateMatrixWorld(true);
    this.raycaster.setFromCamera(new THREE.Vector2((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1), this.camera);
    // Click the visible character as well as the floor underneath it.
    const roots: THREE.Object3D[] = [...this.actors.values()].filter((actor) => actor.root.visible).map((actor) => actor.root);
    for (const hit of this.raycaster.intersectObjects(roots, true)) {
      let visible = true;
      for (let node: THREE.Object3D | null = hit.object; node; node = node.parent) if (!node.visible) visible = false;
      if (!visible) continue;
      let parent = hit.object;
      while (parent.parent && !roots.includes(parent)) parent = parent.parent;
      if (roots.includes(parent)) return worldCell(parent.position);
    }
    const point = this.raycaster.ray.intersectPlane(this.ground, new THREE.Vector3());
    if (!point) return null;
    const p = worldCell(point);
    return this.state.board.terrainAt(p) !== 'void' ? p : null;
  }
  project(p: Position, height = 0): { x: number; y: number } {
    const projected = cellWorld(p, height).project(this.camera);
    return { x: (projected.x * 0.5 + 0.5) * this.width, y: (-projected.y * 0.5 + 0.5) * this.height };
  }
  resetCamera(): void { this.camera.position.copy(this.home); this.controls.target.copy(this.center); this.fittedDistance = this.home.distanceTo(this.center); this.controls.update(); }
  zoom(amount: number): void {
    const offset = this.camera.position.clone().sub(this.controls.target);
    offset.setLength(THREE.MathUtils.clamp(offset.length() * amount, this.controls.minDistance, this.controls.maxDistance));
    this.camera.position.copy(this.controls.target).add(offset); this.controls.update();
  }
  setQuality(high: boolean): void {
    this.ao.enabled = high; this.bloom.enabled = high; this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, high ? 1.75 : 1));
    this.renderer.shadowMap.enabled = high; this.resize();
  }
  toggleGrid(): boolean { this.gridVisible = !this.gridVisible; if (this.lastOverlay) this.showOverlay(this.lastOverlay); return this.gridVisible; }
  toggleThreat(): boolean { this.threatVisible = !this.threatVisible; if (this.lastOverlay) this.showOverlay(this.lastOverlay); return this.threatVisible; }

  private clearOverlay(): void {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    this.overlay.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        geometries.add(object.geometry);
        (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => materials.add(material));
      }
    });
    geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose());
    this.overlay.clear();
    this.previews.forEach((preview) => preview.element.remove()); this.previews = [];
  }
  showOverlay(vm: OverlayVM): void {
    this.lastOverlay = vm; this.clearOverlay();
    for (const [id, actor] of this.actors) actor.selected(id === vm.selectedUnitId);
    const tiles = (cells: Position[] | undefined, color: number, opacity: number, elevation: number, border = false): void => {
      if (!cells?.length) return;
      const geometry = border ? new THREE.EdgesGeometry(new THREE.PlaneGeometry(CELL * 0.88, CELL * 0.88)) : new THREE.PlaneGeometry(CELL * 0.91, CELL * 0.91);
      const material = border ? new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }) : new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
      for (const p of cells) {
        const tile = border ? new THREE.LineSegments(geometry, material) : new THREE.Mesh(geometry, material);
        tile.rotation.x = -Math.PI / 2; tile.position.copy(cellWorld(p, elevation)); tile.renderOrder = 2; this.overlay.add(tile);
      }
    };
    if (this.threatVisible) { tiles(vm.threatMoveCells, 0xde788b, 0.13, 0.023); tiles(vm.threatAttackCells, 0xba6179, 0.07, 0.025); }
    if (this.gridVisible) tiles(vm.moveCells, 0x75dccf, 0.2, 0.035);
    tiles(vm.enemyMoveCells, 0xef8176, 0.16, 0.038);
    tiles(vm.castCells, 0xdab87b, 0.16, 0.04);
    tiles(vm.hitArm, 0xff9f40, 0.42, 0.05); tiles(vm.hitCenter, 0xff6041, 0.55, 0.055);
    tiles(vm.finalBoxes, 0x9be8d9, 0.95, 0.065, true); tiles(vm.hazardWarn, 0xff5346, 1, 0.07, true);
    tiles(vm.originCell ? [vm.originCell] : [], 0xb2dfff, 0.8, 0.06, true);
    tiles(vm.hoverCell ? [vm.hoverCell] : [], 0xffe6b3, 1, 0.085, true);
    for (const arrow of vm.arrows ?? []) {
      const from = cellWorld(arrow.from, 0.16), to = cellWorld(arrow.to, 0.16), dir = to.clone().sub(from);
      if (dir.length() > 0.01) this.overlay.add(new THREE.ArrowHelper(dir.clone().normalize(), from, dir.length(), 0xf1deab, 0.28, 0.2));
    }
    for (const damage of vm.damage ?? []) {
      const element = document.createElement('div'); element.className = `damage-preview ${damage.lethal ? 'lethal' : ''}`;
      element.textContent = `${damage.kind === 'heal' ? '+' : '−'}${damage.amount}${damage.lethal ? ' · 击杀' : ''}`;
      this.labels.append(element); this.previews.push({ element, point: cellWorld(damage.pos, 2.9) });
    }
  }
  private projectLabel(element: HTMLElement, point: THREE.Vector3): void {
    const p = point.clone().project(this.camera);
    element.style.transform = `translate(-50%, -50%) translate(${(p.x * 0.5 + 0.5) * this.width}px, ${(-p.y * 0.5 + 0.5) * this.height}px)`;
  }
  float(point: THREE.Vector3, text: string, color = '#ffe0a4'): void {
    const element = document.createElement('div'); element.className = 'damage-float'; element.textContent = text; element.style.color = color;
    this.labels.append(element); this.floaters.push({ element, point: point.clone().add(new THREE.Vector3(0, 2.2, 0)), age: 0, duration: 1.2 });
  }

  async burst(point: THREE.Vector3, color: number, radius = 1.2): Promise<void> {
    const count = this.reducedMotion ? 12 : 44;
    const geometry = new THREE.BufferGeometry(); const positions = new Float32Array(count * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color, size: 0.09, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    const particles = new THREE.Points(geometry, material); particles.position.copy(point); this.fx.add(particles);
    const ringMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const ringGeometry = new THREE.TorusGeometry(radius, 0.035, 8, 64);
    const ring = new THREE.Mesh(ringGeometry, ringMaterial); ring.rotation.x = Math.PI / 2; ring.position.copy(point).y += 0.08; this.fx.add(ring);
    const light = new THREE.PointLight(color, 9, radius * 4); light.position.copy(point).y += 0.65; this.fx.add(light);
    await this.timeline.animate(0.58, (t) => {
      for (let i = 0; i < count; i++) {
        const angle = i * 2.399; const spread = Math.sqrt(i / count) * radius * t * 2;
        positions[i * 3] = Math.cos(angle) * spread; positions[i * 3 + 1] = Math.sin(t * Math.PI) * (0.3 + this.noise(i, 2) * 1.8); positions[i * 3 + 2] = Math.sin(angle) * spread;
      }
      geometry.attributes.position.needsUpdate = true; material.opacity = 1 - t;
      ring.scale.setScalar(0.2 + t * 1.3); ringMaterial.opacity = (1 - t) * 0.8; light.intensity = 9 * (1 - t);
    });
    particles.removeFromParent(); ring.removeFromParent(); light.removeFromParent();
    geometry.dispose(); material.dispose(); ringGeometry.dispose(); ringMaterial.dispose();
  }
  async projectile(from: THREE.Vector3, to: THREE.Vector3, color: number): Promise<void> {
    const geometry = new THREE.SphereGeometry(0.12, 16, 12);
    const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 4, roughness: 0.25 });
    const bolt = new THREE.Mesh(geometry, material); const light = new THREE.PointLight(color, 3, 3); bolt.add(light); this.fx.add(bolt);
    await this.timeline.animate(0.3, (t) => { bolt.position.lerpVectors(from, to, t); bolt.position.y += Math.sin(t * Math.PI) * 0.55; });
    bolt.removeFromParent(); geometry.dispose(); material.dispose();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; cancelAnimationFrame(this.frame); this.clearLevel(); this.observer.disconnect();
    this.controls.dispose(); this.bloom.dispose(); this.composer.passes.forEach((pass) => { if (pass !== this.bloom) pass.dispose(); }); this.composer.dispose();
    this.environment.dispose(); this.assets.dispose(); this.sun.shadow.dispose(); this.renderer.dispose();
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost); this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    this.canvas.remove(); this.labels.remove();
  }
}

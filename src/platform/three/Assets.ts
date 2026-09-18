import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

const urls = import.meta.glob<string>('./assets/**/*.glb', { eager: true, query: '?url', import: 'default' });

/** Templates own shared geometry/textures. Instances own only their skeleton and materials. */
export class Assets {
  private models = new Map<string, GLTF>();

  async load(progress: (fraction: number) => void): Promise<void> {
    const loader = new GLTFLoader();
    let done = 0;
    const results = await Promise.allSettled(Object.entries(urls).map(async ([path, url]) => {
      const gltf = await loader.loadAsync(url);
      gltf.scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.castShadow = true;
        object.receiveShadow = true;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          if (material instanceof THREE.MeshStandardMaterial) {
            material.roughness = 0.78;
            material.metalness = 0.08;
          }
        }
      });
      this.models.set(path.split('/').pop()!.replace('.glb', ''), gltf);
      progress(++done / Object.keys(urls).length);
    }));
    // Wait for every in-flight load before startup cleanup so late requests cannot leak GPU assets.
    const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    if (failure) throw failure.reason;
  }

  get(name: string): GLTF {
    const asset = this.models.get(name);
    if (!asset) throw new Error(`缺少 3D 资源：${name}`);
    return asset;
  }

  character(name: string): THREE.Object3D { return clone(this.get(name).scene); }

  prop(name: string, width: number, height?: number): THREE.Group {
    const model = this.get(name).scene.clone(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const scale = width / Math.max(size.x, size.z);
    model.scale.setScalar(scale);
    if (height !== undefined) model.scale.y = height / size.y;
    const center = box.getCenter(new THREE.Vector3());
    model.position.set(-center.x * scale, -box.min.y * model.scale.y, -center.z * scale);
    const group = new THREE.Group();
    group.add(model);
    return group;
  }

  dispose(): void {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    for (const gltf of this.models.values()) gltf.scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      geometries.add(obj.geometry);
      for (const mat of Array.isArray(obj.material) ? obj.material : [obj.material]) {
        materials.add(mat);
        for (const value of Object.values(mat)) if (value instanceof THREE.Texture) textures.add(value);
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    this.models.clear();
  }
}

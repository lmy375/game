import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Matrix4, PerspectiveCamera, Plane, Raycaster, Vector2, Vector3 } from 'three';
import { cellWorld, worldCell, facingAngle, angleTo, CELL, boardFitDistance } from '../src/platform/three/coordinates';
import { Timeline } from '../src/platform/three/Timeline';
import { characterStyles } from '../src/platform/three/Character';
import { levels, createRegistry } from '../src/game-data';
import { loadLevel } from '../src/game-core';

const root = resolve('src/platform/three/assets');
interface Gltf { asset: { version: string }; scenes: { nodes: number[] }[]; nodes: { name?: string; skin?: number }[]; skins?: { joints: number[] }[]; animations?: { name: string; channels: unknown[] }[]; meshes: { primitives: { attributes: Record<string, number> }[] }[]; buffers?: { uri?: string }[]; images?: { uri?: string; bufferView?: number }[] }
function glb(path: string): Gltf {
  const data = readFileSync(path);
  expect(data.toString('utf8', 0, 4)).toBe('glTF');
  expect(data.readUInt32LE(8)).toBe(data.length);
  return JSON.parse(data.toString('utf8', 20, 20 + data.readUInt32LE(12))) as Gltf;
}

describe('Three.js presentation contract', () => {
  it('covers every character used throughout the campaign with authored assets', () => {
    const registry = createRegistry();
    for (const level of levels) for (const unit of loadLevel(level, registry).units) {
      const style = characterStyles[unit.defId];
      expect(style, unit.defId).toBeDefined();
      const data = glb(resolve(root, 'models', `${style.model}.glb`));
      const nodes = new Set(data.nodes.map((node) => node.name));
      for (const weapon of style.weapons) expect(nodes.has(weapon), `${style.model}: ${weapon}`).toBe(true);
    }
  });
  it('ships real skinning and authored movement, attack, hit and death animations for every model', () => {
    const required = ['Idle', 'Walking_A', 'Spellcast_Shoot', 'Spellcast_Raise', 'Hit_A', 'Hit_B', 'Death_A', 'Block_Hit', '2H_Ranged_Shoot', '1H_Melee_Attack_Slice_Horizontal', '2H_Melee_Attack_Stab', '2H_Melee_Attack_Spin'];
    for (const file of readdirSync(resolve(root, 'models'))) {
      const data = glb(resolve(root, 'models', file));
      expect(data.skins?.some((skin) => skin.joints.length > 20), file).toBe(true);
      expect(data.meshes.some((mesh) => mesh.primitives.some((primitive) => 'JOINTS_0' in primitive.attributes && 'WEIGHTS_0' in primitive.attributes)), file).toBe(true);
      for (const name of required) expect(data.animations?.find((clip) => clip.name === name)?.channels.length, `${file}: ${name}`).toBeGreaterThan(20);
    }
  });
  it('keeps GLB resources self-contained so the built game does not require third-party CDNs', () => {
    for (const dir of ['models', 'environment']) for (const file of readdirSync(resolve(root, dir))) {
      const data = glb(resolve(root, dir, file));
      for (const buffer of data.buffers ?? []) expect(buffer.uri).toBeUndefined();
      for (const image of data.images ?? []) expect(image.bufferView).toBeTypeOf('number');
    }
    expect(readFileSync(resolve(root, 'licenses/KayKit-Adventurers.txt'), 'utf8')).toContain('commercial');
    expect(readFileSync(resolve(root, 'licenses/KayKit-Dungeon.txt'), 'utf8')).toContain('CC0');
  });
});

describe('3D board picking', () => {
  it('fits full boards and tall characters in narrow and landscape viewports', () => {
    const direction = new Vector3(0.43, 0.82, 0.79).normalize();
    for (const aspect of [0.48, 0.77, 1.5, 2.5]) for (const [width, height] of [[14, 10], [15, 13], [25, 8]]) {
      const camera = new PerspectiveCamera(36, aspect, 0.1, 250);
      camera.position.copy(direction).multiplyScalar(boardFitDistance(width, height, aspect, 36, direction));
      camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
      for (const x of [-width * CELL / 2, width * CELL / 2]) for (const z of [-height * CELL / 2, height * CELL / 2]) for (const y of [-1.1, 3.3]) {
        const projected = new Vector3(x, y, z).project(camera);
        expect(Math.abs(projected.x)).toBeLessThan(1);
        expect(Math.abs(projected.y)).toBeLessThan(1);
      }
    }
  });
  it('projects and picks every cell consistently after rotation, zoom and portrait resizing', () => {
    for (const aspect of [0.55, 1, 1.8, 2.5]) for (const angle of [0, 0.7, 2.2, 4.3]) {
      const camera = new PerspectiveCamera(36, aspect, 0.1, 160);
      const center = cellWorld({ x: 6, y: 5 });
      camera.position.copy(center).add(new Vector3(Math.sin(angle) * 28, 30, Math.cos(angle) * 28));
      camera.lookAt(center); camera.updateMatrixWorld();
      const raycaster = new Raycaster(); const ground = new Plane(new Vector3(0, 1, 0), 0);
      for (let x = 0; x < 14; x++) for (let y = 0; y < 11; y++) {
        const projected = cellWorld({ x, y }).project(camera);
        raycaster.setFromCamera(new Vector2(projected.x, projected.y), camera);
        const point = raycaster.ray.intersectPlane(ground, new Vector3())!;
        expect(worldCell(point)).toEqual({ x, y });
      }
    }
  });
  it('maps direction-based attacks to the same world axes as movement', () => {
    for (const [direction, offset] of Object.entries({ up: { x: 0, y: 1 }, down: { x: 0, y: -1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } })) {
      const target = cellWorld(offset).normalize();
      const forward = new Vector3(0, 0, 1).applyMatrix4(new Matrix4().makeRotationY(facingAngle[direction as keyof typeof facingAngle]));
      expect(forward.distanceTo(target)).toBeLessThan(1e-8);
      expect(Math.abs(Math.sin(angleTo(new Vector3(), cellWorld(offset)) - facingAngle[direction as keyof typeof facingAngle]))).toBeLessThan(1e-8);
    }
    expect(cellWorld({ x: 1, y: 0 }).length()).toBe(CELL);
  });
});

describe('animation lifetime', () => {
  it('settles cancelled animation promises without allowing old writes into a new level', async () => {
    const timeline = new Timeline(); const frames: number[] = [];
    const old = timeline.animate(1, (t) => frames.push(t));
    timeline.tick(0.25); timeline.cancel();
    expect(await old).toBe(false);
    const stopped = [...frames];
    const next = timeline.animate(0.5);
    timeline.tick(0.5);
    expect(await next).toBe(true);
    expect(frames).toEqual(stopped);
  });
  it('resolves simultaneous VFX in the same frame and clamps overshoot', async () => {
    const timeline = new Timeline(); let last = 0;
    const first = timeline.animate(0.2, (t) => { last = t; });
    const second = timeline.animate(0.3);
    timeline.tick(1);
    expect(await Promise.all([first, second])).toEqual([true, true]);
    expect(last).toBe(1);
  });
});

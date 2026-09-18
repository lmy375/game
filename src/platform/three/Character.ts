import * as THREE from 'three';
import type { Unit } from '@core/index';
import { Assets } from './Assets';
import { cellWorld, facingAngle, angleTo } from './coordinates';

export interface CharacterStyle { model: string; weapons: string[]; tint: number; accent: string; height: number }
export const characterStyles: Record<string, CharacterStyle> = {
  fire_mage: { model: 'Mage', weapons: ['2H_Staff', 'Spellbook_open'], tint: 0xffc7a0, accent: '#ffb16f', height: 2.5 },
  wind_mage: { model: 'Mage', weapons: ['1H_Wand', 'Spellbook_open'], tint: 0x92ffcf, accent: '#7de2be', height: 2.5 },
  ice_mage: { model: 'Mage', weapons: ['2H_Staff'], tint: 0xa6d9ff, accent: '#91d7ff', height: 2.5 },
  swordsman: { model: 'Knight', weapons: ['1H_Sword', 'Badge_Shield'], tint: 0xa8daff, accent: '#89ccff', height: 2.35 },
  lancer: { model: 'Knight', weapons: ['2H_Sword'], tint: 0xe1d2a2, accent: '#f0d99b', height: 2.4 },
  enemy_soldier: { model: 'Barbarian', weapons: ['1H_Axe', 'Barbarian_Round_Shield'], tint: 0xe9a39c, accent: '#f28b81', height: 2.3 },
  enemy_archer: { model: 'Rogue_Hooded', weapons: ['2H_Crossbow'], tint: 0xe6acb8, accent: '#f28b81', height: 2.25 },
  enemy_heavy: { model: 'Knight', weapons: ['2H_Sword', 'Rectangle_Shield'], tint: 0xe8a594, accent: '#f28b81', height: 2.55 },
};
const accessories = new Set(['1H_Sword_Offhand', 'Badge_Shield', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield', '1H_Sword', '2H_Sword', 'Spellbook', 'Spellbook_open', '1H_Wand', '2H_Staff', '1H_Axe_Offhand', 'Barbarian_Round_Shield', '1H_Axe', '2H_Axe', 'Mug', 'Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable']);

export class Character {
  readonly root = new THREE.Group();
  readonly model: THREE.Object3D;
  readonly mixer: THREE.AnimationMixer;
  readonly label = document.createElement('div');
  readonly style: CharacterStyle;
  private hpFill = document.createElement('i');
  private hpText = document.createElement('small');
  private clips: THREE.AnimationClip[];
  private current?: THREE.AnimationAction;
  private currentName = '';
  private materials: THREE.MeshStandardMaterial[] = [];
  private selection: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private dead = false;
  private maxHp: number;

  constructor(readonly unitId: string, readonly defId: string, unit: Unit, assets: Assets, labels: HTMLElement) {
    this.style = characterStyles[defId];
    this.maxHp = unit.maxHp;
    this.model = assets.character(this.style.model);
    this.model.traverse((object) => {
      if (accessories.has(object.name)) object.visible = this.style.weapons.includes(object.name);
      if (!(object instanceof THREE.Mesh)) return;
      const copy = (mat: THREE.Material): THREE.Material => {
        const result = mat.clone();
        if (result instanceof THREE.MeshStandardMaterial) {
          result.color.multiply(new THREE.Color(this.style.tint));
          result.roughness = this.style.model === 'Knight' ? 0.46 : 0.82;
          result.metalness = this.style.model === 'Knight' ? 0.38 : 0.06;
          this.materials.push(result);
        }
        return result;
      };
      object.material = Array.isArray(object.material) ? object.material.map(copy) : copy(object.material);
      object.frustumCulled = false; // Animated bounds differ from the exported bind pose.
    });
    this.clips = assets.get(this.style.model).animations;
    this.mixer = new THREE.AnimationMixer(this.model);
    this.play('Idle');
    this.mixer.update(0);
    const bounds = new THREE.Box3();
    this.model.updateMatrixWorld(true);
    this.model.traverseVisible((object) => {
      if (object instanceof THREE.Mesh && !accessories.has(object.name)) bounds.union(new THREE.Box3().setFromObject(object));
    });
    const height = bounds.max.y - bounds.min.y;
    this.model.scale.setScalar(this.style.height / height);
    this.model.position.y = -bounds.min.y * this.model.scale.y;
    this.root.add(this.model);
    this.root.position.copy(cellWorld(unit.pos));
    this.root.rotation.y = facingAngle[unit.facing];
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.48, 0.53, 64), new THREE.MeshBasicMaterial({ color: unit.faction === 'player' ? 0x7be7d6 : 0xf58376, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.045;
    this.selection = ring;
    this.root.add(ring);
    this.label.className = `actor-label ${unit.faction}`;
    this.label.style.setProperty('--actor-color', this.style.accent);
    const name = document.createElement('span');
    name.textContent = unit.name;
    const bar = document.createElement('div');
    bar.className = 'actor-health';
    bar.append(this.hpFill);
    this.label.append(name, this.hpText, bar);
    labels.append(this.label);
    this.setHp(unit.hp);
    this.mixer.update((unit.pos.x * 0.37 + unit.pos.y * 0.19) % 1.5);
  }

  play(name: string, once = false): number {
    const clip = this.clips.find((clip) => clip.name === name) ?? this.clips.find((clip) => clip.name === 'Idle')!;
    if (name === this.currentName && !once) return clip.duration;
    const next = this.mixer.clipAction(clip);
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    next.clampWhenFinished = once;
    next.play();
    if (this.current && this.current !== next) next.crossFadeFrom(this.current, 0.16, false);
    this.current = next;
    this.currentName = name;
    return clip.duration;
  }

  face(point: THREE.Vector3): void { this.root.rotation.y = angleTo(this.root.position, point); }
  setHp(hp: number): void {
    this.hpFill.style.width = `${Math.max(0, hp / this.maxHp) * 100}%`;
    this.hpText.textContent = `${Math.max(0, hp)} / ${this.maxHp}`;
  }
  selected(on: boolean): void {
    this.label.classList.toggle('selected', on);
    this.selection.material.opacity = on ? 1 : 0.52;
    this.selection.scale.setScalar(on ? 1.2 : 1);
  }
  sync(unit: Unit): void {
    this.maxHp = unit.maxHp;
    this.setHp(unit.hp);
    this.root.position.copy(cellWorld(unit.pos));
    this.root.rotation.y = facingAngle[unit.facing];
    this.root.visible = unit.hp > 0;
    this.label.hidden = unit.hp <= 0;
    if (unit.hp > 0) { this.dead = false; this.play('Idle'); }
    const status = unit.statuses.map((s) => ({ burn: '燃烧', stun: '眩晕', vulnerable: '破防' })[s.id]).join(' · ');
    this.label.dataset.status = status;
  }
  flash(t: number, heal = false): void {
    for (const material of this.materials) {
      material.emissive.set(heal ? 0x3fa378 : 0xff5833);
      material.emissiveIntensity = Math.sin(t * Math.PI) * 0.7;
    }
  }
  die(): number { this.dead = true; return this.play('Death_A', true); }
  update(delta: number, camera: THREE.Camera, width: number, height: number): void {
    this.mixer.update(delta);
    if (!this.root.visible) { this.label.hidden = true; return; }
    const p = this.root.position.clone().add(new THREE.Vector3(0, this.style.height + 0.3, 0)).project(camera);
    this.label.hidden = this.dead || p.z > 1 || p.z < -1 || Math.abs(p.x) > 1.1 || Math.abs(p.y) > 1.1;
    this.label.style.transform = `translate(-50%, -100%) translate(${(p.x * 0.5 + 0.5) * width}px, ${(-p.y * 0.5 + 0.5) * height}px)`;
  }
  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
    this.model.traverse((obj) => { if (obj instanceof THREE.SkinnedMesh) obj.skeleton.dispose(); });
    this.materials.forEach((m) => m.dispose());
    this.selection.geometry.dispose(); this.selection.material.dispose();
    this.label.remove(); this.root.removeFromParent();
  }
}

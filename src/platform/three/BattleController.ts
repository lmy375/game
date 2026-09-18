import * as THREE from 'three';
import { loadLevel, type BattleState, type LevelDef, type Position, type BattleEvent, type ContentRegistry } from '@core/index';
import { BattleSession, type BattleSessionHooks, type SessionHost, type ViewModel, type ApplyOpts, type UnitStatPatch } from '../../interaction';
import { DomHud, type HudEls } from '../pixi/DomHud';
import { BattleScene } from './BattleScene';
import { cellWorld } from './coordinates';

/** Three.js is an event-driven presentation adapter; battle rules remain in BattleSession. */
export class BattleController {
  private session?: BattleSession;
  private hud: DomHud;
  private epoch = 0;
  private campaign = false;
  private abort = new AbortController();
  private menuAnchor?: Position;
  private pointer?: { x: number; y: number; id: number; dragged: boolean };
  private pointers = new Set<number>();
  private lastHover = '';
  private currentVm?: ViewModel;

  constructor(private registry: ContentRegistry, readonly stage: BattleScene, private els: HudEls) {
    this.hud = new DomHud(els, {
      selectSkill: (id) => this.session?.selectSkill(id), selectItem: (id) => this.session?.selectItem(id),
      undoMove: () => this.session?.undoMove(), endTurn: () => this.session?.endActiveUnit(),
      rest: () => this.session?.rest(), openLoadout: () => this.session?.openLoadout(),
      confirm: () => void this.session?.confirm(), cancel: () => this.session?.cancel(),
      restart: () => { const level = this.level; if (level) this.load(level); },
    }, (menu, anchor) => { this.menuAnchor = anchor; this.positionMenu(menu, anchor); });
    this.bindInput();
    stage.onFrame = () => {
      if (this.menuAnchor && this.els.menu.style.display !== 'none') this.positionMenu(this.els.menu, this.menuAnchor);
    };
  }
  private level?: LevelDef;
  get state(): BattleState { return this.session!.getState(); }
  get viewModel(): ViewModel | undefined { return this.currentVm; }
  preview(level: LevelDef): void { this.stage.setup(level, loadLevel(level, this.registry)); }
  load(level: LevelDef): void { this.start(level, false); }
  loadCampaignBattle(state: BattleState, level: LevelDef, hooks: Omit<BattleSessionHooks, 'buildState'>): void {
    this.start(level, true, { buildState: () => state, ...hooks });
  }
  private start(level: LevelDef, campaign: boolean, hooks: BattleSessionHooks = {}): void {
    const epoch = ++this.epoch;
    this.level = level; this.campaign = campaign; this.currentVm = undefined; this.lastHover = '';
    // Detached sessions may finish a pending promise, but cannot paint or advance the new campaign.
    const guardedHooks: BattleSessionHooks = { ...hooks };
    if (hooks.onItemConsumed) guardedHooks.onItemConsumed = (id) => { if (epoch === this.epoch) hooks.onItemConsumed!(id); };
    if (hooks.onOpenLoadout) guardedHooks.onOpenLoadout = () => { if (epoch === this.epoch) hooks.onOpenLoadout!(); };
    if (hooks.onEnd) guardedHooks.onEnd = (...args) => { if (epoch === this.epoch) hooks.onEnd!(...args); };
    const host: SessionHost = {
      animates: true,
      setupLevel: (def, state) => {
        if (epoch !== this.epoch) return;
        this.stage.setup(def, state);
        document.getElementById('level-name')!.textContent = def.name;
        document.getElementById('level-number')!.textContent = `CHAPTER ${def.id.slice(-3)}`;
      },
      render: (vm) => { if (epoch === this.epoch) this.render(vm); },
      applyEvents: (events, opts, state) => epoch === this.epoch ? this.applyEvents(events, opts, state, epoch) : undefined,
      delay: async (sec) => { if (epoch === this.epoch) await this.stage.timeline.animate(sec); },
      log: (msg) => { if (epoch === this.epoch) this.hud.log(msg); },
      clearLog: () => { if (epoch === this.epoch) this.hud.clearLog(); },
    };
    this.session = new BattleSession(this.registry, host, guardedHooks);
    this.session.load(level);
  }
  updateUnitStats(patches: UnitStatPatch[]): void { this.session?.applyStatPatches(patches); }
  tapCell(p: Position): void { this.session?.tapCell(p); }
  selectSkill(id: string): void { this.session?.selectSkill(id); }
  confirm(): void { void this.session?.confirm(); }
  undoMove(): void { this.session?.undoMove(); }
  endActiveUnit(): void { this.session?.endActiveUnit(); }
  suspend(): void {
    ++this.epoch; this.stage.timeline.cancel(); this.session = undefined; this.currentVm = undefined;
    this.els.menu.style.display = 'none'; this.els.confirmBar.style.display = 'none';
    this.stage.showOverlay({});
  }
  private render(vm: ViewModel): void {
    this.currentVm = vm;
    this.stage.showOverlay(vm.overlay);
    if (!vm.busy) this.stage.sync(vm.state);
    this.hud.render(this.campaign && vm.banner ? { ...vm, banner: null } : vm);
    const active = vm.state.units.find((u) => u.instanceId === vm.state.activeUnitId);
    document.getElementById('active-name')!.textContent = active?.name ?? '战斗结束';
    document.getElementById('active-status')!.textContent = vm.busy ? '行动演绎中' : active?.faction === 'enemy' ? '敌方行动' : '选择落点或技能';
    document.getElementById('alive-count')!.textContent = `${vm.state.units.filter((u) => u.faction === 'enemy' && u.hp > 0).length} 名敌军`;
  }
  private async applyEvents(events: BattleEvent[], opts: ApplyOpts, state: BattleState, epoch: number): Promise<void> {
    if (opts.resetActor) this.stage.actors.get(opts.resetActor.id)?.root.position.copy(cellWorld(opts.resetActor.fromPos));
    for (const event of events) {
      if (epoch !== this.epoch) return;
      await this.event(event, events, epoch);
    }
    if (epoch === this.epoch) this.stage.sync(state);
  }
  private async event(event: BattleEvent, events: BattleEvent[], epoch: number): Promise<void> {
    const stage = this.stage;
    const actor = 'unitId' in event && event.unitId ? stage.actors.get(event.unitId) : undefined;
    switch (event.type) {
      case 'unit_moved': {
        if (!actor) return;
        actor.play('Walking_A');
        for (let i = 1; i < event.path.length; i++) {
          if (epoch !== this.epoch) return;
          const from = cellWorld(event.path[i - 1]), to = cellWorld(event.path[i]);
          actor.face(to);
          await stage.timeline.animate(0.26, (t) => actor.root.position.lerpVectors(from, to, t));
        }
        actor.play('Idle'); return;
      }
      case 'skill_cast': {
        const caster = stage.actors.get(event.casterId); if (!caster) return;
        const hit = events.find((e) => e.type === 'unit_damaged');
        const targetActor = hit?.type === 'unit_damaged' ? stage.actors.get(hit.unitId) : undefined;
        const target = event.targetCell ? cellWorld(event.targetCell) : targetActor?.root.position.clone() ?? caster.root.position.clone();
        if (caster.root.position.distanceTo(target) > 0.1) caster.face(target);
        const magic = caster.defId.includes('mage');
        const ranged = caster.defId === 'enemy_archer';
        const animation = magic ? 'Spellcast_Shoot' : ranged ? '2H_Ranged_Shoot' : event.skillId.includes('whirlwind') ? '2H_Melee_Attack_Spin' : caster.defId === 'lancer' ? '2H_Melee_Attack_Stab' : '1H_Melee_Attack_Slice_Horizontal';
        const duration = caster.play(animation, true);
        const color = event.skillId.includes('swap') ? 0xba94ff : caster.defId === 'ice_mage' ? 0x80d8ff : caster.defId === 'wind_mage' ? 0x77ead1 : magic ? 0xff8b3e : 0xffdcb0;
        await stage.timeline.animate(Math.min(duration * 0.4, 0.42));
        if (epoch !== this.epoch) return;
        if (magic || ranged) await stage.projectile(caster.root.position.clone().add(new THREE.Vector3(0, 1.3, 0)), target.clone().add(new THREE.Vector3(0, 0.65, 0)), color);
        if (epoch !== this.epoch) return;
        const targets = new Map<string, THREE.Vector3>();
        targets.set(`${target.x},${target.z}`, target);
        for (const e of events) if (e.type === 'unit_damaged' || e.type === 'unit_displaced') {
          const unit = stage.actors.get(e.unitId); if (unit) targets.set(`${unit.root.position.x},${unit.root.position.z}`, unit.root.position.clone());
        }
        await Promise.all([...targets.values()].map((p) => stage.burst(p, color, magic ? 1.15 : 0.6)));
        caster.play('Idle'); return;
      }
      case 'unit_displaced': {
        if (!actor) return;
        const from = actor.root.position.clone(), to = cellWorld(event.to);
        actor.play(event.reason === 'swap' ? 'Spellcast_Raise' : 'Hit_B', true);
        await stage.timeline.animate(0.34, (t) => {
          actor.root.position.lerpVectors(from, to, 1 - (1 - t) ** 3);
          actor.root.position.y += Math.sin(t * Math.PI) * 0.28;
        }); actor.play('Idle'); return;
      }
      case 'unit_damaged': case 'collision_damage': case 'unit_healed': {
        if (!actor) return;
        const heal = event.type === 'unit_healed';
        actor.setHp(event.hpAfter); if (!heal) actor.play('Hit_A', true);
        stage.float(actor.root.position, `${heal ? '+' : '−'}${event.amount}`, heal ? '#91eabd' : '#ffe0a4');
        await stage.timeline.animate(0.28, (t) => actor.flash(t, heal));
        actor.play('Idle'); return;
      }
      case 'unit_died':
        if (actor) { const duration = actor.die(); await stage.timeline.animate(Math.min(duration, 1.2)); actor.root.visible = false; }
        return;
      case 'obstacle_destroyed': stage.destroyObstacle(event.position); await stage.burst(cellWorld(event.position), 0xc9ac81, 0.7); return;
      case 'terrain_triggered': await stage.burst(cellWorld(event.position), event.terrainType === 'fire' ? 0xff833b : 0xc291f2, 0.65); return;
      case 'unit_status_applied': if (actor) stage.float(actor.root.position, { burn: '燃烧', stun: '眩晕', vulnerable: '破防' }[event.statusId], '#e1b0f7'); return;
      case 'displacement_blocked': if (actor) { actor.play('Block_Hit', true); stage.float(actor.root.position, '阻挡', '#e3c99b'); await stage.timeline.animate(0.2); actor.play('Idle'); } return;
      default: return;
    }
  }

  private positionMenu(menu: HTMLElement, anchor: Position): void {
    const p = this.stage.project(anchor, 0.8);
    const width = this.stage.container.clientWidth, height = this.stage.container.clientHeight;
    const menuWidth = menu.offsetWidth || 196, menuHeight = menu.offsetHeight;
    const x = p.x + 65 + menuWidth > width - 20 ? p.x - 65 - menuWidth : p.x + 65;
    menu.style.left = `${Math.max(12, Math.min(x, width - menuWidth - 12))}px`;
    menu.style.top = `${Math.max(80, Math.min(p.y - menuHeight / 2, height - menuHeight - 75))}px`;
  }
  private bindInput(): void {
    const canvas = this.stage.canvas, signal = this.abort.signal;
    canvas.addEventListener('pointerdown', (e) => {
      this.pointers.add(e.pointerId);
      if (e.button === 0) this.pointer = { x: e.clientX, y: e.clientY, id: e.pointerId, dragged: this.pointers.size > 1 };
    }, { signal });
    canvas.addEventListener('pointermove', (e) => {
      if (this.pointer && Math.hypot(e.clientX - this.pointer.x, e.clientY - this.pointer.y) > 5) this.pointer.dragged = true;
      if (e.buttons || !this.session) return;
      const p = this.stage.pick(e.clientX, e.clientY), hash = p ? `${p.x},${p.y}` : '';
      if (hash !== this.lastHover) { this.lastHover = hash; this.session.hoverCell(p); }
    }, { signal });
    canvas.addEventListener('pointerup', (e) => {
      this.pointers.delete(e.pointerId);
      if (e.button !== 0 || !this.pointer || this.pointer.id !== e.pointerId) return;
      const tap = !this.pointer.dragged; this.pointer = undefined;
      if (tap && !document.body.classList.contains('screen-active')) { const p = this.stage.pick(e.clientX, e.clientY); if (p) this.session?.tapCell(p); }
    }, { signal });
    canvas.addEventListener('pointercancel', (e) => { this.pointers.delete(e.pointerId); this.pointer = undefined; }, { signal });
    canvas.addEventListener('pointerleave', () => { this.lastHover = ''; this.session?.hoverCell(null); }, { signal });
    canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); this.session?.cancel(); }, { signal });
    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement).matches('input,select,textarea') || document.body.classList.contains('screen-active')) return;
      if (e.key === 'Escape') this.session?.cancel();
      if (e.key.toLowerCase() === 'r') this.stage.resetCamera();
      if (e.key === 'Enter' && this.currentVm?.confirm.canRelease) { e.preventDefault(); void this.session?.confirm(); }
    }, { signal });
  }
  dispose(): void { this.suspend(); this.abort.abort(); this.stage.onFrame = undefined; }
}

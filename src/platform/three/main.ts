import { createRegistry, levels, getLevel } from '@data/index';
import { loadMetaTables, initialSaveData } from '@data/metaIndex';
import { CampaignDirector, type CampaignHost } from '../../campaign';
import { DomScreens } from '../pixi/DomScreens';
import { LocalSaveStore } from '../pixi/LocalSaveStore';
import { BattleScene } from './BattleScene';
import { BattleController } from './BattleController';

const el = (id: string): HTMLElement => document.getElementById(id)!;
let stage: BattleScene | undefined;
let controller: BattleController | undefined;

async function main(): Promise<void> {
  const registry = createRegistry(), tables = loadMetaTables();
  stage = new BattleScene(el('stage'));
  await stage.assets.load((fraction) => {
    el('loading-progress').style.width = `${fraction * 100}%`;
    el('loading-message').textContent = `正在准备角色、动作与三维场景… ${Math.round(fraction * 100)}%`;
  });
  const battleScene = stage;
  controller = new BattleController(registry, battleScene, {
    menu: el('unit-menu'), info: el('info'), log: el('log'), hint: el('hint'), turn: el('turn'), confirmBar: el('confirm-bar'), banner: el('banner'),
  });
  const battle = controller;
  battle.preview(getLevel('level_004'));
  const screens = new DomScreens(el('screen-root'), {
    title: (id) => id === 'new' ? director.newGame() : id === 'continue' ? director.continueGame() : director.openLoadout('title'),
    cutsceneNext: () => director.advanceCutscene(), cutsceneSkip: () => director.skipCutscene(),
    resultPrimary: () => director.onResultPrimary(), resultSecondary: () => director.openLoadout('result'),
    endingToTitle: () => director.toTitle(), equip: (defId, itemId) => director.doEquip(defId, itemId),
    unequip: (defId, slot) => director.doUnequip(defId, slot),
    equipSkill: (defId, itemId, index) => director.doEquipSkill(defId, itemId, index),
    unequipSkill: (defId, index) => director.doUnequipSkill(defId, index), closeLoadout: () => director.closeLoadout(),
  });
  const host: CampaignHost = {
    showTitle: (vm) => { battle.suspend(); battle.preview(getLevel('level_004')); screens.showTitle(vm); },
    showCutscene: (vm) => screens.showCutscene(vm), showResult: (vm) => screens.showResult(vm),
    showEnding: (vm) => screens.showEnding(vm), showLoadout: (vm) => screens.showLoadout(vm), hideScreens: () => screens.hide(),
    startBattle: (state, level, hooks) => battle.loadCampaignBattle(state, level, hooks),
    updateBattleUnitStats: (patches) => battle.updateUnitStats(patches),
  };
  const director = new CampaignDirector({ registry, tables, store: new LocalSaveStore(), host, newSave: initialSaveData, levelOf: getLevel });
  const select = el('level-select') as HTMLSelectElement;
  const debug = el('debug-toggle') as HTMLInputElement;
  const battleNodes = new Map<string, string>();
  for (const node of Object.values(tables.story.nodes)) if (node.kind === 'battle') battleNodes.set(node.levelId, node.id);
  for (const level of levels) {
    if (!battleNodes.has(level.id)) continue;
    const option = document.createElement('option'); option.value = level.id; option.textContent = `${level.id.slice(-2)} · ${level.name}`; select.append(option);
  }
  debug.addEventListener('change', () => { el('level-select-wrap').hidden = !debug.checked; });
  select.addEventListener('change', () => { battle.suspend(); screens.hide(); director.goToNode(battleNodes.get(select.value)!); });
  el('to-title').addEventListener('click', () => director.toTitle());
  el('zoom-in').addEventListener('click', () => battleScene.zoom(0.85));
  el('zoom-out').addEventListener('click', () => battleScene.zoom(1.18));
  el('reset-camera').addEventListener('click', () => battleScene.resetCamera());
  const toggle = (id: string, run: () => boolean): void => {
    el(id).addEventListener('click', () => { const on = run(); el(id).classList.toggle('active', on); el(id).setAttribute('aria-pressed', String(on)); });
  };
  toggle('toggle-grid', () => battleScene.toggleGrid());
  toggle('toggle-threat', () => battleScene.toggleThreat());
  let quality = true;
  toggle('quality', () => { quality = !quality; battleScene.setQuality(quality); el('quality').textContent = quality ? '高画质' : '流畅'; return quality; });
  director.boot();
  // Explicit QA/developer entry, with ordinary URLs preserving the campaign title screen.
  const requested = new URLSearchParams(location.search).get('level');
  if (requested && levels.some((level) => level.id === requested)) {
    screens.hide(); battle.load(getLevel(requested)); select.value = requested; debug.checked = true; el('level-select-wrap').hidden = false;
  }
  Object.assign(window, { __game: battle, __campaign: director });
  el('loading').remove();
}

void main().catch((error: unknown) => {
  console.error('Three.js renderer startup failed:', error);
  controller?.dispose(); stage?.dispose();
  el('loading-message').textContent = '战场加载失败。请检查浏览器是否支持 WebGL 2，并重新加载资源。';
  const button = document.createElement('button'); button.textContent = '重新加载'; button.onclick = () => location.reload(); el('loading').append(button);
});
window.addEventListener('pagehide', (event) => { if (!event.persisted) { controller?.dispose(); stage?.dispose(); } });
if (import.meta.hot) import.meta.hot.dispose(() => { controller?.dispose(); stage?.dispose(); });

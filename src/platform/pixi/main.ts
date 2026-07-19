/**
 * PixiJS 2D 平台入口：装配舞台 + registry + 战役流程（CampaignDirector），与 web 同一套流程逻辑。
 * 剧情/结算/结局屏幕复用共享 DomScreens；战斗复用本平台 BattleController。
 */
import { createRegistry, levels, getLevel } from "@data/index";
import { loadMetaTables, initialSaveData } from "@data/metaIndex";
import { Assets } from "pixi.js";
import { CampaignDirector, CampaignHost } from "../../campaign";
import { GameStage } from "./GameStage";
import { BattleController, ControllerEls } from "./BattleController";
import { DomScreens } from "./DomScreens";
import { LocalSaveStore } from "./LocalSaveStore";
import { allBattleAssetUrls } from "./AssetManifest";

async function main(): Promise<void> {
  const registry = createRegistry();
  const tables = loadMetaTables();
  await Assets.load(allBattleAssetUrls);
  const stage = new GameStage();
  await stage.init(document.getElementById("stage")!);

  const els: ControllerEls = {
    menu: document.getElementById("unit-menu")!,
    info: document.getElementById("info")!,
    log: document.getElementById("log")!,
    hint: document.getElementById("hint")!,
    turn: document.getElementById("turn")!,
    confirmBar: document.getElementById("confirm-bar")!,
    banner: document.getElementById("banner")!,
  };

  const controller = new BattleController(registry, stage, els);

  const screens = new DomScreens(document.getElementById("screen-root")!, {
    title: (id) =>
      id === "new" ? director.newGame() : id === "continue" ? director.continueGame() : director.openLoadout("title"),
    cutsceneNext: () => director.advanceCutscene(),
    cutsceneSkip: () => director.skipCutscene(),
    resultPrimary: () => director.onResultPrimary(),
    resultSecondary: () => director.openLoadout("result"),
    endingToTitle: () => director.toTitle(),
    equip: (defId, itemId) => director.doEquip(defId, itemId),
    unequip: (defId, slot) => director.doUnequip(defId, slot),
    equipSkill: (defId, itemId, slotIndex) => director.doEquipSkill(defId, itemId, slotIndex),
    unequipSkill: (defId, slotIndex) => director.doUnequipSkill(defId, slotIndex),
    closeLoadout: () => director.closeLoadout(),
  });

  const host: CampaignHost = {
    showTitle: (vm) => screens.showTitle(vm),
    showCutscene: (vm) => screens.showCutscene(vm),
    showResult: (vm) => screens.showResult(vm),
    showEnding: (vm) => screens.showEnding(vm),
    showLoadout: (vm) => screens.showLoadout(vm),
    hideScreens: () => screens.hide(),
    startBattle: (state, level, hooks) => controller.loadCampaignBattle(state, level, hooks),
    updateBattleUnitStats: (patches) => controller.updateUnitStats(patches),
  };

  const director = new CampaignDirector({
    registry,
    tables,
    store: new LocalSaveStore(),
    host,
    newSave: initialSaveData,
    levelOf: getLevel,
  });

  // 调试滑块（常驻右上，任意屏幕可切换，状态持久化）：开启后显示选关下拉。
  // 跳关 = 把战役跳到该关的剧情节点：按当前档案装配、接完整战役钩子，胜利后正常结算并推进下一关。
  const DEBUG_KEY = "formation_debug_v1";
  const debugToggle = document.getElementById("debug-toggle") as HTMLInputElement;
  const levelSelectWrap = document.getElementById("level-select-wrap") as HTMLElement;
  const select = document.getElementById("level-select") as HTMLSelectElement;
  const battleNodeOfLevel = new Map<string, string>();
  for (const node of Object.values(tables.story.nodes)) {
    if (node.kind === "battle") battleNodeOfLevel.set(node.levelId, node.id);
  }
  for (const lvl of levels) {
    if (!battleNodeOfLevel.has(lvl.id)) continue; // 只列战役中真实存在的关卡
    const opt = document.createElement("option");
    opt.value = lvl.id;
    opt.textContent = lvl.name;
    select.appendChild(opt);
  }
  select.addEventListener("change", () => {
    screens.hide();
    director.goToNode(battleNodeOfLevel.get(select.value)!);
  });
  const applyDebug = (on: boolean): void => {
    levelSelectWrap.hidden = !on;
  };
  let debugOn = false;
  try {
    debugOn = localStorage.getItem(DEBUG_KEY) === "1";
  } catch {
    /* 隐私模式等读取失败时按关闭处理 */
  }
  debugToggle.checked = debugOn;
  applyDebug(debugOn);
  debugToggle.addEventListener("change", () => {
    applyDebug(debugToggle.checked);
    try {
      localStorage.setItem(DEBUG_KEY, debugToggle.checked ? "1" : "0");
    } catch {
      /* 写入失败仅影响下次打开的默认值 */
    }
  });

  director.boot();

  (window as unknown as { __game: BattleController }).__game = controller;
  (window as unknown as { __campaign: CampaignDirector }).__campaign = director;
}

void main();

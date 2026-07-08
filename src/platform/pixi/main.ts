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
    resultPrimary: () => director.onResultPrimary(),
    resultSecondary: () => director.openLoadout("result"),
    allocateStat: (defId, stat) => director.allocateStat(defId, stat),
    endingToTitle: () => director.toTitle(),
    equip: (defId, itemId) => director.doEquip(defId, itemId),
    unequip: (defId, slot) => director.doUnequip(defId, slot),
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

  // 关卡下拉是调试工具：默认隐藏，直接跳关会绕过战役流程。加 ?debug 显示。
  const debugMode = new URLSearchParams(location.search).has("debug");
  if (debugMode) {
    document.getElementById("level-select-wrap")?.removeAttribute("hidden");
    const select = document.getElementById("level-select") as HTMLSelectElement;
    for (const lvl of levels) {
      const opt = document.createElement("option");
      opt.value = lvl.id;
      opt.textContent = lvl.name;
      select.appendChild(opt);
    }
    select.addEventListener("change", () => {
      screens.hide();
      controller.load(getLevel(select.value));
    });
  }

  director.boot();

  (window as unknown as { __game: BattleController }).__game = controller;
  (window as unknown as { __campaign: CampaignDirector }).__campaign = director;
}

void main();

/**
 * PixiJS 2D 平台入口：装配舞台 + registry + 战役流程（CampaignDirector），与 web 同一套流程逻辑。
 * 剧情/结算/结局屏幕复用共享 DomScreens；战斗复用本平台 BattleController。
 */
import { createRegistry, levels, getLevel } from "@data/index";
import { loadMetaTables, initialSaveData } from "@data/metaIndex";
import { CampaignDirector, CampaignHost } from "../../campaign";
import { GameStage } from "./GameStage";
import { BattleController, ControllerEls } from "./BattleController";
import { DomScreens } from "../_shared/DomScreens";
import { LocalSaveStore } from "../_shared/LocalSaveStore";

async function main(): Promise<void> {
  const registry = createRegistry();
  const tables = loadMetaTables();
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
    title: (id) => (id === "new" ? director.newGame() : director.continueGame()),
    cutsceneNext: () => director.advanceCutscene(),
    resultPrimary: () => director.onResultPrimary(),
    endingToTitle: () => director.toTitle(),
  });

  const host: CampaignHost = {
    showTitle: (vm) => screens.showTitle(vm),
    showCutscene: (vm) => screens.showCutscene(vm),
    showResult: (vm) => screens.showResult(vm),
    showEnding: (vm) => screens.showEnding(vm),
    hideScreens: () => screens.hide(),
    startBattle: (state, level, onEnd) => controller.loadCampaignBattle(state, level, onEnd),
  };

  const director = new CampaignDirector({
    registry,
    tables,
    store: new LocalSaveStore(),
    host,
    newSave: initialSaveData,
    levelOf: getLevel,
  });

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
  document.getElementById("end-turn")!.addEventListener("click", () => controller.endActiveUnit());

  director.boot();

  (window as unknown as { __game: BattleController }).__game = controller;
  (window as unknown as { __campaign: CampaignDirector }).__campaign = director;
}

void main();

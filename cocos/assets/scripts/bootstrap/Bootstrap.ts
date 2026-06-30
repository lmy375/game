import { _decorator, Component, Node, input, Input } from "cc";
import { createRegistry, levels, getLevel } from "../game-data/index";
import { loadMetaTables, initialSaveData } from "../game-data/metaIndex";
import { loadLevel } from "../game-core/index";
import { CampaignDirector, CampaignHost } from "../campaign";
import { CoordMap } from "../core/CoordMap";
import { SceneRig } from "../view/SceneRig";
import { BoardView } from "../view/BoardView";
import { UnitView } from "../view/UnitView";
import { OverlayView } from "../view/OverlayView";
import { HudView } from "../view/HudView";
import { CampaignScreens } from "../view/CampaignScreens";
import { SkillEffects } from "../anim/SkillEffects";
import { EventAnimator } from "../anim/EventAnimator";
import { InputController } from "../input/InputController";
import { CocosSaveStore } from "../save/CocosSaveStore";

const { ccclass } = _decorator;

/**
 * 入口组件:把它挂到场景里任意一个空节点上即可。
 * 搭起 2.5D 渲染骨架 + 各 View + 战斗控制器 + 战役流程(CampaignDirector),启动进标题。
 * 数字键 1/2/3 = 调试直接切关(绕过战役流程)。
 *
 * 注:cocos 切关暂不重建棋盘几何(沿用首关棋盘),与原实现一致,属已知限制;
 *    在 Cocos Creator 编辑器内由用户实测确认。
 */
@ccclass("Bootstrap")
export class Bootstrap extends Component {
  private rig = new SceneRig();
  private units!: UnitView;
  private controller!: InputController;

  onLoad(): void {
    const registry = createRegistry();
    const root = new Node("Game2D5");
    this.node.addChild(root);

    const first = levels[0];
    const coord = new CoordMap(first.board.width, first.board.height, 1);

    this.rig.build(root, coord);

    const board = new BoardView();
    board.build(this.rig.boardRoot, loadLevel(first, registry), coord);

    this.units = new UnitView(coord, this.rig);
    this.units.build();

    const overlay = new OverlayView(coord, this.rig);
    overlay.build(this.rig.boardRoot);

    const hud = new HudView(this.rig);
    hud.build();

    const fx = new SkillEffects(coord, this.rig);
    fx.build();

    const animator = new EventAnimator(this, coord, this.rig, this.units, board, fx);
    animator.build();

    this.controller = new InputController(this, registry, coord, this.rig, board, this.units, overlay, hud, animator);

    // 战役流程：屏幕 + Host + Director（与 web/three/pixi 同一套 CampaignDirector）。
    const screens = new CampaignScreens(this.rig, {
      title: (id) => (id === "new" ? director.newGame() : director.continueGame()),
      cutsceneNext: () => director.advanceCutscene(),
      resultPrimary: () => director.onResultPrimary(),
      endingToTitle: () => director.toTitle(),
    });
    screens.build();

    const host: CampaignHost = {
      showTitle: (vm) => screens.showTitle(vm),
      showCutscene: (vm) => screens.showCutscene(vm),
      showResult: (vm) => screens.showResult(vm),
      showEnding: (vm) => screens.showEnding(vm),
      hideScreens: () => screens.hide(),
      startBattle: (state, level, onEnd) => this.controller.loadCampaignBattle(state, level, onEnd),
    };

    const director = new CampaignDirector({
      registry,
      tables: loadMetaTables(),
      store: new CocosSaveStore(),
      host,
      newSave: initialSaveData,
      levelOf: getLevel,
    });
    director.boot();

    input.on(Input.EventType.KEY_DOWN, (e: { keyCode?: number }) => {
      const idx = (e.keyCode ?? 0) - 49; // 数字键 1 → keyCode 49(调试切关)
      if (idx >= 0 && idx < levels.length) {
        screens.hide();
        this.controller.load(levels[idx]);
      }
    });
  }

  update(): void {
    // 每帧把单位立绘的世界坐标投影到屏幕(相机固定,单位随动画移动)。
    this.units?.project();
  }
}

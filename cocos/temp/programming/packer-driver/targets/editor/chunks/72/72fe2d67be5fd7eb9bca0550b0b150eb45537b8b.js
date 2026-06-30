System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2", "__unresolved_3", "__unresolved_4", "__unresolved_5", "__unresolved_6", "__unresolved_7", "__unresolved_8", "__unresolved_9", "__unresolved_10", "__unresolved_11"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Component, Node, input, Input, createRegistry, levels, loadLevel, CoordMap, SceneRig, BoardView, UnitView, OverlayView, HudView, SkillEffects, EventAnimator, InputController, _dec, _class, _crd, ccclass, Bootstrap;

  function _reportPossibleCrUseOfcreateRegistry(extras) {
    _reporterNs.report("createRegistry", "../game-data/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOflevels(extras) {
    _reporterNs.report("levels", "../game-data/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfloadLevel(extras) {
    _reporterNs.report("loadLevel", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfCoordMap(extras) {
    _reporterNs.report("CoordMap", "../core/CoordMap", _context.meta, extras);
  }

  function _reportPossibleCrUseOfSceneRig(extras) {
    _reporterNs.report("SceneRig", "../view/SceneRig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfBoardView(extras) {
    _reporterNs.report("BoardView", "../view/BoardView", _context.meta, extras);
  }

  function _reportPossibleCrUseOfUnitView(extras) {
    _reporterNs.report("UnitView", "../view/UnitView", _context.meta, extras);
  }

  function _reportPossibleCrUseOfOverlayView(extras) {
    _reporterNs.report("OverlayView", "../view/OverlayView", _context.meta, extras);
  }

  function _reportPossibleCrUseOfHudView(extras) {
    _reporterNs.report("HudView", "../view/HudView", _context.meta, extras);
  }

  function _reportPossibleCrUseOfSkillEffects(extras) {
    _reporterNs.report("SkillEffects", "../anim/SkillEffects", _context.meta, extras);
  }

  function _reportPossibleCrUseOfEventAnimator(extras) {
    _reporterNs.report("EventAnimator", "../anim/EventAnimator", _context.meta, extras);
  }

  function _reportPossibleCrUseOfInputController(extras) {
    _reporterNs.report("InputController", "../input/InputController", _context.meta, extras);
  }

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      _decorator = _cc._decorator;
      Component = _cc.Component;
      Node = _cc.Node;
      input = _cc.input;
      Input = _cc.Input;
    }, function (_unresolved_2) {
      createRegistry = _unresolved_2.createRegistry;
      levels = _unresolved_2.levels;
    }, function (_unresolved_3) {
      loadLevel = _unresolved_3.loadLevel;
    }, function (_unresolved_4) {
      CoordMap = _unresolved_4.CoordMap;
    }, function (_unresolved_5) {
      SceneRig = _unresolved_5.SceneRig;
    }, function (_unresolved_6) {
      BoardView = _unresolved_6.BoardView;
    }, function (_unresolved_7) {
      UnitView = _unresolved_7.UnitView;
    }, function (_unresolved_8) {
      OverlayView = _unresolved_8.OverlayView;
    }, function (_unresolved_9) {
      HudView = _unresolved_9.HudView;
    }, function (_unresolved_10) {
      SkillEffects = _unresolved_10.SkillEffects;
    }, function (_unresolved_11) {
      EventAnimator = _unresolved_11.EventAnimator;
    }, function (_unresolved_12) {
      InputController = _unresolved_12.InputController;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "06890WwVuJOiI1BL1gnx0sf", "Bootstrap", undefined);

      __checkObsolete__(['_decorator', 'Component', 'Node', 'input', 'Input']);

      ({
        ccclass
      } = _decorator);
      /**
       * 入口组件:把它挂到场景里任意一个空节点上即可。
       * 它在代码里搭起整套 2.5D 渲染骨架(相机/光/Canvas)、装配各 View 与控制器,并加载首关。
       * 数字键 1/2/3 切换关卡。
       */

      _export("Bootstrap", Bootstrap = (_dec = ccclass("Bootstrap"), _dec(_class = class Bootstrap extends Component {
        constructor(...args) {
          super(...args);
          this.rig = new (_crd && SceneRig === void 0 ? (_reportPossibleCrUseOfSceneRig({
            error: Error()
          }), SceneRig) : SceneRig)();
          this.units = void 0;
          this.controller = void 0;
        }

        onLoad() {
          const registry = (_crd && createRegistry === void 0 ? (_reportPossibleCrUseOfcreateRegistry({
            error: Error()
          }), createRegistry) : createRegistry)();
          const root = new Node("Game2D5");
          this.node.addChild(root);
          const first = (_crd && levels === void 0 ? (_reportPossibleCrUseOflevels({
            error: Error()
          }), levels) : levels)[0];
          const coord = new (_crd && CoordMap === void 0 ? (_reportPossibleCrUseOfCoordMap({
            error: Error()
          }), CoordMap) : CoordMap)(first.board.width, first.board.height, 1);
          this.rig.build(root, coord); // BoardView 仅需 board 尺寸与地形;单位由 controller.load 装配。

          const board = new (_crd && BoardView === void 0 ? (_reportPossibleCrUseOfBoardView({
            error: Error()
          }), BoardView) : BoardView)();
          board.build(this.rig.boardRoot, (_crd && loadLevel === void 0 ? (_reportPossibleCrUseOfloadLevel({
            error: Error()
          }), loadLevel) : loadLevel)(first, registry), coord);
          this.units = new (_crd && UnitView === void 0 ? (_reportPossibleCrUseOfUnitView({
            error: Error()
          }), UnitView) : UnitView)(coord, this.rig);
          this.units.build();
          const overlay = new (_crd && OverlayView === void 0 ? (_reportPossibleCrUseOfOverlayView({
            error: Error()
          }), OverlayView) : OverlayView)(coord, this.rig);
          overlay.build(this.rig.boardRoot);
          const hud = new (_crd && HudView === void 0 ? (_reportPossibleCrUseOfHudView({
            error: Error()
          }), HudView) : HudView)(this.rig);
          hud.build();
          const fx = new (_crd && SkillEffects === void 0 ? (_reportPossibleCrUseOfSkillEffects({
            error: Error()
          }), SkillEffects) : SkillEffects)(coord, this.rig);
          fx.build();
          const animator = new (_crd && EventAnimator === void 0 ? (_reportPossibleCrUseOfEventAnimator({
            error: Error()
          }), EventAnimator) : EventAnimator)(this, coord, this.rig, this.units, board, fx);
          animator.build();
          this.controller = new (_crd && InputController === void 0 ? (_reportPossibleCrUseOfInputController({
            error: Error()
          }), InputController) : InputController)(this, registry, coord, this.rig, board, this.units, overlay, hud, animator);
          this.controller.load(first);
          input.on(Input.EventType.KEY_DOWN, e => {
            var _e$keyCode;

            const idx = ((_e$keyCode = e.keyCode) != null ? _e$keyCode : 0) - 49; // 数字键 1 → keyCode 49

            if (idx >= 0 && idx < (_crd && levels === void 0 ? (_reportPossibleCrUseOflevels({
              error: Error()
            }), levels) : levels).length) this.controller.load((_crd && levels === void 0 ? (_reportPossibleCrUseOflevels({
              error: Error()
            }), levels) : levels)[idx]);
          });
        }

        update() {
          var _this$units;

          // 每帧把单位立绘的世界坐标投影到屏幕(相机固定,单位随动画移动)。
          (_this$units = this.units) == null || _this$units.project();
        }

      }) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=72fe2d67be5fd7eb9bca0550b0b150eb45537b8b.js.map
System.register(["__unresolved_0", "cc", "__unresolved_1"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, Node, Camera, DirectionalLight, Canvas, UITransform, Widget, Layers, Vec3, view, hex, SceneRig, _crd;

  function _reportPossibleCrUseOfhex(extras) {
    _reporterNs.report("hex", "./Palette", _context.meta, extras);
  }

  function _reportPossibleCrUseOfCoordMap(extras) {
    _reporterNs.report("CoordMap", "../core/CoordMap", _context.meta, extras);
  }

  _export("SceneRig", void 0);

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      Node = _cc.Node;
      Camera = _cc.Camera;
      DirectionalLight = _cc.DirectionalLight;
      Canvas = _cc.Canvas;
      UITransform = _cc.UITransform;
      Widget = _cc.Widget;
      Layers = _cc.Layers;
      Vec3 = _cc.Vec3;
      view = _cc.view;
    }, function (_unresolved_2) {
      hex = _unresolved_2.hex;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "d169ftEFbpKHac6CPLjw+od", "SceneRig", undefined);

      __checkObsolete__(['Node', 'Camera', 'DirectionalLight', 'Canvas', 'UITransform', 'Widget', 'Layers', 'Color', 'Vec3', 'view']);

      /**
       * 在代码里搭起整套 2.5D 渲染骨架,使场景文件可保持极简(只需一个挂 Bootstrap 的节点)。
       *
       *  - world3D:3D 透视相机 + 方向光,俯视棋盘,负责地形/高亮/物件与阴影。
       *  - uiCamera + canvas:正交 UI 相机(不清色,叠在 3D 之上),负责单位立绘、血条、飘字、HUD。
       *
       * 两台相机用 visibility 分层:3D 相机渲染 DEFAULT 层,UI 相机渲染 UI_2D 层。
       */
      _export("SceneRig", SceneRig = class SceneRig {
        constructor() {
          this.world3DCamera = void 0;
          this.uiCamera = void 0;
          this.canvas = void 0;
          this.boardRoot = void 0;
          this.light = void 0;
          this._tmp = new Vec3();
        }

        build(root, coord) {
          // 棋盘内容根节点(3D)
          this.boardRoot = new Node("BoardRoot");
          this.boardRoot.layer = Layers.Enum.DEFAULT;
          root.addChild(this.boardRoot); // 方向光:斜上方打光,启用阴影

          var lightNode = new Node("MainLight");
          root.addChild(lightNode);
          lightNode.setRotationFromEuler(-55, -35, 0);
          this.light = lightNode.addComponent(DirectionalLight);
          this.light.color = (_crd && hex === void 0 ? (_reportPossibleCrUseOfhex({
            error: Error()
          }), hex) : hex)("#fff4e0");
          this.light.illuminance = 80000;
          this.light.shadowEnabled = true; // 3D 相机:从棋盘后上方俯视(约 55°)

          var camNode = new Node("WorldCamera");
          root.addChild(camNode);
          var span = Math.max(coord.worldWidth, coord.worldDepth);
          var pitch = 56;
          var dist = span * 1.15;
          var rad = pitch * Math.PI / 180;
          camNode.setPosition(0, Math.sin(rad) * dist, Math.cos(rad) * dist);
          camNode.setRotationFromEuler(-pitch, 0, 0);
          var cam = camNode.addComponent(Camera);
          cam.projection = Camera.ProjectionType.PERSPECTIVE;
          cam.fov = 42;
          cam.near = 0.1;
          cam.far = 2000;
          cam.clearFlags = Camera.ClearFlag.SOLID_COLOR;
          cam.clearColor = (_crd && hex === void 0 ? (_reportPossibleCrUseOfhex({
            error: Error()
          }), hex) : hex)("#0d0f15");
          cam.visibility = Layers.Enum.DEFAULT;
          cam.priority = 0;
          this.world3DCamera = cam; // UI 相机:正交,叠加在 3D 之上(只清深度,保留 3D 画面)

          var uiCamNode = new Node("UICamera");
          root.addChild(uiCamNode);
          uiCamNode.setPosition(0, 0, 1000);
          var uiCam = uiCamNode.addComponent(Camera);
          uiCam.projection = Camera.ProjectionType.ORTHO;
          uiCam.clearFlags = Camera.ClearFlag.DEPTH_ONLY;
          uiCam.visibility = Layers.Enum.UI_2D;
          uiCam.priority = 1;
          uiCam.near = 1;
          uiCam.far = 2000;
          this.uiCamera = uiCam; // Canvas:承载所有 2D UI;随屏幕自适应

          var canvasNode = new Node("Canvas");
          canvasNode.layer = Layers.Enum.UI_2D;
          root.addChild(canvasNode);
          var size = view.getVisibleSize();
          var t = canvasNode.addComponent(UITransform);
          t.setContentSize(size.width, size.height);
          var canvas = canvasNode.addComponent(Canvas);
          canvas.cameraComponent = uiCam;
          canvas.alignCanvasWithScreen = true;
          canvasNode.addComponent(Widget);
          this.canvas = canvasNode;
        }

        /**
         * 3D 世界点 → Canvas 局部坐标(Canvas 居中锚点,contentSize=可见尺寸)。
         * 用 worldToScreen + 手动居中(而非 convertToUINode),映射完全可控、与 3D 渲染一致。
         */
        worldToUI(world, out) {
          var sp = this.world3DCamera.worldToScreen(world, this._tmp);
          var vs = view.getVisibleSize();
          var x = sp.x - vs.width / 2;
          var y = sp.y - vs.height / 2;
          return out ? out.set(x, y, 0) : new Vec3(x, y, 0);
        }
        /** UI 配色:画布背景透明,实际背景来自 3D 相机清色。 */


        get bg() {
          return (_crd && hex === void 0 ? (_reportPossibleCrUseOfhex({
            error: Error()
          }), hex) : hex)("#0d0f15");
        }

      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=b21753220363f00e7b324839b859c82778670d4d.js.map
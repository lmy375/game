System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, Node, Vec3, planeMesh, boxMesh, unlitMat, meshNode, uiNode, uiLabel, OVERLAY, UI, OverlayView, _crd;

  function _reportPossibleCrUseOfPosition(extras) {
    _reporterNs.report("Position", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfCoordMap(extras) {
    _reporterNs.report("CoordMap", "../core/CoordMap", _context.meta, extras);
  }

  function _reportPossibleCrUseOfOverlay(extras) {
    _reporterNs.report("Overlay", "../core/types", _context.meta, extras);
  }

  function _reportPossibleCrUseOfSceneRig(extras) {
    _reporterNs.report("SceneRig", "./SceneRig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfplaneMesh(extras) {
    _reporterNs.report("planeMesh", "./Factory", _context.meta, extras);
  }

  function _reportPossibleCrUseOfboxMesh(extras) {
    _reporterNs.report("boxMesh", "./Factory", _context.meta, extras);
  }

  function _reportPossibleCrUseOfunlitMat(extras) {
    _reporterNs.report("unlitMat", "./Factory", _context.meta, extras);
  }

  function _reportPossibleCrUseOfmeshNode(extras) {
    _reporterNs.report("meshNode", "./Factory", _context.meta, extras);
  }

  function _reportPossibleCrUseOfuiNode(extras) {
    _reporterNs.report("uiNode", "./Factory", _context.meta, extras);
  }

  function _reportPossibleCrUseOfuiLabel(extras) {
    _reporterNs.report("uiLabel", "./Factory", _context.meta, extras);
  }

  function _reportPossibleCrUseOfOVERLAY(extras) {
    _reporterNs.report("OVERLAY", "./Palette", _context.meta, extras);
  }

  function _reportPossibleCrUseOfUI(extras) {
    _reporterNs.report("UI", "./Palette", _context.meta, extras);
  }

  _export("OverlayView", void 0);

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      Node = _cc.Node;
      Vec3 = _cc.Vec3;
    }, function (_unresolved_2) {
      planeMesh = _unresolved_2.planeMesh;
      boxMesh = _unresolved_2.boxMesh;
      unlitMat = _unresolved_2.unlitMat;
      meshNode = _unresolved_2.meshNode;
      uiNode = _unresolved_2.uiNode;
      uiLabel = _unresolved_2.uiLabel;
    }, function (_unresolved_3) {
      OVERLAY = _unresolved_3.OVERLAY;
      UI = _unresolved_3.UI;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "c20f9qA8ZpFw47RiMcETpdb", "OverlayView", undefined);

      __checkObsolete__(['Node', 'Vec3', 'Color', 'Label']);

      /**
       * 叠加层:把控制器算出的 Overlay 画在棋盘上。
       *  - 3D 贴地高亮:移动/施法范围、AOE 命中、落点、危险地形、悬停、起点。
       *  - 3D 位移箭头:预览技能会把谁推/拉到哪。
       *  - UI 预览数字:命中后的伤害/治疗预估(投影到屏幕,瞄准时静态展示)。
       */
      _export("OverlayView", OverlayView = class OverlayView {
        // UI 预览数字
        constructor(coord, rig) {
          this.deco = void 0;
          // 3D 贴地装饰
          this.labels = void 0;
          this.coord = coord;
          this.rig = rig;
        }

        build(boardRoot) {
          this.deco = new Node("Overlay3D");
          boardRoot.addChild(this.deco);
          this.labels = (_crd && uiNode === void 0 ? (_reportPossibleCrUseOfuiNode({
            error: Error()
          }), uiNode) : uiNode)("OverlayLabels", this.rig.canvas);
        }

        show(o) {
          this.clear();
          this.cells(o.moveCells, (_crd && OVERLAY === void 0 ? (_reportPossibleCrUseOfOVERLAY({
            error: Error()
          }), OVERLAY) : OVERLAY).move);
          this.cells(o.castCells, (_crd && OVERLAY === void 0 ? (_reportPossibleCrUseOfOVERLAY({
            error: Error()
          }), OVERLAY) : OVERLAY).cast);
          this.cells(o.hazardWarn, (_crd && OVERLAY === void 0 ? (_reportPossibleCrUseOfOVERLAY({
            error: Error()
          }), OVERLAY) : OVERLAY).hazard);
          this.cells(o.hitArm, (_crd && OVERLAY === void 0 ? (_reportPossibleCrUseOfOVERLAY({
            error: Error()
          }), OVERLAY) : OVERLAY).hitArm);
          this.cells(o.hitCenter, (_crd && OVERLAY === void 0 ? (_reportPossibleCrUseOfOVERLAY({
            error: Error()
          }), OVERLAY) : OVERLAY).hitCenter);
          this.cells(o.finalBoxes, (_crd && OVERLAY === void 0 ? (_reportPossibleCrUseOfOVERLAY({
            error: Error()
          }), OVERLAY) : OVERLAY).finalBox, 0.09);
          if (o.originCell) this.cells([o.originCell], (_crd && OVERLAY === void 0 ? (_reportPossibleCrUseOfOVERLAY({
            error: Error()
          }), OVERLAY) : OVERLAY).origin);
          if (o.hoverCell) this.cells([o.hoverCell], (_crd && OVERLAY === void 0 ? (_reportPossibleCrUseOfOVERLAY({
            error: Error()
          }), OVERLAY) : OVERLAY).hover, 0.1);

          for (var a of (_o$arrows = o.arrows) != null ? _o$arrows : []) {
            var _o$arrows;

            this.arrow(a.from, a.to);
          }

          for (var d of (_o$damage = o.damage) != null ? _o$damage : []) {
            var _o$damage;

            this.previewLabel(d.pos, d.amount, d.kind, d.lethal);
          }
        }

        clear() {
          for (var c of [...this.deco.children]) c.destroy();

          for (var _c of [...this.labels.children]) _c.destroy();
        }

        cells(cells, color, y) {
          if (y === void 0) {
            y = 0.05;
          }

          if (!cells) return;
          var size = this.coord.cell * 0.9;

          for (var p of cells) {
            var n = (_crd && meshNode === void 0 ? (_reportPossibleCrUseOfmeshNode({
              error: Error()
            }), meshNode) : meshNode)("hl", this.deco, (_crd && planeMesh === void 0 ? (_reportPossibleCrUseOfplaneMesh({
              error: Error()
            }), planeMesh) : planeMesh)(size, size), (_crd && unlitMat === void 0 ? (_reportPossibleCrUseOfunlitMat({
              error: Error()
            }), unlitMat) : unlitMat)(color, true));
            n.setPosition(this.coord.posToWorld(p, y));
          }
        }

        arrow(from, to) {
          var a = this.coord.posToWorld(from, 0.08);
          var b = this.coord.posToWorld(to, 0.08);
          var dx = b.x - a.x;
          var dz = b.z - a.z;
          var len = Math.hypot(dx, dz);
          if (len < 1e-3) return;
          var shaft = (_crd && meshNode === void 0 ? (_reportPossibleCrUseOfmeshNode({
            error: Error()
          }), meshNode) : meshNode)("arrow", this.deco, (_crd && boxMesh === void 0 ? (_reportPossibleCrUseOfboxMesh({
            error: Error()
          }), boxMesh) : boxMesh)(0.12, 0.04, len), (_crd && unlitMat === void 0 ? (_reportPossibleCrUseOfunlitMat({
            error: Error()
          }), unlitMat) : unlitMat)((_crd && OVERLAY === void 0 ? (_reportPossibleCrUseOfOVERLAY({
            error: Error()
          }), OVERLAY) : OVERLAY).finalBox, true));
          shaft.setPosition(new Vec3((a.x + b.x) / 2, 0.08, (a.z + b.z) / 2));
          shaft.setRotationFromEuler(0, Math.atan2(dx, -dz) * 180 / Math.PI, 0);
        }

        previewLabel(p, amount, kind, lethal) {
          var color = kind === "heal" ? (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
            error: Error()
          }), UI) : UI).heal : lethal ? (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
            error: Error()
          }), UI) : UI).danger : (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
            error: Error()
          }), UI) : UI).good;
          var l = (_crd && uiLabel === void 0 ? (_reportPossibleCrUseOfuiLabel({
            error: Error()
          }), uiLabel) : uiLabel)(this.labels, "" + (kind === "heal" ? "+" : "-") + amount, {
            size: 22,
            color,
            bold: true,
            outline: (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
              error: Error()
            }), UI) : UI).hpBack
          });
          var w = this.coord.posToWorld(p, 0.6);
          l.node.setPosition(this.rig.worldToUI(w));
        }

      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=6cc88ffd324bb987fdeab7f84319d58d73f97341.js.map
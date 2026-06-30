System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, Vec3, tween, uiNode, uiGraphics, hex, SkillEffects, _crd;

  function _reportPossibleCrUseOfCoordMap(extras) {
    _reporterNs.report("CoordMap", "../core/CoordMap", _context.meta, extras);
  }

  function _reportPossibleCrUseOfSceneRig(extras) {
    _reporterNs.report("SceneRig", "../view/SceneRig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfuiNode(extras) {
    _reporterNs.report("uiNode", "../view/Factory", _context.meta, extras);
  }

  function _reportPossibleCrUseOfuiGraphics(extras) {
    _reporterNs.report("uiGraphics", "../view/Factory", _context.meta, extras);
  }

  function _reportPossibleCrUseOfhex(extras) {
    _reporterNs.report("hex", "../view/Palette", _context.meta, extras);
  }

  _export("SkillEffects", void 0);

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      Vec3 = _cc.Vec3;
      tween = _cc.tween;
    }, function (_unresolved_2) {
      uiNode = _unresolved_2.uiNode;
      uiGraphics = _unresolved_2.uiGraphics;
    }, function (_unresolved_3) {
      hex = _unresolved_3.hex;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "11f3b837DNGnpHgTAnFqSUs", "SkillEffects", undefined);

      __checkObsolete__(['Node', 'Vec3', 'Color', 'Graphics', 'tween']);

      /**
       * 程序化技能特效:全部用代码生成的 UI 粒子/光环/弹道,无需任何美术资源。
       * 坐标按世界点投影到 Canvas;相机静止,故投影一次即可。后续可在编辑器替换为正式特效。
       */
      _export("SkillEffects", SkillEffects = class SkillEffects {
        constructor(coord, rig) {
          this.layer = void 0;
          this.coord = coord;
          this.rig = rig;
        }

        build() {
          this.layer = (_crd && uiNode === void 0 ? (_reportPossibleCrUseOfuiNode({
            error: Error()
          }), uiNode) : uiNode)("Effects", this.rig.canvas);
        }

        toUI(world) {
          const v = new Vec3();
          this.rig.worldToUI(world, v);
          return new Vec3(v.x, v.y, 0);
        }
        /** 一团向外迸射的粒子(受击/爆裂)。 */


        burst(atWorld, color, count = 10, radius = 60) {
          const at = this.toUI(atWorld);

          for (let i = 0; i < count; i++) {
            const dot = (_crd && uiGraphics === void 0 ? (_reportPossibleCrUseOfuiGraphics({
              error: Error()
            }), uiGraphics) : uiGraphics)(this.layer);
            const sz = 3 + Math.random() * 4;
            dot.fillColor = color;
            dot.circle(0, 0, sz);
            dot.fill();
            dot.node.setPosition(at.clone());
            const ang = Math.random() * Math.PI * 2;
            const r = radius * (0.4 + Math.random() * 0.6);
            const delta = new Vec3(Math.cos(ang) * r, Math.sin(ang) * r, 0);
            const life = 0.3 + Math.random() * 0.3;
            tween(dot.node).by(life, {
              position: delta
            }, {
              easing: "quadOut"
            }).start();
            tween(dot.node).to(life, {
              scale: new Vec3(0, 0, 0)
            }).call(() => dot.node.destroy()).start();
          }
        }
        /** 一圈扩散的光环(聚拢/冲击波/施法起手)。 */


        ring(atWorld, color, maxScale = 3, life = 0.45) {
          const at = this.toUI(atWorld);
          const g = (_crd && uiGraphics === void 0 ? (_reportPossibleCrUseOfuiGraphics({
            error: Error()
          }), uiGraphics) : uiGraphics)(this.layer);
          g.lineWidth = 5;
          g.strokeColor = color;
          g.circle(0, 0, 26);
          g.stroke();
          g.node.setPosition(at);
          g.node.setScale(new Vec3(0.2, 0.2, 1));
          tween(g.node).to(life, {
            scale: new Vec3(maxScale, maxScale, 1)
          }, {
            easing: "quadOut"
          }).call(() => g.node.destroy()).start();
        }
        /** 一道直线弹道(贯穿/远程),抵达后回调。 */


        projectile(fromWorld, toWorld, color, onArrive) {
          const from = this.toUI(fromWorld);
          const to = this.toUI(toWorld);
          const dot = (_crd && uiGraphics === void 0 ? (_reportPossibleCrUseOfuiGraphics({
            error: Error()
          }), uiGraphics) : uiGraphics)(this.layer);
          dot.fillColor = color;
          dot.circle(0, 0, 7);
          dot.fill();
          dot.node.setPosition(from);
          const dist = Vec3.distance(from, to);
          const life = Math.max(0.12, Math.min(0.4, dist / 1400));
          tween(dot.node).to(life, {
            position: to
          }, {
            easing: "quadIn"
          }).call(() => {
            this.burst(toWorld, color, 6, 36);
            dot.node.destroy();
            onArrive == null || onArrive();
          }).start();
        }
        /** 按技能给出差异化的施法表现(占位编排,可按 skillId 继续扩展)。 */


        cast(skillId, casterWorld, targetWorld) {
          const tgt = targetWorld != null ? targetWorld : casterWorld;

          if (/gale|gather|wind|聚/.test(skillId)) {
            this.ring(tgt, (_crd && hex === void 0 ? (_reportPossibleCrUseOfhex({
              error: Error()
            }), hex) : hex)("#8fe3ff"), 3.2);
          } else if (/pierce|line|shoot|spear|贯穿|射/.test(skillId)) {
            this.projectile(casterWorld, tgt, (_crd && hex === void 0 ? (_reportPossibleCrUseOfhex({
              error: Error()
            }), hex) : hex)("#ffe08a"));
          } else if (/fire|cross|burn|火/.test(skillId)) {
            this.ring(casterWorld, (_crd && hex === void 0 ? (_reportPossibleCrUseOfhex({
              error: Error()
            }), hex) : hex)("#ff8a3a"), 1.6, 0.3);
            this.burst(tgt, (_crd && hex === void 0 ? (_reportPossibleCrUseOfhex({
              error: Error()
            }), hex) : hex)("#ff6a2a"), 14, 70);
          } else if (/push|wave|knock|推/.test(skillId)) {
            this.ring(casterWorld, (_crd && hex === void 0 ? (_reportPossibleCrUseOfhex({
              error: Error()
            }), hex) : hex)("#cfe0ff"), 2.6);
          } else {
            this.ring(casterWorld, (_crd && hex === void 0 ? (_reportPossibleCrUseOfhex({
              error: Error()
            }), hex) : hex)("#ffffff"), 1.4, 0.25);
          }
        }

      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=50a13c176060bf1c3ebb25ad95bcd3569091a4df.js.map
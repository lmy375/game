System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2", "__unresolved_3"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, Vec3, tween, directionTo, uiNode, uiLabel, UI, hex, EventAnimator, _crd;

  function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

  function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

  function _reportPossibleCrUseOfBattleEvent(extras) {
    _reporterNs.report("BattleEvent", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfPosition(extras) {
    _reporterNs.report("Position", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfDirection(extras) {
    _reporterNs.report("Direction", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfdirectionTo(extras) {
    _reporterNs.report("directionTo", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfTerrainType(extras) {
    _reporterNs.report("TerrainType", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfCoordMap(extras) {
    _reporterNs.report("CoordMap", "../core/CoordMap", _context.meta, extras);
  }

  function _reportPossibleCrUseOfSceneRig(extras) {
    _reporterNs.report("SceneRig", "../view/SceneRig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfUnitView(extras) {
    _reporterNs.report("UnitView", "../view/UnitView", _context.meta, extras);
  }

  function _reportPossibleCrUseOfBoardView(extras) {
    _reporterNs.report("BoardView", "../view/BoardView", _context.meta, extras);
  }

  function _reportPossibleCrUseOfSkillEffects(extras) {
    _reporterNs.report("SkillEffects", "./SkillEffects", _context.meta, extras);
  }

  function _reportPossibleCrUseOfuiNode(extras) {
    _reporterNs.report("uiNode", "../view/Factory", _context.meta, extras);
  }

  function _reportPossibleCrUseOfuiLabel(extras) {
    _reporterNs.report("uiLabel", "../view/Factory", _context.meta, extras);
  }

  function _reportPossibleCrUseOfUI(extras) {
    _reporterNs.report("UI", "../view/Palette", _context.meta, extras);
  }

  function _reportPossibleCrUseOfhex(extras) {
    _reporterNs.report("hex", "../view/Palette", _context.meta, extras);
  }

  _export("EventAnimator", void 0);

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
      directionTo = _unresolved_2.directionTo;
    }, function (_unresolved_3) {
      uiNode = _unresolved_3.uiNode;
      uiLabel = _unresolved_3.uiLabel;
    }, function (_unresolved_4) {
      UI = _unresolved_4.UI;
      hex = _unresolved_4.hex;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "e5088n0za5H2YXL8iKrTc/V", "EventAnimator", undefined);

      __checkObsolete__(['Component', 'Node', 'Vec3', 'Color', 'tween']);

      /**
       * ★核心:把一次 simulate() 产出的 BattleEvent[] 排成时间线,串行播放补间 + 粒子,
       * 全部播完才 resolve(交回操作权)。内核只产出事件,这里只负责把事件「演出来」。
       */
      _export("EventAnimator", EventAnimator = class EventAnimator {
        constructor(host, coord, rig, units, board, fx) {
          this.floatLayer = void 0;
          this.host = host;
          this.coord = coord;
          this.rig = rig;
          this.units = units;
          this.board = board;
          this.fx = fx;
        }

        build() {
          this.floatLayer = (_crd && uiNode === void 0 ? (_reportPossibleCrUseOfuiNode({
            error: Error()
          }), uiNode) : uiNode)("Floaters", this.rig.canvas);
        }

        wait(sec) {
          return new Promise(res => this.host.scheduleOnce(res, sec));
        }
        /** 顺序播放整段事件。 */


        play(events) {
          var _this = this;

          return _asyncToGenerator(function* () {
            for (var e of events) yield _this.one(e);
          })();
        }

        one(e) {
          var _this2 = this;

          return _asyncToGenerator(function* () {
            switch (e.type) {
              case "unit_moved":
                return _this2.move(e.unitId, e.path);

              case "skill_cast":
                {
                  var _this2$units$get$worl, _this2$units$get;

                  var w = (_this2$units$get$worl = (_this2$units$get = _this2.units.get(e.casterId)) == null ? void 0 : _this2$units$get.world) != null ? _this2$units$get$worl : _this2.coord.posToWorld({
                    x: 0,
                    y: 0
                  });
                  var tgt = e.targetCell ? _this2.coord.posToWorld(e.targetCell, 0) : null;

                  _this2.fx.cast(e.skillId, w.clone(), tgt);

                  return _this2.wait(0.22);
                }

              case "unit_displaced":
                return _this2.displace(e.unitId, e.from, e.to, e.reason);

              case "displacement_blocked":
                {
                  var _this2$units$get2;

                  (_this2$units$get2 = _this2.units.get(e.unitId)) == null || _this2$units$get2.punch(0.9, 0.06);
                  return _this2.wait(0.08);
                }

              case "unit_damaged":
              case "collision_damage":
                return _this2.damage(e.unitId, e.amount, e.hpAfter, false);

              case "unit_healed":
                return _this2.damage(e.unitId, e.amount, e.hpAfter, true);

              case "terrain_triggered":
                return _this2.terrain(e.position, e.terrainType);

              case "obstacle_destroyed":
                {
                  _this2.fx.burst(_this2.coord.posToWorld(e.position, 0.3), (_crd && hex === void 0 ? (_reportPossibleCrUseOfhex({
                    error: Error()
                  }), hex) : hex)("#8b6b46"), 12, 50);

                  _this2.board.updateTerrain(e.position, "ground", _this2.coord);

                  return _this2.wait(0.12);
                }

              case "unit_status_applied":
                {
                  var s = _this2.units.get(e.unitId);

                  if (s) _this2.fx.ring(s.world.clone(), (_crd && hex === void 0 ? (_reportPossibleCrUseOfhex({
                    error: Error()
                  }), hex) : hex)("#d96ad9"), 1.4, 0.3);
                  return _this2.wait(0.08);
                }

              case "unit_died":
                return _this2.die(e.unitId);

              default:
                return;
              // turn_started / turn_ended / status_expired / battle_ended 由 HUD/控制器处理
            }
          })();
        }

        move(id, path) {
          var _this3 = this;

          return _asyncToGenerator(function* () {
            var s = _this3.units.get(id);

            if (!s || path.length < 2) return;
            var stepDur = 0.14;

            for (var i = 1; i < path.length; i++) {
              var prev = path[i - 1];
              var cell = path[i];
              var dir = (_crd && directionTo === void 0 ? (_reportPossibleCrUseOfdirectionTo({
                error: Error()
              }), directionTo) : directionTo)(prev, cell);
              s.setFacing(dir);

              var w = _this3.coord.posToWorld(cell, 0);

              tween(s.world).to(stepDur, {
                x: w.x,
                z: w.z
              }, {
                easing: "smooth"
              }).start(); // 行走起伏

              tween(s.world).to(stepDur / 2, {
                y: 0.22
              }).to(stepDur / 2, {
                y: 0
              }).start();
              yield _this3.wait(stepDur);
            }
          })();
        }

        displace(id, _from, to, reason) {
          var _this4 = this;

          return _asyncToGenerator(function* () {
            var s = _this4.units.get(id);

            if (!s) return;

            var w = _this4.coord.posToWorld(to, 0);

            var dur = reason === "knockback" ? 0.18 : reason === "gather" ? 0.3 : 0.24;
            var easing = reason === "knockback" ? "quadOut" : reason === "gather" ? "backOut" : "quadOut";
            tween(s.world).to(dur, {
              x: w.x,
              z: w.z
            }, {
              easing
            }).start();
            yield _this4.wait(dur);

            _this4.fx.burst(w.clone(), (_crd && hex === void 0 ? (_reportPossibleCrUseOfhex({
              error: Error()
            }), hex) : hex)("#cfd6e4"), 5, 28);
          })();
        }

        damage(id, amount, hpAfter, heal) {
          var _this5 = this;

          return _asyncToGenerator(function* () {
            var s = _this5.units.get(id);

            if (s) {
              s.punch(heal ? 1.1 : 1.25);

              _this5.fx.burst(s.world.clone(), heal ? (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
                error: Error()
              }), UI) : UI).heal : (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
                error: Error()
              }), UI) : UI).danger, heal ? 5 : 9, heal ? 30 : 50);

              _this5.float(s.world.clone(), "" + (heal ? "+" : "-") + amount, heal ? (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
                error: Error()
              }), UI) : UI).heal : hpAfter <= 0 ? (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
                error: Error()
              }), UI) : UI).danger : (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
                error: Error()
              }), UI) : UI).good);

              s.setHp(hpAfter);
            }

            return _this5.wait(0.2);
          })();
        }

        terrain(p, terrain) {
          var _this6 = this;

          return _asyncToGenerator(function* () {
            var color = terrain === "fire" ? (_crd && hex === void 0 ? (_reportPossibleCrUseOfhex({
              error: Error()
            }), hex) : hex)("#ff6a2a") : terrain === "trap" ? (_crd && hex === void 0 ? (_reportPossibleCrUseOfhex({
              error: Error()
            }), hex) : hex)("#9a4ad9") : (_crd && hex === void 0 ? (_reportPossibleCrUseOfhex({
              error: Error()
            }), hex) : hex)("#ffffff");

            _this6.fx.burst(_this6.coord.posToWorld(p, 0.1), color, 12, 55);

            return _this6.wait(0.12);
          })();
        }

        die(id) {
          var _this7 = this;

          return _asyncToGenerator(function* () {
            var s = _this7.units.get(id);

            if (!s) return;

            _this7.fx.burst(s.world.clone(), (_crd && hex === void 0 ? (_reportPossibleCrUseOfhex({
              error: Error()
            }), hex) : hex)("#88909e"), 14, 60);

            yield new Promise(res => s.die(res));
          })();
        }
        /** 上浮并淡出的飘字。 */


        float(world, text, color) {
          var l = (_crd && uiLabel === void 0 ? (_reportPossibleCrUseOfuiLabel({
            error: Error()
          }), uiLabel) : uiLabel)(this.floatLayer, text, {
            size: 26,
            color,
            bold: true,
            outline: (_crd && hex === void 0 ? (_reportPossibleCrUseOfhex({
              error: Error()
            }), hex) : hex)("#000000", 200)
          });
          var w = new Vec3();
          this.rig.worldToUI(new Vec3(world.x, world.y + 0.7, world.z), w);
          l.node.setPosition(new Vec3(w.x, w.y, 0));
          tween(l.node).by(0.7, {
            position: new Vec3(0, 60, 0)
          }, {
            easing: "quadOut"
          }).start();
          tween(l.node).delay(0.4).to(0.3, {
            scale: new Vec3(0.4, 0.4, 1)
          }).call(() => l.node.destroy()).start();
        }

      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=00371c788c30cc234e5ea25789159e503cd7b66a.js.map
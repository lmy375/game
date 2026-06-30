System.register(["__unresolved_0", "cc", "__unresolved_1"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, Input, input, EventMouse, Vec3, geometry, BattleSimulator, EnemyAI, loadLevel, cloneState, activeUnit, computeMoveRange, getCastableCells, canCast, previewSkill, describePreview, predictTurnOrder, directionTo, eq, unitById, isAlive, InputController, _crd, EFFECT_EVENTS;

  function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

  function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

  function _reportPossibleCrUseOfBattleState(extras) {
    _reporterNs.report("BattleState", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfBattleSimulator(extras) {
    _reporterNs.report("BattleSimulator", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfEnemyAI(extras) {
    _reporterNs.report("EnemyAI", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfContentRegistry(extras) {
    _reporterNs.report("ContentRegistry", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfLevelDef(extras) {
    _reporterNs.report("LevelDef", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfloadLevel(extras) {
    _reporterNs.report("loadLevel", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfcloneState(extras) {
    _reporterNs.report("cloneState", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfactiveUnit(extras) {
    _reporterNs.report("activeUnit", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfcomputeMoveRange(extras) {
    _reporterNs.report("computeMoveRange", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfgetCastableCells(extras) {
    _reporterNs.report("getCastableCells", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfcanCast(extras) {
    _reporterNs.report("canCast", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfpreviewSkill(extras) {
    _reporterNs.report("previewSkill", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfdescribePreview(extras) {
    _reporterNs.report("describePreview", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfpredictTurnOrder(extras) {
    _reporterNs.report("predictTurnOrder", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfdirectionTo(extras) {
    _reporterNs.report("directionTo", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfeq(extras) {
    _reporterNs.report("eq", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfPosition(extras) {
    _reporterNs.report("Position", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfDirection(extras) {
    _reporterNs.report("Direction", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfUnit(extras) {
    _reporterNs.report("Unit", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfunitById(extras) {
    _reporterNs.report("unitById", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfisAlive(extras) {
    _reporterNs.report("isAlive", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfBattleAction(extras) {
    _reporterNs.report("BattleAction", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfBattleEvent(extras) {
    _reporterNs.report("BattleEvent", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfCoordMap(extras) {
    _reporterNs.report("CoordMap", "../core/CoordMap", _context.meta, extras);
  }

  function _reportPossibleCrUseOfOverlay(extras) {
    _reporterNs.report("Overlay", "../core/types", _context.meta, extras);
  }

  function _reportPossibleCrUseOfArrow(extras) {
    _reporterNs.report("Arrow", "../core/types", _context.meta, extras);
  }

  function _reportPossibleCrUseOfDamageLabel(extras) {
    _reporterNs.report("DamageLabel", "../core/types", _context.meta, extras);
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

  function _reportPossibleCrUseOfRosterRow(extras) {
    _reporterNs.report("RosterRow", "../view/HudView", _context.meta, extras);
  }

  function _reportPossibleCrUseOfMenuItem(extras) {
    _reporterNs.report("MenuItem", "../view/HudView", _context.meta, extras);
  }

  function _reportPossibleCrUseOfEventAnimator(extras) {
    _reporterNs.report("EventAnimator", "../anim/EventAnimator", _context.meta, extras);
  }

  _export("InputController", void 0);

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      Input = _cc.Input;
      input = _cc.input;
      EventMouse = _cc.EventMouse;
      Vec3 = _cc.Vec3;
      geometry = _cc.geometry;
    }, function (_unresolved_2) {
      BattleSimulator = _unresolved_2.BattleSimulator;
      EnemyAI = _unresolved_2.EnemyAI;
      loadLevel = _unresolved_2.loadLevel;
      cloneState = _unresolved_2.cloneState;
      activeUnit = _unresolved_2.activeUnit;
      computeMoveRange = _unresolved_2.computeMoveRange;
      getCastableCells = _unresolved_2.getCastableCells;
      canCast = _unresolved_2.canCast;
      previewSkill = _unresolved_2.previewSkill;
      describePreview = _unresolved_2.describePreview;
      predictTurnOrder = _unresolved_2.predictTurnOrder;
      directionTo = _unresolved_2.directionTo;
      eq = _unresolved_2.eq;
      unitById = _unresolved_2.unitById;
      isAlive = _unresolved_2.isAlive;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "b41e4JWCH1BFqBiNZPewvAz", "InputController", undefined);

      __checkObsolete__(['Component', 'Input', 'input', 'EventMouse', 'EventTouch', 'Camera', 'Vec3', 'geometry', 'tween']);

      /** 视为「对目标产生了实际效果」的事件(禁止空放技能)。 */
      EFFECT_EVENTS = new Set(["unit_damaged", "unit_displaced", "unit_healed", "unit_status_applied", "collision_damage", "terrain_triggered", "obstacle_destroyed", "unit_died"]);
      /**
       * 战斗控制器(Cocos 版):连接输入 → game-core 模拟器 → 各 View + EventAnimator。
       * 交互状态机与 Web 版 BattleController 一致;差异仅在输入(相机射线拾取)与表现(动画/UI)。
       */

      _export("InputController", InputController = class InputController {
        constructor(host, registry, coord, rig, board, units, overlay, hud, animator) {
          this.state = void 0;
          this.level = void 0;
          this.sim = void 0;
          this.ai = void 0;
          this.activeSkill = null;
          this.pending = null;
          this.hover = null;
          this.busy = false;
          this.menuOpen = false;

          /** 技能瞄准:第一次点击后锁定范围(不再随指针移动),第二次点击释放。 */
          this.aimLocked = false;
          this.preMove = null;
          this.host = host;
          this.registry = registry;
          this.coord = coord;
          this.rig = rig;
          this.board = board;
          this.units = units;
          this.overlay = overlay;
          this.hud = hud;
          this.animator = animator;
          this.sim = new (_crd && BattleSimulator === void 0 ? (_reportPossibleCrUseOfBattleSimulator({
            error: Error()
          }), BattleSimulator) : BattleSimulator)(registry);
          this.ai = new (_crd && EnemyAI === void 0 ? (_reportPossibleCrUseOfEnemyAI({
            error: Error()
          }), EnemyAI) : EnemyAI)(registry, this.sim);
          this.bindInput();
        } // ---------- 加载 ----------


        load(level) {
          var _level$teach;

          this.level = level;
          this.state = (_crd && loadLevel === void 0 ? (_reportPossibleCrUseOfloadLevel({
            error: Error()
          }), loadLevel) : loadLevel)(level, this.registry);
          this.clearSel();
          this.busy = false;
          this.hud.hideBanner();
          this.hud.setHint("\uD83C\uDFAF " + level.name + ":" + ((_level$teach = level.teach) != null ? _level$teach : ""));
          this.hud.clearLog();
          this.hud.log("\u5173\u5361\u300C" + level.name + "\u300D\u5F00\u59CB\u3002");
          this.units.sync(this.state);
          this.refresh();
          void this.processTurn();
        }

        clearSel() {
          this.activeSkill = null;
          this.pending = null;
          this.preMove = null;
          this.menuOpen = false;
          this.aimLocked = false;
        } // ---------- 工具 ----------


        active() {
          return (_crd && activeUnit === void 0 ? (_reportPossibleCrUseOfactiveUnit({
            error: Error()
          }), activeUnit) : activeUnit)(this.state);
        }

        isPlayerTurn() {
          var a = this.active();
          return !!a && a.faction === "player" && !this.state.outcome && !this.busy;
        }

        finished(u) {
          if (u.movedThisTurn && u.actedThisTurn) return true;
          if (u.actedThisTurn && (_crd && computeMoveRange === void 0 ? (_reportPossibleCrUseOfcomputeMoveRange({
            error: Error()
          }), computeMoveRange) : computeMoveRange)(this.state, u.instanceId).length === 0) return true;
          return false;
        }

        canMove(u) {
          var _this$preMove;

          if (((_this$preMove = this.preMove) == null ? void 0 : _this$preMove.unitId) === u.instanceId) return true;
          return !u.movedThisTurn;
        }

        moveBase(u) {
          var _this$preMove2;

          return ((_this$preMove2 = this.preMove) == null ? void 0 : _this$preMove2.unitId) === u.instanceId ? this.preMove.base : this.state;
        }

        findUnitAt(cell) {
          return this.state.units.find(u => (_crd && isAlive === void 0 ? (_reportPossibleCrUseOfisAlive({
            error: Error()
          }), isAlive) : isAlive)(u) && (_crd && eq === void 0 ? (_reportPossibleCrUseOfeq({
            error: Error()
          }), eq) : eq)(u.pos, cell));
        }

        hasEffect(events) {
          return events.some(e => EFFECT_EVENTS.has(e.type));
        } // ---------- 输入:屏幕 → 逻辑格 ----------


        bindInput() {
          input.on(Input.EventType.MOUSE_MOVE, e => {
            if (this.busy) return;
            var cell = this.pick(e.getLocationX(), e.getLocationY());
            this.hover = cell;
            if (this.activeSkill && !this.aimLocked && cell) this.updatePendingFromCell(cell);
            this.refresh();
          });
          input.on(Input.EventType.MOUSE_DOWN, e => {
            if (e.getButton() === EventMouse.BUTTON_RIGHT) {
              this.cancel();
              return;
            }

            var cell = this.pick(e.getLocationX(), e.getLocationY());
            if (cell) this.tapCell(cell);
          });
          input.on(Input.EventType.TOUCH_END, e => {
            var cell = this.pick(e.getLocationX(), e.getLocationY());
            if (cell) this.tapCell(cell);
          });
        }
        /** 相机射线 ∩ 地面(y=0)→ 逻辑格。 */


        pick(sx, sy) {
          var cam = this.rig.world3DCamera;
          var ray = new geometry.Ray();
          cam.screenPointToRay(sx, sy, ray);
          if (Math.abs(ray.d.y) < 1e-6) return null;
          var t = -ray.o.y / ray.d.y;
          if (t < 0) return null;
          var hit = new Vec3(ray.o.x + ray.d.x * t, 0, ray.o.z + ray.d.z * t);
          return this.coord.worldToCell(hit);
        } // ---------- 点击格 ----------


        tapCell(cell) {
          if (!this.isPlayerTurn()) return;
          var active = this.active(); // 第一次点击锁定范围(之后不随指针移动),第二次点击释放;右键取消。

          if (this.activeSkill) {
            if (this.aimLocked) {
              void this.confirm();
            } else {
              this.updatePendingFromCell(cell);
              if (this.canReleasePending()) this.aimLocked = true;
              this.refresh();
            }

            return;
          }

          var clicked = this.findUnitAt(cell);

          if (clicked && clicked.instanceId === active.instanceId) {
            this.menuOpen = !this.menuOpen;
            this.refresh();
            return;
          }

          if (this.canMove(active)) {
            var range = (_crd && computeMoveRange === void 0 ? (_reportPossibleCrUseOfcomputeMoveRange({
              error: Error()
            }), computeMoveRange) : computeMoveRange)(this.moveBase(active), active.instanceId);

            if (range.some(p => (_crd && eq === void 0 ? (_reportPossibleCrUseOfeq({
              error: Error()
            }), eq) : eq)(p, cell))) {
              void this.tentativeMove(cell);
              return;
            }
          }

          this.menuOpen = false;
          this.refresh();
        }

        tentativeMove(cell) {
          var _this = this;

          return _asyncToGenerator(function* () {
            var _this$preMove3;

            var active = _this.active();

            var id = active.instanceId;
            var base = ((_this$preMove3 = _this.preMove) == null ? void 0 : _this$preMove3.unitId) === id ? _this.preMove.base : (_crd && cloneState === void 0 ? (_reportPossibleCrUseOfcloneState({
              error: Error()
            }), cloneState) : cloneState)(_this.state);

            var res = _this.sim.simulate(base, {
              type: "move",
              actorId: id,
              moveTo: cell
            });

            if (!res.ok) {
              var _res$error;

              _this.hud.log("\u26A0 " + ((_res$error = res.error) != null ? _res$error : "无法移动"));

              return;
            }

            _this.preMove = {
              base,
              unitId: id
            };
            _this.state = res.nextState; // 让立绘从「本回合起点」走起,重复改点也是干净的行走动画

            var start = (_crd && unitById === void 0 ? (_reportPossibleCrUseOfunitById({
              error: Error()
            }), unitById) : unitById)(base, id);

            var s = _this.units.get(id);

            if (s && start) _this.coord.posToWorld(start.pos, 0, s.world);
            _this.busy = true;

            _this.overlay.clear();

            _this.hud.hideMenu();

            yield _this.animator.play(res.events);

            _this.units.sync(_this.state);

            _this.busy = false;
            _this.menuOpen = true;

            _this.refresh();

            yield _this.afterPlayerAction();
          })();
        }

        undoMove() {
          var _this$active;

          if (!this.preMove || this.preMove.unitId !== ((_this$active = this.active()) == null ? void 0 : _this$active.instanceId)) return;
          this.state = this.preMove.base;
          this.preMove = null;
          this.menuOpen = false;
          this.units.sync(this.state);
          this.hud.log("↩ 撤销移动");
          this.refresh();
        }

        updatePendingFromCell(cell) {
          var active = this.active();
          if (!active || !this.activeSkill) return;
          var skill = this.registry.skill(this.activeSkill);

          if (skill.targetType === "direction") {
            var dir = (_crd && eq === void 0 ? (_reportPossibleCrUseOfeq({
              error: Error()
            }), eq) : eq)(cell, active.pos) ? active.facing : (_crd && directionTo === void 0 ? (_reportPossibleCrUseOfdirectionTo({
              error: Error()
            }), directionTo) : directionTo)(active.pos, cell);
            this.pending = {
              direction: dir
            };
          } else if (skill.targetType === "unit") {
            var target = this.findUnitAt(cell);
            this.pending = target ? {
              unitId: target.instanceId,
              cell
            } : null;
          } else {
            this.pending = {
              cell
            };
          }
        }
        /** 当前 pending 是否可释放(合法且命中有效目标)。 */


        canReleasePending() {
          var active = this.active();
          if (!active || !this.activeSkill || !this.pending) return false;
          var skill = this.registry.skill(this.activeSkill);
          if (!(_crd && canCast === void 0 ? (_reportPossibleCrUseOfcanCast({
            error: Error()
          }), canCast) : canCast)(this.state, active, skill, this.pending)) return false;
          var pv = (_crd && previewSkill === void 0 ? (_reportPossibleCrUseOfpreviewSkill({
            error: Error()
          }), previewSkill) : previewSkill)(this.state, this.sim, this.registry, active.instanceId, this.activeSkill, this.pending);
          return pv.ok && this.hasEffect(pv.events);
        } // ---------- 技能 ----------


        selectSkill(skillId) {
          var _active$cooldowns$ski;

          var active = this.active();
          if (!active || active.actedThisTurn) return;
          if (((_active$cooldowns$ski = active.cooldowns[skillId]) != null ? _active$cooldowns$ski : 0) > 0) return;
          this.activeSkill = skillId;
          this.pending = null;
          this.aimLocked = false;
          this.refresh();
        }

        confirm() {
          var _this2 = this;

          return _asyncToGenerator(function* () {
            var active = _this2.active();

            if (!active || !_this2.activeSkill || !_this2.pending) return;

            var skill = _this2.registry.skill(_this2.activeSkill);

            if (!(_crd && canCast === void 0 ? (_reportPossibleCrUseOfcanCast({
              error: Error()
            }), canCast) : canCast)(_this2.state, active, skill, _this2.pending)) return;
            var preview = (_crd && previewSkill === void 0 ? (_reportPossibleCrUseOfpreviewSkill({
              error: Error()
            }), previewSkill) : previewSkill)(_this2.state, _this2.sim, _this2.registry, active.instanceId, _this2.activeSkill, _this2.pending);

            if (!preview.ok || !_this2.hasEffect(preview.events)) {
              _this2.hud.log("⚠ 该技能未命中任何有效目标,无法释放");

              return;
            }

            var action = {
              type: "skill",
              actorId: active.instanceId,
              skillId: _this2.activeSkill,
              targetCell: _this2.pending.cell,
              targetUnitId: _this2.pending.unitId,
              direction: _this2.pending.direction
            };
            _this2.preMove = null;
            _this2.activeSkill = null;
            _this2.pending = null;
            _this2.aimLocked = false;
            _this2.menuOpen = false;
            yield _this2.exec(action);
            yield _this2.afterPlayerAction();
          })();
        }

        cancel() {
          if (!this.activeSkill) return;
          this.activeSkill = null;
          this.pending = null;
          this.aimLocked = false;
          this.refresh();
        }

        endActiveUnit() {
          if (!this.isPlayerTurn()) return;
          void this.advanceTurn();
        }
        /** 执行行动:模拟 → 播放事件动画 → 同步终态 → 刷新。 */


        exec(action) {
          var _this3 = this;

          return _asyncToGenerator(function* () {
            var res = _this3.sim.simulate(_this3.state, action);

            if (!res.ok) {
              var _res$error2;

              _this3.hud.log("\u26A0 " + ((_res$error2 = res.error) != null ? _res$error2 : "行动无效"));

              return;
            }

            _this3.busy = true;

            _this3.overlay.clear();

            _this3.hud.hideMenu();

            _this3.state = res.nextState;

            _this3.logEvents(res.events);

            yield _this3.animator.play(res.events);

            _this3.units.sync(_this3.state);

            _this3.busy = false;

            _this3.refresh();
          })();
        }

        afterPlayerAction() {
          var _this4 = this;

          return _asyncToGenerator(function* () {
            if (_this4.checkEnd()) return;

            var active = _this4.active();

            if (active && active.faction === "player" && _this4.finished(active)) {
              yield _this4.advanceTurn();
            } else {
              _this4.refresh();
            }
          })();
        }

        advanceTurn() {
          var _this5 = this;

          return _asyncToGenerator(function* () {
            _this5.clearSel();

            var res = _this5.sim.simulate(_this5.state, {
              type: "end_turn"
            });

            _this5.state = res.nextState;

            _this5.logEvents(res.events);

            _this5.units.sync(_this5.state);

            _this5.refresh();

            yield _this5.processTurn();
          })();
        }
        /** 行动循环:敌方由 AI 自动行动(带动画),直到轮到我方或分出胜负。 */


        processTurn() {
          var _this6 = this;

          return _asyncToGenerator(function* () {
            while (!_this6.state.outcome) {
              var active = _this6.active();

              if (!active) break;

              if (active.faction === "player") {
                if (_this6.finished(active)) {
                  var res = _this6.sim.simulate(_this6.state, {
                    type: "end_turn"
                  });

                  _this6.state = res.nextState;

                  _this6.logEvents(res.events);

                  _this6.units.sync(_this6.state);

                  continue;
                }

                _this6.busy = false;
                _this6.activeSkill = null;
                _this6.pending = null;
                _this6.preMove = null;
                _this6.menuOpen = !_this6.canMove(active);

                _this6.refresh();

                return; // 等待玩家输入
              } // 敌方 AI 行动(逐个动作带动画)


              _this6.busy = true;

              _this6.refresh();

              var actions = _this6.ai.planTurn(_this6.state);

              for (var act of actions) {
                var _res = _this6.sim.simulate(_this6.state, act);

                if (_res.ok) {
                  _this6.state = _res.nextState;

                  _this6.logEvents(_res.events);

                  if (act.type !== "end_turn") {
                    yield _this6.animator.play(_res.events);

                    _this6.units.sync(_this6.state);

                    _this6.refresh();
                  } else {
                    _this6.units.sync(_this6.state);
                  }
                }

                if (_this6.state.outcome) break;
              }

              _this6.busy = false;
            }

            _this6.busy = false;

            _this6.refresh();

            _this6.checkEnd();
          })();
        }

        checkEnd() {
          if (!this.state.outcome) return false;
          var win = this.state.outcome === "player_win";
          this.hud.showBanner(win, () => this.load(this.level));
          return true;
        } // ---------- 刷新(构建 Overlay + 喂 HUD) ----------


        refresh() {
          var _this$hover;

          var overlay = {
            hoverCell: (_this$hover = this.hover) != null ? _this$hover : undefined
          };
          var active = this.active();
          if (active) overlay.selectedUnitId = active.instanceId;
          var myTurn = this.isPlayerTurn();

          if (active && myTurn) {
            var _this$preMove4;

            if (((_this$preMove4 = this.preMove) == null ? void 0 : _this$preMove4.unitId) === active.instanceId) {
              var start = (_crd && unitById === void 0 ? (_reportPossibleCrUseOfunitById({
                error: Error()
              }), unitById) : unitById)(this.preMove.base, active.instanceId);
              if (start) overlay.originCell = start.pos;
            }

            if (this.activeSkill) {
              overlay.castCells = (_crd && getCastableCells === void 0 ? (_reportPossibleCrUseOfgetCastableCells({
                error: Error()
              }), getCastableCells) : getCastableCells)(this.state, active, this.registry.skill(this.activeSkill));
              this.applyPreview(overlay);
            } else if (this.canMove(active)) {
              overlay.moveCells = (_crd && computeMoveRange === void 0 ? (_reportPossibleCrUseOfcomputeMoveRange({
                error: Error()
              }), computeMoveRange) : computeMoveRange)(this.moveBase(active), active.instanceId);
            }
          }

          this.overlay.show(overlay);
          this.units.setSelected(active == null ? void 0 : active.instanceId);
          this.renderHud(active, myTurn);
        }

        applyPreview(overlay) {
          var active = this.active();
          if (!active || !this.activeSkill || !this.pending) return;
          var preview = (_crd && previewSkill === void 0 ? (_reportPossibleCrUseOfpreviewSkill({
            error: Error()
          }), previewSkill) : previewSkill)(this.state, this.sim, this.registry, active.instanceId, this.activeSkill, this.pending);
          if (!preview.ok) return;
          overlay.hitCenter = preview.hitCells.filter(c => c.effectKey === "center").map(c => c.pos);
          overlay.hitArm = preview.hitCells.filter(c => c.effectKey !== "center").map(c => c.pos);
          var arrows = [];
          var boxes = [];
          var dmgMap = new Map();
          var hazard = [];

          for (var e of preview.events) {
            if (e.type === "unit_displaced") {
              arrows.push({
                from: e.from,
                to: e.to
              });
              boxes.push(e.to);
            } else if (e.type === "unit_damaged" || e.type === "collision_damage") {
              var _dmgMap$get;

              var m = (_dmgMap$get = dmgMap.get(e.unitId)) != null ? _dmgMap$get : {
                dmg: 0,
                heal: 0
              };
              m.dmg += e.amount;
              dmgMap.set(e.unitId, m);
            } else if (e.type === "unit_healed") {
              var _dmgMap$get2;

              var _m = (_dmgMap$get2 = dmgMap.get(e.unitId)) != null ? _dmgMap$get2 : {
                dmg: 0,
                heal: 0
              };

              _m.heal += e.amount;
              dmgMap.set(e.unitId, _m);
            } else if (e.type === "terrain_triggered") {
              hazard.push(e.position);
            }
          }

          var labels = [];

          for (var [uid, _m2] of dmgMap) {
            var _finalUnit$pos, _ref;

            var finalUnit = (_crd && unitById === void 0 ? (_reportPossibleCrUseOfunitById({
              error: Error()
            }), unitById) : unitById)(preview.resultState, uid);
            var pos = (_finalUnit$pos = finalUnit == null ? void 0 : finalUnit.pos) != null ? _finalUnit$pos : (_ref = (_crd && unitById === void 0 ? (_reportPossibleCrUseOfunitById({
              error: Error()
            }), unitById) : unitById)(this.state, uid)) == null ? void 0 : _ref.pos;
            if (!pos) continue;
            var lethal = !finalUnit || finalUnit.hp <= 0;
            if (_m2.dmg > 0) labels.push({
              pos,
              amount: _m2.dmg,
              lethal,
              kind: "damage"
            });else if (_m2.heal > 0) labels.push({
              pos,
              amount: _m2.heal,
              lethal: false,
              kind: "heal"
            });
          }

          overlay.arrows = arrows;
          overlay.finalBoxes = boxes;
          overlay.damage = labels;
          overlay.hazardWarn = hazard;
        } // ---------- HUD ----------


        renderHud(active, myTurn) {
          // 回合提示
          if (this.busy) this.hud.setTurn(active ? "\u654C\u65B9\u884C\u52A8:" + active.name : "敌方行动…");else if (active) this.hud.setTurn((active.faction === "player" ? "我方" : "敌方") + "\u884C\u52A8:" + active.name);else this.hud.setTurn(""); // 行动顺序

          this.hud.renderOrder((_crd && predictTurnOrder === void 0 ? (_reportPossibleCrUseOfpredictTurnOrder({
            error: Error()
          }), predictTurnOrder) : predictTurnOrder)(this.state, 6).map((id, i) => {
            var u = (_crd && unitById === void 0 ? (_reportPossibleCrUseOfunitById({
              error: Error()
            }), unitById) : unitById)(this.state, id);
            if (!u) return null;
            return {
              name: u.name,
              kind: i === 0 ? "now" : u.faction
            };
          }).filter(x => !!x)); // 名册

          var rows = this.state.units.map(u => ({
            name: u.name,
            speed: u.stats.speed,
            hp: u.hp,
            maxHp: u.maxHp,
            faction: u.faction,
            dead: u.hp <= 0,
            sel: u.instanceId === this.state.activeUnitId
          }));
          this.hud.renderRoster(rows); // 技能菜单

          if (active && myTurn && this.menuOpen && !this.activeSkill && !this.finished(active)) {
            var _this$preMove5;

            var items = active.skills.map(sid => {
              var _active$cooldowns$sid;

              var skill = this.registry.skill(sid);
              var cd = (_active$cooldowns$sid = active.cooldowns[sid]) != null ? _active$cooldowns$sid : 0;
              return {
                skillId: sid,
                name: skill.name,
                desc: skill.description,
                disabled: active.actedThisTurn || cd > 0
              };
            });
            var uiPos = this.rig.worldToUI(this.coord.posToWorld(active.pos, 0.4));
            this.hud.showMenu(active.name, items, ((_this$preMove5 = this.preMove) == null ? void 0 : _this$preMove5.unitId) === active.instanceId, new Vec3(uiPos.x, uiPos.y, 0), {
              onSkill: id => this.selectSkill(id),
              onUndo: () => this.undoMove(),
              onEnd: () => this.endActiveUnit()
            });
          } else {
            this.hud.hideMenu();
          } // 确认条


          if (myTurn && active && this.activeSkill && this.pending) {
            var skill = this.registry.skill(this.activeSkill);
            var can = (_crd && canCast === void 0 ? (_reportPossibleCrUseOfcanCast({
              error: Error()
            }), canCast) : canCast)(this.state, active, skill, this.pending);
            var effect = false;
            var desc = "无效目标";

            if (can) {
              var preview = (_crd && previewSkill === void 0 ? (_reportPossibleCrUseOfpreviewSkill({
                error: Error()
              }), previewSkill) : previewSkill)(this.state, this.sim, this.registry, active.instanceId, this.activeSkill, this.pending);
              effect = this.hasEffect(preview.events);
              var lines = (_crd && describePreview === void 0 ? (_reportPossibleCrUseOfdescribePreview({
                error: Error()
              }), describePreview) : describePreview)(this.state, preview.events).filter(l => !l.includes("施放"));
              desc = effect ? lines.join("　·　") : "未命中有效目标,无法释放";
            }

            this.hud.showConfirm(skill.name, desc, can && effect, {
              onConfirm: () => void this.confirm(),
              onCancel: () => this.cancel()
            });
          } else {
            this.hud.hideConfirm();
          }
        } // ---------- 日志 ----------


        logEvents(events) {
          for (var line of (_crd && describePreview === void 0 ? (_reportPossibleCrUseOfdescribePreview({
            error: Error()
          }), describePreview) : describePreview)(this.state, events)) this.hud.log(line);

          for (var e of events) {
            if (e.type === "turn_started") {
              var _u$name;

              var u = e.unitId ? (_crd && unitById === void 0 ? (_reportPossibleCrUseOfunitById({
                error: Error()
              }), unitById) : unitById)(this.state, e.unitId) : undefined;
              this.hud.log("\u2014 \u8F6E\u5230 " + ((_u$name = u == null ? void 0 : u.name) != null ? _u$name : e.faction === "player" ? "我方" : "敌方") + " \u884C\u52A8 \u2014");
            }

            if (e.type === "battle_ended") this.hud.log(e.outcome === "player_win" ? "🎉 我方胜利" : "💀 我方战败");
          }
        }

      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=10c549647b6fb8eee5fef943d50e20ab58994dca.js.map
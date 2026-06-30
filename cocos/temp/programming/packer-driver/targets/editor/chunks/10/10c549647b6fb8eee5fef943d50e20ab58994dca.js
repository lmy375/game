System.register(["__unresolved_0", "cc", "__unresolved_1"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, Input, input, EventMouse, Vec3, geometry, BattleSimulator, EnemyAI, loadLevel, cloneState, activeUnit, computeMoveRange, getCastableCells, canCast, previewSkill, describePreview, predictTurnOrder, directionTo, eq, unitById, isAlive, InputController, _crd, EFFECT_EVENTS;

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
          this.hud.setHint(`🎯 ${level.name}:${(_level$teach = level.teach) != null ? _level$teach : ""}`);
          this.hud.clearLog();
          this.hud.log(`关卡「${level.name}」开始。`);
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
          const a = this.active();
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
            const cell = this.pick(e.getLocationX(), e.getLocationY());
            this.hover = cell;
            if (this.activeSkill && !this.aimLocked && cell) this.updatePendingFromCell(cell);
            this.refresh();
          });
          input.on(Input.EventType.MOUSE_DOWN, e => {
            if (e.getButton() === EventMouse.BUTTON_RIGHT) {
              this.cancel();
              return;
            }

            const cell = this.pick(e.getLocationX(), e.getLocationY());
            if (cell) this.tapCell(cell);
          });
          input.on(Input.EventType.TOUCH_END, e => {
            const cell = this.pick(e.getLocationX(), e.getLocationY());
            if (cell) this.tapCell(cell);
          });
        }
        /** 相机射线 ∩ 地面(y=0)→ 逻辑格。 */


        pick(sx, sy) {
          const cam = this.rig.world3DCamera;
          const ray = new geometry.Ray();
          cam.screenPointToRay(sx, sy, ray);
          if (Math.abs(ray.d.y) < 1e-6) return null;
          const t = -ray.o.y / ray.d.y;
          if (t < 0) return null;
          const hit = new Vec3(ray.o.x + ray.d.x * t, 0, ray.o.z + ray.d.z * t);
          return this.coord.worldToCell(hit);
        } // ---------- 点击格 ----------


        tapCell(cell) {
          if (!this.isPlayerTurn()) return;
          const active = this.active(); // 第一次点击锁定范围(之后不随指针移动),第二次点击释放;右键取消。

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

          const clicked = this.findUnitAt(cell);

          if (clicked && clicked.instanceId === active.instanceId) {
            this.menuOpen = !this.menuOpen;
            this.refresh();
            return;
          }

          if (this.canMove(active)) {
            const range = (_crd && computeMoveRange === void 0 ? (_reportPossibleCrUseOfcomputeMoveRange({
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

        async tentativeMove(cell) {
          var _this$preMove3;

          const active = this.active();
          const id = active.instanceId;
          const base = ((_this$preMove3 = this.preMove) == null ? void 0 : _this$preMove3.unitId) === id ? this.preMove.base : (_crd && cloneState === void 0 ? (_reportPossibleCrUseOfcloneState({
            error: Error()
          }), cloneState) : cloneState)(this.state);
          const res = this.sim.simulate(base, {
            type: "move",
            actorId: id,
            moveTo: cell
          });

          if (!res.ok) {
            var _res$error;

            this.hud.log(`⚠ ${(_res$error = res.error) != null ? _res$error : "无法移动"}`);
            return;
          }

          this.preMove = {
            base,
            unitId: id
          };
          this.state = res.nextState; // 让立绘从「本回合起点」走起,重复改点也是干净的行走动画

          const start = (_crd && unitById === void 0 ? (_reportPossibleCrUseOfunitById({
            error: Error()
          }), unitById) : unitById)(base, id);
          const s = this.units.get(id);
          if (s && start) this.coord.posToWorld(start.pos, 0, s.world);
          this.busy = true;
          this.overlay.clear();
          this.hud.hideMenu();
          await this.animator.play(res.events);
          this.units.sync(this.state);
          this.busy = false;
          this.menuOpen = true;
          this.refresh();
          await this.afterPlayerAction();
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
          const active = this.active();
          if (!active || !this.activeSkill) return;
          const skill = this.registry.skill(this.activeSkill);

          if (skill.targetType === "direction") {
            const dir = (_crd && eq === void 0 ? (_reportPossibleCrUseOfeq({
              error: Error()
            }), eq) : eq)(cell, active.pos) ? active.facing : (_crd && directionTo === void 0 ? (_reportPossibleCrUseOfdirectionTo({
              error: Error()
            }), directionTo) : directionTo)(active.pos, cell);
            this.pending = {
              direction: dir
            };
          } else if (skill.targetType === "unit") {
            const target = this.findUnitAt(cell);
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
          const active = this.active();
          if (!active || !this.activeSkill || !this.pending) return false;
          const skill = this.registry.skill(this.activeSkill);
          if (!(_crd && canCast === void 0 ? (_reportPossibleCrUseOfcanCast({
            error: Error()
          }), canCast) : canCast)(this.state, active, skill, this.pending)) return false;
          const pv = (_crd && previewSkill === void 0 ? (_reportPossibleCrUseOfpreviewSkill({
            error: Error()
          }), previewSkill) : previewSkill)(this.state, this.sim, this.registry, active.instanceId, this.activeSkill, this.pending);
          return pv.ok && this.hasEffect(pv.events);
        } // ---------- 技能 ----------


        selectSkill(skillId) {
          var _active$cooldowns$ski;

          const active = this.active();
          if (!active || active.actedThisTurn) return;
          if (((_active$cooldowns$ski = active.cooldowns[skillId]) != null ? _active$cooldowns$ski : 0) > 0) return;
          this.activeSkill = skillId;
          this.pending = null;
          this.aimLocked = false;
          this.refresh();
        }

        async confirm() {
          const active = this.active();
          if (!active || !this.activeSkill || !this.pending) return;
          const skill = this.registry.skill(this.activeSkill);
          if (!(_crd && canCast === void 0 ? (_reportPossibleCrUseOfcanCast({
            error: Error()
          }), canCast) : canCast)(this.state, active, skill, this.pending)) return;
          const preview = (_crd && previewSkill === void 0 ? (_reportPossibleCrUseOfpreviewSkill({
            error: Error()
          }), previewSkill) : previewSkill)(this.state, this.sim, this.registry, active.instanceId, this.activeSkill, this.pending);

          if (!preview.ok || !this.hasEffect(preview.events)) {
            this.hud.log("⚠ 该技能未命中任何有效目标,无法释放");
            return;
          }

          const action = {
            type: "skill",
            actorId: active.instanceId,
            skillId: this.activeSkill,
            targetCell: this.pending.cell,
            targetUnitId: this.pending.unitId,
            direction: this.pending.direction
          };
          this.preMove = null;
          this.activeSkill = null;
          this.pending = null;
          this.aimLocked = false;
          this.menuOpen = false;
          await this.exec(action);
          await this.afterPlayerAction();
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


        async exec(action) {
          const res = this.sim.simulate(this.state, action);

          if (!res.ok) {
            var _res$error2;

            this.hud.log(`⚠ ${(_res$error2 = res.error) != null ? _res$error2 : "行动无效"}`);
            return;
          }

          this.busy = true;
          this.overlay.clear();
          this.hud.hideMenu();
          this.state = res.nextState;
          this.logEvents(res.events);
          await this.animator.play(res.events);
          this.units.sync(this.state);
          this.busy = false;
          this.refresh();
        }

        async afterPlayerAction() {
          if (this.checkEnd()) return;
          const active = this.active();

          if (active && active.faction === "player" && this.finished(active)) {
            await this.advanceTurn();
          } else {
            this.refresh();
          }
        }

        async advanceTurn() {
          this.clearSel();
          const res = this.sim.simulate(this.state, {
            type: "end_turn"
          });
          this.state = res.nextState;
          this.logEvents(res.events);
          this.units.sync(this.state);
          this.refresh();
          await this.processTurn();
        }
        /** 行动循环:敌方由 AI 自动行动(带动画),直到轮到我方或分出胜负。 */


        async processTurn() {
          while (!this.state.outcome) {
            const active = this.active();
            if (!active) break;

            if (active.faction === "player") {
              if (this.finished(active)) {
                const res = this.sim.simulate(this.state, {
                  type: "end_turn"
                });
                this.state = res.nextState;
                this.logEvents(res.events);
                this.units.sync(this.state);
                continue;
              }

              this.busy = false;
              this.activeSkill = null;
              this.pending = null;
              this.preMove = null;
              this.menuOpen = !this.canMove(active);
              this.refresh();
              return; // 等待玩家输入
            } // 敌方 AI 行动(逐个动作带动画)


            this.busy = true;
            this.refresh();
            const actions = this.ai.planTurn(this.state);

            for (const act of actions) {
              const res = this.sim.simulate(this.state, act);

              if (res.ok) {
                this.state = res.nextState;
                this.logEvents(res.events);

                if (act.type !== "end_turn") {
                  await this.animator.play(res.events);
                  this.units.sync(this.state);
                  this.refresh();
                } else {
                  this.units.sync(this.state);
                }
              }

              if (this.state.outcome) break;
            }

            this.busy = false;
          }

          this.busy = false;
          this.refresh();
          this.checkEnd();
        }

        checkEnd() {
          if (!this.state.outcome) return false;
          const win = this.state.outcome === "player_win";
          this.hud.showBanner(win, () => this.load(this.level));
          return true;
        } // ---------- 刷新(构建 Overlay + 喂 HUD) ----------


        refresh() {
          var _this$hover;

          const overlay = {
            hoverCell: (_this$hover = this.hover) != null ? _this$hover : undefined
          };
          const active = this.active();
          if (active) overlay.selectedUnitId = active.instanceId;
          const myTurn = this.isPlayerTurn();

          if (active && myTurn) {
            var _this$preMove4;

            if (((_this$preMove4 = this.preMove) == null ? void 0 : _this$preMove4.unitId) === active.instanceId) {
              const start = (_crd && unitById === void 0 ? (_reportPossibleCrUseOfunitById({
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
          const active = this.active();
          if (!active || !this.activeSkill || !this.pending) return;
          const preview = (_crd && previewSkill === void 0 ? (_reportPossibleCrUseOfpreviewSkill({
            error: Error()
          }), previewSkill) : previewSkill)(this.state, this.sim, this.registry, active.instanceId, this.activeSkill, this.pending);
          if (!preview.ok) return;
          overlay.hitCenter = preview.hitCells.filter(c => c.effectKey === "center").map(c => c.pos);
          overlay.hitArm = preview.hitCells.filter(c => c.effectKey !== "center").map(c => c.pos);
          const arrows = [];
          const boxes = [];
          const dmgMap = new Map();
          const hazard = [];

          for (const e of preview.events) {
            if (e.type === "unit_displaced") {
              arrows.push({
                from: e.from,
                to: e.to
              });
              boxes.push(e.to);
            } else if (e.type === "unit_damaged" || e.type === "collision_damage") {
              var _dmgMap$get;

              const m = (_dmgMap$get = dmgMap.get(e.unitId)) != null ? _dmgMap$get : {
                dmg: 0,
                heal: 0
              };
              m.dmg += e.amount;
              dmgMap.set(e.unitId, m);
            } else if (e.type === "unit_healed") {
              var _dmgMap$get2;

              const m = (_dmgMap$get2 = dmgMap.get(e.unitId)) != null ? _dmgMap$get2 : {
                dmg: 0,
                heal: 0
              };
              m.heal += e.amount;
              dmgMap.set(e.unitId, m);
            } else if (e.type === "terrain_triggered") {
              hazard.push(e.position);
            }
          }

          const labels = [];

          for (const [uid, m] of dmgMap) {
            var _finalUnit$pos, _ref;

            const finalUnit = (_crd && unitById === void 0 ? (_reportPossibleCrUseOfunitById({
              error: Error()
            }), unitById) : unitById)(preview.resultState, uid);
            const pos = (_finalUnit$pos = finalUnit == null ? void 0 : finalUnit.pos) != null ? _finalUnit$pos : (_ref = (_crd && unitById === void 0 ? (_reportPossibleCrUseOfunitById({
              error: Error()
            }), unitById) : unitById)(this.state, uid)) == null ? void 0 : _ref.pos;
            if (!pos) continue;
            const lethal = !finalUnit || finalUnit.hp <= 0;
            if (m.dmg > 0) labels.push({
              pos,
              amount: m.dmg,
              lethal,
              kind: "damage"
            });else if (m.heal > 0) labels.push({
              pos,
              amount: m.heal,
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
          if (this.busy) this.hud.setTurn(active ? `敌方行动:${active.name}` : "敌方行动…");else if (active) this.hud.setTurn(`${active.faction === "player" ? "我方" : "敌方"}行动:${active.name}`);else this.hud.setTurn(""); // 行动顺序

          this.hud.renderOrder((_crd && predictTurnOrder === void 0 ? (_reportPossibleCrUseOfpredictTurnOrder({
            error: Error()
          }), predictTurnOrder) : predictTurnOrder)(this.state, 6).map((id, i) => {
            const u = (_crd && unitById === void 0 ? (_reportPossibleCrUseOfunitById({
              error: Error()
            }), unitById) : unitById)(this.state, id);
            if (!u) return null;
            return {
              name: u.name,
              kind: i === 0 ? "now" : u.faction
            };
          }).filter(x => !!x)); // 名册

          const rows = this.state.units.map(u => ({
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

            const items = active.skills.map(sid => {
              var _active$cooldowns$sid;

              const skill = this.registry.skill(sid);
              const cd = (_active$cooldowns$sid = active.cooldowns[sid]) != null ? _active$cooldowns$sid : 0;
              return {
                skillId: sid,
                name: skill.name,
                desc: skill.description,
                disabled: active.actedThisTurn || cd > 0
              };
            });
            const uiPos = this.rig.worldToUI(this.coord.posToWorld(active.pos, 0.4));
            this.hud.showMenu(active.name, items, ((_this$preMove5 = this.preMove) == null ? void 0 : _this$preMove5.unitId) === active.instanceId, new Vec3(uiPos.x, uiPos.y, 0), {
              onSkill: id => this.selectSkill(id),
              onUndo: () => this.undoMove(),
              onEnd: () => this.endActiveUnit()
            });
          } else {
            this.hud.hideMenu();
          } // 确认条


          if (myTurn && active && this.activeSkill && this.pending) {
            const skill = this.registry.skill(this.activeSkill);
            const can = (_crd && canCast === void 0 ? (_reportPossibleCrUseOfcanCast({
              error: Error()
            }), canCast) : canCast)(this.state, active, skill, this.pending);
            let effect = false;
            let desc = "无效目标";

            if (can) {
              const preview = (_crd && previewSkill === void 0 ? (_reportPossibleCrUseOfpreviewSkill({
                error: Error()
              }), previewSkill) : previewSkill)(this.state, this.sim, this.registry, active.instanceId, this.activeSkill, this.pending);
              effect = this.hasEffect(preview.events);
              const lines = (_crd && describePreview === void 0 ? (_reportPossibleCrUseOfdescribePreview({
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
          for (const line of (_crd && describePreview === void 0 ? (_reportPossibleCrUseOfdescribePreview({
            error: Error()
          }), describePreview) : describePreview)(this.state, events)) this.hud.log(line);

          for (const e of events) {
            if (e.type === "turn_started") {
              var _u$name;

              const u = e.unitId ? (_crd && unitById === void 0 ? (_reportPossibleCrUseOfunitById({
                error: Error()
              }), unitById) : unitById)(this.state, e.unitId) : undefined;
              this.hud.log(`— 轮到 ${(_u$name = u == null ? void 0 : u.name) != null ? _u$name : e.faction === "player" ? "我方" : "敌方"} 行动 —`);
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
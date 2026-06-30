System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2", "__unresolved_3"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, livingUnits, hasStatus, dealDamage, processDeaths, _crd, CT_THRESHOLD, BURN_DEFAULT_DAMAGE;

  /** 在不修改 state 的前提下，挑选下一个达到行动阈值的单位（推进 ct）。返回单位 id 或 null。 */
  function tickUntilReady(state) {
    var _candidates$0$instanc, _candidates$;

    var alive = (_crd && livingUnits === void 0 ? (_reportPossibleCrUseOflivingUnits({
      error: Error()
    }), livingUnits) : livingUnits)(state);
    if (alive.length === 0) return null; // 已有单位达标则直接选择

    var ready = () => alive.filter(u => u.ct >= CT_THRESHOLD);

    var guard = 0;

    while (ready().length === 0 && guard++ < 100000) {
      for (var u of alive) u.ct += Math.max(1, u.stats.speed);
    } // 多个达标时，ct 最高者先动；平局按 speed、再按 instanceId 保证确定性


    var candidates = ready().sort((a, b) => {
      if (b.ct !== a.ct) return b.ct - a.ct;
      if (b.stats.speed !== a.stats.speed) return b.stats.speed - a.stats.speed;
      return a.instanceId < b.instanceId ? -1 : 1;
    });
    return (_candidates$0$instanc = (_candidates$ = candidates[0]) == null ? void 0 : _candidates$.instanceId) != null ? _candidates$0$instanc : null;
  }
  /** 开始某单位的行动：重置行动标记、递减其冷却、结算其回合起始状态（燃烧/眩晕）。 */


  function startUnitTurn(state, unit, events) {
    state.activeUnitId = unit.instanceId;
    state.turn = unit.faction;
    state.turnCount += 1;
    events.push({
      type: "turn_started",
      faction: unit.faction,
      turnCount: state.turnCount,
      unitId: unit.instanceId
    });
    unit.movedThisTurn = false;
    unit.actedThisTurn = false;

    for (var id of Object.keys(unit.cooldowns)) {
      if (unit.cooldowns[id] > 0) unit.cooldowns[id] -= 1;
    }

    var alreadyDead = new Set(state.units.filter(u => u.hp <= 0).map(u => u.instanceId));

    for (var s of unit.statuses) {
      var _s$magnitude;

      if (s.id === "burn") (_crd && dealDamage === void 0 ? (_reportPossibleCrUseOfdealDamage({
        error: Error()
      }), dealDamage) : dealDamage)(state, unit, (_s$magnitude = s.magnitude) != null ? _s$magnitude : BURN_DEFAULT_DAMAGE, "status:burn", events);
    }

    if ((_crd && hasStatus === void 0 ? (_reportPossibleCrUseOfhasStatus({
      error: Error()
    }), hasStatus) : hasStatus)(unit, "stun")) {
      // 眩晕：本次行动直接跳过
      unit.movedThisTurn = true;
      unit.actedThisTurn = true;
    }

    unit.statuses = unit.statuses.filter(s => {
      s.duration -= 1;

      if (s.duration <= 0) {
        events.push({
          type: "unit_status_expired",
          unitId: unit.instanceId,
          statusId: s.id
        });
        return false;
      }

      return true;
    });
    (_crd && processDeaths === void 0 ? (_reportPossibleCrUseOfprocessDeaths({
      error: Error()
    }), processDeaths) : processDeaths)(state, events, alreadyDead);
  }
  /**
   * 推进到下一个行动单位：扣除当前行动单位的充能，挑选下一个达标单位并开始其行动。
   */


  function advanceInitiative(state, events) {
    var current = state.activeUnitId ? state.units.find(u => u.instanceId === state.activeUnitId) : undefined;
    if (current) current.ct -= CT_THRESHOLD;
    state.activeUnitId = null;
    var nextId = tickUntilReady(state);
    if (!nextId) return;
    var next = state.units.find(u => u.instanceId === nextId);
    startUnitTurn(state, next, events);
  }
  /** 初始化战斗的首个行动单位（关卡加载时调用）。 */


  function initInitiative(state) {
    var events = [];
    var nextId = tickUntilReady(state);
    if (!nextId) return;
    var next = state.units.find(u => u.instanceId === nextId);
    startUnitTurn(state, next, events);
  }
  /**
   * 预测接下来 n 个行动单位的顺序（用于 UI 显示）。不修改真实状态。
   */


  function predictTurnOrder(state, n) {
    // 仅复制 ct/speed/faction，避免深克隆整张棋盘
    var sim = (_crd && livingUnits === void 0 ? (_reportPossibleCrUseOflivingUnits({
      error: Error()
    }), livingUnits) : livingUnits)(state).map(u => ({
      id: u.instanceId,
      ct: u.ct,
      speed: Math.max(1, u.stats.speed)
    }));
    if (sim.length === 0) return [];
    var order = []; // 第一个就是当前行动单位

    if (state.activeUnitId && sim.some(u => u.id === state.activeUnitId)) {
      order.push(state.activeUnitId);
      var cur = sim.find(u => u.id === state.activeUnitId);
      cur.ct -= CT_THRESHOLD;
    }

    var guard = 0;

    while (order.length < n && guard++ < 100000) {
      while (!sim.some(u => u.ct >= CT_THRESHOLD)) {
        for (var u of sim) u.ct += u.speed;
      }

      var ready = sim.filter(u => u.ct >= CT_THRESHOLD).sort((a, b) => b.ct !== a.ct ? b.ct - a.ct : b.speed - a.speed);
      var pick = ready[0];
      order.push(pick.id);
      pick.ct -= CT_THRESHOLD;
    }

    return order;
  }

  function otherFaction(f) {
    return f === "player" ? "enemy" : "player";
  }

  function _reportPossibleCrUseOfBattleState(extras) {
    _reporterNs.report("BattleState", "../state/BattleState", _context.meta, extras);
  }

  function _reportPossibleCrUseOflivingUnits(extras) {
    _reporterNs.report("livingUnits", "../state/BattleState", _context.meta, extras);
  }

  function _reportPossibleCrUseOfFaction(extras) {
    _reporterNs.report("Faction", "../unit/Unit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfUnit(extras) {
    _reporterNs.report("Unit", "../unit/Unit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfhasStatus(extras) {
    _reporterNs.report("hasStatus", "../unit/Unit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfBattleEvent(extras) {
    _reporterNs.report("BattleEvent", "../state/events", _context.meta, extras);
  }

  function _reportPossibleCrUseOfdealDamage(extras) {
    _reporterNs.report("dealDamage", "../skill/combat", _context.meta, extras);
  }

  function _reportPossibleCrUseOfprocessDeaths(extras) {
    _reporterNs.report("processDeaths", "../skill/combat", _context.meta, extras);
  }

  _export({
    advanceInitiative: advanceInitiative,
    initInitiative: initInitiative,
    predictTurnOrder: predictTurnOrder,
    otherFaction: otherFaction
  });

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }, function (_unresolved_2) {
      livingUnits = _unresolved_2.livingUnits;
    }, function (_unresolved_3) {
      hasStatus = _unresolved_3.hasStatus;
    }, function (_unresolved_4) {
      dealDamage = _unresolved_4.dealDamage;
      processDeaths = _unresolved_4.processDeaths;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "2c1b6+HkE5PgakK2gp+k87E", "turn", undefined); // ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。

      /**
       * 速度初动（Charge-Time）行动顺序系统。
       *
       * 每个单位有 speed，每个 tick 充能 ct += speed；当 ct >= CT_THRESHOLD 即可行动。
       * 行动结束后扣除 CT_THRESHOLD。速度越高，达到阈值越快、行动轮数越多
       * （speed 80 的单位行动次数约为 speed 40 单位的两倍）。
       */


      _export("CT_THRESHOLD", CT_THRESHOLD = 100);

      BURN_DEFAULT_DAMAGE = 10;

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=dfa035fa57c095dc37878bfa23b8928129b0323b.js.map
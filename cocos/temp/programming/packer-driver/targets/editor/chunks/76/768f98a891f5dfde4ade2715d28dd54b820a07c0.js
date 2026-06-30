System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, eq, cloneUnit, isAlive, _crd;

  function cloneState(s) {
    return {
      board: s.board.clone(),
      units: s.units.map(_crd && cloneUnit === void 0 ? (_reportPossibleCrUseOfcloneUnit({
        error: Error()
      }), cloneUnit) : cloneUnit),
      turn: s.turn,
      activeUnitId: s.activeUnitId,
      turnCount: s.turnCount,
      outcome: s.outcome
    };
  }

  function activeUnit(s) {
    return s.activeUnitId ? s.units.find(u => u.instanceId === s.activeUnitId) : undefined;
  }

  function unitAt(s, p) {
    return s.units.find(u => (_crd && isAlive === void 0 ? (_reportPossibleCrUseOfisAlive({
      error: Error()
    }), isAlive) : isAlive)(u) && (_crd && eq === void 0 ? (_reportPossibleCrUseOfeq({
      error: Error()
    }), eq) : eq)(u.pos, p));
  }

  function unitById(s, instanceId) {
    return s.units.find(u => u.instanceId === instanceId);
  }

  function livingUnits(s, faction) {
    return s.units.filter(u => (_crd && isAlive === void 0 ? (_reportPossibleCrUseOfisAlive({
      error: Error()
    }), isAlive) : isAlive)(u) && (faction ? u.faction === faction : true));
  }

  function isOccupied(s, p) {
    return unitAt(s, p) !== undefined;
  }
  /** 某格能否作为单位的合法落点（地形可站 + 无单位占用）。 */


  function isStandable(s, p, ignoreInstanceId) {
    if (!s.board.isWalkable(p)) return false;
    const occ = unitAt(s, p);
    if (occ && occ.instanceId !== ignoreInstanceId) return false;
    return true;
  }

  function evaluateOutcome(s) {
    const players = livingUnits(s, "player");
    const enemies = livingUnits(s, "enemy");
    if (enemies.length === 0) return "player_win";
    if (players.length === 0) return "enemy_win";
    return null;
  }

  function _reportPossibleCrUseOfGridBoard(extras) {
    _reporterNs.report("GridBoard", "../board/GridBoard", _context.meta, extras);
  }

  function _reportPossibleCrUseOfPosition(extras) {
    _reporterNs.report("Position", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfeq(extras) {
    _reporterNs.report("eq", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfFaction(extras) {
    _reporterNs.report("Faction", "../unit/Unit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfUnit(extras) {
    _reporterNs.report("Unit", "../unit/Unit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfcloneUnit(extras) {
    _reporterNs.report("cloneUnit", "../unit/Unit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfisAlive(extras) {
    _reporterNs.report("isAlive", "../unit/Unit", _context.meta, extras);
  }

  _export({
    cloneState: cloneState,
    activeUnit: activeUnit,
    unitAt: unitAt,
    unitById: unitById,
    livingUnits: livingUnits,
    isOccupied: isOccupied,
    isStandable: isStandable,
    evaluateOutcome: evaluateOutcome
  });

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }, function (_unresolved_2) {
      eq = _unresolved_2.eq;
    }, function (_unresolved_3) {
      cloneUnit = _unresolved_3.cloneUnit;
      isAlive = _unresolved_3.isAlive;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "17da4/3eCtCsoH+s7cYoal1", "BattleState", undefined); // ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。

      /**
       * 战斗状态：棋盘 + 单位 + 回合信息。
       * 所有改变状态的操作都应通过克隆产生新状态（模拟器纯函数化的基础）。
       */


      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=768f98a891f5dfde4ade2715d28dd54b820a07c0.js.map
System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, key, manhattan, ALL_DIRECTIONS, DIRECTION_VECTOR, add, isStandable, unitAt, _crd;

  /**
   * 计算单位的可达格集合（不含起点）。
   * 移动中不能穿过任何其他单位（即使该格最终可站立）。
   */
  function computeMoveRange(state, instanceId) {
    const unit = state.units.find(u => u.instanceId === instanceId);
    if (!unit) return [];
    const start = unit.pos;
    const maxCost = unit.stats.moveRange;
    const dist = new Map();
    dist.set((_crd && key === void 0 ? (_reportPossibleCrUseOfkey({
      error: Error()
    }), key) : key)(start), 0);
    const queue = [start];
    const result = [];

    while (queue.length > 0) {
      const cur = queue.shift();
      const curCost = dist.get((_crd && key === void 0 ? (_reportPossibleCrUseOfkey({
        error: Error()
      }), key) : key)(cur));
      if (curCost >= maxCost) continue;

      for (const dir of _crd && ALL_DIRECTIONS === void 0 ? (_reportPossibleCrUseOfALL_DIRECTIONS({
        error: Error()
      }), ALL_DIRECTIONS) : ALL_DIRECTIONS) {
        const next = (_crd && add === void 0 ? (_reportPossibleCrUseOfadd({
          error: Error()
        }), add) : add)(cur, (_crd && DIRECTION_VECTOR === void 0 ? (_reportPossibleCrUseOfDIRECTION_VECTOR({
          error: Error()
        }), DIRECTION_VECTOR) : DIRECTION_VECTOR)[dir]);
        const k = (_crd && key === void 0 ? (_reportPossibleCrUseOfkey({
          error: Error()
        }), key) : key)(next);
        if (dist.has(k)) continue;
        if (!state.board.inBounds(next)) continue;
        if (!state.board.isWalkable(next)) continue;
        const occ = (_crd && unitAt === void 0 ? (_reportPossibleCrUseOfunitAt({
          error: Error()
        }), unitAt) : unitAt)(state, next);
        if (occ && occ.instanceId !== instanceId) continue; // 不能穿过单位

        dist.set(k, curCost + 1);
        result.push(next);
        queue.push(next);
      }
    }

    return result;
  }
  /**
   * A* 寻路：返回从 start 到 goal 的路径（含起点与终点）；不可达返回 null。
   * 用于移动动画与「移动到该格需要多少步」判断。
   */


  function findPath(state, instanceId, goal) {
    const unit = state.units.find(u => u.instanceId === instanceId);
    if (!unit) return null;
    const start = unit.pos;
    if (!(_crd && isStandable === void 0 ? (_reportPossibleCrUseOfisStandable({
      error: Error()
    }), isStandable) : isStandable)(state, goal, instanceId)) return null;
    const open = [start];
    const cameFrom = new Map();
    const g = new Map();
    g.set((_crd && key === void 0 ? (_reportPossibleCrUseOfkey({
      error: Error()
    }), key) : key)(start), 0);
    const f = new Map();
    f.set((_crd && key === void 0 ? (_reportPossibleCrUseOfkey({
      error: Error()
    }), key) : key)(start), (_crd && manhattan === void 0 ? (_reportPossibleCrUseOfmanhattan({
      error: Error()
    }), manhattan) : manhattan)(start, goal));

    while (open.length > 0) {
      // 取 f 最小的节点
      let bestIdx = 0;

      for (let i = 1; i < open.length; i++) {
        var _f$get, _f$get2;

        if (((_f$get = f.get((_crd && key === void 0 ? (_reportPossibleCrUseOfkey({
          error: Error()
        }), key) : key)(open[i]))) != null ? _f$get : Infinity) < ((_f$get2 = f.get((_crd && key === void 0 ? (_reportPossibleCrUseOfkey({
          error: Error()
        }), key) : key)(open[bestIdx]))) != null ? _f$get2 : Infinity)) bestIdx = i;
      }

      const cur = open.splice(bestIdx, 1)[0];

      if (cur.x === goal.x && cur.y === goal.y) {
        return reconstruct(cameFrom, cur);
      }

      const curG = g.get((_crd && key === void 0 ? (_reportPossibleCrUseOfkey({
        error: Error()
      }), key) : key)(cur));

      for (const dir of _crd && ALL_DIRECTIONS === void 0 ? (_reportPossibleCrUseOfALL_DIRECTIONS({
        error: Error()
      }), ALL_DIRECTIONS) : ALL_DIRECTIONS) {
        var _g$get;

        const next = (_crd && add === void 0 ? (_reportPossibleCrUseOfadd({
          error: Error()
        }), add) : add)(cur, (_crd && DIRECTION_VECTOR === void 0 ? (_reportPossibleCrUseOfDIRECTION_VECTOR({
          error: Error()
        }), DIRECTION_VECTOR) : DIRECTION_VECTOR)[dir]);
        if (!state.board.isWalkable(next)) continue;
        const occ = (_crd && unitAt === void 0 ? (_reportPossibleCrUseOfunitAt({
          error: Error()
        }), unitAt) : unitAt)(state, next);
        if (occ && occ.instanceId !== instanceId) continue;
        const tentative = curG + 1;

        if (tentative < ((_g$get = g.get((_crd && key === void 0 ? (_reportPossibleCrUseOfkey({
          error: Error()
        }), key) : key)(next))) != null ? _g$get : Infinity)) {
          cameFrom.set((_crd && key === void 0 ? (_reportPossibleCrUseOfkey({
            error: Error()
          }), key) : key)(next), cur);
          g.set((_crd && key === void 0 ? (_reportPossibleCrUseOfkey({
            error: Error()
          }), key) : key)(next), tentative);
          f.set((_crd && key === void 0 ? (_reportPossibleCrUseOfkey({
            error: Error()
          }), key) : key)(next), tentative + (_crd && manhattan === void 0 ? (_reportPossibleCrUseOfmanhattan({
            error: Error()
          }), manhattan) : manhattan)(next, goal));
          if (!open.some(p => p.x === next.x && p.y === next.y)) open.push(next);
        }
      }
    }

    return null;
  }

  function reconstruct(cameFrom, end) {
    const path = [end];
    let cur = end;

    while (cameFrom.has((_crd && key === void 0 ? (_reportPossibleCrUseOfkey({
      error: Error()
    }), key) : key)(cur))) {
      cur = cameFrom.get((_crd && key === void 0 ? (_reportPossibleCrUseOfkey({
        error: Error()
      }), key) : key)(cur));
      path.unshift(cur);
    }

    return path;
  }

  function _reportPossibleCrUseOfPosition(extras) {
    _reporterNs.report("Position", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfkey(extras) {
    _reporterNs.report("key", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfmanhattan(extras) {
    _reporterNs.report("manhattan", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfALL_DIRECTIONS(extras) {
    _reporterNs.report("ALL_DIRECTIONS", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfDIRECTION_VECTOR(extras) {
    _reporterNs.report("DIRECTION_VECTOR", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfadd(extras) {
    _reporterNs.report("add", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfBattleState(extras) {
    _reporterNs.report("BattleState", "../state/BattleState", _context.meta, extras);
  }

  function _reportPossibleCrUseOfisStandable(extras) {
    _reporterNs.report("isStandable", "../state/BattleState", _context.meta, extras);
  }

  function _reportPossibleCrUseOfunitAt(extras) {
    _reporterNs.report("unitAt", "../state/BattleState", _context.meta, extras);
  }

  _export({
    computeMoveRange: computeMoveRange,
    findPath: findPath
  });

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }, function (_unresolved_2) {
      key = _unresolved_2.key;
      manhattan = _unresolved_2.manhattan;
      ALL_DIRECTIONS = _unresolved_2.ALL_DIRECTIONS;
      DIRECTION_VECTOR = _unresolved_2.DIRECTION_VECTOR;
      add = _unresolved_2.add;
    }, function (_unresolved_3) {
      isStandable = _unresolved_3.isStandable;
      unitAt = _unresolved_3.unitAt;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "cbc1dfJFhtCkZZYBMC0txa9", "pathfinding", undefined); // ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。

      /**
       * 移动范围计算（BFS）与 A* 寻路。四方向移动，每格代价 1。
       * 单位不能穿过其他单位与不可站立格。
       */


      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=284d8ffcbb3b89ee65abfb702e0658b7160ee6d6.js.map
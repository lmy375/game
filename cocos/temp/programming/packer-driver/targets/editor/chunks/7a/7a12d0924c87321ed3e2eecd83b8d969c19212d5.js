System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2", "__unresolved_3"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, DIRECTION_VECTOR, add, eq, directionTo, manhattan, clone, unitAt, isAlive, _crd;

  /**
   * 沿单一方向把单位移动最多 maxSteps 格，遇阻停止。不触发地形（地形在外层统一处理）。
   */
  function stepMove(state, unit, dir, maxSteps, reason, events) {
    const from = (_crd && clone === void 0 ? (_reportPossibleCrUseOfclone({
      error: Error()
    }), clone) : clone)(unit.pos);
    const vec = (_crd && DIRECTION_VECTOR === void 0 ? (_reportPossibleCrUseOfDIRECTION_VECTOR({
      error: Error()
    }), DIRECTION_VECTOR) : DIRECTION_VECTOR)[dir];
    let moved = 0;
    let blocked = null;

    for (let i = 0; i < maxSteps; i++) {
      const next = (_crd && add === void 0 ? (_reportPossibleCrUseOfadd({
        error: Error()
      }), add) : add)(unit.pos, vec);

      if (!state.board.inBounds(next)) {
        blocked = "edge";
        break;
      }

      if (state.board.blocksDisplacement(next)) {
        blocked = "wall";
        break;
      }

      const occ = (_crd && unitAt === void 0 ? (_reportPossibleCrUseOfunitAt({
        error: Error()
      }), unitAt) : unitAt)(state, next);

      if (occ && occ.instanceId !== unit.instanceId) {
        blocked = "occupied";
        break;
      }

      unit.pos = next;
      moved++;
    }

    if (moved > 0) {
      events.push({
        type: "unit_displaced",
        unitId: unit.instanceId,
        from,
        to: (_crd && clone === void 0 ? (_reportPossibleCrUseOfclone({
          error: Error()
        }), clone) : clone)(unit.pos),
        reason
      });
    } else if (blocked) {
      events.push({
        type: "displacement_blocked",
        unitId: unit.instanceId,
        at: (_crd && clone === void 0 ? (_reportPossibleCrUseOfclone({
          error: Error()
        }), clone) : clone)(unit.pos),
        reason: blocked
      });
    }

    return {
      moved,
      finalPos: (_crd && clone === void 0 ? (_reportPossibleCrUseOfclone({
        error: Error()
      }), clone) : clone)(unit.pos),
      blocked
    };
  }
  /** Push：沿释放方向推开。 */


  function applyPush(state, unit, dir, distance, events) {
    return stepMove(state, unit, dir, distance, "push", events);
  }
  /** Pull：朝施法者方向拉近 distance 格（不穿过施法者）。 */


  function applyPull(state, unit, casterPos, distance, events) {
    const dir = (_crd && directionTo === void 0 ? (_reportPossibleCrUseOfdirectionTo({
      error: Error()
    }), directionTo) : directionTo)(unit.pos, casterPos);
    return pullTowards(state, unit, casterPos, dir, distance, "pull", events);
  }
  /** Gather / pull_to_center：朝中心点聚拢，不越过中心。 */


  function applyPullToCenter(state, unit, center, maxDistance, events) {
    const dir = (_crd && directionTo === void 0 ? (_reportPossibleCrUseOfdirectionTo({
      error: Error()
    }), directionTo) : directionTo)(unit.pos, center);
    return pullTowards(state, unit, center, dir, maxDistance, "gather", events);
  }
  /** 朝某点逐格拉近，到达该点或越过前停止。 */


  function pullTowards(state, unit, point, dir, maxSteps, reason, events) {
    const from = (_crd && clone === void 0 ? (_reportPossibleCrUseOfclone({
      error: Error()
    }), clone) : clone)(unit.pos);
    const vec = (_crd && DIRECTION_VECTOR === void 0 ? (_reportPossibleCrUseOfDIRECTION_VECTOR({
      error: Error()
    }), DIRECTION_VECTOR) : DIRECTION_VECTOR)[dir];
    let moved = 0;
    let blocked = null;

    for (let i = 0; i < maxSteps; i++) {
      const next = (_crd && add === void 0 ? (_reportPossibleCrUseOfadd({
        error: Error()
      }), add) : add)(unit.pos, vec); // 只朝目标点靠近；到达或越过则停止。

      if ((_crd && manhattan === void 0 ? (_reportPossibleCrUseOfmanhattan({
        error: Error()
      }), manhattan) : manhattan)(next, point) >= (_crd && manhattan === void 0 ? (_reportPossibleCrUseOfmanhattan({
        error: Error()
      }), manhattan) : manhattan)(unit.pos, point)) break;

      if (!state.board.inBounds(next)) {
        blocked = "edge";
        break;
      }

      if (state.board.blocksDisplacement(next)) {
        blocked = "wall";
        break;
      }

      const occ = (_crd && unitAt === void 0 ? (_reportPossibleCrUseOfunitAt({
        error: Error()
      }), unitAt) : unitAt)(state, next);

      if (occ && occ.instanceId !== unit.instanceId) {
        blocked = "occupied";
        break;
      }

      unit.pos = next;
      moved++;
    }

    if (moved > 0) {
      events.push({
        type: "unit_displaced",
        unitId: unit.instanceId,
        from,
        to: (_crd && clone === void 0 ? (_reportPossibleCrUseOfclone({
          error: Error()
        }), clone) : clone)(unit.pos),
        reason
      });
    } else if (blocked) {
      events.push({
        type: "displacement_blocked",
        unitId: unit.instanceId,
        at: (_crd && clone === void 0 ? (_reportPossibleCrUseOfclone({
          error: Error()
        }), clone) : clone)(unit.pos),
        reason: blocked
      });
    }

    return {
      moved,
      finalPos: (_crd && clone === void 0 ? (_reportPossibleCrUseOfclone({
        error: Error()
      }), clone) : clone)(unit.pos),
      blocked
    };
  }
  /** Knockback：沿方向击退，撞墙/边界/单位造成额外伤害。 */


  function applyKnockback(state, unit, dir, distance, collisionDamage, events) {
    const res = stepMove(state, unit, dir, distance, "knockback", events);

    if (res.blocked && collisionDamage > 0) {
      unit.hp = Math.max(0, unit.hp - collisionDamage);
      events.push({
        type: "collision_damage",
        unitId: unit.instanceId,
        amount: collisionDamage,
        hpAfter: unit.hp
      });
    }

    return res;
  }
  /** Swap：交换两个单位位置（双方都须可站立）。 */


  function applySwap(state, a, b, events) {
    const aPos = (_crd && clone === void 0 ? (_reportPossibleCrUseOfclone({
      error: Error()
    }), clone) : clone)(a.pos);
    const bPos = (_crd && clone === void 0 ? (_reportPossibleCrUseOfclone({
      error: Error()
    }), clone) : clone)(b.pos);
    if (!state.board.isWalkable(aPos) || !state.board.isWalkable(bPos)) return false;
    a.pos = bPos;
    b.pos = aPos;
    events.push({
      type: "unit_displaced",
      unitId: a.instanceId,
      from: aPos,
      to: (_crd && clone === void 0 ? (_reportPossibleCrUseOfclone({
        error: Error()
      }), clone) : clone)(a.pos),
      reason: "swap"
    });
    events.push({
      type: "unit_displaced",
      unitId: b.instanceId,
      from: bPos,
      to: (_crd && clone === void 0 ? (_reportPossibleCrUseOfclone({
        error: Error()
      }), clone) : clone)(b.pos),
      reason: "swap"
    });
    return true;
  }
  /**
   * ArrangeLine：把若干单位整理成沿 dir 方向、从 anchor 起始的一条直线。
   * 按到 anchor 的距离从近到远放置；跳过不可站立/已占用格。
   */


  function applyArrangeLine(state, units, anchor, dir, maxUnits, events) {
    const vec = (_crd && DIRECTION_VECTOR === void 0 ? (_reportPossibleCrUseOfDIRECTION_VECTOR({
      error: Error()
    }), DIRECTION_VECTOR) : DIRECTION_VECTOR)[dir];
    const sorted = [...units].filter(_crd && isAlive === void 0 ? (_reportPossibleCrUseOfisAlive({
      error: Error()
    }), isAlive) : isAlive).sort((u, v) => (_crd && manhattan === void 0 ? (_reportPossibleCrUseOfmanhattan({
      error: Error()
    }), manhattan) : manhattan)(u.pos, anchor) - (_crd && manhattan === void 0 ? (_reportPossibleCrUseOfmanhattan({
      error: Error()
    }), manhattan) : manhattan)(v.pos, anchor)).slice(0, maxUnits);
    let slot = 0;

    for (const u of sorted) {
      // 找到下一个可放置的直线格
      let placed = false;

      while (slot < 64) {
        const target = {
          x: anchor.x + vec.x * slot,
          y: anchor.y + vec.y * slot
        };
        slot++;
        if (!state.board.isWalkable(target)) continue;
        const occ = (_crd && unitAt === void 0 ? (_reportPossibleCrUseOfunitAt({
          error: Error()
        }), unitAt) : unitAt)(state, target);
        if (occ && occ.instanceId !== u.instanceId) continue;
        const from = (_crd && clone === void 0 ? (_reportPossibleCrUseOfclone({
          error: Error()
        }), clone) : clone)(u.pos);

        if (!(_crd && eq === void 0 ? (_reportPossibleCrUseOfeq({
          error: Error()
        }), eq) : eq)(from, target)) {
          u.pos = (_crd && clone === void 0 ? (_reportPossibleCrUseOfclone({
            error: Error()
          }), clone) : clone)(target);
          events.push({
            type: "unit_displaced",
            unitId: u.instanceId,
            from,
            to: (_crd && clone === void 0 ? (_reportPossibleCrUseOfclone({
              error: Error()
            }), clone) : clone)(target),
            reason: "arrange_line"
          });
        }

        placed = true;
        break;
      }

      if (!placed) break;
    }
  }

  function _reportPossibleCrUseOfPosition(extras) {
    _reporterNs.report("Position", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfDirection(extras) {
    _reporterNs.report("Direction", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfDIRECTION_VECTOR(extras) {
    _reporterNs.report("DIRECTION_VECTOR", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfadd(extras) {
    _reporterNs.report("add", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfeq(extras) {
    _reporterNs.report("eq", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfdirectionTo(extras) {
    _reporterNs.report("directionTo", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfmanhattan(extras) {
    _reporterNs.report("manhattan", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfclone(extras) {
    _reporterNs.report("clone", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfBattleState(extras) {
    _reporterNs.report("BattleState", "../state/BattleState", _context.meta, extras);
  }

  function _reportPossibleCrUseOfunitAt(extras) {
    _reporterNs.report("unitAt", "../state/BattleState", _context.meta, extras);
  }

  function _reportPossibleCrUseOfUnit(extras) {
    _reporterNs.report("Unit", "../unit/Unit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfisAlive(extras) {
    _reporterNs.report("isAlive", "../unit/Unit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfBattleEvent(extras) {
    _reporterNs.report("BattleEvent", "../state/events", _context.meta, extras);
  }

  _export({
    stepMove: stepMove,
    applyPush: applyPush,
    applyPull: applyPull,
    applyPullToCenter: applyPullToCenter,
    applyKnockback: applyKnockback,
    applySwap: applySwap,
    applyArrangeLine: applyArrangeLine
  });

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }, function (_unresolved_2) {
      DIRECTION_VECTOR = _unresolved_2.DIRECTION_VECTOR;
      add = _unresolved_2.add;
      eq = _unresolved_2.eq;
      directionTo = _unresolved_2.directionTo;
      manhattan = _unresolved_2.manhattan;
      clone = _unresolved_2.clone;
    }, function (_unresolved_3) {
      unitAt = _unresolved_3.unitAt;
    }, function (_unresolved_4) {
      isAlive = _unresolved_4.isAlive;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "ea937EdAENC2oN6SRwsqneN", "displacement", undefined); // ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。

      /**
       * 位移结算。所有位移必须可预测：单方向逐格移动，遇墙/障碍/单位/边界停止。
       * 函数直接修改传入的 state（调用方负责先克隆），并向 events 追加事件。
       */


      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=7a12d0924c87321ed3e2eecd83b8d969c19212d5.js.map
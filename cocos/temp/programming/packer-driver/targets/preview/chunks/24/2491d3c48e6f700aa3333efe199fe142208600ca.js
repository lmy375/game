System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, unitById, resolveHitCells, _crd;

  function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

  function previewSkill(state, simulator, registry, actorId, skillId, target) {
    var actor = (_crd && unitById === void 0 ? (_reportPossibleCrUseOfunitById({
      error: Error()
    }), unitById) : unitById)(state, actorId);
    var skill = registry.skill(skillId);
    var hitCells = [];

    if (actor) {
      var effectiveTarget = _extends({}, target);

      if (skill.targetType === "unit" && target.unitId) {
        var tu = (_crd && unitById === void 0 ? (_reportPossibleCrUseOfunitById({
          error: Error()
        }), unitById) : unitById)(state, target.unitId);
        if (tu) effectiveTarget.cell = tu.pos;
      }

      hitCells = (_crd && resolveHitCells === void 0 ? (_reportPossibleCrUseOfresolveHitCells({
        error: Error()
      }), resolveHitCells) : resolveHitCells)(actor, skill, registry, effectiveTarget).cells.filter(c => state.board.inBounds(c.pos));
    }

    var result = simulator.simulate(state, {
      type: "skill",
      actorId,
      skillId,
      targetCell: target.cell,
      targetUnitId: target.unitId,
      direction: target.direction
    });
    return {
      hitCells,
      events: result.events,
      resultState: result.nextState,
      ok: result.ok
    };
  }
  /** 从预览事件中提取「人话」描述，对应 PRD 9.3 的位移预览提示。 */


  function describePreview(state, events) {
    var lines = [];

    var nameOf = id => {
      var _name, _ref;

      return (_name = (_ref = (_crd && unitById === void 0 ? (_reportPossibleCrUseOfunitById({
        error: Error()
      }), unitById) : unitById)(state, id)) == null ? void 0 : _ref.name) != null ? _name : id;
    };

    for (var e of events) {
      switch (e.type) {
        case "unit_damaged":
          lines.push(nameOf(e.unitId) + " \u53D7\u5230 " + e.amount + " \u70B9\u4F24\u5BB3\uFF08\u5269\u4F59 " + e.hpAfter + "\uFF09");
          break;

        case "unit_displaced":
          lines.push(nameOf(e.unitId) + " \u88AB" + reasonText(e.reason) + "\u81F3 (" + e.to.x + ", " + e.to.y + ")");
          break;

        case "displacement_blocked":
          lines.push(nameOf(e.unitId) + " \u88AB" + (e.reason === "occupied" ? "其他单位" : "障碍") + "\u963B\u6321\uFF0C\u65E0\u6CD5\u79FB\u52A8");
          break;

        case "collision_damage":
          lines.push(nameOf(e.unitId) + " \u649E\u51FB\u53D7\u5230 " + e.amount + " \u70B9\u989D\u5916\u4F24\u5BB3");
          break;

        case "terrain_triggered":
          lines.push(nameOf(e.unitId) + " \u8E0F\u5165" + (e.terrainType === "fire" ? "火焰" : "陷阱"));
          break;

        case "unit_status_applied":
          lines.push(nameOf(e.unitId) + " \u83B7\u5F97\u72B6\u6001\u300C" + e.statusId + "\u300D");
          break;

        case "unit_died":
          lines.push(nameOf(e.unitId) + " \u88AB\u51FB\u8D25");
          break;
      }
    }

    return lines;
  }

  function reasonText(reason) {
    switch (reason) {
      case "push":
        return "推";

      case "pull":
        return "拉";

      case "gather":
        return "聚拢";

      case "swap":
        return "换位";

      case "arrange_line":
        return "整队";

      case "knockback":
        return "击退";

      default:
        return "移动";
    }
  }

  function _reportPossibleCrUseOfPosition(extras) {
    _reporterNs.report("Position", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfDirection(extras) {
    _reporterNs.report("Direction", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfBattleState(extras) {
    _reporterNs.report("BattleState", "../state/BattleState", _context.meta, extras);
  }

  function _reportPossibleCrUseOfunitById(extras) {
    _reporterNs.report("unitById", "../state/BattleState", _context.meta, extras);
  }

  function _reportPossibleCrUseOfBattleEvent(extras) {
    _reporterNs.report("BattleEvent", "../state/events", _context.meta, extras);
  }

  function _reportPossibleCrUseOfContentRegistry(extras) {
    _reporterNs.report("ContentRegistry", "../content/Registry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfBattleSimulator(extras) {
    _reporterNs.report("BattleSimulator", "./BattleSimulator", _context.meta, extras);
  }

  function _reportPossibleCrUseOfresolveHitCells(extras) {
    _reporterNs.report("resolveHitCells", "../skill/resolveSkill", _context.meta, extras);
  }

  function _reportPossibleCrUseOfResolvedPatternCell(extras) {
    _reporterNs.report("ResolvedPatternCell", "../pattern/Pattern", _context.meta, extras);
  }

  _export({
    previewSkill: previewSkill,
    describePreview: describePreview
  });

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }, function (_unresolved_2) {
      unitById = _unresolved_2.unitById;
    }, function (_unresolved_3) {
      resolveHitCells = _unresolved_3.resolveHitCells;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "eefc849YbVD8rxw528HSK++", "preview", undefined); // ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。

      /**
       * 预览系统：通过在克隆状态上跑模拟，得到「释放后会发生什么」，绝不修改真实状态。
       * 返回命中格 + 事件流 + 结果态，供 UI 渲染伤害数字、位移箭头、撞墙/陷阱提示。
       */


      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=2491d3c48e6f700aa3333efe199fe142208600ca.js.map
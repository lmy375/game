System.register(["__unresolved_0", "cc"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, _crd;

  function _reportPossibleCrUseOfPosition(extras) {
    _reporterNs.report("Position", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfStatusId(extras) {
    _reporterNs.report("StatusId", "../unit/Unit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfTerrainType(extras) {
    _reporterNs.report("TerrainType", "../board/terrain", _context.meta, extras);
  }

  function _reportPossibleCrUseOfFaction(extras) {
    _reporterNs.report("Faction", "../unit/Unit", _context.meta, extras);
  }

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "10dd98sL+BD5bYzn5Qt8ORa", "events", undefined); // ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。

      /**
       * 战斗事件。模拟器输出事件流，表现层（Web/Cocos）据此播放动画。
       * 核心逻辑绝不直接驱动渲染。
       */


      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=8d5d1cb692879a07ed7dc893ec7214dd312562ac.js.map
System.register(["__unresolved_0", "cc"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, _crd;

  function _reportPossibleCrUseOfPosition(extras) {
    _reporterNs.report("Position", "../game-core/index", _context.meta, extras);
  }

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "d4643Lbf39CAq3fXPiUhPIG", "types", undefined);
      /** 位移箭头(从一格指向另一格)。 */

      /** 预览阶段在格上静态展示的伤害/治疗数字。 */

      /**
       * 叠加层数据:控制器每帧据当前交互态算出,交给 OverlayView 画在棋盘上。
       * 字段语义与 Web 版 RenderOverlay 一致(见 src/platform/web/CanvasRenderer.ts)。
       */


      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=d69d1dd591bd2de61b55f1f9fd57433a69482f4e.js.map
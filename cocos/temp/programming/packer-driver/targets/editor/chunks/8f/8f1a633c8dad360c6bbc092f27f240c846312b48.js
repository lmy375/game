System.register(["__unresolved_0", "cc"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, _crd;

  /**
   * 将相对坐标按方向旋转。基准方向为 up（不旋转）。
   * 采用标准二维旋转（y 向上为正，逆时针为正角度）：
   *   up:    (dx, dy) -> (dx, dy)
   *   right: (dx, dy) -> (dy, -dx)   顺时针 90°
   *   down:  (dx, dy) -> (-dx, -dy)  180°
   *   left:  (dx, dy) -> (-dy, dx)   逆时针 90°
   */
  function rotateOffset(cell, dir) {
    // nz: 规避 -0（仅为输出整洁，不影响坐标运算）
    const nz = n => n === 0 ? 0 : n;

    switch (dir) {
      case "up":
        return {
          dx: nz(cell.dx),
          dy: nz(cell.dy)
        };

      case "right":
        return {
          dx: nz(cell.dy),
          dy: nz(-cell.dx)
        };

      case "down":
        return {
          dx: nz(-cell.dx),
          dy: nz(-cell.dy)
        };

      case "left":
        return {
          dx: nz(-cell.dy),
          dy: nz(cell.dx)
        };
    }
  }

  /**
   * 解析 Pattern 在战场上的最终命中格。
   * @param origin   anchor 原点（target：目标格；caster_direction：施法者所在格）
   * @param dir      释放方向（rotatable=false 时忽略）
   */
  function resolvePattern(pattern, origin, dir = "up") {
    const useDir = pattern.rotatable ? dir : "up";
    return pattern.cells.map(c => {
      const r = rotateOffset(c, useDir);
      return {
        pos: {
          x: origin.x + r.dx,
          y: origin.y + r.dy
        },
        effectKey: c.effectKey
      };
    });
  }

  function _reportPossibleCrUseOfPosition(extras) {
    _reporterNs.report("Position", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfDirection(extras) {
    _reporterNs.report("Direction", "../board/geometry", _context.meta, extras);
  }

  _export({
    rotateOffset: rotateOffset,
    resolvePattern: resolvePattern
  });

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "8f7bfuKnKBCfIjuTMv/P4rI", "Pattern", undefined); // ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。

      /**
       * 命中形状 Pattern：相对坐标 + 旋转。
       *
       * 约定：初始 Pattern 默认朝「上」(up)。系统根据释放方向把相对坐标旋转到最终朝向。
       * anchor 决定相对坐标的原点：
       *   - "target": 以目标格为中心（如十字火焰）
       *   - "caster_direction": 以施法者为原点、沿释放方向延伸（如直线、T 字）
       */


      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=8f1a633c8dad360c6bbc092f27f240c846312b48.js.map
System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, _crd;

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "2cf68leEfpOxrjNsXvgYMdU", "patterns", undefined);

      // ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
      _export("default", [{
        "id": "single",
        "name": "单点",
        "anchor": "target",
        "rotatable": false,
        "cells": [{
          "dx": 0,
          "dy": 0,
          "effectKey": "center"
        }]
      }, {
        "id": "cross_1",
        "name": "小十字",
        "anchor": "target",
        "rotatable": false,
        "cells": [{
          "dx": 0,
          "dy": 0,
          "effectKey": "center"
        }, {
          "dx": 1,
          "dy": 0,
          "effectKey": "arm"
        }, {
          "dx": -1,
          "dy": 0,
          "effectKey": "arm"
        }, {
          "dx": 0,
          "dy": 1,
          "effectKey": "arm"
        }, {
          "dx": 0,
          "dy": -1,
          "effectKey": "arm"
        }]
      }, {
        "id": "area_3x3",
        "name": "九宫格",
        "anchor": "target",
        "rotatable": false,
        "cells": [{
          "dx": -1,
          "dy": 1,
          "effectKey": "all"
        }, {
          "dx": 0,
          "dy": 1,
          "effectKey": "all"
        }, {
          "dx": 1,
          "dy": 1,
          "effectKey": "all"
        }, {
          "dx": -1,
          "dy": 0,
          "effectKey": "all"
        }, {
          "dx": 0,
          "dy": 0,
          "effectKey": "all"
        }, {
          "dx": 1,
          "dy": 0,
          "effectKey": "all"
        }, {
          "dx": -1,
          "dy": -1,
          "effectKey": "all"
        }, {
          "dx": 0,
          "dy": -1,
          "effectKey": "all"
        }, {
          "dx": 1,
          "dy": -1,
          "effectKey": "all"
        }]
      }, {
        "id": "line_4",
        "name": "贯穿直线",
        "anchor": "caster_direction",
        "rotatable": true,
        "cells": [{
          "dx": 0,
          "dy": 1,
          "effectKey": "path"
        }, {
          "dx": 0,
          "dy": 2,
          "effectKey": "path"
        }, {
          "dx": 0,
          "dy": 3,
          "effectKey": "path"
        }, {
          "dx": 0,
          "dy": 4,
          "effectKey": "path"
        }]
      }, {
        "id": "front_row_3",
        "name": "前方横排",
        "anchor": "caster_direction",
        "rotatable": true,
        "cells": [{
          "dx": -1,
          "dy": 1,
          "effectKey": "all"
        }, {
          "dx": 0,
          "dy": 1,
          "effectKey": "all"
        }, {
          "dx": 1,
          "dy": 1,
          "effectKey": "all"
        }]
      }, {
        "id": "t_shape",
        "name": "T字",
        "anchor": "caster_direction",
        "rotatable": true,
        "cells": [{
          "dx": 0,
          "dy": 1,
          "effectKey": "stem"
        }, {
          "dx": -1,
          "dy": 2,
          "effectKey": "head"
        }, {
          "dx": 0,
          "dy": 2,
          "effectKey": "head"
        }, {
          "dx": 1,
          "dy": 2,
          "effectKey": "head"
        }]
      }]);

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=1a294e5c7ab0821916d086bfea4853785eef2acb.js.map
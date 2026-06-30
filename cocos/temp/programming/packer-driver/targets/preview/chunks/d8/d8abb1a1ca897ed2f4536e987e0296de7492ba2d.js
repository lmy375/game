System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, Color, _crd, TERRAIN, TERRAIN_EMISSIVE, FACTION, OVERLAY, UI;

  /** 十六进制 → Color(可带 alpha 0–255)。 */
  function hex(h, a) {
    if (a === void 0) {
      a = 255;
    }

    var c = new Color();
    Color.fromHEX(c, h);
    c.a = a;
    return c;
  }
  /** 地形配色,沿用 Web 版 CanvasRenderer 的 TERRAIN_COLOR。 */


  _export("hex", hex);

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      Color = _cc.Color;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "ddde2OLqsNHnqv80niwwzOy", "Palette", undefined);

      __checkObsolete__(['Color']);

      _export("TERRAIN", TERRAIN = {
        ground: hex("#39404e"),
        wall: hex("#191c24"),
        obstacle: hex("#5b4636"),
        fire: hex("#7a2a1c"),
        trap: hex("#46295c")
      });
      /** 地形自发光(火/陷阱发光,增强 3D 场景氛围)。 */


      _export("TERRAIN_EMISSIVE", TERRAIN_EMISSIVE = {
        fire: hex("#ff6a2a"),
        trap: hex("#9a4ad9")
      });
      /** 阵营主色(单位立绘)。 */


      _export("FACTION", FACTION = {
        player: hex("#4a90d9"),
        enemy: hex("#d9534f")
      });
      /** 叠加层高亮色。 */


      _export("OVERLAY", OVERLAY = {
        move: hex("#4a90d9", 90),
        cast: hex("#e8c840", 60),
        hitCenter: hex("#e8503f", 150),
        hitArm: hex("#e8843f", 120),
        finalBox: hex("#ffffff", 110),
        hazard: hex("#ff5030", 130),
        origin: hex("#9fb4d0", 80),
        hover: hex("#ffffff", 40)
      });

      _export("UI", UI = {
        panel: hex("#1b1f29", 235),
        panelEdge: hex("#2a3142"),
        text: hex("#e8edf6"),
        textDim: hex("#8c97ad"),
        accent: hex("#4a90d9"),
        danger: hex("#d9534f"),
        hpFull: hex("#5fcf6a"),
        hpLow: hex("#d9534f"),
        hpBack: hex("#11141b", 220),
        good: hex("#e8c840"),
        heal: hex("#5fcf6a")
      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=d8abb1a1ca897ed2f4536e987e0296de7492ba2d.js.map
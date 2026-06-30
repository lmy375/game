System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, Node, MeshRenderer, Material, primitives, utils, Layers, UITransform, Label, Graphics, _crd, meshCache;

  function boxMesh(w, h, l) {
    var key = "box:" + w + "," + h + "," + l;
    var m = meshCache.get(key);

    if (!m) {
      m = utils.createMesh(primitives.box({
        width: w,
        height: h,
        length: l
      }));
      meshCache.set(key, m);
    }

    return m;
  }

  function planeMesh(w, l) {
    var key = "plane:" + w + "," + l;
    var m = meshCache.get(key);

    if (!m) {
      m = utils.createMesh(primitives.plane({
        width: w,
        length: l,
        widthSegments: 1,
        lengthSegments: 1
      }));
      meshCache.set(key, m);
    }

    return m;
  }

  function cylinderMesh(radius, height) {
    var key = "cyl:" + radius + "," + height;
    var m = meshCache.get(key);

    if (!m) {
      m = utils.createMesh(primitives.cylinder(radius, radius, height, {
        radialSegments: 18
      }));
      meshCache.set(key, m);
    }

    return m;
  }

  function sphereMesh(radius) {
    var key = "sph:" + radius;
    var m = meshCache.get(key);

    if (!m) {
      m = utils.createMesh(primitives.sphere(radius, {
        segments: 18
      }));
      meshCache.set(key, m);
    }

    return m;
  }

  function torusMesh(radius, tube) {
    var key = "tor:" + radius + "," + tube;
    var m = meshCache.get(key);

    if (!m) {
      m = utils.createMesh(primitives.torus(radius, tube, {
        radialSegments: 28,
        tubularSegments: 12
      }));
      meshCache.set(key, m);
    }

    return m;
  }
  /** 受光标准材质(投/接阴影),用于地形与立体物件。 */


  function litMat(color, emissive) {
    var m = new Material();
    m.initialize({
      effectName: "builtin-standard"
    });
    m.setProperty("mainColor", color);
    m.setProperty("roughness", 0.9);
    m.setProperty("metallic", 0.0);

    if (emissive) {
      m.setProperty("emissive", emissive);
      m.setProperty("emissiveScale", 0.6);
    }

    return m;
  }
  /** 无光材质;transparent=true 时走半透明 technique(用于贴地高亮)。 */


  function unlitMat(color, transparent) {
    if (transparent === void 0) {
      transparent = false;
    }

    var m = new Material();
    m.initialize(transparent ? {
      effectName: "builtin-unlit",
      technique: 1
    } : {
      effectName: "builtin-unlit"
    });
    m.setProperty("mainColor", color);
    return m;
  }
  /** 建一个挂 MeshRenderer 的 3D 节点。shadow=false 时不投/接阴影(用于薄片/血条等)。 */


  function meshNode(name, parent, mesh, mat, shadow) {
    if (shadow === void 0) {
      shadow = true;
    }

    var n = new Node(name);
    n.layer = Layers.Enum.DEFAULT;
    parent.addChild(n);
    var mr = n.addComponent(MeshRenderer);
    mr.mesh = mesh;
    mr.setMaterial(mat, 0);
    mr.shadowCastingMode = shadow ? MeshRenderer.ShadowCastingMode.ON : MeshRenderer.ShadowCastingMode.OFF;
    mr.receiveShadow = shadow ? MeshRenderer.ShadowReceivingMode.ON : MeshRenderer.ShadowReceivingMode.OFF;
    return n;
  } // ── UI(2D)节点助手 ───────────────────────────────────────────────────

  /** 建一个带 UITransform 的 UI 节点(layer = UI_2D)。 */


  function uiNode(name, parent, w, h) {
    if (w === void 0) {
      w = 0;
    }

    if (h === void 0) {
      h = 0;
    }

    var n = new Node(name);
    n.layer = Layers.Enum.UI_2D;
    parent.addChild(n);
    var t = n.addComponent(UITransform);
    if (w || h) t.setContentSize(w, h);
    return n;
  }

  function uiLabel(parent, text, opts) {
    var _opts$size, _opts$size2;

    if (opts === void 0) {
      opts = {};
    }

    var n = uiNode("label", parent);
    var l = n.addComponent(Label);
    l.string = text;
    l.fontSize = (_opts$size = opts.size) != null ? _opts$size : 18;
    l.lineHeight = ((_opts$size2 = opts.size) != null ? _opts$size2 : 18) + 4;
    if (opts.color) l.color = opts.color;
    if (opts.bold) l.isBold = true;

    if (opts.outline) {
      l.enableOutline = true;
      l.outlineColor = opts.outline;
      l.outlineWidth = 2;
    }

    return l;
  }

  function uiGraphics(parent, w, h) {
    if (w === void 0) {
      w = 0;
    }

    if (h === void 0) {
      h = 0;
    }

    var n = uiNode("gfx", parent, w, h);
    return n.addComponent(Graphics);
  }
  /** 纯色圆角 UI 面板(Graphics 程序化绘制;后续可替换为图集 Sprite)。 */


  function uiSolid(parent, w, h, color) {
    var n = uiNode("solid", parent, w, h);
    var g = n.addComponent(Graphics);
    g.fillColor = color;
    g.roundRect(-w / 2, -h / 2, w, h, 8);
    g.fill();
    return {
      node: n,
      gfx: g
    };
  }

  _export({
    boxMesh: boxMesh,
    planeMesh: planeMesh,
    cylinderMesh: cylinderMesh,
    sphereMesh: sphereMesh,
    torusMesh: torusMesh,
    litMat: litMat,
    unlitMat: unlitMat,
    meshNode: meshNode,
    uiNode: uiNode,
    uiLabel: uiLabel,
    uiGraphics: uiGraphics,
    uiSolid: uiSolid
  });

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      Node = _cc.Node;
      MeshRenderer = _cc.MeshRenderer;
      Material = _cc.Material;
      primitives = _cc.primitives;
      utils = _cc.utils;
      Layers = _cc.Layers;
      UITransform = _cc.UITransform;
      Label = _cc.Label;
      Graphics = _cc.Graphics;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "6436bWLO7NKNIbN0VHvEX7A", "Factory", undefined);

      /** 复用同尺寸的 primitive mesh,避免每格重建。 */
      __checkObsolete__(['Node', 'MeshRenderer', 'Material', 'Mesh', 'primitives', 'utils', 'Color', 'Layers', 'UITransform', 'Label', 'Graphics']);

      meshCache = new Map();

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=d1cf839adcbeea1132443eb58c6f2199330e7895.js.map
System.register(["__unresolved_0", "cc"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, ContentRegistry, _crd;

  function _reportPossibleCrUseOfPatternDef(extras) {
    _reporterNs.report("PatternDef", "../pattern/Pattern", _context.meta, extras);
  }

  function _reportPossibleCrUseOfSkillDef(extras) {
    _reporterNs.report("SkillDef", "../skill/Skill", _context.meta, extras);
  }

  function _reportPossibleCrUseOfUnitDef(extras) {
    _reporterNs.report("UnitDef", "../unit/Unit", _context.meta, extras);
  }

  _export("ContentRegistry", void 0);

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "ea8f6EwTO5CNqIZsvSlSNy2", "Registry", undefined); // ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。

      /**
       * 内容注册表：集中持有 Pattern / Skill / Unit 的静态配置。
       * 战斗逻辑只通过 id 查询，不直接接触 JSON 文件（便于测试与热替换）。
       */


      _export("ContentRegistry", ContentRegistry = class ContentRegistry {
        constructor() {
          this.patterns = new Map();
          this.skills = new Map();
          this.units = new Map();
        }

        addPatterns(defs) {
          for (var d of defs) this.patterns.set(d.id, d);

          return this;
        }

        addSkills(defs) {
          for (var d of defs) this.skills.set(d.id, d);

          return this;
        }

        addUnits(defs) {
          for (var d of defs) this.units.set(d.id, d);

          return this;
        }

        pattern(id) {
          var p = this.patterns.get(id);
          if (!p) throw new Error("\u672A\u77E5 Pattern: " + id);
          return p;
        }

        skill(id) {
          var s = this.skills.get(id);
          if (!s) throw new Error("\u672A\u77E5 Skill: " + id);
          return s;
        }

        unit(id) {
          var u = this.units.get(id);
          if (!u) throw new Error("\u672A\u77E5 Unit: " + id);
          return u;
        }

        hasSkill(id) {
          return this.skills.has(id);
        }

      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=5195047275ddbc8ccc8e13e95685eb9b78cfe886.js.map
System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2", "__unresolved_3", "__unresolved_4", "__unresolved_5"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, ContentRegistry, patternsRaw, skillsRaw, unitsRaw, levelsRaw, _crd, patterns, skills, units, levels;

  function createRegistry() {
    return new (_crd && ContentRegistry === void 0 ? (_reportPossibleCrUseOfContentRegistry({
      error: Error()
    }), ContentRegistry) : ContentRegistry)().addPatterns(patterns).addSkills(skills).addUnits(units);
  }

  function getLevel(id) {
    const lvl = levels.find(l => l.id === id);
    if (!lvl) throw new Error(`未知关卡: ${id}`);
    return lvl;
  }

  function _reportPossibleCrUseOfContentRegistry(extras) {
    _reporterNs.report("ContentRegistry", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfPatternDef(extras) {
    _reporterNs.report("PatternDef", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfSkillDef(extras) {
    _reporterNs.report("SkillDef", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfUnitDef(extras) {
    _reporterNs.report("UnitDef", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfLevelDef(extras) {
    _reporterNs.report("LevelDef", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfpatternsRaw(extras) {
    _reporterNs.report("patternsRaw", "./patterns", _context.meta, extras);
  }

  function _reportPossibleCrUseOfskillsRaw(extras) {
    _reporterNs.report("skillsRaw", "./skills", _context.meta, extras);
  }

  function _reportPossibleCrUseOfunitsRaw(extras) {
    _reporterNs.report("unitsRaw", "./units", _context.meta, extras);
  }

  function _reportPossibleCrUseOflevelsRaw(extras) {
    _reporterNs.report("levelsRaw", "./levels", _context.meta, extras);
  }

  _export({
    createRegistry: createRegistry,
    getLevel: getLevel
  });

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }, function (_unresolved_2) {
      ContentRegistry = _unresolved_2.ContentRegistry;
    }, function (_unresolved_3) {
      patternsRaw = _unresolved_3.default;
    }, function (_unresolved_4) {
      skillsRaw = _unresolved_4.default;
    }, function (_unresolved_5) {
      unitsRaw = _unresolved_5.default;
    }, function (_unresolved_6) {
      levelsRaw = _unresolved_6.default;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "0ebe0j9y4pHv5aKM7RhxYke", "index", undefined); // ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。

      /**
       * 数据层出口：导入 JSON 配置并构建强类型的 ContentRegistry。
       * 这是「数据 -> 核心」唯一的连接点；core 本身不接触 JSON。
       */


      // JSON 推断为宽泛 string 字面量，这里断言为强类型定义（结构由测试与运行时保证）。
      _export("patterns", patterns = patternsRaw);

      _export("skills", skills = skillsRaw);

      _export("units", units = unitsRaw);

      _export("levels", levels = levelsRaw);

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=751e21f02275289a01f86e5daed963a24cf38986.js.map
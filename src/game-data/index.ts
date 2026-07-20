/**
 * 数据层出口：导入 JSON 配置并构建强类型的 ContentRegistry。
 * 这是「数据 -> 核心」唯一的连接点；core 本身不接触 JSON。
 */
import { ContentRegistry, PatternDef, SkillDef, UnitDef, LevelDef } from "@core/index";
import patternsRaw from "./patterns.json";
import skillsRaw from "./skills.json";
import unitsRaw from "./units.json";
import levelsRaw from "./levels.json";
import { validateGameData } from "./validateGameData";

export { validateGameData, collectGameDataIssues, bundledGameData, GameDataValidationError } from "./validateGameData";

// JSON 推断为宽泛 string 字面量，这里断言为强类型定义（结构由测试与运行时保证）。
export const patterns = patternsRaw as unknown as PatternDef[];
export const skills = skillsRaw as unknown as SkillDef[];
export const units = unitsRaw as unknown as UnitDef[];
export const levels = levelsRaw as unknown as LevelDef[];

export function createRegistry(): ContentRegistry {
  validateGameData();
  return new ContentRegistry().addPatterns(patterns).addSkills(skills).addUnits(units);
}

export function getLevel(id: string): LevelDef {
  const lvl = levels.find((l) => l.id === id);
  if (!lvl) throw new Error(`未知关卡: ${id}`);
  return lvl;
}

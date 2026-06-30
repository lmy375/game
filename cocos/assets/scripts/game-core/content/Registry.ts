// ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
/**
 * 内容注册表：集中持有 Pattern / Skill / Unit 的静态配置。
 * 战斗逻辑只通过 id 查询，不直接接触 JSON 文件（便于测试与热替换）。
 */
import { PatternDef } from "../pattern/Pattern";
import { SkillDef } from "../skill/Skill";
import { UnitDef } from "../unit/Unit";

export class ContentRegistry {
  private patterns = new Map<string, PatternDef>();
  private skills = new Map<string, SkillDef>();
  private units = new Map<string, UnitDef>();

  addPatterns(defs: PatternDef[]): this {
    for (const d of defs) this.patterns.set(d.id, d);
    return this;
  }
  addSkills(defs: SkillDef[]): this {
    for (const d of defs) this.skills.set(d.id, d);
    return this;
  }
  addUnits(defs: UnitDef[]): this {
    for (const d of defs) this.units.set(d.id, d);
    return this;
  }

  pattern(id: string): PatternDef {
    const p = this.patterns.get(id);
    if (!p) throw new Error(`未知 Pattern: ${id}`);
    return p;
  }
  skill(id: string): SkillDef {
    const s = this.skills.get(id);
    if (!s) throw new Error(`未知 Skill: ${id}`);
    return s;
  }
  unit(id: string): UnitDef {
    const u = this.units.get(id);
    if (!u) throw new Error(`未知 Unit: ${id}`);
    return u;
  }

  hasSkill(id: string): boolean {
    return this.skills.has(id);
  }
}

/** Engine-independent image URLs used only by DOM menus and campaign screens. */
export const unitPortraitUrls = {
  wind_mage: new URL("../pixi/assets/portraits/wind_mage.png", import.meta.url).href,
  fire_mage: new URL("../pixi/assets/portraits/fire_mage.png", import.meta.url).href,
  lancer: new URL("../pixi/assets/portraits/lancer.png", import.meta.url).href,
  swordsman: new URL("../pixi/assets/portraits/swordsman.png", import.meta.url).href,
  ice_mage: new URL("../pixi/assets/portraits/ice_mage.png", import.meta.url).href,
  enemy_soldier: new URL("../pixi/assets/portraits/enemy_soldier.png", import.meta.url).href,
  enemy_archer: new URL("../pixi/assets/portraits/enemy_archer.png", import.meta.url).href,
  enemy_heavy: new URL("../pixi/assets/portraits/enemy_heavy.png", import.meta.url).href,
} as const;

export const skillIconUrls = {
  // 通用回退图标：尚无专属图标的技能共用（原普攻图标复用为斩击底图）。
  fallback: new URL("../pixi/assets/skills/normal_attack.png", import.meta.url).href,
  cross_fire: new URL("../pixi/assets/skills/cross_fire.png", import.meta.url).href,
  pierce_shot: new URL("../pixi/assets/skills/pierce_shot.png", import.meta.url).href,
  gale_gather: new URL("../pixi/assets/skills/gale_gather.png", import.meta.url).href,
  push_wave: new URL("../pixi/assets/skills/push_wave.png", import.meta.url).href,
  swap_skill: new URL("../pixi/assets/skills/swap_skill.png", import.meta.url).href,
  ranged_shot: new URL("../pixi/assets/skills/ranged_shot.png", import.meta.url).href,
  defend: new URL("../pixi/assets/skills/defend.png", import.meta.url).href,
} as const;

const portraitByName: Record<string, string> = {
  风术士: unitPortraitUrls.wind_mage,
  火法师: unitPortraitUrls.fire_mage,
  枪兵: unitPortraitUrls.lancer,
  剑客: unitPortraitUrls.swordsman,
  冰法师: unitPortraitUrls.ice_mage,
  近战兵: unitPortraitUrls.enemy_soldier,
  远程兵: unitPortraitUrls.enemy_archer,
  重甲兵: unitPortraitUrls.enemy_heavy,
};

const portraitByGlyph: Record<string, string> = {
  风: unitPortraitUrls.wind_mage,
  火: unitPortraitUrls.fire_mage,
  枪: unitPortraitUrls.lancer,
  剑: unitPortraitUrls.swordsman,
  冰: unitPortraitUrls.ice_mage,
};

export function portraitUrlFor(token?: string): string | undefined {
  if (!token) return undefined;
  return portraitByName[token] ?? portraitByGlyph[token];
}


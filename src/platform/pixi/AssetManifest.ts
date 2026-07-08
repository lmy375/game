export const unitSpriteUrls = {
  wind_mage: new URL("./assets/characters/wind_mage.png", import.meta.url).href,
  fire_mage: new URL("./assets/characters/fire_mage.png", import.meta.url).href,
  lancer: new URL("./assets/characters/lancer.png", import.meta.url).href,
  swordsman: new URL("./assets/characters/swordsman.png", import.meta.url).href,
  ice_mage: new URL("./assets/characters/ice_mage.png", import.meta.url).href,
  enemy_soldier: new URL("./assets/characters/enemy_soldier.png", import.meta.url).href,
  enemy_archer: new URL("./assets/characters/enemy_archer.png", import.meta.url).href,
  enemy_heavy: new URL("./assets/characters/enemy_heavy.png", import.meta.url).href,
} as const;

export const unitPortraitUrls = {
  wind_mage: new URL("./assets/portraits/wind_mage.png", import.meta.url).href,
  fire_mage: new URL("./assets/portraits/fire_mage.png", import.meta.url).href,
  lancer: new URL("./assets/portraits/lancer.png", import.meta.url).href,
  swordsman: new URL("./assets/portraits/swordsman.png", import.meta.url).href,
  ice_mage: new URL("./assets/portraits/ice_mage.png", import.meta.url).href,
  enemy_soldier: new URL("./assets/portraits/enemy_soldier.png", import.meta.url).href,
  enemy_archer: new URL("./assets/portraits/enemy_archer.png", import.meta.url).href,
  enemy_heavy: new URL("./assets/portraits/enemy_heavy.png", import.meta.url).href,
} as const;

export const skillIconUrls = {
  normal_attack: new URL("./assets/skills/normal_attack.png", import.meta.url).href,
  cross_fire: new URL("./assets/skills/cross_fire.png", import.meta.url).href,
  pierce_shot: new URL("./assets/skills/pierce_shot.png", import.meta.url).href,
  gale_gather: new URL("./assets/skills/gale_gather.png", import.meta.url).href,
  push_wave: new URL("./assets/skills/push_wave.png", import.meta.url).href,
  swap_skill: new URL("./assets/skills/swap_skill.png", import.meta.url).href,
  ranged_shot: new URL("./assets/skills/ranged_shot.png", import.meta.url).href,
  defend: new URL("./assets/skills/defend.png", import.meta.url).href,
} as const;

export const terrainTextureUrls = {
  ground: new URL("./assets/terrain/ground.png", import.meta.url).href,
  wall: new URL("./assets/terrain/wall.png", import.meta.url).href,
  obstacle: new URL("./assets/terrain/obstacle.png", import.meta.url).href,
  fire: new URL("./assets/terrain/fire.png", import.meta.url).href,
  trap: new URL("./assets/terrain/trap.png", import.meta.url).href,
} as const;

export const effectTextureUrls = {
  fire_burst: new URL("./assets/effects/fire_burst.png", import.meta.url).href,
  cross_fire: new URL("./assets/effects/cross_fire.png", import.meta.url).href,
  gale_gather: new URL("./assets/effects/gale_gather.png", import.meta.url).href,
  push_wave: new URL("./assets/effects/push_wave.png", import.meta.url).href,
  pierce_shot: new URL("./assets/effects/pierce_shot.png", import.meta.url).href,
  swap_skill: new URL("./assets/effects/swap_skill.png", import.meta.url).href,
  slash: new URL("./assets/effects/slash.png", import.meta.url).href,
  trap: new URL("./assets/effects/trap.png", import.meta.url).href,
} as const;

export const generatedEffectSheetUrls = {
  fire_burst: new URL("./assets/effects/generated/fire_burst_sheet.png", import.meta.url).href,
  wind_cyclone: new URL("./assets/effects/generated/wind_cyclone_sheet.png", import.meta.url).href,
  ice_burst: new URL("./assets/effects/generated/ice_burst_sheet.png", import.meta.url).href,
  slash_arc: new URL("./assets/effects/generated/slash_arc_sheet.png", import.meta.url).href,
  push_wave: new URL("./assets/effects/generated/push_wave_sheet.png", import.meta.url).href,
  swap_portal: new URL("./assets/effects/generated/swap_portal_sheet.png", import.meta.url).href,
  projectile_bolt: new URL("./assets/effects/generated/projectile_bolt_sheet.png", import.meta.url).href,
} as const;

export const battleBackgroundUrls = {
  default: new URL("./assets/backgrounds/dungeon-battlefield.png", import.meta.url).href,
  level_001: new URL("./assets/backgrounds/levels/level_001-scorched-frontier.png", import.meta.url).href,
  level_002: new URL("./assets/backgrounds/levels/level_002-wind-shrine.png", import.meta.url).href,
  level_003: new URL("./assets/backgrounds/levels/level_003-long-bridge.png", import.meta.url).href,
  level_004: new URL("./assets/backgrounds/levels/level_004-ruined-courtyard.png", import.meta.url).href,
  level_005: new URL("./assets/backgrounds/levels/level_005-frozen-pass.png", import.meta.url).href,
  level_006: new URL("./assets/backgrounds/levels/level_006-night-raid.png", import.meta.url).href,
  level_007: new URL("./assets/backgrounds/levels/level_007-canyon-ambush.png", import.meta.url).href,
  level_008: new URL("./assets/backgrounds/levels/level_008-castle-gate.png", import.meta.url).href,
  level_009: new URL("./assets/backgrounds/levels/level_009-inner-city.png", import.meta.url).href,
  level_010: new URL("./assets/backgrounds/levels/level_010-command-hall.png", import.meta.url).href,
} as const;

export const battleBackgroundUrl = battleBackgroundUrls.default;

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

export const allBattleAssetUrls = [
  ...Object.values(unitSpriteUrls),
  ...Object.values(unitPortraitUrls),
  ...Object.values(skillIconUrls),
  ...Object.values(terrainTextureUrls),
  ...Object.values(effectTextureUrls),
  ...Object.values(generatedEffectSheetUrls),
  ...Object.values(battleBackgroundUrls),
];

/**
 * 基于 localStorage 的存档实现（web/three/pixi 共用）。game-meta 只定义 SaveStore 契约，IO 在此。
 */
import { SaveStore, SaveData, serialize, deserialize } from "@meta/index";
import { migrateLegacySave } from "@data/metaIndex";

const KEY = "formation_save_v1";

export class LocalSaveStore implements SaveStore {
  load(): SaveData | null {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      try {
        return deserialize(raw);
      } catch {
        // 旧版本存档：尝试迁移；成功则回写，失败当作无存档。
        const migrated = migrateLegacySave(JSON.parse(raw));
        if (migrated) this.save(migrated);
        return migrated;
      }
    } catch {
      return null; // 损坏/不兼容存档当作无存档
    }
  }
  save(data: SaveData): void {
    try {
      localStorage.setItem(KEY, serialize(data));
    } catch {
      /* 隐私模式等写入失败时静默忽略 */
    }
  }
  clear(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
}

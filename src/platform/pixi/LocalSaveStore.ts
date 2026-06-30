/**
 * 基于 localStorage 的存档实现（web/three/pixi 共用）。game-meta 只定义 SaveStore 契约，IO 在此。
 */
import { SaveStore, SaveData, serialize, deserialize } from "@meta/index";

const KEY = "formation_save_v1";

export class LocalSaveStore implements SaveStore {
  load(): SaveData | null {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? deserialize(raw) : null;
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

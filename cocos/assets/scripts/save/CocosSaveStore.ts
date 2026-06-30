import { sys } from "cc";
import { SaveStore, SaveData, serialize, deserialize } from "../game-meta/index";

const KEY = "formation_save_v1";

/** 基于 Cocos sys.localStorage 的存档实现。game-meta 只定义 SaveStore 契约，IO 在此。 */
export class CocosSaveStore implements SaveStore {
  load(): SaveData | null {
    try {
      const raw = sys.localStorage.getItem(KEY);
      return raw ? deserialize(raw) : null;
    } catch {
      return null;
    }
  }
  save(data: SaveData): void {
    try {
      sys.localStorage.setItem(KEY, serialize(data));
    } catch {
      /* ignore */
    }
  }
  clear(): void {
    try {
      sys.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
}

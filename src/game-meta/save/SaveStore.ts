/**
 * 存档契约：game-meta 只声明接口与纯（反）序列化；具体 IO（localStorage 等）由表现层实现。
 */
import { SaveData, cloneSaveData } from "../profile/Profile";

export interface SaveStore {
  load(): SaveData | null;
  save(data: SaveData): void;
  clear(): void;
}

export function serialize(data: SaveData): string {
  return JSON.stringify(data);
}

export function deserialize(json: string): SaveData {
  const parsed = JSON.parse(json) as Partial<SaveData>;
  if (!parsed || parsed.version !== 3 || !parsed.profile) {
    throw new Error("存档版本不兼容或已损坏");
  }
  // 深拷贝，避免外部持有内部引用。
  return cloneSaveData(parsed as SaveData);
}

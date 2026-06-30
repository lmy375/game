// @ts-check
/**
 * sync-core.mjs —— 把单一真源 src/ 的引擎无关层同步进 Cocos 工程。
 *
 * 设计:game-core / game-meta / interaction / campaign 都是引擎无关纯 TS,单一真源永远在 ../src。
 * Cocos 工程里的 assets/scripts/{game-core,game-data,game-meta,interaction,campaign} 是「派生产物」,
 * 由本脚本生成,勿手改。别名 @core/@data/@meta 统一重写为相对路径。
 *
 * 运行:  pnpm sync:cocos      (= node cocos/scripts/sync-core.mjs)
 */
import { fileURLToPath } from "node:url";
import { dirname, join, relative, sep } from "node:path";
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync, existsSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", ".."); // cocos/scripts → repo 根
const SRC_CORE = join(repoRoot, "src", "game-core");
const SRC_DATA = join(repoRoot, "src", "game-data");
const SRC_META = join(repoRoot, "src", "game-meta");
const SRC_INTERACTION = join(repoRoot, "src", "interaction");
const SRC_CAMPAIGN = join(repoRoot, "src", "campaign");
const OUT_ROOT = join(repoRoot, "cocos", "assets", "scripts");
const OUT_CORE = join(OUT_ROOT, "game-core");
const OUT_DATA = join(OUT_ROOT, "game-data");
const OUT_META = join(OUT_ROOT, "game-meta");
const OUT_INTERACTION = join(OUT_ROOT, "interaction");
const OUT_CAMPAIGN = join(OUT_ROOT, "campaign");

const BANNER = "// ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。\n";

/** 别名 → 相对路径。前缀按目标文件相对 assets/scripts 的目录深度计算（嵌套子目录需多个 ../）。 */
function rewriteAliases(code, destFile) {
  const relDir = relative(OUT_ROOT, dirname(destFile));
  const depth = relDir === "" ? 0 : relDir.split(sep).length;
  const up = "../".repeat(depth);
  return code
    .replace(/(["'])@core\//g, `$1${up}game-core/`)
    .replace(/(["'])@meta\//g, `$1${up}game-meta/`)
    .replace(/(["'])@data\//g, `$1${up}game-data/`);
}

function walk(dir) {
  /** @type {string[]} */
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function clean(dir) {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

/** 逐字复制一层（.ts 加 banner + 别名重写；其它文件原样）。返回 .ts 数量。 */
function syncLayer(srcDir, outDir) {
  clean(outDir);
  let count = 0;
  for (const file of walk(srcDir)) {
    const rel = relative(srcDir, file);
    const dest = join(outDir, rel);
    mkdirSync(dirname(dest), { recursive: true });
    if (file.endsWith(".ts")) {
      writeFileSync(dest, BANNER + rewriteAliases(readFileSync(file, "utf8"), dest));
      count++;
    } else {
      writeFileSync(dest, readFileSync(file));
    }
  }
  return count;
}

// ── 1. game-core ─────────────────────────────────────────────────────────
const coreCount = syncLayer(SRC_CORE, OUT_CORE);

// ── 2. game-data:JSON → TS default-export 模块；.ts 重写别名 + 去 .json 扩展名 ──
clean(OUT_DATA);
let dataCount = 0;
for (const file of walk(SRC_DATA)) {
  const name = relative(SRC_DATA, file);
  if (name.endsWith(".json")) {
    const json = readFileSync(file, "utf8").trim();
    const base = name.replace(/\.json$/, "");
    writeFileSync(join(OUT_DATA, base + ".ts"), `${BANNER}export default ${json} as const;\n`);
    dataCount++;
  } else if (name.endsWith(".ts")) {
    // game-data 内部的 .json 导入在 cocos 端变成 .ts，去掉扩展名；@data 指向本目录。
    let code = readFileSync(file, "utf8")
      .replace(/(["'])@core\//g, "$1../game-core/")
      .replace(/(["'])@meta\//g, "$1../game-meta/")
      .replace(/(["'])@data\//g, "$1./")
      .replace(/\.json(["'])/g, "$1");
    writeFileSync(join(OUT_DATA, name), BANNER + code);
    dataCount++;
  }
}

// ── 3. game-meta / interaction / campaign ─────────────────────────────────
const metaCount = syncLayer(SRC_META, OUT_META);
const interactionCount = syncLayer(SRC_INTERACTION, OUT_INTERACTION);
const campaignCount = syncLayer(SRC_CAMPAIGN, OUT_CAMPAIGN);

console.log(
  `✓ 已同步 game-core(${coreCount}) game-data(${dataCount}) game-meta(${metaCount}) interaction(${interactionCount}) campaign(${campaignCount})`
);
for (const d of [OUT_CORE, OUT_DATA, OUT_META, OUT_INTERACTION, OUT_CAMPAIGN]) {
  console.log(`  → ${relative(repoRoot, d)}`);
}

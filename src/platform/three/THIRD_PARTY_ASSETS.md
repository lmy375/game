# 3D 美术素材与授权

角色、装备和遗迹场景来自 **Kay Lousberg / KayKit**，均使用上游明确标记的 **CC0 1.0** 免费版本，可用于商业项目并随游戏分发。本项目没有使用付费 EXTRA / SOURCE 包。

| 内容 | 原始来源 | 固定版本 |
| --- | --- | --- |
| Knight、Mage、Rogue Hooded、Barbarian；骨骼动画、随身武器 | [KayKit Adventurers](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0) | `672074b73ba276876a19e8816ecdc5241817ab47` |
| 石板、立柱、墙体、木桶、碎石、火把、旗帜、尖刺陷阱 | [KayKit Dungeon Remastered](https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0) | `b0ca9bd96a8072ab36a3a5464f00ed1e06a16d07` |

原始授权文本保存在 `assets/licenses/`。逐文件下载来源、原始 SHA-256、输出 SHA-256 和处理说明见 `assets/provenance.json`。

角色保留 12 种实际使用的作者骨骼动作（待机、行走、施法、受击、死亡、格挡、射击和三种近战），裁剪未使用的动画并无损重排 glTF buffer/accessor，四个角色共约 3.5 MB。几何、贴图、骨架和保留的关键帧均未做有损简化。场景 GLB 保持原样。所有 GLB 自带纹理，运行期间不请求第三方 CDN。

`python3 scripts/prepare-three-assets.py` 可从固定上游版本重新下载、处理并生成溯源清单。

角色外观是作者设计的风格化比例。8 个战斗职业通过 4 套角色网格、装备选择、颜色和体型区分；三位法师复用 Mage，枪兵和重甲兵复用 Knight。当前枪兵使用原包双手长剑与突刺动作；若产品最终确定为写实人物或要求每个职业独占外形，需要替换职业模型与对应武器，不能把这些共用资产当成定制写实角色。

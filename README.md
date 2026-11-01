# 量权 Quant Throne

一局 5–8 分钟的竖屏滑卡游戏：你掌舵“竹林资本”，在经营决策和**隐去日期与代码的 Panda Data 真实历史行情**中做选择。游戏把选择与表现转成**有证据、可修正**的量化画像（偏好与能力分开、给出置信度和“证据不足”），据此从 QuantSkills / PandaAI 资源中推荐 3 项并说明理由与“暂不推荐”，再给一个在游戏内就能完成的 10 分钟任务。画像可导出为 `pandaai.profile.v1` JSON，并可送入 Vivic 生成三张卡片。

> PandaAI 官方授权数据支持 · 游戏测评，不构成投资建议

## 在线体验（无需账号）

| 内容 | 地址 |
| --- | --- |
| H5 游戏（手机竖屏） | https://edsionc.top/game/?play=quant-throne |
| 游戏直链 | https://edsionc.top/game/games/quant-throne/index.html |
| 官网（含 4 分钟演示视频） | https://edsionc.top/quant-throne/ |
| 模拟演示路径 A / B（规则模拟，非真实用户） | 直链后加 `?demo=A&seed=review` 或 `?demo=B&seed=review` |
| Android 测试包（debug 签名） | https://edsionc.top/game/games/quant-throne/download/quant-throne.apk |
| Vivic 内入口 | https://vivic.edsionc.top/ 右上角“量权” |

## 本地运行

环境：Node.js 24 + npm。**本地运行游戏不需要任何账号或数据密钥**，仓库已带真实行情快照（`src/data/episodes.pack.json`），接口、字段、口径和抓取时间见 `docs/data/provenance.json`。

```bash
npm ci            # 安装依赖
npm test          # 单元测试：画像/推荐纯函数、选牌、隐私导出、消息白名单、行情服务
npm run dev       # 打开 http://127.0.0.1:5173/
                  # ?seed=review 固定选牌；?demo=A&seed=review / ?demo=B&seed=review 复现两条演示路径
npm run build     # 类型检查 + 生产构建 → dist/（纯静态，放到任意 HTTPS 目录即可）
npm run preview   # 预览构建产物
```

## 可选部分

**行情 / 画像传送服务**（`services/quant-api/`，官网实时快照与“送入 Vivic”用）
```bash
PANDA_DATA_USERNAME=... PANDA_DATA_PASSWORD=... node services/quant-api/start.mjs
# 监听 127.0.0.1:18894（QUANT_API_PORT 可改）；接口 /quant-throne/api/{health,market,transfer,transfer/claim}
```
未配置 Panda Data 账号时游戏照常可玩，官网快照显示“暂不可用”，不会填入假数据。

**重新抓取真实数据**（需要 Panda Data 账号）：在 `secrets/local.env.local` 写入 `PANDA_DATA_USERNAME=`、`PANDA_DATA_PASSWORD=`，然后
```bash
npm run data:login && npm run data:build && npm run data:verify
```

**构建 Android APK**（JDK 21 + Android SDK 35）
```bash
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug
```

**官网静态页**：`landing/`，直接用任意静态服务器打开 `landing/index.html`。

## 配置与密钥

- 密钥只放在本机 `secrets/*.env.local`（已被 `.gitignore` 忽略），前端产物与 APK 不含任何密钥。
- `npm run check:secrets` 扫描源码、文档与构建产物，确认没有泄露（需要本机存在 `secrets/` 目录）。

## 测试账号

- 游戏与官网：**不需要账号**。
- Vivic 内入口：不登录也能打开游戏、查看画像和三张卡预览；“保存三张卡到 Vivic”需要登录 Vivic，目前没有公开测试账号，评委需要时请联系我们单独提供。

## 目录

| 路径 | 内容 |
| --- | --- |
| `src/` | 游戏（React 18 + TypeScript + Vite）；`src/engine/` 画像、推荐、选牌等纯函数及测试 |
| `src/data/` | Panda Data 真实行情关卡快照、推荐资源表（等级/风格为团队标注） |
| `tools/data/` | Panda Data 抓取、关卡生成与校验脚本 |
| `services/quant-api/` | 行情代理与画像一次性传送服务 |
| `integrations/vivic/` | Vivic 前端入口脚本（手机比例游戏舞台 + 侧栏） |
| `landing/` | 官网静态页 |
| `android/` | Capacitor Android 工程 |
| `public/assets/` | 原创 AI 生成美术、TTS 语音、CC0 背景音乐 |

## 说明与标注

- **公开版不含游戏音效**：线上版本使用的 11 段授权音效不在本仓库分发，游戏缺少音效时静默跳过，玩法不受影响。背景音乐为 CC0（`docs/audio/bgm-source.json`），语音为自有 TTS 生成（`docs/audio/voice-sources.json`）。
- 演示路径 A/B 为规则模拟，非真实用户；游戏净值换算、均线实验等为模拟或示意，界面中均有标注。
- 分享人物卡与 `profile.v1` 不含原始逐卡记录；逐卡记录只存在本机 localStorage，可在设置中清除。
- 已知局限：尚无真人计时试玩；iOS 与 Android 真机未完成验收；APK 为 debug 签名。

联系人：程佳锐，2014184720@qq.com

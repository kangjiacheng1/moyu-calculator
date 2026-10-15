# 摸鱼计算器 · 开发文档

> 本文档记录项目的技术栈、构建编译方法、GitHub 发布流程和运维注意事项。
> 面向"几个月后回来的自己"或接手的人。

## 一、技术栈

### 核心

| 层 | 技术 | 说明 |
|---|---|---|
| 框架 | **Vite 8 + React 19**（JSX，无 TypeScript） | `npm create vite` 模板起步 |
| UI | **手写 Material Design 3 (Material You)** | 无 UI 框架；CSS 自定义属性双套 token（`html[data-theme=light/dark]`），28px 大圆角卡片、pill 按钮、tonal 表面 |
| 路由 | 无 | `App.jsx` 用 state 切换 home / settings / month 三个视图 |
| 状态 | React Context + useReducer（`src/state.jsx`） | 每次 state 变化整体写入 localStorage |
| 数据 | **localStorage**（无后端） | 四个 key：`moyu.settings.v1` / `moyu.days.v1` / `moyu.holidayCache.v1` / `moyu.dayOverrides.v1` |
| Lint | oxlint（模板自带） | 无单元测试框架 |

### PWA

- **vite-plugin-pwa**（Workbox generateSW，`registerType: 'autoUpdate'`）
- `public/icons/`：icon-192/512 + maskable-192/512（maskable 用 PIL 从设计稿合成，见下）
- `public/favicon.ico` / `favicon-16/32.png` / `apple-touch-icon.png`
- 坑：SW 缓存导致浏览器测试时旧页面顽固——换个端口或 origin 开全新标签页即可绕过

### 业务逻辑（全部纯函数，`src/lib/`）

| 文件 | 职责 |
|---|---|
| `time.js` | 工作窗口裁剪、迟到/早退、午休拆分（展示层合成）、周/月/年日期工具、紧凑时长格式 |
| `money.js` | 薪资换算：日薪 = 月薪 ÷ **当月实际应出勤天数**（非固定 21.75） |
| `rank.js` | 山海经摸鱼段位（鲛人→鲲鹏 + 卷王），占比阈值 + 科普文案 |
| `schedule.js` | 工作日判定：手动覆盖 > 节假日 > 工作制度（双休/大小周隔周取模/单休） |
| `holiday.js` + `holiday2026.js` | timor.tech API（缓存 7 天）→ 内置 2026 官方放假调休表兜底 |
| `ai.js` | DeepSeek（OpenAI 兼容）`listModels` / `chat`，日报生成 |
| `notify.js` | 通知栏日报（仅原生），固定 id cancel+schedule 实现更新 |
| `storage.js` | localStorage 读写 + 导出/导入 JSON |

### 安卓离线版（Capacitor 8）

- 网页文件打进 APK 内部，完全离线，包名 `com.kangjiacheng.moyu`
- 插件：`@capacitor/local-notifications`（通知栏日报）、`@capacitor/filesystem` + `@capacitor/share`（导出备份走系统分享面板——WebView 不支持 `<a download>`）
- `src/main.jsx`：原生环境跳过 SW 注册（`Capacitor.isNativePlatform()`），否则 cap sync 后旧缓存不更新
- 启动图标：`android/app/src/main/res/mipmap-*/` 已替换为摸鱼 logo（自适应图标背景色 #156FE6）

## 二、编译构建

### 环境要求

- Node 22+（`node -v` 验证）
- **JDK 21**：安卓构建用。注意 Android Studio 自带的 JBR 已升到 Java 25，Gradle 8.14 不认（报 `Unsupported class file major version 69`）。本机已装 Temurin JDK 21 在 `~/.jdks/jdk-21.0.12.1+1/`，下面的命令已带好 JAVA_HOME
- Android Studio 仅在需要图形界面调试/真机 Run 时使用（Gradle JDK 需在设置里选 21）

### 网页版

```bash
npm install
npm run dev        # 开发 http://localhost:5173
npm run build      # 产出 dist/
npm run preview    # 生产预览 http://localhost:4173
```

### 安卓 APK（离线版）

```bash
npm run cap:sync   # = npm run build + cap sync，同步网页进安卓工程
cd android && JAVA_HOME="$HOME/.jdks/jdk-21.0.12.1+1/Contents/Home" ./gradlew assembleDebug
# 产出：android/app/build/outputs/apk/debug/app-debug.apk
```

**每次发版前必须提版本号**（否则覆盖安装可能被系统拒绝）：编辑 `android/app/build.gradle` 的 `versionCode`（整数递增）和 `versionName`。

**无缝更新三要素**：同包名 + 同签名（debug 包用同一个 `~/.android/debug.keystore`，同机器天然满足）+ versionCode 递增。满足后覆盖安装，localStorage 数据原样保留。

## 三、Git 与 GitHub 发布

### 仓库

- 地址：`github.com/kangjiacheng1/moyu-calculator`（公开；GitHub 不支持中文仓库名，中文门面靠 README 和仓库简介）
- 本机已装 `gh` CLI 并登录（device flow 授权），`gh auth setup-git` 已配置好 git 凭证

### 版本提交规范

```bash
git add -A
git commit -m "1.6.1

- 改动要点一行一条
- 安卓版 versionCode 9 / versionName 1.6.1"   # 动了安卓版就写这行
git push
```

### 发布 APK（新建 Release，不覆盖旧版）

```bash
cp android/app/build/outputs/apk/debug/app-debug.apk /tmp/moyu-release/moyu-calculator-offline-v<版本>.apk
gh release create v<版本> /tmp/moyu-release/moyu-calculator-offline-v<版本>.apk \
  --repo kangjiacheng1/moyu-calculator \
  --title "摸鱼计算器 v<版本> <emoji> <标题>" \
  --notes "版本说明（俏皮风格，不写开发过程）"
```

- 固定直链：`https://github.com/kangjiacheng1/moyu-calculator/releases/latest/download/<文件名>`（文件名带版本号时注意同步）
- 删除旧 Release（如需）：`gh release delete v<版本> --yes --cleanup-tag`（连标签一起清）

## 四、运维备忘

- **签名密钥**：`keystore/` 目录（PWABuilder 时代的 TWA 签名）已 gitignore，丢了没法给那个包名发更新；离线版 debug 签名在 `~/.android/debug.keystore`，换机器构建会导致无法覆盖安装
- **节假日 API**（timor.tech）在 Cloudflare 后面，curl 会被拦 403，浏览器/WebView 正常；API 挂了有内置 2026 兜底表 + 手动日历覆盖
- **节假日兜底表只覆盖 2026 年**，跨年记得补 `src/lib/holiday2026.js` 的新年数据（或依赖 API 在线拉取）
- **通知栏日报**仅在安卓离线版生效，App 被系统杀死后停止更新（WebView 局限，属正常）
- `/tmp/moyu-release/` 会被系统清理，发版时先 `mkdir -p`

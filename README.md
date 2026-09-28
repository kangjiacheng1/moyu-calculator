<p align="center">
  <img src="public/icons/icon-512.png" width="128" alt="摸鱼计算器 Logo" />
</p>

<h1 align="center">摸鱼计算器</h1>

<p align="center">算算你今天白嫖了老板多少钱 🐟</p>

<p align="center">
  Vite + React 构建的移动端 PWA，可一键打包成安卓 APK<br/>
  数据全部存在本地，老板和网络运营商都看不到
</p>

---

## 📱 长什么样

<p align="center">
  <img src="docs/screenshots/main-light.png" width="220" alt="主操作页（浅色）" />
  <img src="docs/screenshots/main-dark.png" width="220" alt="主操作页（深色）" />
  <img src="docs/screenshots/daily-report.png" width="220" alt="日报" />
  <img src="docs/screenshots/week-report.png" width="220" alt="周报" />
</p>

## ✨ 功能一览

**⏱️ 打卡计时**
- 「🌅 开始上班」打卡 → 「🧱 搬砖 / 🐟 摸鱼」随意切换 → 「🏃 下班跑路」收工
- 大号实时计时，「今日记录」逐段列出每一次切换，账记得清清楚楚
- 忘记按下班？当天 24:00 自动按下班时间结算

**🧮 时间逻辑**
- 上午 / 下午两段作息可配置（默认 09:00–12:00、13:30–18:00），午休自动剔除
- 迟到（宽限期可改）、早退、加班自动判定，**迟到早退统统计入摸鱼**
- 非工作时段计时照走，但会明确提示「不计入统计」

**💰 薪资换算**
- 填上月薪和年终奖，自动算出日薪和「每分钟价值」
- 摸鱼、迟到、早退、加班全部折算成金额，日报大字展示**今日总白嫖金额**

**📅 工作制度 & 节假日**
- 双休 / 大小周（指定基准周六，隔周循环）/ 单休
- 节假日三层判定：timor.tech API（本地缓存）→ 内置 2026 年完整官方放假调休表 → 手动逐日覆盖
- 休息日自动不记账，显示「今天放假，摸鱼自由 🎉」

**📊 报表与段位**
- 主页横向滑动三页：日报 | 主操作 | 周报，月报独立成页
- 周报：每日摸鱼柱状图 + 与上周对比；月报：搬砖 vs 摸鱼环形图 + 摸鱼最多的星期几
- 快乐换算：本月摸鱼 ≈ X 杯奶茶（1 杯 = 15 元）
- 五档摸鱼段位：🥉 青铜鱼 → 🥈 白银鱼 → 🍟 老油条 → 🐋 深海巨鲸 → 🏠 公司是我家

**💾 数据**
- 全部存 localStorage，刷新、杀后台、关屏重开都不丢
- 设置即改即存，支持导出 / 导入 JSON 备份迁移

**🎨 外观**
- Material Design 3 (Material You) 风格：大圆角卡片、低饱和配色、深浅双主题
- 适配手机竖屏，刘海屏 / 底部手势条安全区全处理

## 🚀 快速开始

```bash
npm install
npm run dev        # 开发预览 http://localhost:5173
```

```bash
npm run build      # 构建到 dist/
npm run preview    # 生产预览 http://localhost:4173
```

手机真机预览：`npm run dev -- --host`，手机连同一 Wi-Fi 访问电脑 IP 即可。

## 📦 打包成安卓 APK

项目已内置完整 PWA 配置（manifest、图标、service worker 离线缓存）：

1. `npm run build`，把 `dist/` 部署到任意 HTTPS 托管（Netlify / Vercel / GitHub Pages）
2. 打开 [PWABuilder](https://www.pwabuilder.com)，输入部署地址，检测全绿
3. Package For Android → 下载 APK，传到手机安装即可

## 🛠 技术栈

- **Vite + React 19**，无 UI 框架，Material You 风格手写 CSS（浅色 / 深色双套 token）
- **vite-plugin-pwa**：service worker 离线缓存，可安装到主屏幕
- **零后端**：localStorage 持久化，纯函数时间/薪资/段位计算逻辑（`src/lib/`）
- 节假日数据：[timor.tech API](https://timor.tech/api/holiday) + 内置 2026 年兜底表

## ⚠️ 免责声明

本应用仅供娱乐。摸鱼虽爽，请注意分寸；因使用本应用导致的任何后果（包括但不限于被老板抓包、绩效归零），作者概不负责 🐟

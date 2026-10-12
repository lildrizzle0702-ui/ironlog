# IRONLOG

力量训练记录 PWA。深色优先，手机优先，离线可用，iOS 可添加到主屏幕。

- 技术栈：React 19 + TypeScript + Vite + vite-plugin-pwa（IndexedDB / idb 存储，无后端）
- 路由：hash 路由，base `/ironlog/`，部署于 GitHub Pages
- 数据：全部存本机 IndexedDB，支持 JSON 备份导入导出、CSV 明细导出

## 功能

- 记训练：空手或从模板开始；逐组记重量/次数/RIR/RPE/节奏；自定义数字键盘 + 快捷加重；左滑删除
- 组间计时器：完成一组自动启动，全屏进度环，60/90/120/180 快捷切换
- 工具：%1RM 配重、杠铃配片计算器、三公式 e1RM（Epley/Brzycki/Lombardi）
- PR 系统：重量/次数/容量/e1RM 自动检测，破纪录全屏庆祝，PR 历史时间线
- 渐进超负荷建议：同重量 3×8 且 RIR≤2 提示下次 +2.5kg
- 动作库：预置 60+ 动作（中英双名、肌群、器械），支持自定义
- 模板：内置四分化（胸+二头 / 背+三头 / 肩 / 腿），可编辑可自建，支持超级组
- 日历 / 历史 / 统计：月视图高亮、单次明细编辑复制、 e1RM 曲线、每肌群周组数、周容量、训练频率热力图、体重腰围曲线
- 设置：kg/lb、杆重、默认休息、RIR/RPE 开关、e1RM 公式选择

## 开发

```bash
npm install
npm run dev
npm run build   # 产物在 dist/，含 service worker
```

## 部署

推送到 `main` 后由 GitHub Actions 自动构建并发布到 GitHub Pages（需仓库 Pages 设置为 GitHub Actions 模式）。

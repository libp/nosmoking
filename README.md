# 余生 · AFTERGLOW

完整的控烟公益 Web 体验：身体账本、3D 心脏实验室、烟幕剧场、屏幕点烟与戒烟行动。保留小程序骨架，当前先交付独立 Web 版。

首页支持粗略计算（2024 调查平均日支数）与详细计算（个人年龄、烟龄、日支数、月消费、可选开始吸烟日期），展示包年、肺部艺术色阶、花费、假设税费及消费情景，可导出 PNG。不能用烟龄预测肺部真实颜色、健康评分或个人寿命。

烟幕剧场包含原创 18 秒反讽动态短片，以及《是，首相》S1E3《烟幕》的 Apple TV 剧集入口、BBC Comedy Greats YouTube 片段（仅点击后加载，播放受外部平台、地区和网络条件影响）。养老金只计算用户明确填写的情景，不当作吸烟的财政净收益。

无烟游乐场支持虚拟点燃、吸烟、燃尽、熄灭、烟雾粒子与 20 秒舒缓呼吸；5 口折算一支纯属游戏规则。替代消费金额是假设，不冒充真实节省。戒烟页提供本地日期计时、预计少花金额与少吸支数、每日行动和无佣金的工具链接。

`product/model.js` 为可复用的纯计算模块；`product/app.js` 为 Web 展示与本地持久化；`games/script.js` 为按需初始化的 Three.js 心脏。后续小程序移植可复用模型和数据口径，界面与 Canvas/WebGL 适配另行处理。

已核验的数据快照：2025 年行业工商税利 16,570 亿元、财政总额 15,800 亿元；2024 调查吸烟率 23.2%、现在吸烟者平均每日 15.8 支；WHO 2026 更新全球每年烟草死亡超过 700 万。全部来源、年份、定义与公式保存在 `product/model.js` 并在页面「数据与算法」展示。非实时数据流。行业税利含利润，不能当成每支烟实际税额。

## 本地运行

需要 Node.js 20.19+ 或 22.12+。

```sh
npm install
npm run dev
```

打开 http://127.0.0.1:5173/ 。原来的 `/games/index.html` 入口会跳转到首页。小程序的 `app.*`、`pages/` 和微信项目配置保留；新的网页体验独立运行，并非微信小程序内嵌页面。

```sh
npm run build
npm run preview
```

构建结果在 `dist/`，可部署到普通静态站点服务器。

## 手机预览与访问

`npm run dev:mobile` 启动监听局域网的 5174 端口。电脑可打开 `http://127.0.0.1:5174/mobile.html` 查看可互动的手机外框，切换 360 / 390 / 430 像素。手机与电脑连接相同 Wi‑Fi 后，打开终端输出的 WLAN Network 地址（局域网 IP 可能随网络变化）。无需在手机输入 127.0.0.1。

手机布局包含底部五栏导航、安全区域留白、48px 按钮、16px 输入字号、单栏账单与触控滑杆。心脏画布限定在模型区域；该区域支持单指旋转、双指缩放，其余页面支持正常手指滚动。外框预览模拟尺寸，真实手势仍需手机实机验证。

触摸回归使用 Playwright CLI：先 `playwright-cli -s=mobile open http://127.0.0.1:5173/ --device="iPhone 13"`，再 `playwright-cli -s=mobile run-code --filename=scripts/verify-mobile.cjs`。覆盖 320 / 360 / 390 / 430 宽度、导航触达、输入字号、触摸点烟、页面滑动、模型旋转与双指缩放。

## 交互

- 鼠标拖动 / 单指拖动：旋转；滚轮 / 双指手势：缩放。
- 点击三个解剖标记：阅读主动脉、冠脉、心肌的机制说明。
- 三个状态按钮与 0–30 年滑杆：实时改变心率演示、心肌形变与损伤纹理、冠脉狭窄和斑块生长、血流滞留和烟雾浓度。年份只控制艺术表达的递进，不是医学剂量模型。
- 恢复旅程：拖动进度，观察停止暴露后逐步改善的艺术化表达。
- 右下工具：自动旋转、重置视角、合成心跳声音、导出 PNG 场景。
- 状态选项支持方向键 / Home / End；滑杆支持键盘。系统减少动态效果偏好会关闭模型的心跳形变和漂浮。

## 实现

使用 Three.js、OrbitControls、物理材质、PMREM 环境照明、定制组织噪声、FBM 烟雾着色器、冠脉曲线粒子与轻量 Bloom。没有外部 3D 模型或贴图依赖。字体使用 Google Fonts，网络不可用时回退到系统字体。音频仅在用户主动开启后通过 Web Audio 合成。

视网膜渲染比例上限 1.75，帧率上限 45 FPS，隐藏页面停止模拟更新。浏览器需要 WebGL 2 / 硬件加速。

## 科学说明

模型是程序生成的解剖意象，不是医学扫描。裂隙、凹陷与瘢痕为强调损伤的艺术化表达，并非真实心脏破裂。心率、年份对应的外观、血流和恢复进度为机制示意，不预测个人疾病概率或康复时长。恢复终点保留部分暴露痕迹，不意味着既有损伤立即消失。

## 浏览器验证

计算模型测试：`node --test product/model.test.js`。

完整产品交互回归：`npx --yes --package=@playwright/cli playwright-cli run-code --filename=scripts/verify-product.cjs`，覆盖计算校验、存储、报告、心脏联动、剧场、游戏、戒烟计时与手机布局。

开发服务器运行时，使用 Playwright CLI 的无头浏览器执行交互回归：

```sh
npx --yes --package=@playwright/cli playwright-cli open http://127.0.0.1:5173/
npx --yes --package=@playwright/cli playwright-cli run-code --filename=scripts/verify-browser.cjs
```

覆盖健康基线、高年数损伤、斑块与裂隙、恢复、标记弹窗、旋转缩放、声音、PNG 导出、资料链接与手机布局。截图写入 `output/playwright/`（已忽略）。

页面「科学依据」提供以下来源：

- [CDC：吸烟与心血管疾病](https://www.cdc.gov/tobacco/about/cigarettes-and-cardiovascular-disease.html)
- [CDC：心血管健康与戒烟](https://www.cdc.gov/tobacco/hcp/patient-care-settings/cardiovascular.html)
- [FDA：吸烟如何影响心脏](https://www.fda.gov/tobacco-products/health-effects-tobacco-use/how-smoking-affects-heart-health)

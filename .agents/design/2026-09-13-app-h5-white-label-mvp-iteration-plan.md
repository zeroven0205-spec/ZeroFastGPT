# App H5 白标 MVP 一期项目交付完整计划

> 版本：v0.2
> 计划日期：2026-09-13
> 适用项目：FastGPT 现有 Next.js 应用
> 目标：基于现有系统新增业务方专属 `/app/[appKey]` H5 入口，通过 APP WebView 使用，复用现有登录、用户、应用、Agent 和对话能力；业务方终端不出现平台显性品牌。
> 本文件同时作为一期交付的总计划、阶段门禁、子 Agent/子任务拆分、验收标准和发布准入依据。

## 1. 计划原则

### 1.1 一期采用“外部白标、内部兼容”

一期只改造业务方能够感知的边界：

- 新增业务方专属 `/app/[appKey]` 路由族。
- 新增独立 H5 Layout，不复用平台管理端 Navbar。
- 复用现有登录 API、Cookie、用户和权限体系。
- 复用现有 Chat/Agent 能力，不复制一套对话引擎。
- 使用业务方 Logo、favicon、页面标题、主题色和文案。
- 生产部署层使用业务方镜像仓库、服务名和容器名。

一期暂不改造内部兼容性标识：

- Workspace 包名和 `@fastgpt/*` 导入作用域。
- 已发布 SDK、插件包名。
- 数据库名、Redis key、Bucket 名、历史数据字段。
- 内部 Cookie/Header/API 协议，除非业务方确认需要网络层严格白标。
- 历史文档、历史测试协议样例和原生 APP 工程。

### 1.2 先锁定业务决策，再开发

开发启动前必须确认：

1. 一套部署是否只服务一个业务方。
2. APP 是否已有自己的登录态。
3. WebView 是否需要免登录。
4. 是否必须支持一次性 `authCode` 登录桥接。
5. 是否支持注册、密码登录、OAuth、企业 SSO。
6. 是否显示历史会话。
7. 是否支持文件上传、语音输入、反馈和引用来源。
8. 业务方是否可以查看 Docker/Kubernetes/镜像仓库。
9. 业务方是否会检查 WebView Network、Cookie、Header 和 JS Bundle。
10. 业务方提供的正式域名、Logo、隐私政策和用户协议地址。

业务方已确认以下一期基线：

- 当前管理端 `http://localhost:3000/dashboard/agent` 已存在登录态；APP WebView 按独立隔离处理，一期通过 authCode 换取 H5 HttpOnly Cookie。
- H5 与 API 同源。
- 一套部署服务一个业务方。
- 暂不支持注册。
- 显示当前用户可见的历史会话。
- 暂不支持文件上传。
- 支持语音输入。
- 支持引用，不支持消息反馈。
- 业务方不交付或查看 Docker 部署；内部是否使用 Docker 不改变一期外部交付边界。
- 不要求业务方检查 Network、Cookie、Header 或 JS Bundle；工程侧仅保留可选的内部排查。
- 现有内部包名、数据库、Cookie/Header 协议暂不直接重命名；业务方不检查网络层，因此一期不增加 BFF 转换。

仍需补充确认：

- 正式域名、Logo、favicon、主色和合规链接：待后续补充，暂用临时配置。
- authCode 已按“业务 APP 服务端签发请求 + 60 秒一次性码 + H5 服务端回调”实现临时联调协议；正式上线前仍需确认外部用户映射归属及是否升级请求签名。

## 2. MVP 交付范围

### 2.1 路由

```text
/app/[appKey]
/app/[appKey]/chat
/app/[appKey]/login
/app/[appKey]/auth/callback        # 如果一期启用 APP 免登录桥接
```

推荐示例：

```text
https://business.example.com/app/customer-service
https://business.example.com/app/customer-service/chat
https://business.example.com/app/customer-service/login
```

`appKey` 不直接等同于 MongoDB `appId`，服务端通过配置或映射解析：

```text
appKey -> appId -> AppEntryConfig -> BrandConfig
```

### 2.2 H5 功能

MVP 必须支持：

- 业务方品牌首页。
- 登录、退出和登录后回跳。
- AppKey 解析和无效入口错误页。
- 新建会话。
- 发送和接收流式消息。
- 查看当前用户可见历史会话。
- 切换会话。
- 语音输入及 WebView 麦克风权限处理。
- 引用来源展示。
- 移动端输入框、键盘和安全区适配。
- 错误信息脱敏。
- 页面标题、favicon、Logo 和主题色配置。
- 页面 DOM、title、favicon、Logo 和用户可见文案的显性白标检查。

MVP 暂不支持：

- 用户注册。
- 文件上传。
- 消息反馈。
- 工作台、知识库、模型管理、插件市场。
- 团队管理、账单、API Key、系统配置。
- App 工作流编辑和发布管理。
- 原生 Android/iOS 页面。
- 全量源码包名迁移。

MVP 按业务需要评估：

- APP 一次性登录码：因 APP WebView 独立隔离，作为一期必做能力。
- 用户协议、隐私政策和客服入口：上线前必须提供正式地址。

明确不做：

- 工作台、知识库、模型管理、插件市场。
- 团队管理、账单、API Key、系统配置。
- App 工作流编辑和发布管理。
- 原生 Android/iOS 页面。
- 全量源码包名迁移。

## 3. 迭代总览

建议采用 6 个迭代，首个 MVP 周期约 4 周；如果只有单人开发，预计 5～7 周。

| 迭代 | 时间建议 | 目标 | 产出 | 是否可演示 |
|---|---|---|---|---|
| Iteration 0 | 2026-09-14 ～ 2026-09-16 | 需求锁定、基线和技术设计 | PRD、路由/登录/品牌方案、风险清单 | 否 |
| Iteration 1 | 2026-09-17 ～ 2026-09-22 | `/app/[appKey]` 路由和独立 H5 外壳 | 首页、错误页、品牌配置、页面隔离 | 是 |
| Iteration 2 | 2026-09-23 ～ 2026-09-26 | 复用登录和权限守卫 | 登录、Cookie、回跳、服务端鉴权 | 是 |
| Iteration 3 | 2026-09-28 ～ 2026-10-06 | 对话能力和移动端交互 | H5 Chat、历史、输入、文件/语音按范围交付 | 是 |
| Iteration 4 | 2026-10-07 ～ 2026-10-12 | 白标清理、错误脱敏和运行环境边界 | P0 页面白标、错误脱敏、内部部署边界说明 | 是 |
| Iteration 5 | 2026-10-13 ～ 2026-10-16 | 联调、兼容性验证和发布 | WebView 验收、回归测试、上线包和回滚方案 | 是 |
| Iteration 6 | MVP 验收后 | UI/交互设计 | 基于真实 MVP 反馈完成用户流程、线框、视觉和交互方案 | 否 |
| Iteration 7 | UI/交互设计确认后 | 设计落地优化 | 按确认后的设计优化 H5 页面并进行视觉回归 | 是 |

日期以 2026-09-13 为计划基准，可根据需求确认和人员投入顺延。UI/交互设计不提前阻塞技术 MVP，待 MVP 完成并通过业务验收后再启动。

## 3.1 UI/交互设计后置原则

本项目先完成“可用、可登录、可对话、可嵌入、可白标”的技术 MVP，再进行完整 UI/交互设计。MVP 阶段只允许使用现有组件和最小必要样式，不提前进行高成本视觉定稿。

### MVP 阶段只做

- 页面结构可用。
- 移动端布局可用。
- 登录、回跳、会话和错误流程可用。
- 业务方 Logo、标题、主色和基础文案可配置。
- 关键状态有明确反馈。
- 满足 WebView 安全区、键盘和返回行为。

### MVP 阶段暂不做

- 完整视觉风格探索。
- 多套 UI 方案比稿。
- 复杂动效。
- 高保真交互稿。
- 非功能性装饰和品牌微调。
- 为视觉方案提前大范围重构 Chat 组件。

### MVP 验收后再做

1. 基于真机和业务方反馈梳理用户任务流。
2. 确认首页、登录、对话、历史、异常和退出流程。
3. 输出低保真线框和信息架构。
4. 输出高保真视觉稿、组件规范和交互说明。
5. 评估设计对现有 Chat 组件的影响。
6. 形成 UI 实施任务并单独排期。

## 4. Iteration 0：需求锁定与基线

### 4.1 目标

在不修改业务代码的前提下，明确外部产品边界、登录方式和白标等级，避免后续出现“前端白标完成但部署/协议仍暴露”的返工。

### 4.2 工作项

- 梳理现有路由、Layout、Auth、Chat、NextHead 和 App 配置读取链路。
- 盘点现有登录方式和登录 Cookie 生命周期。
- 确认 WebView 的 iOS/Android 容器能力。
- 确认业务方品牌资产和外部链接。
- 选择 `appKey` 来源：环境变量、配置文件或数据库映射。
- 确认业务方是否已有 APP 登录态。
- 建立显性品牌扫描清单。
- 建立内部协议、部署标识和路径的风险清单。
- 记录本项目现有去品牌改动，避免与 MVP 变更混在一起。

### 4.3 设计产出

S1-01 已形成以下基线文档：

```text
.agents/design/app-h5-mvp/architecture-baseline.md
.agents/design/app-h5-mvp/risk-register.md
.agents/design/app-h5-mvp/acceptance-matrix.md
```

文档分别覆盖：

- 现有路由、Layout、Auth、App、Chat、部署和配置链路。
- AppKey 映射、同源 H5/API、authCode 和内部协议兼容方案判断。
- 复用能力矩阵和新增边界。
- P0/P1 风险、触发条件、影响和处理决策。
- 路由、认证、权限、Chat、WebView、部署和构建产物验收标准。

S1-01 后续仍需由业务方确认：

```text
Q11/Q12 品牌资产和正式域名
authCode 正式外部用户映射归属和生产请求签名方式
APP WebView 的系统版本和容器限制
```

### 4.4 验收标准

- [ ] 明确 H5 最小功能范围。
- [x] 登录方案已确定：APP WebView 独立隔离，使用一次性 authCode 桥接。
- [ ] 明确 AppKey 与内部 App ID 的映射方式。
- [x] P0 白标边界已确定：终端可用性、显性页面白标和错误脱敏；不含 Network/Cookie/Header/JS Bundle。
- [x] 已确认业务方不支持/不交付 Docker，部署命名不作为业务方一期交付项。
- [ ] 正式域名、Logo、favicon、主色和合规链接：待后续补充，正式业务验收/上线前必须补齐。

## 5. Iteration 1：路由、配置和 H5 外壳

### 5.1 目标

建立业务方专属入口，保证 `/app/*` 不进入平台管理端 Layout，不展示平台底部导航、工作台和账户模块。

### 5.2 建议新增文件

```text
projects/app/src/pages/app/[appKey]/index.tsx
projects/app/src/pages/app/[appKey]/chat.tsx
projects/app/src/pages/app/[appKey]/login.tsx
projects/app/src/pages/app/[appKey]/auth/callback.tsx

projects/app/src/pageComponents/appEntry/AppEntryLayout.tsx
projects/app/src/pageComponents/appEntry/AppEntryGuard.tsx
projects/app/src/pageComponents/appEntry/AppEntryBrandProvider.tsx
projects/app/src/pageComponents/appEntry/AppEntryHome.tsx
projects/app/src/pageComponents/appEntry/AppEntryChat.tsx
projects/app/src/pageComponents/appEntry/AppEntryLogin.tsx
projects/app/src/pageComponents/appEntry/AppEntryError.tsx
projects/app/src/pageComponents/appEntry/appEntryConfig.ts
projects/app/src/web/core/appEntry/api.ts
projects/app/src/web/core/appEntry/type.ts
projects/app/src/web/core/appEntry/route.ts
```

如果采用服务端 SSR 直接解析配置，可暂不增加独立配置 API。

### 5.3 重点修改文件

```text
projects/app/src/web/context/AppShell.tsx
projects/app/src/components/Layout/index.tsx
projects/app/src/components/Layout/auth.tsx
projects/app/src/components/common/NextHead/index.tsx
projects/app/src/web/context/useInitApp.ts
```

修改方式：

- 增加 AppEntry 路由识别。
- AppEntry 路由使用独立 Layout。
- 不通过 CSS 隐藏平台 Navbar，而是在渲染层不挂载平台 Navbar。
- 禁止加载平台 SupportBot、升级弹窗、系统通知和平台底部导航。
- Head 信息优先使用业务方配置。
- 业务方主题通过 Provider 或 CSS 变量注入。

### 5.4 页面行为

访问：

```text
/app/customer-service
```

流程：

```text
解析 appKey
  ↓
读取业务 App 配置
  ↓
校验入口是否启用
  ↓
读取品牌配置
  ↓
判断登录状态
  ├─ 未登录：/app/customer-service/login
  └─ 已登录：渲染业务首页
```

### 5.5 验收标准

- [ ] `/app/[appKey]` 可以直接访问。
- [ ] AppKey 不存在时显示业务方错误页。
- [ ] 页面不显示 PC 左侧平台导航。
- [ ] 页面不显示 H5 平台底部导航。
- [ ] 页面不加载 Studio、Datasets、Account 等入口。
- [ ] 页面标题和 favicon 使用业务方配置。
- [ ] 首页 Logo 和主色可配置。
- [ ] PC 页面 `/chat`、`/dashboard/*` 不受影响。

## 6. Iteration 2：登录复用与服务端守卫

### 6.1 目标

复用现有登录机制，但将登录页面和回跳逻辑隔离到业务方 H5 路由。

### 6.2 H5/API 同源与 H5 Cookie

```text
GET /app/customer-service
  ↓
未登录
  ↓
GET /app/customer-service/login?returnTo=/app/customer-service
  ↓
POST 现有登录 API
  ↓
服务端写入 HttpOnly Cookie
  ↓
回到 /app/customer-service
```

H5/API 同源可以保证 authCode 换取 Cookie 后的请求链路稳定。需要验证：

- HTTPS 下 `Secure` 是否正确。
- authCode 换取后的 Cookie 是否持久化。
- 登录失败时不泄露内部错误。
- 退出登录后 Cookie 是否清除。
- iOS WKWebView 和 Android WebView 的行为是否一致。

### 6.3 方案 B：APP 一次性登录码（一期必做）

```text
APP 已登录
  ↓
业务服务生成一次性 authCode
  ↓
WebView 打开 /app/customer-service/auth/callback?code=xxx
  ↓
服务端校验 code、appKey、用户和有效期
  ↓
消费 code
  ↓
写入 HttpOnly Cookie
  ↓
清理 URL 并跳转到 /app/customer-service
```

约束：

- code 有效期 30 秒～2 分钟。
- code 只能消费一次。
- code 绑定 appKey 和用户。
- 不在 URL 中传长期 JWT。
- callback 只允许同源或白名单回跳。

### 6.4 服务端权限

H5 页面和 API 都要校验：

```text
appKey 是否存在
App 是否启用
用户是否已登录
用户是否有权访问该 App
用户是否属于正确团队
用户是否只能读取自己的会话
```

不得只在前端做权限判断。

### 6.5 验收标准

- [ ] 未登录访问会跳业务方登录页。
- [ ] 登录成功后回到原始页面。
- [ ] 刷新页面登录态保持。
- [ ] 退出登录后不能继续访问受保护 API。
- [ ] 无效 AppKey 和无权限用户返回统一错误页。
- [ ] 不允许开放重定向。
- [ ] 不使用长期 URL Token。
- [ ] 现有 `/login` 和 `/chat` 登录流程不受影响。

## 7. Iteration 3：Chat 能力和 WebView 交互

### 7.1 目标

在独立 H5 外壳内复用现有对话能力，完成移动端最小可用交互。

### 7.2 复用范围

优先复用：

```text
projects/app/src/pageComponents/chat/ChatWindow/AppChatWindow.tsx
projects/app/src/components/core/chat/ChatContainer/ChatBox
projects/app/src/web/core/chat/context/*
projects/app/src/web/core/chat/api/*
```

通过 Props/Context 注入：

```text
appId
appKey
brandConfig
showHistory
showHeader
showCitation
showFeedback
allowFileUpload
allowVoiceInput
```

避免复制聊天引擎。

### 7.3 H5 必做交互

- 页面加载状态。
- 首次欢迎语。
- 输入框固定底部。
- 键盘弹出时输入框可见。
- 流式消息显示。
- 发送中禁止重复提交。
- 新建会话。
- 历史会话抽屉。
- 返回按钮行为。
- 网络错误和超时提示。
- 页面重新进入后恢复当前会话。
- iOS 安全区和 Android 底部导航区适配。

### 7.4 可选交互

- 文件上传。
- 语音输入。
- 引用来源抽屉。
- 消息复制。
- 点赞/点踩。
- 长按菜单。
- APP 原生分享或复制链接。

### 7.5 验收标准

- [ ] 手机宽度 320px～430px 无横向滚动。
- [ ] 输入框不被软键盘遮挡。
- [ ] iOS WKWebView 和 Android WebView 均可发送消息。
- [ ] 流式响应中断后有明确状态。
- [ ] 历史会话只显示当前用户允许的数据。
- [ ] APP 返回键不会意外退出登录或丢失会话。
- [ ] 文件/语音能力按需求决定是否进入 MVP。

## 8. Iteration 4：显性白标、安全脱敏与部署命名

### 8.1 目标

确保业务方终端和可见部署环境中不出现平台显性信息。

### 8.2 P0 终端白标清单

扫描并处理：

```text
页面 title 和 meta description
favicon
Logo、Banner、默认头像
首页欢迎语
登录页品牌
ChatHeader
ChatInput placeholder
错误页
空状态
反馈弹窗
引用来源
文件上传提示
退出登录提示
系统通知
升级/商业版/社区版提示
Marketplace/GitHub/官网入口
SupportBot
版权和页脚
```

验收重点是终端可用性和显性页面白标：

- 浏览器 DOM 文本。
- 页面 title。
- WebView 截图。
- 登录、对话、历史和异常流程。
- 生产构建可正常加载。

Network、Cookie、Header 和 JS Bundle 不作为业务方验收项；仅在出现登录或加载问题时由工程侧排查。

### 8.3 基础可用性和终端显性白标

业务方不检查 Network、Cookie、Header 或 JS Bundle，因此一期不增加 BFF 协议转换，也不重命名内部 Cookie/Header/API。只需要保证：

- 页面 DOM、title、favicon、Logo 和用户可见文案不出现业务方禁止的显性品牌。
- API 能正常请求并保持登录态。
- 错误页面不展示内部堆栈、服务名和连接地址。
- 生产 Source Map 按现有安全策略处理，不把它作为业务方验收阻塞项。

如果未来升级为严格网络级白标，再单独设计业务方 Cookie/Header/API 边界。

### 8.4 部署边界

业务方已确认不支持或不交付 Docker 部署，因此 Docker/Compose/Kubernetes 不作为业务方 H5 交付界面。内部部署仍需保留安全检查，但不在一期默认修改现有部署资源名称。

如果后续业务方要求查看部署控制台，再单独启用以下变更：

- Docker 镜像重新打标签。
- 私有镜像仓库路径。
- Compose service 名。
- `container_name`。
- Docker Network。
- Volume 名。
- `depends_on`。
- 服务间 URL。
- `NO_PROXY/no_proxy`。
- 监控服务名和日志标签。
- Kubernetes Deployment、Service、ConfigMap、Secret、PVC 名称。
- Helm Release 名称。
- OCI image labels。

一期建议“重打标签/重命名运行资源”，不改源码包名和已发布 SDK 名称。

### 8.5 变更门禁

部署 YAML 和生产镜像改动必须单独评审，确认：

- [ ] 新旧镜像可回滚。
- [ ] 数据卷不被误创建或误删除。
- [ ] 服务间 DNS 全部更新。
- [ ] 健康检查通过。
- [ ] 备份和恢复脚本已验证。
- [ ] 旧服务名兼容窗口已明确。
- [ ] 生产日志中不泄露内部地址和 Secret。

## 9. Iteration 5：联调、验收和发布

### 9.1 测试矩阵

| 类别 | 环境 | 重点 |
|---|---|---|
| 桌面浏览器 | Chrome、Safari、Edge | 路由、登录、Chat 基本行为 |
| iOS WebView | iOS 16+、iOS 17+ | Cookie、键盘、安全区、返回 |
| Android WebView | Android 10+ | Cookie、输入法、文件选择、返回 |
| 弱网 | 3G/限速网络 | 流式中断、重试、超时 |
| 长会话 | 多轮对话、大消息 | 内存、滚动、恢复 |
| 未授权 | 无 Cookie、过期 Cookie | 跳转和数据隔离 |
| 错误输入 | 无效 AppKey、无效 code | 错误页和脱敏 |
| 部署 | 全新环境、滚动升级 | 镜像、服务名、健康检查、回滚 |

### 9.2 显性品牌自动扫描

源码扫描：

```bash
rg -n -i "fastgpt|fast-gpt|fast_gpt" \
  projects/app/src \
  projects/app/public \
  packages/web/i18n
```

构建产物扫描：

```bash
rg -n -i "fastgpt|fast-gpt|fast_gpt" \
  projects/app/.next \
  projects/app/public
```

注意：内部包名、协议、部署配置和历史样例允许存在于受控范围，但 `/app/*` 页面渲染结果和对外资源不允许出现显性品牌。

### 9.3 发布准入

- [ ] H5 主流程通过。
- [ ] 登录和退出流程通过。
- [ ] 用户数据隔离通过。
- [ ] iOS/Android WebView 通过。
- [ ] P0 品牌扫描通过。
- [ ] 生产镜像和运行资源命名通过。
- [ ] 旧 `/chat`、`/dashboard`、`/login` 回归通过。
- [ ] 监控、日志和告警正常。
- [ ] 回滚操作在预发布环境验证。
- [ ] 业务方完成真机验收。

## 10. 任务拆分建议

### 前端

- [ ] AppEntry 路由和独立 Layout。
- [ ] 品牌配置 Provider。
- [ ] H5 首页、登录页、错误页。
- [ ] Chat 组件装配。
- [ ] 历史抽屉和返回行为。
- [ ] 键盘、安全区和 WebView 适配。
- [ ] 终端显性品牌扫描。

### 后端

- [ ] AppKey 解析和配置查询。
- [ ] AppEntry 访问权限。
- [ ] 登录回跳白名单。
- [x] authCode 桥接作为一期必做能力。
- [ ] H5 API 数据范围限制。
- [ ] 错误响应脱敏。
- [ ] 访问和安全日志。

### DevOps

- [ ] 业务方域名和 HTTPS。
- [ ] 镜像重新打标签。
- [ ] Compose/Kubernetes 运行资源白标。
- [ ] 健康检查和回滚。
- [ ] 日志、监控和告警标签调整。
- [ ] 生产环境关闭 Source Map。

### QA/业务方

- [ ] 真机登录。
- [ ] 真机对话。
- [ ] 键盘和安全区。
- [ ] 文件/语音能力。
- [ ] 无权限和异常流程。
- [ ] 截图/录像确认无显性品牌。
- [ ] 部署控制台可见信息确认。

## 11. 风险与决策门

| 风险 | 影响 | 处理时机 | 决策 |
|---|---|---|---|
| 直接复制 Chat 逻辑 | 后续修复分叉、行为不一致 | Iteration 1 | 禁止复制，复用组件和 Context |
| 直接把 appId 放 URL | 泄露内部 ID、未来迁移困难 | Iteration 0 | 使用 appKey 映射 |
| APP WebView 独立隔离 | 登录循环或要求用户重复登录 | Iteration 2 | authCode 作为一期 P0 必做能力 |
| 修改内部 Cookie/Header | 旧端和插件失效 | Iteration 4 | MVP 默认不改 |
| 批量重命名包名和路径 | 构建、依赖、外部 SDK 失败 | Iteration 0 | 不纳入 MVP |
| 直接修改生产 Compose/YAML | 服务中断、数据卷风险 | Iteration 4 | 单独变更、单独回滚演练 |
| 仅清源码不清构建产物 | WebView 仍可能看到品牌 | Iteration 5 | 必须扫描 build 产物 |
| 仅 CSS 隐藏平台导航 | 请求和 DOM 仍暴露平台信息 | Iteration 1 | 使用独立 Layout，不加载 |
| 未处理 WebView Cookie | 登录态不稳定 | Iteration 2 | 真机优先验证 |
| 未处理错误脱敏 | 内部服务/路径暴露 | Iteration 4 | 统一 AppEntry 错误边界 |

## 12. 推荐首个试点案例

选择一个低风险、单一 App 的客服/知识问答入口：

```text
业务入口：/app/customer-service
内部 App：现有 customer-service App
登录：同域名 Cookie
功能：登录、历史、新建会话、流式对话
暂不启用：语音、复杂文件、多租户品牌后台
部署：业务方镜像仓库 + 业务方服务名
```

试点验收通过后，再扩展：

```text
/app/sales-assistant
/app/operations-helper
/app/internal-knowledge
```

## 13. MVP 完成定义

一期只有同时满足以下条件，才算完成：

1. APP WebView 可以稳定打开 `/app/[appKey]`。
2. 用户可以完成登录或 APP 免登录桥接。
3. 用户可以进入指定 App 并完成多轮对话。
4. 历史会话和权限数据隔离正确。
5. iOS 和 Android WebView 主流程通过。
6. H5 页面没有业务方不希望看到的显性平台品牌。
7. 业务方能够接受生产部署中的服务和镜像命名。
8. 原有 `/chat`、`/login`、`/dashboard` 业务不受影响。
9. 有完整的回滚方案和验证记录。
10. 高风险内部标识没有在未经确认的情况下被批量修改。
11. MVP 完成后，才进入 UI/交互设计阶段；UI 设计不作为技术 MVP 的前置依赖。

## 14. 一期交付任务总账

本节将整个一期拆分为两个阶段，并给出可交给独立子 Agent/开发者执行的边界。每个子任务必须遵循：

- 先读取任务说明和指定 Spec，再开始工作。
- 只修改任务允许的文件范围。
- 不擅自修改部署 YAML、内部包名、Cookie/Header、数据库名和外部协议。
- 任务完成后必须输出变更文件、验证命令、未解决问题和风险。
- 不自行提交 Git commit；由主任务统一 Review、合并和提交。
- 若发现需要越过任务边界，先暂停并向主任务报告，不直接扩展范围。

### 14.1 阶段一：技术 MVP 和部署白标

阶段目标：完成可嵌入 APP WebView 的业务方 H5 技术版本，具备登录、权限、对话、历史会话、显性白标和生产部署能力。

阶段交付物：

```text
/app/[appKey]
/app/[appKey]/chat
/app/[appKey]/login
/app/[appKey]/auth/callback       # 业务需要时启用

业务方 H5 Layout
业务方品牌配置
登录和权限守卫
Chat 对话能力
WebView 兼容性
显性品牌扫描报告
部署白标变更和回滚方案
```

阶段不包含：

```text
完整 UI/交互设计
高保真视觉稿
复杂动效
源码包名迁移
数据库/Redis/Token 协议迁移
原生 APP 页面开发
```

### 14.2 阶段二：UI/交互设计和设计落地

阶段启动条件：

- 阶段一已完成业务方真机验收。
- 已记录真实使用问题和流程阻塞点。
- 业务方已确认 MVP 功能边界。
- 已冻结一期技术路由和接口契约。

阶段目标：基于真实 MVP，而不是假设，完成业务方 H5 的用户流程、交互、视觉和设计落地。

阶段交付物：

```text
用户任务流
信息架构
低保真线框
高保真视觉稿
交互状态说明
组件和设计 Token
WebView 适配说明
设计落地任务
视觉回归验收记录
```

## 15. 阶段一子任务计划：技术 MVP

### S1-01：需求、现状和架构基线

- **角色**：分析/架构 Agent，只读为主。
- **依赖**：无。
- **目标**：确认现有系统可复用边界，不修改业务代码。
- **必须读取**：
  - `AGENTS.md`
  - `projects/app/src/components/Layout/index.tsx`
  - `projects/app/src/components/Layout/auth.tsx`
  - `projects/app/src/web/context/AppShell.tsx`
  - `projects/app/src/web/support/user/api.ts`
  - `projects/app/src/web/support/user/loginRedirect/`
  - `projects/app/src/pages/chat/index.tsx`
  - `projects/app/src/pageComponents/chat/ChatWindow/`
  - `projects/app/src/web/core/app/`
- **允许修改**：
  - `.agents/design/app-h5-mvp/architecture-baseline.md`
  - `.agents/design/app-h5-mvp/risk-register.md`
  - `.agents/design/app-h5-mvp/acceptance-matrix.md`
- **禁止修改**：所有 `projects/app/src` 业务实现、部署文件和依赖文件。
- **输出**：
  - 现有复用链路。
  - AppKey 到 App ID 的解析方案。
  - 登录方案 A/B 对比和推荐结论。
  - Layout 隔离点。
  - H5 API 最小能力清单。
  - 风险和需要业务方确认的问题。
- **验收**：所有结论必须引用具体代码路径；不得把理想架构描述成已有能力。

### S1-02：AppEntry 路由和独立 H5 Layout

- **角色**：前端 Agent。
- **依赖**：S1-01。
- **目标**：实现 `/app/[appKey]` 路由族和独立的业务 H5 页面外壳。
- **允许修改**：
  - `projects/app/src/pages/app/[appKey]/`
  - `projects/app/src/pageComponents/appEntry/`
  - `projects/app/src/web/core/appEntry/route.ts`
  - `projects/app/src/web/core/appEntry/type.ts`
  - `projects/app/src/web/core/appEntry/config.ts`
  - `projects/app/src/web/context/AppShell.tsx`（仅增加路由分流）
  - `projects/app/src/components/Layout/index.tsx`（仅增加 AppEntry 分支）
- **禁止修改**：
  - 现有 `/chat`、`/dashboard` 页面行为。
  - 内部登录 API 和 Cookie 名称。
  - `package.json`、`pnpm-lock.yaml`。
  - 部署 YAML。
- **实现要求**：
  - AppEntry 路由不挂载平台 PC Navbar、H5 底部 Navbar、SupportBot 和管理端弹窗。
  - 通过独立 Layout 实现隔离，不仅使用 CSS 隐藏。
  - AppKey 无效、未启用、无权限时使用统一错误页。
  - 页面可配置业务方 Logo、favicon、名称、主色和基础文案。
- **验收命令**：

```bash
pnpm --filter @fastgpt/app lint
```

- **验收标准**：
  - [ ] `/app/[appKey]` 可访问。
  - [ ] AppKey 解析不直接暴露内部 App ID。
  - [ ] 旧页面行为不变。
  - [ ] 页面 Head 使用业务方配置。
  - [ ] 移动端不出现平台底部导航。

### S1-03：AppKey、配置和后端访问守卫

- **角色**：后端 Agent。
- **依赖**：S1-01；与 S1-02 的路由接口约定完成后执行。
- **目标**：建立 AppEntry 配置解析、服务端鉴权和最小数据访问边界。
- **允许修改**：
  - `projects/app/src/web/core/appEntry/api.ts`
  - `projects/app/src/pages/api/app/[appKey]/`
  - `projects/app/src/service/core/appEntry/`
  - `packages/global/openapi/core/appEntry/`（仅新协议）
  - 对应测试目录。
- **禁止修改**：
  - 现有 App 数据结构，除非 S1-01 明确批准。
  - 现有用户、团队和权限语义。
  - 内部 Cookie/Header。
  - 管理端 App CRUD API 的既有行为。
- **实现要求**：
  - AppKey 解析为内部 App ID。
  - 服务端验证 App 是否启用。
  - 服务端验证用户和团队访问权限。
  - H5 只暴露读取配置、进入对话和读取当前用户会话所需的数据。
  - 错误响应不包含 Mongo、Redis、Docker、内部 URL 或堆栈。
- **验收标准**：
  - [ ] 无效 AppKey 返回统一错误。
  - [ ] 无权限用户无法通过 API 读取 App 数据。
  - [ ] 当前用户无法读取其他用户会话。
  - [ ] 正常用户只获得 H5 所需最小字段。
  - [ ] API 测试覆盖未登录、无权限、无效 AppKey 和正常访问。

### S1-04：登录复用和 APP authCode 桥接

- **角色**：认证/后端 Agent。
- **依赖**：S1-02、S1-03。
- **目标**：复用现有登录能力，完成 H5 登录、回跳和退出；由于 APP WebView 独立隔离，一期必须实现 APP 一次性 authCode 免登录桥接。
- **允许修改**：
  - `projects/app/src/pages/app/[appKey]/login.tsx`
  - `projects/app/src/pages/app/[appKey]/auth/callback.tsx`
  - `projects/app/src/pageComponents/appEntry/AppEntryLogin.tsx`
  - `projects/app/src/web/core/appEntry/auth.ts`
  - `projects/app/src/pages/api/app/[appKey]/auth/`
  - `projects/app/src/web/support/user/loginRedirect/` 中与 AppEntry 直接相关的新增逻辑。
- **禁止修改**：
  - 现有登录 API 的兼容行为。
  - `fastgpt_token` Cookie 语义。
  - 长期 Token URL 传递。
  - 开放重定向逻辑。
- **H5/API**：同源。
- **APP 登录**：一次性 `authCode`，有效期 30 秒～2 分钟、单次消费、绑定用户和 AppKey。
- **Cookie**：authCode 校验成功后由服务端写入现有 HttpOnly Cookie。
- **验收标准**：
  - [x] 未登录跳转业务方登录页。
  - [x] 登录成功回到原始 AppEntry 页面。
  - [x] 刷新后登录态保持。
  - [x] 退出后页面和 API 均不可继续访问。
  - [x] 回跳仅允许同源或白名单路径。
  - [x] authCode 不可重复消费。
  - [x] URL 中不出现长期 JWT。

### S1-05：Chat 装配和 H5 交互

- **角色**：前端 Agent。
- **依赖**：S1-02、S1-03、S1-04。
- **目标**：在业务方 H5 外壳内复用现有 Chat/Agent 能力。
- **允许修改**：
  - `projects/app/src/pageComponents/appEntry/AppEntryChat.tsx`
  - `projects/app/src/pages/app/[appKey]/chat.tsx`
  - `projects/app/src/components/core/chat/` 中为 AppEntry 增加的最小适配 Props/Context。
  - `projects/app/src/pageComponents/chat/` 中与 AppEntry 直接相关的适配文件。
  - H5 相关样式和测试。
- **禁止修改**：
  - 复制一套 Chat 引擎。
  - 改变普通 `/chat` 和 `/chat/share` 的默认行为。
  - 未经确认增加工作台、知识库、模型管理、插件市场入口。
- **必做能力**：
  - 流式对话。
  - 新建会话。
  - 历史会话抽屉。
  - 输入框和发送状态。
  - 网络异常和流式中断状态。
  - iOS/Android 安全区。
  - 键盘弹出后输入框仍可见。
- **固定能力**：语音输入、引用来源。
- **固定关闭**：文件上传、消息反馈。
- **验收标准**：
  - [x] 320px～430px 宽度无横向滚动。
  - [x] 多轮对话成功。
  - [x] 流式消息中断时有明确提示。
  - [x] 会话历史按用户权限隔离。
  - [x] 返回、新建会话和切换会话行为稳定。

### S1-06：终端显性白标和错误脱敏

- **角色**：前端/安全 Agent。
- **依赖**：S1-02、S1-04、S1-05。
- **目标**：清理业务方终端可见的平台显性信息。
- **允许修改**：
  - `projects/app/src/pageComponents/appEntry/`
  - AppEntry 专属翻译资源。
  - AppEntry 专属静态资源目录。
  - `NextHead` 的 AppEntry 分支。
  - AppEntry 错误边界和脱敏映射。
- **禁止修改**：
  - 外部平台域名和现有协议。
  - 内部包名、数据库名、Cookie/Header。
  - 非 AppEntry 页面默认文案，除非已有独立且安全的去品牌任务。
- **检查范围**：
  - 页面 title/meta。
  - favicon、Logo、Banner、默认头像。
  - 登录页、首页、ChatHeader、ChatInput。
  - 错误页、空状态、反馈、引用和文件提示。
  - GitHub、官网、Marketplace、升级和版权入口。
  - DOM、Network 响应和构建产物。
- **验收标准**：
  - [x] `/app/*` 页面 DOM 无显性平台品牌。
  - [x] 页面 title/favicon/Logo 均为业务方资源。
  - [x] 错误响应不暴露内部服务信息。
  - [x] 生产环境关闭 Source Map，或确认 Source Map 访问权限。
  - [x] 输出扫描报告。

### S1-07：内部部署边界与运行环境检查

- **角色**：DevOps Agent。
- **依赖**：S1-01；部署命名方案确认后执行。
- **目标**：确认业务方不交付 Docker 后的内部部署边界；一期默认只输出检查清单和回滚约束，不修改现有部署资源名称。
- **允许修改**：部署检查文档、环境映射和独立 overlay；只有主任务和运维明确授权后才能修改部署文件。
- **禁止直接修改**：
  - `deploy/`、`.github/workflows/`、`.forgejo/workflows/` 中的现有 YAML，除非已获得显式审批。
  - 生产环境现有 Volume 和数据库资源。
- **建议方式**：
  - 镜像重新打标签到业务方私有仓库。
  - 通过环境变量或部署 overlay 使用业务方 service/container/network 名。
  - 保留旧命名兼容窗口和回滚映射。
- **必须检查**：
  - service 名、container_name、network、volume。
  - `depends_on`、healthcheck、服务间 URL。
  - `NO_PROXY/no_proxy`。
  - OCI labels、监控、日志和 Helm/Kubernetes 资源名。
  - 备份恢复脚本和滚动升级。
- **验收标准**：
  - [ ] 新环境可启动。
  - [x] 服务间 DNS 全部可用。
  - [x] 数据卷未误创建、误删除或断开。
  - [ ] 健康检查通过。
  - [ ] 旧版本可回滚。
  - [x] 已确认业务方不查看/不交付 Docker；内部部署命名变更不纳入一期默认发布。

### S1-08：测试、真机验收和发布门禁

- **角色**：QA/验收 Agent，只允许修复测试或 AppEntry 范围问题。
- **依赖**：S1-02～S1-07。
- **目标**：完成端到端验收和发布准入判断。
- **允许修改**：
  - AppEntry 相关测试。
  - `.agents/design/app-h5-mvp/test-report.md`
  - 明确由主任务授权的最小修复文件。
- **禁止修改**：
  - 为通过测试而改业务断言。
  - 修改无关模块。
  - 直接修改部署资源而不报告。
- **测试矩阵**：
  - Chrome/Safari/Edge。
  - iOS WKWebView。
  - Android WebView。
  - 弱网、超时、流式中断。
  - 未登录、过期登录、无权限、无效 AppKey。
  - 文件/语音能力（如进入 MVP）。
  - 新旧部署回滚。
- **输出**：
  - 通过项。
  - 阻塞问题。
  - 非阻塞问题。
  - 未执行的测试和原因。
  - 业务方签字/确认记录。
- **发布门禁**：任何 P0 项未通过，阶段一不得进入阶段二。

## 16. 阶段一子任务依赖图和执行顺序

```text
S1-01 需求/架构基线
  ├── S1-02 路由与 H5 Layout
  ├── S1-03 AppKey/配置/权限
  │     └── S1-04 登录复用/authCode
  │           └── S1-05 Chat 装配/H5 交互
  │                 └── S1-06 终端白标/错误脱敏
  └── S1-07 部署白标

S1-02 + S1-03 + S1-04 + S1-05 + S1-06 + S1-07
  └── S1-08 测试/真机验收/发布门禁
```

可以并行的工作：

- S1-02 与 S1-03 在接口契约确定后并行。
- S1-07 可与 S1-04～S1-06 并行，但一期默认只做内部部署检查；如需要改名，必须先确认部署命名和回滚策略。
- S1-08 的测试用例设计可以提前，真机执行必须等待可演示版本。

不得并行的工作：

- 未完成 S1-02 前，不开始复制或深度改造 Chat。
- 未完成 S1-03 前，不开放 H5 数据 API。
- 未完成 S1-04 前，不把业务方 APP 登录态接入生产。
- 未完成 S1-06 前，不宣布“白标完成”。
- 未完成 S1-07 回滚演练前，不进行生产部署。

## 17. 阶段二子任务计划：UI/交互设计

### S2-01：基于 MVP 的用户研究和问题收集

- **角色**：产品/UX Research Agent。
- **依赖**：阶段一完成、业务方真机验收完成。
- **目标**：基于真实使用反馈，而不是技术人员假设，梳理用户任务和问题。
- **输入**：
  - 阶段一 H5 可用版本。
  - 真机录屏和验收记录。
  - 用户反馈、客服问题、访问日志和错误日志。
  - 当前功能边界和已知限制。
- **允许修改**：
  - `.agents/design/app-h5-ui/research.md`
  - `.agents/design/app-h5-ui/problem-list.md`
- **禁止修改**：业务代码、API 契约、部署配置。
- **输出**：
  - 用户角色。
  - 核心任务。
  - 任务频率和优先级。
  - 当前流程阻塞点。
  - 用户对登录、首页、对话、历史、异常和退出的反馈。
- **验收**：每个设计结论必须关联真实反馈、日志或验收证据。

### S2-02：信息架构和关键用户流程

- **角色**：产品/交互 Agent。
- **依赖**：S2-01。
- **目标**：形成业务 H5 的页面结构和关键任务流。
- **允许修改**：
  - `.agents/design/app-h5-ui/information-architecture.md`
  - `.agents/design/app-h5-ui/user-flows.md`
  - `.agents/design/app-h5-ui/decision-log.md`
- **流程范围**：
  - 首次进入。
  - 登录和免登录。
  - 首页到对话。
  - 新建会话。
  - 历史会话切换。
  - 网络错误和重试。
  - 文件/语音入口（如 MVP 已启用）。
  - 退出和再次进入。
- **验收**：所有页面都必须有入口、出口、加载、空、错误和完成状态。

### S2-03：低保真线框和交互状态

- **角色**：UX/UI Agent。
- **依赖**：S2-02。
- **目标**：输出不依赖视觉装饰的可评审线框和状态说明。
- **允许修改**：
  - `.agents/design/app-h5-ui/wireframes/`
  - `.agents/design/app-h5-ui/interaction-spec.md`
  - Figma/设计工具中的业务方 H5 设计文件（如果项目已提供目标文件）。
- **必须覆盖**：
  - 320px、375px、430px 布局。
  - 键盘弹出。
  - 刘海屏和底部安全区。
  - 流式输出。
  - 长文本和长列表。
  - 网络断开和恢复。
  - 空历史、无权限和 AppKey 无效。
- **禁止**：在交互未确认前修改生产代码。
- **验收**：业务方能够仅根据线框理解完成核心任务。

### S2-04：高保真视觉、组件和品牌规范

- **角色**：视觉/UI Agent。
- **依赖**：S2-03 通过业务评审。
- **目标**：形成可实施的视觉稿和组件规范。
- **允许修改**：
  - `.agents/design/app-h5-ui/visual-spec.md`
  - `.agents/design/app-h5-ui/design-tokens.md`
  - Figma 设计文件及组件库。
- **必须输出**：
  - Logo 和 favicon 使用规范。
  - 颜色、字体、间距、圆角、阴影。
  - 按钮、输入框、消息气泡、历史列表、抽屉、Toast、错误页。
  - 加载、禁用、发送中、流式中断、失败和重试状态。
  - 深色/浅色支持结论。
  - WebView 安全区适配标注。
- **禁止**：修改后端协议、路由和数据结构。
- **验收**：设计稿可直接拆分为开发任务，不依赖口头解释。

### S2-05：设计落地实施

- **角色**：前端实施 Agent。
- **依赖**：S2-04 业务方确认。
- **目标**：将确认后的 UI/交互设计落地到 AppEntry H5，不改变已验收的业务能力和接口契约。
- **允许修改**：
  - `projects/app/src/pageComponents/appEntry/`
  - `projects/app/src/pages/app/[appKey]/`
  - AppEntry 专属样式、Token 和资源。
  - 必要时修改 Chat 组件的展示适配层，不改 Chat 核心业务。
- **禁止修改**：
  - AppKey、登录、权限和 API 契约。
  - 普通 `/chat`、`/dashboard` 页面。
  - 内部包名、数据库、Cookie/Header 和部署资源。
- **验收**：
  - [ ] 页面与确认稿一致。
  - [ ] 所有交互状态均有对应实现。
  - [ ] iOS/Android WebView 不回退到旧交互。
  - [ ] 无障碍和触控目标尺寸符合业务方要求。
  - [ ] 不引入无必要的新依赖。

### S2-05A：基于移动端视觉稿 v2 的交互样式修订

- **角色**：移动端前端/视觉实施 Agent。
- **依赖**：S2-05 完成；业务方确认 `index-v2.html` 为本轮视觉修订基准。
- **目标**：以最新移动端 HTML 视觉稿为样式和交互参考，修订现有 AppEntry H5 的视觉效果；只替换展示层，不改变 S1 已验收的路由、登录、权限、Chat、历史、语音和引用业务语义。
- **设计输入**：
  - 当前本地设计稿：`/Users/sinan/Documents/HTech/index-v2.html`
  - 文件修改时间：`2026-09-13 19:16:50 CST`
  - SHA-256：`f6548eb1124cf4c66cccc2d9e6c0e2e2dc3358780b48e30e7a99fc2dbdb1264a`
  - 设计主题：瓷白、墨蓝、玉绿、黄铜的浅色移动端体系；参考稿已包含登录、工作台、智能体中心、对话和历史状态。
- **基准解释**：
  - `index-v2.html` 是本轮视觉与微交互参考，不是新的产品功能合同。
  - 当前 MVP 没有工作台、智能体中心和四项底部导航，不得因为参考稿中存在这些页面而擅自新增入口或扩大范围。
  - 页面文案、演示账号、模拟回答、本地存储和前端假流式逻辑仅用于设计演示，不得复制到生产实现。
  - 当前 AppEntry 继续复用真实登录、authCode、Chat Context、流式接口、历史和引用能力。
- **允许修改**：
  - `projects/app/src/pageComponents/appEntry/`
  - `projects/app/src/pages/app/[appKey]/`
  - AppEntry 专属设计 Token、样式、字体声明和静态品牌资源。
  - 必要时为共享 Chat 增加隔离且向后兼容的展示 props/context；不得改变普通 `/chat` 默认视觉和行为。
  - AppEntry 相关视觉、响应式、交互和可访问性测试。
  - `.agents/design/app-h5-ui/index-v2-implementation-spec.md`
- **禁止修改**：
  - AppKey 映射、登录/authCode、Cookie/Header、权限和 API 契约。
  - Chat 生成、恢复、历史和引用的核心数据逻辑。
  - 普通 `/chat`、`/login`、`/dashboard` 和管理端页面样式。
  - 为复刻演示稿新增工作台、智能体列表、底部导航或模拟业务数据。
  - 直接依赖公网 Google Fonts；如需使用 Fraunces、Outfit、Noto Serif SC 或 Noto Sans SC，必须确认字体授权、包体和 WebView 离线策略，并优先使用受控自托管资源或系统字体回退。
  - 部署 YAML、数据库、内部包名和生产 Secret。
- **视觉 Token 对齐**：
  - 页面底色：瓷白 `#F9F8F5`；卡片面 `#FEFDFC`；下沉面 `#F0EEEA`。
  - 正文墨蓝：`#0D2131`；次级文字 `#283D4E`；弱化文字 `#556574`。
  - 主强调色：玉绿 `#00A97B`；浅底文字和主按钮优先使用可访问性更高的 `#007654`。
  - 点睛色：黄铜 `#C2A132`，仅用于有限描边、标记和装饰，不与玉绿争夺主操作层级。
  - 圆角基线：6/10/14/20px；阴影使用墨蓝染色透明阴影，不使用纯黑重阴影。
  - 字体层级、间距、图标线宽和动效时长必须整理为 AppEntry 专属 Token，禁止在页面中散落重复魔法值。
- **页面修订范围**：
  - 登录页：品牌章、标题、副标题、表单、错误态、主按钮、隐私/协议链接和键盘状态。
  - 首页：品牌欢迎区、应用说明、主入口按钮和空/加载/不可用状态；保持单 App 入口，不实现参考稿工作台信息架构。
  - ChatHeader：返回、历史、会话标题、新建会话的层级、尺寸和按压反馈。
  - Chat 内容：业务头像、用户/AI 气泡、元信息、长文本、代码片段、流式光标、生成状态和错误卡。
  - ChatInput：固定输入区、聚焦态、发送/停止、语音入口、禁用态、安全区和软键盘适配。
  - 预设问题/快捷回复：卡片层级、触控反馈、长文本折行和不可用状态。
  - 引用来源：来源数量、展开/收起、文件名、摘要、滚动和关闭行为。
  - 历史会话：抽屉/列表、时间、标题、摘要、当前会话、置顶、重命名、删除和空状态。
  - Toast/Error/Loading：统一颜色、圆角、阴影、位置和出现/退出动效，继续使用 S1-06 脱敏文案。
- **交互与可访问性要求**：
  - 保留 viewport 用户缩放，不设置 `maximum-scale=1` 或 `user-scalable=no`；如共享 `NextHead` 仍限制缩放，必须通过 AppEntry 隔离分支修订且不影响普通页面。
  - iOS/Android 安全区、`visualViewport` 软键盘、横竖屏和页面切后台恢复必须继续有效。
  - 主要触控目标不小于 44×44px；图标按钮具备可读 `aria-label` 和明确 focus-visible。
  - 支持 `prefers-reduced-motion: reduce`，关闭非必要位移、呼吸和流式装饰动画。
  - Hover 只作为桌面增强；核心状态必须有触摸按压、禁用和加载反馈。
  - 颜色对比至少满足 WCAG 2.2 AA；不能只用颜色表达在线、错误、选中或禁用。
  - 320px、375px、390px、430px 宽度无横向滚动；长标题、长回答、代码、来源文件名和历史摘要不能撑破容器。
- **实施步骤**：
  1. 将参考稿 Token、组件状态和页面结构整理到 `index-v2-implementation-spec.md`，建立“参考稿元素 → 当前 AppEntry 组件”映射。
  2. 对现有 AppEntry 页面做截图基线，确认哪些差异属于视觉、哪些属于产品范围差异。
  3. 先落地 AppEntry Token、字体回退和基础容器，再按登录 → 首页 → ChatHeader → 消息/引用 → ChatInput → 历史/错误状态顺序实施。
  4. 每个页面同时覆盖默认、加载、空、错误、禁用、发送中和流式中断状态，禁止只实现静态首屏。
  5. 增加响应式和交互回归测试，确认普通平台页面未继承 AppEntry Token 或样式。
  6. 输出 320/375/390/430px 浏览器截图和 iOS/Android WebView 真机截图，交由 S2-06 对比验收。
- **验收标准**：
  - [ ] 登录、首页、对话、引用、历史和错误状态与 `index-v2.html` 的瓷玉墨金视觉体系一致。
  - [ ] 业务功能、路由、真实接口和权限语义零变化，未引入演示数据或假流式逻辑。
  - [ ] 未新增工作台、智能体中心或底部导航等未批准功能。
  - [ ] AppEntry 的页面背景、字体、主色、卡片、按钮、气泡、输入框、Toast 和动效全部由专属 Token 驱动。
  - [ ] 用户缩放、focus-visible、44px 触控目标、Reduced Motion 和 WCAG 2.2 AA 检查通过。
  - [ ] 320px～430px、键盘弹出、安全区、长内容和横竖屏无布局破坏。
  - [ ] 文件上传、反馈和注册仍关闭；语音、引用和历史仍按一期固定基线可用。
  - [ ] 普通 `/chat`、`/login`、`/dashboard` 页面视觉回归通过。
  - [ ] 业务方确认视觉对齐结果后，才进入 S2-06 最终视觉验收。

### S2-06：视觉回归和最终验收

- **角色**：QA/视觉验收 Agent。
- **依赖**：S2-05A。
- **目标**：完成设计落地和移动端视觉稿 v2 修订后的截图、交互和 WebView 回归。
- **允许修改**：测试报告和最小 AppEntry 修复。
- **检查范围**：
  - 设计稿和真机截图对比。
  - 页面 title、Logo、favicon 和品牌文案。
  - 键盘、安全区、返回和横竖屏。
  - 加载、空、错误、流式和长列表。
  - 业务方提供的品牌资源清晰度和裁切。
- **输出**：
  - 视觉回归报告。
  - 交互验收报告。
  - 遗留问题清单。
  - 最终发布建议。

## 18. 阶段二依赖图

```text
阶段一 MVP 验收
  ↓
S2-01 用户研究/问题收集
  ↓
S2-02 信息架构/用户流程
  ↓
S2-03 低保真/交互状态
  ↓ 业务方确认
S2-04 高保真视觉/组件规范
  ↓ 业务方确认
S2-05 设计落地
  ↓
S2-05A 移动端视觉稿 v2 对齐修订
  ↓
S2-06 视觉回归/最终验收
```

阶段二禁止提前做的事情：

- 未完成 S2-01，不凭个人偏好重做首页。
- 未完成 S2-03，不直接进入高保真视觉设计。
- 未完成 S2-04 业务确认，不修改生产 H5 页面样式。
- S2-05 只改 AppEntry 范围，不借设计任务重构全站。
- S2-05A 只把 `index-v2.html` 作为视觉/微交互参考，不复制演示业务、模拟数据或未批准的信息架构。
- S2-06 发现业务逻辑问题时，回到对应技术任务处理，不通过视觉改动掩盖问题。

## 19. 子任务交付模板

每个子 Agent/开发者完成任务后必须提交以下格式的结果：

```markdown
## Task
S1-02 / S2-04

## Summary
完成了什么，未完成什么。

## Changed files
- /absolute/path/to/file

## Validation
- command: ...
- result: passed / failed / not-run

## Risks
- 发现的兼容性、权限、部署、WebView 或设计风险。

## Out of scope
- 明确没有修改哪些相关文件。

## Handoff
- 后继任务需要读取什么。
- 是否需要主任务决策。
```

## 20. 主任务协调规则

主任务不把整个仓库上下文无差别发给所有子 Agent，而是按任务边界派发：

| 任务 | 主要输入 | 主要输出 | 是否允许改代码 |
|---|---|---|---|
| S1-01 | 现有代码和规范 | 架构/风险基线 | 否 |
| S1-02 | 路由和 Layout 规范 | H5 路由/外壳 | 是 |
| S1-03 | App/权限/API 规范 | 配置和访问守卫 | 是 |
| S1-04 | 登录规范和业务登录决策 | 登录/回跳/桥接 | 是 |
| S1-05 | Chat 规范和 API 契约 | 对话 H5 装配 | 是 |
| S1-06 | 品牌清单和业务资源 | 终端白标/脱敏 | 是 |
| S1-07 | 部署方案和回滚策略 | 运行资源白标 | 需审批 |
| S1-08 | 全部验收标准 | 测试/发布结论 | 仅最小修复 |
| S2-01 | MVP 反馈 | 用户问题和研究 | 否 |
| S2-02 | 研究结果 | 用户流和信息架构 | 否 |
| S2-03 | 流程和布局约束 | 线框和交互状态 | 设计文件 |
| S2-04 | 线框和品牌资产 | 高保真设计系统 | 设计文件 |
| S2-05 | 已确认设计稿 | UI 落地 | 是 |
| S2-05A | `index-v2.html` 与现有 AppEntry | 移动端视觉/微交互修订 | 是，仅 AppEntry 展示层 |
| S2-06 | 设计稿和实现 | 回归/验收报告 | 仅最小修复 |

## 21. 阶段切换门禁

### 阶段一开始前

- [ ] 正式域名、Logo、favicon、主色和合规链接：待后续补充，技术 MVP 阶段使用临时配置。
- [x] 登录方案已确定：APP WebView 独立隔离，使用一次性 authCode 桥接。
- [ ] 确认 AppKey 规则。
- [x] 功能范围已确定：历史开启、语音开启、引用开启、文件关闭、反馈关闭、注册关闭。
- [x] 已确认业务方不支持/不交付 Docker 部署。
- [x] 已确认业务方不检查 Network/Cookie/Header/JS Bundle，只关注可用性和终端显性白标。

### 阶段一结束时

- [ ] H5 主流程稳定。
- [ ] 真机验收通过。
- [ ] 权限隔离通过。
- [ ] P0 显性品牌扫描通过。
- [x] 内部部署检查和回滚策略通过（不作为业务方 Docker 交付项；实际回滚演练仍是 S1-08 发布门禁）。
- [ ] 原有平台页面回归通过。
- [x] MVP 遗留问题已经分级。
- [ ] 业务方书面确认“可以进入 UI/交互设计”。

### 阶段二结束时

- [ ] UI/交互设计稿已确认。
- [ ] 设计 Token 和组件说明齐全。
- [ ] 所有关键状态完成设计和实现。
- [ ] 真机视觉回归通过。
- [ ] 无障碍和触控验收通过。
- [ ] 业务方完成最终体验验收。

## 22. 推荐派发顺序

如果使用多个子 Agent，推荐按照以下顺序派发：

```text
Round 1：S1-01
Round 2：S1-02 + S1-03
Round 3：S1-04
Round 4：S1-05 + S1-07
Round 5：S1-06
Round 6：S1-08

阶段一业务验收

Round 7：S2-01
Round 8：S2-02
Round 9：S2-03
Round 10：业务方评审
Round 11：S2-04
Round 12：业务方评审
Round 13：S2-05
Round 14：S2-05A
Round 15：S2-06
```

如果只有一个开发者，可以保持相同顺序，但不需要创建多个 Agent；每一轮仍然需要保留对应的任务产物和验收记录。

## 23. 业务方确认结果（2026-09-13）

### 已确认并写入一期基线

```text
Q2 H5 与 API 同源
Q3 一套部署服务一个业务方
Q4 暂不支持注册
Q5 显示历史会话
Q6 暂不支持文件上传
Q7 支持语音输入
Q8 支持引用、不支持反馈
Q9 业务方不支持/不交付 Docker 部署
Q10 不检查 Network/Cookie/Header/JS Bundle，只检查可用性和终端显性白标
```

### Q1 的解释和技术门禁

业务方已确认当前管理端 `http://localhost:3000/dashboard/agent` 存在登录态，但 APP WebView 按独立隔离处理，不能假设自动共享该 Cookie。

因此一期直接采用一次性 authCode 桥接：

1. APP 业务侧确认用户已登录。
2. APP/业务服务生成一次性 authCode。
3. WebView 打开 `/app/[appKey]/auth/callback?code=xxx`。
4. 服务端校验 code、用户、AppKey、有效期和单次消费状态。
5. 服务端写入 H5 HttpOnly Cookie。
6. 清理 URL 并进入 `/app/[appKey]`。

不能把长期 Token 放进 URL。该流程属于阶段一 P0 阻塞门禁。

### 因 Q10 调整的范围

业务方不检查 Network、Cookie、Header 和 JS Bundle，因此一期不增加 BFF 协议转换，不改内部 Cookie/Header/API 协议；只做页面可用性、错误脱敏和终端显性白标。

### S1-01 状态

- [x] 现状和复用边界完成。
- [x] 风险清单完成。
- [x] 验收矩阵完成。
- [x] 业务方 Q1～Q10 已记录。
- [x] 已按独立 APP WebView 启用 authCode 桥接方案。
- [x] 已取消 Network/Cookie/Header/JS Bundle 作为业务方验收项。
- [ ] 正式域名、Logo、favicon、主色、隐私/协议地址：待后续补充，暂不阻塞技术 MVP，正式验收/上线前补齐。
- [x] authCode 临时联调协议已实现；正式外部用户映射归属和生产请求签名方式仍待业务方确认。

下一步：进入 S1-02；S1-04 按 authCode 必做方案实施。

## 24. S1-02 执行记录（2026-09-13）

### 已完成

- [x] 新增 `/app/[appKey]` 首页路由。
- [x] 新增 `/app/[appKey]/chat` 路由骨架。
- [x] 新增 `/app/[appKey]/login` 路由骨架。
- [x] 新增 AppEntry 路由识别工具。
- [x] AppEntry 页面绕过全局平台 Layout。
- [x] AppEntry 页面绕过全局平台 Head 和动态脚本注入。
- [x] 新增独立 `AppEntryLayout`，不挂载平台 Navbar、底部导航、SupportBot 和平台弹窗。
- [x] 新增品牌 Provider 和临时品牌配置类型。
- [x] 新增 H5 安全区基础样式。
- [x] 新增路由构造和识别单测。

### 暂未完成，留给后续子任务

- [x] S1-03：AppKey 服务端解析、App ID 映射和权限守卫。
- [x] S1-04：authCode 登录桥接和真实登录页面。
- [x] S1-05：真实 Chat、历史会话、语音和引用接入。
- [ ] S1-06：真实品牌配置、业务资源和错误脱敏。
- [ ] S1-08：浏览器和真机验证。

### 执行边界

S1-02 当前提供的是可运行的路由和 H5 外壳骨架，页面中的“应用入口/对话入口/登录入口”是临时占位状态，不代表一期最终业务页面。AppKey 配置、登录、Chat 和业务方品牌资料接入必须由对应后续任务完成。
## 25. S1-03 执行记录（2026-09-13）

### 已完成

- [x] 新增单部署单业务方 AppEntry 环境配置：`APP_ENTRY_ENABLED`、`APP_ENTRY_APP_KEY`、`APP_ENTRY_APP_ID` 及品牌字段。
- [x] 服务端按 `appKey -> APP_ENTRY_APP_ID` 固定映射解析，未启用、Key 不匹配、App ID 非法时拒绝访问。
- [x] 服务端查询目标 App，并拒绝不存在、已软删除及非 `AppTypeList` 对话类型的 App。
- [x] 新增公共配置 API：`GET /api/app/[appKey]/config`。
- [x] 公共配置仅返回 `appKey`、启用状态、品牌配置和一期功能开关，不返回内部 `appId`、工作流、权限、团队或数据库字段。
- [x] 新增 `authAppEntry` 后端守卫：先校验 AppKey 映射，再复用现有 `authApp` 和 `ReadPermissionVal` 校验用户/团队访问权限。
- [x] 新增 H5 端公共配置请求封装，供后续 Chat、登录和运行时初始化复用。
- [x] 页面 SSR 使用真实服务端配置，失效入口统一返回 `notFound`。
- [x] 增加配置 resolver 单测，覆盖关闭、Key 不匹配、非法 ID、App 不存在/删除/类型不符、品牌覆盖、脱敏和权限守卫。

### 变更文件

- `/Users/sinan/Documents/github/FastGPT/projects/app/src/env.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/.env.template`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/service/core/appEntry/config.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/pages/api/app/[appKey]/config.ts`
- `/Users/sinan/Documents/github/FastGPT/packages/global/openapi/core/appEntry/api.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/web/core/appEntry/api.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/web/core/appEntry/type.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/pages/app/[appKey]/index.tsx`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/pages/app/[appKey]/chat.tsx`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/pages/app/[appKey]/login.tsx`
- `/Users/sinan/Documents/github/FastGPT/projects/app/test/service/core/appEntry/config.test.ts`

### 当前验证状态

- `pnpm exec eslint`（AppEntry 变更文件）：通过。
- `git diff --check`：未引入新的 whitespace 错误；仓库已有其他历史文件存在 trailing whitespace。
- `pnpm --filter @fastgpt/app typecheck`：已运行；当前仓库仍有 76 个既有类型错误，主要来自缺失的 `@fastgpt-sdk/sandbox-adapter` 和 `packages/service` 沙箱代码；本次 AppEntry 文件未出现在错误列表。
- AppEntry 定向测试：已通过临时 Vitest 配置运行，2 个测试文件、12 个测试全部通过；标准 Vitest 配置会先启动 Mongo Memory Server，因下载 MongoDB 二进制较慢未作为最终验证命令。
- 当前 `3000` 端口仍是旧服务实例；需重启/重新构建后再验证 `/app/[appKey]` 和 `/api/app/[appKey]/config`。

### 风险与后续交接

- `APP_ENTRY_APP_KEY`、`APP_ENTRY_APP_ID` 是服务端配置，生产环境必须由部署侧注入；不要改为从 URL 直接接受 `appId`。
- `authAppEntry` 已提供给后续历史会话、Chat 和引用 API 使用；这些 API 必须继续调用该守卫，不能仅依赖前端传入的 App ID。
- 公共配置 API 当前不要求登录，仅返回品牌与功能开关；涉及 App 数据、历史会话和对话执行的 API 必须要求现有登录态并走 `authAppEntry`。
- 正式域名、Logo、favicon、主色、隐私政策、用户协议和客服地址仍待业务方补充，不阻塞技术实现但阻塞最终上线验收。
- authCode 具体协议仍由 S1-04 完成，本任务未提前实现登录桥接。

### 下一步

进入 S1-04：登录复用、一次性 `authCode` 桥接和回跳；随后由 S1-05 使用 `authAppEntry` 接入 Chat、历史会话、语音和引用。
## 26. S1-04 执行记录（2026-09-13）

### 已完成

- [x] `/app/[appKey]/chat` SSR 接入 `authAppEntry`；未登录或当前用户无访问权限时跳转业务方登录页。
- [x] 新增 AppEntry 专用密码登录页面，复用现有预登录和密码登录 API，不展示注册、OAuth 或管理端入口。
- [x] 登录成功后调用 AppEntry Session 校验接口确认目标 App 权限，再回到原始 H5 页面。
- [x] 全局请求鉴权失败分流支持 AppEntry 实际路由，避免跳往平台 `/login`；同时排除既有管理端 `/app/detail` 静态路由。
- [x] 新增同 AppKey 回跳约束，拒绝绝对 URL、协议相对 URL、反斜杠路径和其他 AppKey，阻断开放重定向。
- [x] 新增 APP 后端一次性 authCode 签发接口：`POST /api/app/[appKey]/auth/code`。
- [x] authCode 签发接口使用独立 Bearer 密钥，输入仅接受由业务 APP 服务端映射出的 `tmbId`；用户、团队和 App 权限均由服务端重新解析。
- [x] authCode 默认有效期 60 秒，并通过环境变量限制在 30～120 秒。
- [x] authCode 在 Redis 中仅保存 SHA-256 摘要键，回调使用 Lua 原子 GET+DEL，保证单次消费。
- [x] 新增 `/app/[appKey]/auth/callback` 服务端回调；消费成功后创建现有用户 Session、写入现有 `fastgpt_token` HttpOnly Cookie 并立即 302 清理 URL。
- [x] authCode 无效、过期、跨 AppKey、成员变化、用户禁用或权限变化时统一回到业务登录页，不向终端暴露内部错误。
- [x] H5 退出复用现有退出 API；退出后清除 Cookie 和用户 Session，再回到业务登录页。

### 临时联调协议

业务 APP 服务端调用：

```http
POST /api/app/{appKey}/auth/code
Authorization: Bearer ${APP_ENTRY_AUTH_CODE_SECRET}
Content-Type: application/json

{
  "tmbId": "已由业务 APP 服务端完成用户映射的 FastGPT 团队成员 ID"
}
```

返回：

```json
{
  "code": 200,
  "data": {
    "code": "一次性登录码",
    "expiresIn": 60
  }
}
```

APP WebView 打开：

```text
/app/{appKey}/auth/callback?code={一次性登录码}&returnTo=/app/{appKey}/chat
```

`APP_ENTRY_AUTH_CODE_SECRET` 只允许配置在业务 APP 服务端，不得写入原生客户端、H5 Bundle 或 URL。当前 `tmbId` 映射和 Bearer 密钥是一期可运行的临时联调契约；正式上线前仍需业务方确认外部用户到 `tmbId` 的映射归属，以及是否升级为带时间戳和 nonce 的请求签名。

### 变更文件

- `/Users/sinan/Documents/github/FastGPT/packages/global/openapi/core/appEntry/auth.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/env.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/.env.template`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/service/core/appEntry/auth.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/service/core/appEntry/config.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/pages/api/app/[appKey]/auth/code.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/pages/api/app/[appKey]/auth/session.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/pages/app/[appKey]/auth/callback.tsx`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/pages/app/[appKey]/login.tsx`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/pages/app/[appKey]/chat.tsx`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/pageComponents/appEntry/AppEntryLogin.tsx`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/web/core/appEntry/auth.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/web/core/appEntry/route.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/web/support/user/loginRedirect/url.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/test/service/core/appEntry/auth.test.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/test/web/core/appEntry/route.test.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/test/web/support/user/loginRedirect.test.ts`

### 当前验证状态

- AppEntry S1-04 变更文件 ESLint：通过。
- `git diff --check`（S1-04 范围）：通过。
- 定向测试：4 个测试文件、42 个测试全部通过。
- `pnpm --filter @fastgpt/app typecheck`：已运行；仓库仍有 76 个既有错误，均位于缺失 `@fastgpt-sdk/sandbox-adapter` 的 Sandbox 相关文件；本次 AppEntry 文件未出现在第二次类型检查错误列表。

### 风险与后续交接

- 生产环境必须配置高强度 `APP_ENTRY_AUTH_CODE_SECRET`；未配置时签发接口默认关闭。
- 业务 APP 后端必须先完成外部用户到 FastGPT `tmbId` 的可信映射，原生客户端不得自行提交任意 `tmbId` 调用签发接口。
- S1-05 的 Chat、历史会话和引用 API 必须继续使用 `authAppEntry`，不能只依赖页面 SSR 或客户端状态。
- 当前退出复用平台既有退出语义，会删除该用户全部登录 Session；如果业务方要求“只退出当前 WebView”，需要后续单独增加单 Session 注销能力。
- 正式联调时应验证 APP WebView 对 302、SameSite=Strict、HTTPS Secure Cookie 和麦克风权限的实际行为。

### 下一步

进入 S1-05：复用现有 Chat/Agent 能力，接入新建会话、历史会话、流式消息、语音输入和引用展示。
## 27. S1-05 执行记录（2026-09-13）

### 已完成

- [x] 新增 `AppEntryChat` 装配层，直接复用现有 `ChatContextProvider`、`ChatItemContextProvider`、`ChatRecordContextProvider` 和 `ChatBox`，未复制 Chat 生成引擎。
- [x] `/app/[appKey]/chat` SSR 在 `authAppEntry` 通过后注入内部运行时 App ID；业务 URL 始终只保留 `appKey`。
- [x] 复用现有 `/core/chat/init` 初始化 App 欢迎语、变量、Chat 配置和当前会话。
- [x] 复用现有 `streamFetch` 和 `/v2/chat/completions` 完成流式消息、多轮对话、停止和自动恢复。
- [x] 复用现有 ChatBox 的发送中状态和重复提交保护；流式中断继续使用现有错误消息卡和重试行为。
- [x] 复用现有历史 API 和 `ChatContext`，新增业务 H5 历史抽屉、新建会话、切换、重命名、置顶和删除能力。
- [x] 历史和记录查询继续按现有 `tmbId` 条件隔离，当前用户不能读取其他成员会话。
- [x] 新增 AppEntry 请求作用域 Header；Axios、流式请求和流恢复请求自动携带 `x-app-entry-key`。
- [x] Chat 初始化、Chat CRUD 和 Chat Completions 服务端在收到 AppEntry 作用域时重新执行 `authAppEntry`，并拒绝与 `appKey` 映射不一致的 App ID 或非 App source。
- [x] 保留普通 `/chat`、API Key、Skill Edit 和分享链接的默认鉴权行为；未携带 AppEntry Header 时不改变现有逻辑。
- [x] 语音输入按 AppEntry 固定配置启用，复用现有录音、WebView 麦克风和 `/v1/audio/transcriptions` 链路；固定关闭自动 TTS。
- [x] 引用来源复用现有 `ChatQuoteList`，以全屏 H5 阅读层展示；关闭跳转数据集详情和原文件下载。
- [x] ChatBox 新增默认兼容的 `fileUpload` feature；AppEntry 固定关闭选择、拖拽、粘贴等全部文件入口，普通 Chat 默认仍开启。
- [x] 消息反馈、标注、Sandbox、工单和 TTS 在 AppEntry 中固定关闭。
- [x] 新增 `visualViewport` 高度同步，键盘弹出时以可视区域高度更新 H5 容器；输入区保留 iOS/Android 底部安全区。
- [x] H5 外层和 Chat 内容区增加 `minW=0`、`maxW=100vw` 和横向溢出约束，覆盖 320px～430px 移动宽度基础布局。
- [x] 增加会话初始化加载态、网络失败提示和重新加载入口。

### 关键运行链路

```text
/app/{appKey}/chat
  -> SSR authAppEntry(appKey)
  -> AppEntryChat
  -> ChatContextProvider / ChatItemContextProvider / ChatRecordContextProvider
  -> /core/chat/init
  -> ChatBox
  -> /v2/chat/completions SSE
  -> 现有 Chat 历史、语音和引用 API
```

AppEntry 页面发出的共享 Chat 请求会携带：

```http
x-app-entry-key: {appKey}
```

服务端仅在该 Header 存在时增加 AppEntry 映射校验，因此普通 `/chat`、分享链接、API Key 和 Skill Edit 行为保持不变。

### 变更文件

- `/Users/sinan/Documents/github/FastGPT/projects/app/src/pageComponents/appEntry/AppEntryChat.tsx`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/pageComponents/appEntry/AppEntryLayout.tsx`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/pages/app/[appKey]/chat.tsx`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/web/core/appEntry/chat.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/web/core/appEntry/route.ts`
- `/Users/sinan/Documents/github/FastGPT/packages/global/openapi/core/appEntry/auth.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/service/core/appEntry/config.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/web/common/api/request.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/web/common/api/fetch.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/pages/api/core/chat/init.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/service/support/permission/auth/chat.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/service/support/permission/auth/chatCompletion.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/components/core/chat/ChatContainer/ChatBox/index.tsx`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/components/core/chat/ChatContainer/ChatBox/Provider.tsx`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/components/core/chat/ChatContainer/ChatBox/utils/file.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/test/web/core/appEntry/chat.test.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/test/service/core/appEntry/config.test.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/test/web/core/appEntry/route.test.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/test/components/core/chat/ChatContainer/ChatBox/file.test.ts`

### 当前验证状态

- S1-05 相关 ESLint（errors only）：通过。
- `git diff --check`（S1-05 范围）：通过。
- AppEntry、文件能力、Chat 鉴权和通用请求定向测试共 10 个文件、142 个测试全部通过。
- `pnpm --filter @fastgpt/app typecheck`：已运行；仓库仍有 76 个既有 Sandbox 类型错误，主要原因是缺失 `@fastgpt-sdk/sandbox-adapter`；本次 S1-05 文件未出现在最终类型检查错误列表。

### 尚待 S1-08 真机验证

- iOS WKWebView 和 Android WebView 的真实软键盘高度变化。
- 麦克风授权、拒绝授权和系统设置恢复流程。
- 320px、375px、390px、430px 真机宽度视觉检查。
- 弱网、SSE 中断、切后台后恢复和 APP 原生返回键行为。
- 业务模型真实多轮回答、引用数据和历史数据联调。

### 风险与后续交接

- AppEntry 页面不会在 URL 和公共配置 API 中暴露 App ID；当前 Next.js SSR 运行时 Props 仍包含内部 App ID，用于复用现有 Chat API。业务方已确认一期不检查 JS Bundle/Network；如果后续升级为严格网络层白标，需要改为 AppEntry BFF 或短期作用域 Token。
- `x-app-entry-key` 是服务端重新校验映射的作用域提示，不是独立认证凭证；真正身份仍由 `fastgpt_token` HttpOnly Cookie 提供。
- 当前 AppEntry Chat 面向普通 App/Agent；如果配置目标为 `workflowTool` 插件型 App，需要后续接入现有 `CustomPluginRunBox` 的 H5 适配。
- S1-06 需要继续处理 Chat 组件中用户可见的通用平台文案、错误脱敏、主题色和 DOM 显性品牌扫描。

### 下一步

进入 S1-06：终端显性白标、品牌资源接入和错误信息脱敏。

## 28. S1-07 执行记录（2026-09-13）

### 执行边界

业务方已确认不查看、不管理且不接收 Docker/Kubernetes 交付。本次按 S1-07 默认边界执行：

- 不修改现有 `deploy/`、Compose、Kubernetes、Helm 和 CI YAML。
- 不修改 service、`container_name`、network、volume 和内部 DNS。
- 不重建或重启当前容器。
- 只新增内部部署边界文档、环境映射示例和非破坏性预检脚本。

### 已完成

- [x] 新增内部部署边界、镜像发布、备份恢复和回滚约束文档。
- [x] 新增 AppEntry 生产环境变量映射示例，不包含真实 Secret。
- [x] 新增不输出 Secret 的 Compose/运行时预检脚本，支持 `baseline`、`release-config` 和 `runtime` 三种模式。
- [x] 检查当前 Compose 语法，12 个主服务配置可解析。
- [x] 盘点主应用、数据库、Redis、MinIO、Plugin、AI Proxy 和 Sandbox 相关服务、镜像、网络及数据卷。
- [x] 从 `fastgpt-app` 容器验证 Mongo、Redis、MinIO、Plugin、Code Sandbox、AI Proxy、OpenSandbox 和 Volume Manager 的 DNS/TCP，全部通过。
- [x] 验证当前外部首页 HTTP 返回 200。
- [x] 确认 Mongo、PostgreSQL、Redis、MinIO、Plugin、Code Sandbox、OpenSandbox、Volume Manager 和 AI Proxy 相关容器健康状态为 `healthy`。
- [x] 确认现有数据卷未被创建、删除、重命名或重新挂载。
- [x] 记录当前主应用旧镜像和不可变 digest，作为应用层回滚基线。
- [x] 确认当前运行容器没有 `APP_ENTRY_*` 环境变量，不能直接用于 AppEntry 验收。
- [x] 确认 `fastgpt-app` 当前没有 Docker healthcheck，正式滚动升级需要 HTTP readiness。
- [x] 检查 OCI labels，当前镜像包含 `org.opencontainers.image.source`；供应链白标不纳入一期。
- [x] 检查内部监控标签，当前 OTEL service name 仍使用内部平台命名；业务方不查看部署，因此一期不改。
- [x] 检查 Kubernetes/Helm，当前只有 Volume Manager 的独立 Kubernetes YAML，没有 AppEntry 主应用完整发布资源。
- [x] 确认当前单实例 Compose 不具备可证明的零停机滚动升级能力，正式环境需要反向代理并行切换或带 readiness 的编排平台。
- [x] 确认仓库当前没有覆盖整套 Compose 数据面的统一备份/恢复脚本，恢复演练仍为发布阻断项。
- [x] 发现根目录未跟踪 Compose 含明文凭证，登记为 P0 Secret 风险；未在文档或脚本输出任何 Secret 值。
- [x] 确认业务方不交付 Docker，部署资源改名不纳入一期默认发布。

### 新增文件

```text
.agents/design/app-h5-mvp/deployment-boundary.md
.agents/design/app-h5-mvp/deployment/app-entry.env.example
.agents/design/app-h5-mvp/deployment/check-runtime.mjs
```

### 当前基线结果

```text
Compose config: PASS
主 Compose 服务数: 12
主应用 HTTP: PASS (200)
依赖 DNS/TCP: PASS
已配置 healthcheck 的核心依赖: PASS
数据卷连接: PASS
主应用 Docker healthcheck: NOT CONFIGURED
AppEntry 环境变量: NOT INJECTED
新 AppEntry 镜像: NOT BUILT/DEPLOYED
备份恢复演练: NOT RUN
部署资源改名: NOT PERFORMED
```

当前主应用回滚基线：

```text
registry.cn-hangzhou.aliyuncs.com/fastgpt/fastgpt@sha256:6481c09126aa1bd0a35c6b1aa6222c4aaa5b2515a94dd95efa929c9bad587a44
```

### 预检验证

基线模式：通过。

```bash
node .agents/design/app-h5-mvp/deployment/check-runtime.mjs \
  --mode baseline \
  --compose docker-compose.yml \
  --container fastgpt-app \
  --url http://127.0.0.1:3000/
```

发布配置示例：通过格式校验。

```bash
node .agents/design/app-h5-mvp/deployment/check-runtime.mjs \
  --mode release-config \
  --compose docker-compose.yml \
  --env .agents/design/app-h5-mvp/deployment/app-entry.env.example
```

负向配置验证：将 authCode Secret 缩短并把 `FE_DOMAIN` 改为 HTTP 后，脚本按预期以非零状态拒绝，并只输出字段错误，不输出 Secret 值。

当前运行容器执行 `runtime` 门禁时按预期失败，原因：

```text
fastgpt-app 未配置 Docker healthcheck
缺少 APP_ENTRY_ENABLED
缺少 APP_ENTRY_APP_KEY
缺少 APP_ENTRY_APP_ID
缺少 APP_ENTRY_AUTH_CODE_SECRET
缺少 APP_ENTRY_AUTH_CODE_TTL_SECONDS
缺少 AUTH_COOKIE_SECURE
```

该失败说明脚本能够阻止把当前旧容器误判为 AppEntry 可发布环境。

### 尚未完成的生产发布门禁

- [ ] 构建并推送包含 S1-02～S1-07 代码的不可变 AppEntry 镜像。
- [ ] 注入正式域名、Logo、favicon、主色、隐私政策和用户协议。
- [ ] 注入高强度 `APP_ENTRY_AUTH_CODE_SECRET`，并启用 HTTPS/Secure Cookie。
- [ ] 为主应用配置并验证 HTTP readiness/healthcheck。
- [ ] 在隔离环境完成 Mongo、向量 PostgreSQL、AI Proxy PostgreSQL 和 MinIO 备份恢复演练。
- [ ] 在预发布环境完成新镜像启动和旧 digest 回滚演练。
- [ ] 完成发布后 AppEntry 登录、authCode、Chat、历史、语音和引用检查。

### 风险与处置

1. 根目录未跟踪 Compose 文件当前包含明文数据库口令、Token、对象存储凭证和系统 Key，并且没有被 Git ignore 规则保护。正式发布前必须迁移到 Secret Manager/受控 env，并评估凭证轮换。
2. 当前 `fastgpt-app:v4.16.2` 不包含本次 AppEntry 代码，仅能作为旧版本回滚基线。
3. 本次没有修改任何现有部署 YAML、服务名或数据卷，避免因为业务方不交付 Docker 而引入无收益的高风险迁移。
4. 如后续要求部署控制台白标，必须另立运维变更，完整更新服务间 URL、`NO_PROXY/no_proxy`、监控标签和回滚映射。

### 下一步

S1-07 的内部边界、检查工具和回滚策略已完成。进入 S1-06 或 S1-08 前，运维需先处理 P0 Secret 风险；真正的新环境启动、健康检查和回滚演练由 S1-08 在新镜像和正式配置具备后执行。



## 29. S1-06 执行记录（2026-09-13）

### 已完成

- [x] 新增 AppEntry 最终可见品牌收敛：清理平台产品名、平台默认资源和平台链接，缺失 Logo/Favicon 时使用业务名称首字符与业务主色生成 SVG data URL。
- [x] `toPublicAppEntryConfig` 统一输出已清理的业务品牌配置；Chat 初始化后覆盖内部 App 的名称、头像和简介展示。
- [x] `NextHead` 增加向后兼容的 AppEntry 严格分支，支持业务 data URL、favicon 和 apple-touch-icon，且不回落平台 `/favicon.ico`。
- [x] AppEntry 根节点按业务主色覆盖共享 Chat 使用的 Chakra `primary.*` 色板。
- [x] 为共享 ChatBox 增加可选 presentation，不改变普通 Chat 默认行为；AppEntry 覆盖 ChatInput、Agent Ask、合规 Footer 和错误文案。
- [x] Chat 发送、恢复、重试、编辑和行内工作流错误统一经过 AppEntry 中性错误映射，不展示 URL、服务名、路径、堆栈或凭证内容。
- [x] AppEntry 专属 API 增加未知错误边界：详细异常只写服务端日志，响应仅返回中性消息；已登记公开业务错误码保持现有协议。
- [x] 新增 AppEntry React Error Boundary 和 `/app/[appKey]/unavailable`；无效入口不再落入平台 404/管理端跳转。
- [x] 输出 `.agents/design/app-h5-mvp/white-label-scan-report.md`。
- [x] 确认 `projects/app/next.config.ts` 中 `productionBrowserSourceMaps: false`、`poweredByHeader: false`。

### 新增文件

```text
.agents/design/app-h5-mvp/white-label-scan-report.md
projects/app/src/pageComponents/appEntry/AppEntryBrandMark.tsx
projects/app/src/pageComponents/appEntry/AppEntryErrorBoundary.tsx
projects/app/src/pageComponents/appEntry/AppEntryErrorState.tsx
projects/app/src/pages/app/[appKey]/unavailable.tsx
projects/app/src/service/core/appEntry/error.ts
projects/app/src/web/core/appEntry/brand.ts
projects/app/src/web/core/appEntry/error.ts
projects/app/test/service/core/appEntry/error.test.ts
projects/app/test/web/core/appEntry/brand.test.ts
projects/app/test/web/core/appEntry/error.test.ts
```

### 验证

```text
Targeted Vitest: 11 files, 82 tests passed
ESLint (errors only): passed
S1-06 target diff check: passed
App typecheck: 76 pre-existing Sandbox errors; no S1-06/AppEntry errors
Production browser source maps: disabled in next.config.ts
```

### 兼容边界

1. 普通 `/chat`、分享页、API Key、Skill Edit 和管理端未传入 ChatBox presentation，保持原有文案、合规提示和错误行为。
2. 未修改 Cookie/Header 名、内部包名、数据库名、外部平台协议或任何部署 YAML。
3. 共享 Chat 源码仍可包含普通页面使用的平台兜底；AppEntry 通过独立 presentation 保证这些兜底不进入 `/app/*` DOM。
4. 正式品牌资源和真机 DOM 复验由 S1-08 在新镜像与正式环境变量具备后执行。

### 下一步

进入 S1-08：在包含 S1-02～S1-07 的新镜像中执行浏览器/真机、故障注入、生产构建 Source Map 和发布回滚门禁。


## 30. S1-08 执行记录（2026-09-13）

### 状态

```text
发布结论：NO-GO
阶段一状态：阻塞，不得进入阶段二实施/生产发布
```

### 已完成

- [x] 构建 `@fastgpt-sdk/storage`、`@fastgpt-sdk/otel` 和 `@fastgpt-sdk/sandbox-adapter`。
- [x] App workspace TypeScript 检查通过，0 error。
- [x] 使用构建专用占位环境变量完成 Next.js production build。
- [x] 构建清单确认 5 个 AppEntry 页面和 3 个 AppEntry API 均进入产物。
- [x] 扫描生产浏览器静态目录，`.map` 数量为 0；服务端 Source Map 保留在非公开 server 目录。
- [x] AppEntry/Chat 定向回归：24 个测试文件、227 个测试通过。
- [x] App workspace 全量测试执行：2530 个测试通过、18 个跳过、1 个 Migration Runner 高负载超时；失败文件隔离复验 10/10 通过。
- [x] ESLint errors-only 和目标 diff check 通过。
- [x] 复验部署 baseline 和 release-config 检查。
- [x] runtime 门禁正确拒绝当前旧容器：无 healthcheck、无 AppEntry 环境变量。
- [x] 确认当前 `v4.16.2` 容器的 `/app/customer-service`、`/login`、`/chat` 均返回 404，不能用于 AppEntry 验收。
- [x] S1-08 发现并修复 AppEntry 语音权限/转写错误可能透传原始异常的问题。
- [x] 输出 `.agents/design/app-h5-mvp/test-report.md`，包含通过项、阻塞项、非阻塞项、未执行项和业务方签字模板。
- [x] MVP 遗留问题已按 P0/P1/P2 分级。

### P0 阻塞

- [ ] 根目录 Compose 明文 Secret 风险处理和必要轮换。
- [ ] AppEntry 新镜像构建、推送、部署和不可变 digest 记录。
- [ ] 正式品牌、HTTPS、Secure Cookie 和 authCode Secret 注入。
- [ ] 业务 APP 外部用户到可信 `tmbId` 的生产映射与 authCode 联调。
- [ ] iOS WKWebView、Android WebView 真机登录、Chat、键盘、安全区、返回、语音和引用验收。
- [ ] Mongo、向量 PostgreSQL、AI Proxy PostgreSQL、MinIO 备份恢复演练。
- [ ] 新镜像 readiness 和旧 digest 回滚演练。
- [ ] 业务方书面确认。

### 最小修复文件

```text
projects/app/src/components/core/chat/ChatContainer/ChatBox/Input/VoiceInput.tsx
projects/app/src/web/common/hooks/useSpeech.ts
projects/app/src/web/core/appEntry/error.ts
projects/app/test/web/core/appEntry/error.test.ts
```

### 报告

```text
.agents/design/app-h5-mvp/test-report.md
```

### 下一步

由运维和业务 APP 团队先关闭 P0 环境门禁；具备新镜像、正式配置、测试账号和真机后重新执行 S1-08。当前不得把 S2-05A 视觉修订计划解释为阶段一已经验收通过。

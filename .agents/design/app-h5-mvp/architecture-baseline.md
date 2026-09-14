# App H5 白标 MVP：需求、现状与架构基线

> 任务：S1-01 需求、现状和架构基线
> 日期：2026-09-13
> 状态：待业务方确认后进入 S1-02～S1-07
> 目标：在不破坏现有平台能力和内部兼容性的前提下，为业务方 APP 提供可通过 WebView 打开的专属 H5 入口。

## 1. 结论摘要

### 1.1 推荐架构

采用“路由隔离 + 独立 H5 Layout + 现有能力复用 + 运行时白标”的方案：

```text
业务方 APP
  ↓ WebView
业务方域名 /app/[appKey]
  ↓ 同源 Cookie 或一次性 authCode
Next.js AppEntry H5 外壳
  ├── 业务方品牌上下文
  ├── AppKey 解析和服务端访问守卫
  ├── 业务方登录/回跳
  └── 现有 Chat/Agent 能力
       ├── 现有 /core/chat/init
       ├── 现有流式 Chat API
       ├── 现有用户、团队和权限
       ├── 现有 App 数据和版本
       └── 现有文件/引用能力
```

### 1.2 一期最重要的边界

一期只对白标外部可见边界和部署运行资源，不做源码级整体改名：

| 层级 | 一期处理 | 一期暂不处理 |
|---|---|---|
| H5 路由 | 新增 `/app/[appKey]` 路由族 | 不替换现有 `/chat`、`/chat/share` |
| 页面外壳 | 新增 AppEntry Layout | 不在全局 Layout 中复制平台页面 |
| 登录 | APP WebView 独立隔离，使用一次性 authCode 换取现有登录态 | 不重建用户系统、不传长期 Token |
| Chat | 复用现有 Chat Context、初始化和流式接口 | 不复制 Chat 引擎 |
| 权限 | AppKey 解析后服务端鉴权 | 不只做前端隐藏 |
| 品牌 | 业务方标题、Logo、favicon、主题和文案 | 不直接改全局系统默认值影响所有租户 |
| 部署 | 业务方不交付 Docker；一期只记录内部部署边界 | 不改现有部署资源，除非内部运维另行授权 |
| 协议 | 只做错误脱敏和页面可用性 | 不做 BFF、不改 Cookie/Header/API 内部协议 |
| UI | 最小可用布局和状态 | MVP 验收前不做完整高保真 UI/交互设计 |

## 2. 当前系统事实

### 2.1 技术和路由结构

- 应用为 Next.js Pages Router。
- 页面入口位于 `projects/app/src/pages/`。
- 全局壳由 `projects/app/src/web/context/AppShell.tsx`、`projects/app/src/components/Layout/index.tsx` 和 `projects/app/src/components/Layout/auth.tsx` 组成。
- 现有应用管理页为 `/app/detail?appId=...`，它是编辑、发布、日志和工作流管理页面，不适合作为业务方 H5 入口。
- 现有通用对话页为 `/chat`，通过 query 选择 App 和对话状态。
- 现有公开分享页为 `/chat/share?shareId=...`，使用外链认证，不适合作为默认的 APP 登录态入口。
- Next 配置支持 `basePath`，其值来自 `NEXT_PUBLIC_BASE_URL`；新路由和跳转不能假设部署在根路径。
- 当前页面 Head 由 `NextHead` 和 `useInitApp` 共同参与渲染；动态 AppEntry 路由需要避免系统默认 title/favicon 覆盖业务配置。

### 2.2 当前 Layout 和认证行为

`projects/app/src/components/Layout/index.tsx` 当前按固定路由表决定是否显示平台 Navbar：

- PC 端为固定左侧 Navbar。
- 手机端为底部 `NavbarPhone`。
- `/chat`、`/chat/share` 等页面被列为不显示平台 Navbar 的路由。
- 新增 `/app/[appKey]` 后必须增加动态路由判断，否则业务 H5 可能出现平台底部导航或左侧导航。
- 仅使用 CSS 隐藏不够，因为平台弹窗、SupportBot、未读数请求或平台导航组件仍可能初始化。
- `Auth` 目前使用固定的 `unAuthPage` 路由表；业务 H5 需要独立处理登录守卫，不能依赖固定路由表自动推断动态 `/app/*` 页面。

### 2.3 当前移动端能力

系统已经存在可复用的手机交互：

- `useSystem` 通过 `(min-width: 900px)` 判断 PC/手机。
- `AppChatWindow` 在手机端使用 `ChatSliderMobileDrawer`。
- Chat 输入框、语音输入和引用内容已经存在移动端分支。
- `NavbarPhone` 是平台管理端的底部导航，AppEntry 必须明确不挂载它。
- 当前 viewport 已设置 `viewport-fit=cover`，但 AppEntry 仍需真机验证键盘和 safe-area。

### 2.4 当前登录能力

现有登录接口位于 `projects/app/src/web/support/user/api.ts`：

```text
GET  /support/user/account/tokenLogin
POST /support/user/account/loginByPassword
POST /proApi/support/user/account/login/oauth
POST /proApi/support/user/account/login/fastLogin
GET  /support/user/account/loginout
```

当前登录页 `projects/app/src/pages/login/index.tsx`：

- 使用现有 `LoginModal`。
- 登录成功后写入用户 Store。
- 根据 `lastRoute` 和 `lastTmbId` 处理回跳。
- 通过 `validateRedirectUrl` 限制回跳目标。
- 页面挂载时会执行清理旧 Token 的逻辑。

当前服务端登录 Cookie 定义在 `packages/service/support/permission/auth/common.ts`：

- Cookie 名称为现有内部名称。
- HttpOnly。
- SameSite 为 Strict。
- Secure 由 `AUTH_COOKIE_SECURE` 控制。
- 有效期为 7 天。

业务方已确认 APP WebView 独立隔离，因此一期默认采用：

```text
APP/业务服务确认用户已登录
  ↓
生成一次性 authCode
  ↓
WebView 打开 /app/[appKey]/auth/callback?code=...
  ↓
服务端校验并消费 code
  ↓
写入现有 HttpOnly Cookie
  ↓
进入 /app/[appKey]
```

H5 与 API 保持同源；不能把长期 JWT 或长期 Token 放进 URL。

### 2.5 当前 App 和权限能力

现有 App 详情接口为：

```text
GET /core/app/detail?appId=...
```

服务端通过 `authApp` 使用 `ReadPermissionVal` 鉴权。`authApp` 会校验：

- 用户登录身份。
- 用户所在团队。
- App 所属团队。
- App 类型。
- App 继承权限。
- 当前成员对 App 的资源权限。

现有聊天初始化接口为：

```text
GET /core/chat/init?sourceType=app&sourceId=<appId>&chatId=<chatId>
```

该接口同样通过 `authApp` 校验 App 读取权限，并额外校验聊天记录归属和读取权限。

因此 AppEntry 不需要重新实现 App 和 Chat 的权限逻辑，但需要新增：

```text
appKey -> appId
```

并保证解析出的 `appId` 继续经过现有服务端权限校验。

### 2.6 当前 Chat 复用链路

现有登录用户对话链路：

```text
/chat?appId=...
  ↓
projects/app/src/pages/chat/index.tsx
  ↓
ChatContextProvider
  ↓
ChatItemContextProvider
  ↓
ChatRecordContextProvider
  ↓
AppChatWindow
  ↓
getInitChatInfo -> /core/chat/init
  ↓
streamFetch -> 流式消息接口
```

`AppChatWindow` 已经包含：

- App Chat 初始化。
- 当前 Chat ID 处理。
- Chat 历史侧栏。
- 手机端历史抽屉。
- Chat Header。
- 输入框和流式生成状态。
- Sandbox 相关入口。
- 引用和反馈等既有能力。

推荐 AppEntry 以适配层复用上述能力，并通过 Props/Context 控制：

```text
showHistory
showHeader
showCitation
showFeedback
allowFileUpload
allowVoiceInput
```

### 2.7 当前部署事实

当前项目存在多套部署文件和服务命名，内部包含：

- App 服务。
- MongoDB。
- Redis。
- Plugin 服务。
- Code Sandbox。
- AI Proxy。
- Volume Manager。
- Agent Sandbox Proxy。
- MinIO/对象存储。
- MCP Server。

部署配置中存在服务名、容器名、网络名、Volume 名、镜像仓库路径、`NO_PROXY` 和服务间 URL 的耦合。

一期如果业务方可以查看部署控制台，建议采用：

```text
重新构建或重新打标签
  ↓
业务方私有镜像仓库
  ↓
业务方命名的 Compose/Kubernetes 运行资源
  ↓
保留旧命名到新命名的回滚映射
```

不得把部署命名替换误认为源码包名迁移。

## 3. 推荐目标架构

### 3.1 路由架构

推荐目录：

```text
projects/app/src/pages/app/[appKey]/index.tsx
projects/app/src/pages/app/[appKey]/chat.tsx
projects/app/src/pages/app/[appKey]/login.tsx
projects/app/src/pages/app/[appKey]/auth/callback.tsx
```

推荐页面职责：

| 页面 | 职责 |
|---|---|
| `/app/[appKey]` | 读取配置、判断登录、显示业务首页或直接进入对话 |
| `/app/[appKey]/chat` | 显示业务方 H5 Chat |
| `/app/[appKey]/login` | 业务方品牌登录页，复用现有登录 API |
| `/app/[appKey]/auth/callback` | APP authCode 换取登录态，一期必做 |

### 3.2 配置对象

建议定义独立配置，不直接把业务方字段塞入全局 `feConfigs`：

```typescript
type AppEntryConfig = {
  appKey: string;
  appId: string;
  enabled: boolean;
  brand: {
    name: string;
    description: string;
    logo: string;
    favicon: string;
    primaryColor: string;
    supportUrl?: string;
    privacyUrl?: string;
    termsUrl?: string;
  };
  features: {
    showHistory: boolean;
    allowFileUpload: boolean;
    allowVoiceInput: boolean;
    showCitation: boolean;
    showFeedback: boolean;
  };
};
```

一期单业务方单部署可以先使用环境变量或配置文件；如果未来一套部署承载多个业务方，再将配置放入数据库并通过 `appKey` 查询。

### 3.3 Layout 架构

AppEntry 必须走独立布局：

```text
AppEntryPage
  ↓
AppEntryGuard
  ↓
AppEntryBrandProvider
  ↓
AppEntryLayout
  ├── AppEntryHeader
  ├── AppEntryContent
  └── AppEntryErrorBoundary
```

独立 Layout 需要做到：

- 不挂载平台 Navbar。
- 不挂载平台 H5 底部导航。
- 不挂载平台 SupportBot。
- 不加载平台升级/账单/通知等弹窗。
- 不显示平台页面入口。
- 只加载 AppEntry 需要的配置和数据。

### 3.4 登录架构

#### 一期方案：一次性 authCode

```text
APP 已登录
  ↓
APP/业务服务生成一次性 authCode
  ↓
WebView GET /app/customer-service/auth/callback?code=...
  ↓
服务端校验 code、appKey、用户、有效期和单次消费
  ↓
写入 HttpOnly Cookie
  ↓
清理 URL
  ↓
进入 /app/customer-service
```

#### 账号密码兜底方案

如果业务方允许 H5 直接登录，可保留业务方品牌登录页调用现有 `loginByPassword`；这不是 APP 免登录主流程。

```text
APP 已登录
  ↓
APP/业务服务生成一次性 code
  ↓
WebView GET /app/customer-service/auth/callback?code=...
  ↓
服务端校验 code、appKey、用户、有效期和单次消费
  ↓
写入 HttpOnly Cookie
  ↓
清理 URL
  ↓
进入 /app/customer-service
```

### 3.5 API 架构

推荐一期优先使用现有 Chat API，通过 AppEntry 适配层传入已经解析和鉴权的 App ID。

只有以下场景才新增 AppEntry API：

- 根据 appKey 读取业务配置。
- 根据 appKey 返回业务品牌配置。
- APP authCode 换取登录态。
- 对外统一错误码和脱敏响应。
- 需要限制现有 API 返回字段。

不建议为了形式上的 `/app-api/*` 而复制全部现有 Chat API。

### 3.6 域名和同源策略

推荐：

```text
https://business.example.com/app/customer-service
https://business.example.com/api/...
```

使用反向代理把页面和 API 代理到同一个 Next.js 服务，避免跨域 Cookie 问题。

不推荐默认采用：

```text
https://business.example.com/app/customer-service
https://internal-fastgpt.example.com/api/...
```

因为会引入：

- CORS。
- SameSite Cookie 限制。
- CSRF 配置。
- WebView Cookie 隔离。
- 外部域名暴露。
- API 错误来源泄露。

## 4. 现有能力复用矩阵

| 能力 | 当前实现 | AppEntry 处理 | 复用结论 |
|---|---|---|---|
| 用户登录 | `LoginModal`、`loginByPassword` | 新增 AppEntry 登录外壳和回跳 | 复用 |
| Cookie 鉴权 | `authApp`、`authCert`、HttpOnly Cookie | 默认不改内部 Cookie | 复用 |
| App 权限 | `authApp` + `ReadPermissionVal` | AppKey 解析后继续调用 | 复用 |
| App 初始化 | `/core/chat/init` | sourceType=app、sourceId=appId | 复用 |
| 流式对话 | `streamFetch` 和 Chat API | AppEntry Chat 适配 | 复用 |
| Chat 历史 | `ChatRecordContext`、历史 API | 通过 feature 控制是否显示 | 复用 |
| 文件上传 | 现有 Chat 文件流程 | 根据 AppEntry 配置开启 | 复用 |
| 语音 | 现有 VoiceInput | MVP 后按需求开启 | 复用 |
| 页面 Head | `NextHead`、`useInitApp` | AppEntry 优先级覆盖 | 局部适配 |
| 平台导航 | `Layout`、`NavbarPhone` | AppEntry 独立 Layout 不挂载 | 不复用 |
| 平台通知 | `Layout` 内多种 Modal | AppEntry 不挂载 | 不复用 |
| 工作台 | `/dashboard/*` | 不暴露 | 不复用 |
| 知识库管理 | `/dataset/*` | 不暴露 | 不复用 |
| 公开分享 | `/chat/share` | 仅作为历史参考，不作为默认入口 | 不复用 |

## 5. 关键未决问题

以下问题在 S1-01 后必须由业务方确认：

| 编号 | 问题 | 默认建议 | 未确认的影响 |
|---|---|---|---|
| Q1 | APP 是否已有登录态？ | APP WebView 独立隔离，必须 authCode 桥接 | 决定登录桥接和 Cookie 写入 |
| Q2 | H5 和 API 是否同源？ | 同源 | 降低 CORS/Cookie/CSRF 风险 |
| Q3 | 一套部署服务几个业务方？ | 单部署单业务方 | 配置可先放环境变量/配置文件 |
| Q4 | 是否允许用户注册？ | 关闭 | 登录页不显示注册入口 |
| Q5 | 是否显示历史会话？ | 显示当前用户自己的历史 | Chat 保留历史侧栏/抽屉 |
| Q6 | 是否支持文件上传？ | 关闭 | 不渲染文件入口，不调用上传 API |
| Q7 | 是否支持语音输入？ | 开启 | 需要 WebView 麦克风权限和 HTTPS |
| Q8 | 是否支持引用、反馈？ | 支持引用，不支持反馈 | 保留引用展示，关闭反馈入口 |
| Q9 | 业务方能否查看部署控制台？ | 不查看/不交付 Docker | 部署资源改名不纳入一期业务验收 |
| Q10 | 是否检查 Network/Cookie/JS Bundle？ | 不检查，只关注可用性和页面显性白标 | 不增加 BFF，不改内部协议 |
| Q11 | 业务方提供哪些品牌资源？ | Logo、favicon、主色、文案 | 没有资源只能使用临时占位 |
| Q12 | 正式域名和隐私/协议地址是什么？ | 业务方提供 | 影响生产上线和合规验收 |

## 6. S1-01 结论

### 可直接进入开发的结论

1. 新增 `/app/[appKey]` 路由族，而不是修改 `/chat` 作为业务入口。
2. 使用独立 H5 Layout，不把业务方页面塞入平台管理端 Layout。
3. APP WebView 独立隔离，一期必须通过一次性 authCode 换取现有登录 Cookie。
4. AppKey 必须由服务端解析和校验，不能只在前端映射 App ID。
5. Chat 复用现有 `AppChatWindow`、Chat Context、初始化 API 和流式接口。
6. H5 终端只开放登录、首页、Chat、历史、新建会话和退出等最小能力。
7. 显性白标优先处理 title、favicon、Logo、文案、错误和导航；构建产物只做工程侧可选排查。
8. 部署层不作为业务方 Docker 交付；内部如需运行资源重命名另立运维变更，不做源码包名迁移。
9. UI/交互设计后置到 MVP 真机验收之后。

### 必须在编码前确认的阻塞项

- Q11/Q12：业务方品牌、正式域名和合规链接。
- authCode 接口归属、签名方式和 APP 回调参数。
- APP WebView 支持的系统版本和容器限制。

### 不属于 S1-01 的内容

- 不创建路由代码。
- 不修改全局 Layout。
- 不改 Cookie/Header/API 协议。
- 不改数据库、Redis、Bucket 和部署 YAML。
- 不进行 UI/交互视觉设计。

## 7. 业务方确认后的基线决策（2026-09-13）

### 已确认

| 项目 | 决策 |
|---|---|
| Q1 现有登录态 | 管理端已有登录态，但 APP WebView 独立隔离，一期必须使用 authCode 桥接 |
| Q2 H5/API | 同源 |
| Q3 部署形态 | 一套部署服务一个业务方 |
| Q4 注册 | 暂不支持注册 |
| Q5 历史会话 | 显示历史会话 |
| Q6 文件上传 | 暂不支持 |
| Q7 语音 | 支持语音输入 |
| Q8 引用/反馈 | 支持引用，不支持反馈 |
| Q9 Docker | 业务方不支持/不交付 Docker 部署 |
| Q10 严格白标 | 业务方不检查 Network/Cookie/Header/JS Bundle，只关注可用性和页面显性白标 |

### 因决策产生的调整

1. AppEntry 功能开关固定为：

```text
showHistory: true
allowFileUpload: false
allowVoiceInput: true
showCitation: true
showFeedback: false
allowRegister: false
```

2. Q2 已确认 H5/API 同源。由于 APP WebView 独立隔离，一期通过 authCode 换取 H5 Cookie，不要求共享管理端浏览器 Cookie。

3. Q9 使“业务方可见的 Docker 部署白标”不再是一期交付项。S1-07 改为内部部署边界检查；除非内部运维明确要求，不修改现有 Compose/Kubernetes 文件。

4. Q10 不要求业务方检查 Network、Cookie、Header 和 JS Bundle，一期只验收页面可用性、错误脱敏和终端显性白标。

5. Q1 已按 APP WebView 独立隔离处理，authCode 是一期登录必做项。桌面管理端已有登录态只用于验证现有账号和权限，不作为 APP WebView 登录态。

### 仍待补充

- 正式 H5 域名、Logo、favicon、主色和默认文案：待后续补充，技术 MVP 阶段使用临时配置。
- 隐私政策、用户协议、客服入口地址：待正式业务验收/上线前补充。
- APP WebView 类型和版本范围。
- authCode 生成和校验接口归属。
- authCode 签名方式、过期时间和失败回退策略。

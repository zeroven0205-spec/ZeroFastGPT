# AppEntry H5 显性白标与错误脱敏扫描报告

- 扫描日期：2026-09-13
- 对应任务：S1-06
- 路由范围：`/app/[appKey]`、`/app/[appKey]/login`、`/app/[appKey]/auth/callback`、`/app/[appKey]/chat`、`/app/[appKey]/unavailable`
- 终端验收边界：可见 DOM、页面 Head、Logo/Favicon、可见错误、业务链接；不改 Cookie/Header/内部包名/数据库名和共享 Chat 协议。

## 1. 结论

| 检查项 | 结果 | 说明 |
| --- | --- | --- |
| AppEntry 独立壳 | 通过 | `AppShell` 对 AppEntry 不挂载平台 `Layout`、平台 Head 和平台脚本；页面使用独立 H5 Layout。 |
| 页面 title/meta | 通过 | 所有可见 AppEntry 页面使用业务 `brand.name`、`brand.description`；不可用页使用中性错误标题。 |
| Favicon/Apple Touch Icon | 通过 | `NextHead` 增加 AppEntry 严格分支，不回落 `/favicon.ico`；业务图标缺失时由业务名称首字符和主色生成 SVG data URL。 |
| Logo/默认头像 | 通过 | Header、历史抽屉、错误页和 Chat AI 头像统一使用业务 Logo；平台默认资源会被拒绝并替换为业务派生图标。 |
| ChatInput/Agent Ask | 通过 | AppEntry 通过独立 presentation 覆盖输入占位和自定义回答文案，不读取共享平台品牌兜底文案。 |
| 合规/版权/升级入口 | 通过 | AppEntry Chat 关闭共享输入框合规 Footer；文件、反馈、TTS、Sandbox、工单及平台 Layout 入口保持关闭。 |
| 业务链接 | 通过 | 登录页只渲染显式配置的隐私政策/用户协议；包含平台品牌的默认链接在公开品牌配置阶段移除。 |
| 可见错误 | 通过 | Chat 发送、恢复、重试、编辑、行内工作流错误均经过有限中性消息映射；加载和登录错误不渲染原始异常。 |
| AppEntry API 未知错误 | 通过 | AppEntry 专属 API 保留已登记公开业务错误码；未知异常仅记录服务端日志，响应使用中性 `UserError`。 |
| 无效入口/渲染崩溃 | 通过 | 无效配置进入独立 `/unavailable`，不进入平台 404；客户端渲染异常由 AppEntry Error Boundary 接管。 |
| 主色 | 通过 | AppEntry 根节点按业务主色覆盖 Chakra `primary.50`～`primary.900`，共享 Chat 控件不使用平台默认主色。 |
| Production Source Map | 通过（配置） | `projects/app/next.config.ts` 明确设置 `productionBrowserSourceMaps: false`；S1-08 production build 后确认 `.next/static` 浏览器 `.map` 数量为 0。服务端 `.map` 仅位于非公开 server 构建目录。 |

## 2. 主要修复

### 2.1 品牌资源收敛

- 新增 `projects/app/src/web/core/appEntry/brand.ts`：
  - 清理 `FastGPT`、`AI Platform` 等显性平台产品名。
  - 拒绝平台默认 favicon、平台品牌资源 URL 和平台品牌业务链接。
  - 在业务资源缺失时，以业务名称首字符和主色生成内联 SVG 图标。
  - 生成 AppEntry 独立 Chakra 主色变量。
- `toPublicAppEntryConfig` 在任何 AppEntry 页面/API 输出前统一生成最终可见品牌配置。
- Chat 初始化后覆盖共享 App 数据中的 `name`、`avatar`、`intro`，避免内部 App 元数据作为终端品牌兜底。

### 2.2 Head 与错误页

- `NextHead` 增加向后兼容的 `appEntry` 分支：
  - 支持业务 SVG data URL。
  - 同时输出 favicon 和 apple-touch-icon。
  - AppEntry 图标无效时不回落平台 `/favicon.ico`。
- 新增 AppEntry 统一不可用页和 React Error Boundary。
- 原来会进入平台 404 的无效 AppEntry 配置统一重定向到业务中性错误页。

### 2.3 共享 Chat 的隔离扩展

共享 Chat 只增加可选 `presentation`，普通 `/chat`、分享页、API Key 和 Skill Edit 未传入该配置时保持原行为：

- `inputPlaceholder`
- `agentAskCustomAnswer`
- `showComplianceTip`
- `errorTitle`
- `formatError`

AppEntry 注入业务文案并关闭共享 Footer。错误格式化覆盖以下终端通道：

- 普通流式生成失败。
- 自动恢复流中断。
- 消息重试/编辑失败。
- ChatItem 行内工作流错误。

## 3. 静态扫描结果

### 3.1 AppEntry 可见代码路径品牌词扫描

扫描目录：

```text
projects/app/src/pageComponents/appEntry
projects/app/src/pages/app/[appKey]
projects/app/src/web/core/appEntry
projects/app/src/service/core/appEntry
```

对精确可见产品名 `FastGPT|AI Platform` 的扫描结果为 0。源码中的内部包名 `@fastgpt/*`、错误脱敏正则和服务端实现标识不属于可见 DOM，且按任务约束不改名。

### 3.2 共享 Chat 兜底扫描

共享 Chat 仍保留普通页面使用的原有翻译和默认值。AppEntry 运行时固定传入 presentation：

```text
inputPlaceholder: 发消息给{业务品牌名}
agentAskCustomAnswer: 请输入补充内容
showComplianceTip: false
errorTitle: 请求未完成
formatError: sanitizeAppEntryError
```

因此共享 `AI Platform` 兜底和 Agent Ask 翻译不会进入 AppEntry DOM；普通 Chat 默认文案未被 S1-06 全局修改。

### 3.3 链接与错误渲染扫描

- AppEntry 仅发现隐私政策和用户协议两个可见外链位置，数据均来自已清理的业务配置。
- 未发现把异常对象、堆栈、URL、文件路径或服务名直接插入 AppEntry JSX 的路径。
- 服务端日志保留原始异常；客户端和 AppEntry API 未知错误仅返回有限中性消息。

## 4. 验证记录

### 单元测试

```text
11 test files passed
82 tests passed
```

覆盖：品牌清理、业务图标生成、主色变量、错误脱敏、AppEntry API 错误边界、Chat presentation、路由、Head/Favicon、authCode、配置和共享 Chat 生成/恢复/文件能力回归。

### ESLint

S1-06 修改文件执行 `eslint --quiet`，0 error。

### TypeScript

S1-06 初次检查时因缺少已构建的 `@fastgpt-sdk/sandbox-adapter` 出现 76 个既有 Sandbox 错误。S1-08 已执行 `pnpm run build:sdks` 补齐 SDK 产物，随后 App workspace typecheck 通过，0 error。

### Diff

S1-06 目标文件 `git diff --check` 通过。

## 5. S1-08 运行时复验项

以下项目需要在包含本次代码和正式业务品牌环境变量的新镜像中完成，不属于本次静态实现阻断：

1. Chrome、Safari、Edge 逐页检查 Head 和可见 DOM。
2. iOS WKWebView、Android WebView 检查 favicon/apple-touch-icon、软键盘和安全区。
3. 人工注入 Mongo/Redis/上游 HTTP/流中断错误，确认 UI 只显示中性消息。
4. 已在 S1-08 对 production build 执行 `.next/static` Source Map 扫描，浏览器 `.map` 数量为 0。
5. 检查正式业务 Logo、favicon、隐私政策和用户协议 URL 均已注入，且不依赖平台域名。

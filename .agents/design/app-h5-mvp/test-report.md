# AppEntry H5 MVP S1-08 测试与发布门禁报告

- 执行日期：2026-09-13
- 对应任务：S1-08
- 仓库：`/Users/sinan/Documents/github/FastGPT`
- 验收基线：`.agents/design/app-h5-mvp/acceptance-matrix.md`
- 结论：**NO-GO / 阻止发布，阶段一暂不得进入阶段二实施**

## 1. 发布结论

当前代码级 MVP 已完成生产构建、类型检查、AppEntry/Chat 定向回归和显性白标扫描；但正式发布依赖的运行环境与真机证据尚不具备，并存在未关闭的 P0 项：

1. 当前运行的 `fastgpt-app` 仍是旧版 `v4.16.2`，没有 AppEntry 路由和 `APP_ENTRY_*` 环境变量。
2. 尚未构建、推送和部署包含 S1-02～S1-08 代码的不可变 AppEntry 镜像。
3. iOS WKWebView、Android WebView 的 Cookie、软键盘、安全区、返回键、麦克风和后台恢复未执行真机测试。
4. APP 外部用户到可信 `tmbId` 的生产映射、正式签发请求和 authCode 全链路未联调。
5. Mongo、向量 PostgreSQL、AI Proxy PostgreSQL、MinIO 的备份恢复演练未执行。
6. 新镜像启动、HTTP readiness 和旧镜像 digest 回滚演练未执行。
7. 根目录未跟踪 Compose 文件中的明文 Secret 风险仍未关闭；本报告不记录或输出任何 Secret 值。

根据 S1-08 规则“任何 P0 项未通过，阶段一不得进入阶段二”，当前发布门禁结论为 **NO-GO**。S2-05A 视觉修订任务可以保留在计划中，但不得被解释为阶段一已经完成或可以生产发布。

## 2. 本轮最小修复

### 2.1 WebView 麦克风拒绝错误脱敏

S1-08 检查语音入口时发现：共享 `useSpeech` 在浏览器拒绝麦克风权限或转写失败时会直接使用原始异常生成 Toast，AppEntry 可能显示浏览器/上游内部错误。

已采用向后兼容的最小修复：

- `useSpeech` 增加可选 `formatError`，普通 Chat 未传入时保持原行为。
- AppEntry Chat 的 `VoiceInput` 从 ChatBox presentation 读取现有脱敏函数并传入语音 Hook。
- `NotAllowedError`、`Permission denied` 等权限错误统一显示：

```text
未获得麦克风权限，请在系统设置中允许后重试。
```

- 转写失败继续使用 AppEntry 有限错误映射，不展示 URL、内部服务、文件路径、堆栈或 Token。

涉及文件：

```text
projects/app/src/components/core/chat/ChatContainer/ChatBox/Input/VoiceInput.tsx
projects/app/src/web/common/hooks/useSpeech.ts
projects/app/src/web/core/appEntry/error.ts
projects/app/test/web/core/appEntry/error.test.ts
```

## 3. 自动化验证结果

### 3.1 SDK 构建

命令：

```bash
pnpm run build:sdks
```

结果：**PASS**。

成功构建：

```text
@fastgpt-sdk/storage
@fastgpt-sdk/otel
@fastgpt-sdk/sandbox-adapter
```

该步骤补齐了工作区先前缺失的 Sandbox Adapter 构建产物。

### 3.2 TypeScript

命令：

```bash
pnpm --filter @fastgpt/app typecheck
```

结果：**PASS，0 error**。

### 3.3 生产构建

命令使用仅供构建校验的非生产占位配置，未读取或写入生产 Secret：

```bash
STORAGE_DOWNLOAD_URL_MODE=short-proxy \
FILE_TOKEN_KEY=<build-only-placeholder> \
pnpm --filter @fastgpt/app build
```

结果：**PASS**。

构建清单包含：

```text
/app/[appKey]
/app/[appKey]/login
/app/[appKey]/auth/callback
/app/[appKey]/chat
/app/[appKey]/unavailable
/api/app/[appKey]/config
/api/app/[appKey]/auth/code
/api/app/[appKey]/auth/session
```

构建期间存在一个非阻塞警告：Turbopack 未解析 `styled-jsx/style.js`，但最终构建退出码为 0。发布镜像构建时需要再次确认该警告不会造成运行时缺失。

### 3.4 Source Map

生产构建扫描：

```text
projects/app/.next/static 浏览器 .map 数量：0
projects/app/.next/server 服务端 .map 数量：2999
```

结论：**浏览器 Source Map 已关闭**，符合 `productionBrowserSourceMaps: false`。服务端 Source Map 位于服务器构建目录，不属于 `/_next/static` 浏览器公开资源；镜像和日志访问权限仍由内部运维控制。

### 3.5 AppEntry/Chat 定向回归

覆盖：

- AppEntry AppKey、路由和安全回跳。
- authCode 签发、TTL、Redis 原子消费、重放/过期和 AppKey 绑定。
- App 权限和 AppEntry 请求作用域。
- 品牌资源、Head/Favicon 和错误脱敏。
- 登录鉴权失败分流。
- Chat 生成、恢复、中断、重复提交状态和停止。
- 文件入口关闭及上传模式隔离。
- 快捷回复、交互节点、历史记录数据处理。
- Axios/SSE AppEntry Header。
- 麦克风权限拒绝的业务提示。

结果：

```text
24 test files passed
227 tests passed
```

### 3.6 App workspace 全量测试

命令：

```bash
FASTGPT_TEST_SCOPE=app pnpm test
```

结果：**未达到全绿**。

```text
Test files: 325 passed, 2 skipped, 1 failed
Tests:      2530 passed, 18 skipped, 1 failed
```

唯一失败：

```text
projects/app/test/migration/runner.test.ts
leaves a stopped owner running until another node takes over the expired lease
原因：全量并发/高负载下超过 30000ms 测试超时
```

随后按仓库最小复验规则单独运行该文件：

```bash
pnpm test projects/app/test/migration/runner.test.ts
```

结果：

```text
1 test file passed
10 tests passed
目标用例约 2.1 秒完成
```

判断：该失败与 AppEntry 无直接依赖，隔离复验通过，暂列 **P2 测试稳定性问题**；但在调整超时或降低全量测试资源争用前，不能把全量 App 测试标记为完全通过。

### 3.7 ESLint 和 Diff

S1-08/AppEntry 最小修复文件执行 `eslint --quiet`：**PASS**。

S1-08/AppEntry 目标文件执行 `git diff --check`：**PASS**。

## 4. 部署与运行环境检查

### 4.1 基线环境

`baseline` 检查通过：

```text
Compose config：PASS
主 Compose 服务数：12
旧主应用 HTTP：首页 200
服务间 DNS/TCP：PASS
数据卷连接：PASS
```

当前主应用：

```text
image: registry.cn-hangzhou.aliyuncs.com/fastgpt/fastgpt:v4.16.2
image digest: sha256:6481c09126aa1bd0a35c6b1aa6222c4aaa5b2515a94dd95efa929c9bad587a44
health: not-configured
AppEntry env keys: none
```

当前旧容器访问结果：

```text
/app/customer-service       -> 404
/app/customer-service/login -> 404
/app/customer-service/chat  -> 404
```

这与 S1-07 记录一致：当前运行容器不能用于 AppEntry 业务验收。

### 4.2 发布配置静态预检

命令：

```bash
node .agents/design/app-h5-mvp/deployment/check-runtime.mjs \
  --mode release-config \
  --compose docker-compose.yml \
  --env .agents/design/app-h5-mvp/deployment/app-entry.env.example
```

结果：**PASS**。示例 AppEntry 字段、HTTPS/Secure Cookie 和 authCode Secret 格式满足检查脚本要求。

### 4.3 当前运行时门禁

命令：

```bash
node .agents/design/app-h5-mvp/deployment/check-runtime.mjs \
  --mode runtime \
  --compose docker-compose.yml \
  --container fastgpt-app \
  --url http://127.0.0.1:3000/
```

结果：**按预期 FAIL**：

```text
fastgpt-app health is not healthy
缺少 APP_ENTRY_ENABLED
缺少 APP_ENTRY_APP_KEY
缺少 APP_ENTRY_APP_ID
缺少 APP_ENTRY_AUTH_CODE_SECRET
缺少 APP_ENTRY_AUTH_CODE_TTL_SECONDS
缺少 AUTH_COOKIE_SECURE
```

### 4.4 本地生产包启动尝试

在不修改 Compose/YAML 的前提下，尝试以本地生产 standalone 包连接现有容器数据面。Next 服务能够启动，但宿主机无法解析/访问 Compose 内部 PostgreSQL、S3 等服务地址，系统初始化持续重连，页面请求无法完成。

结论：该尝试不能替代同网络的新镜像预发布部署，也不能据此判定 AppEntry 运行时通过。测试创建的临时 Mongo TCP 代理已停止，未修改数据卷、服务配置或生产容器。

## 5. 验收矩阵状态

状态定义：

- **PASS-AUTO**：自动化或生产构建已验证。
- **PASS-STATIC**：静态结构/代码路径已验证，仍需运行时复验。
- **BLOCKED**：缺少新运行环境、真机或外部业务系统。
- **NOT-RUN**：本轮无法安全执行。

### 5.1 路由、白标和错误

| 范围 | 状态 | 说明 |
| --- | --- | --- |
| R-002、UI-001～UI-012 | PASS-STATIC | 独立 Layout、业务 Head/Logo/Favicon、无效 AppKey 错误页和可见品牌扫描已覆盖。 |
| R-005 | PASS-AUTO | 路由/API 使用现有 basePath 工具与 AppEntry Header 适配，相关单测通过。 |
| BASIC-002、BASIC-006、BASIC-007 | PASS-AUTO | 白标、浏览器 Source Map 和外部入口扫描通过。 |
| R-001、R-003、R-004、BASIC-001 | BLOCKED | 当前运行镜像无 AppEntry；需新镜像预发布环境。 |

### 5.2 登录、认证和权限

| 范围 | 状态 | 说明 |
| --- | --- | --- |
| AUTH-006～AUTH-009 | PASS-AUTO | 安全 returnTo、重放、过期和 AppKey 绑定测试通过。 |
| PER-001、PER-003、PER-004、PER-009、PER-010 | PASS-AUTO/STATIC | AppKey 映射、App 权限、公开配置和禁用入口测试通过。 |
| AUTH-001～AUTH-005、AUTH-010～AUTH-011 | BLOCKED | 需要真实 Cookie、APP authCode 签发方和新运行环境。 |
| PER-002、PER-005、PER-008 | PASS-AUTO，需运行时复验 | 复用现有 Chat 鉴权和团队隔离测试通过；仍需真实双用户/双团队测试。 |
| PER-006、PER-007 | PASS-STATIC | AppEntry 不挂载管理入口；需浏览器网络与权限账号复验。 |

### 5.3 Chat 和能力开关

| 范围 | 状态 | 说明 |
| --- | --- | --- |
| CHAT-007～CHAT-009 | PASS-AUTO | 重复提交防护、恢复/中断和错误映射测试通过。 |
| CHAT-011、WV-013 | PASS-AUTO | 文件入口固定关闭，上传配置被强制收敛。 |
| WV-017、WV-018 | PASS-AUTO/STATIC | 反馈和注册入口固定关闭。 |
| CHAT-001～CHAT-006、CHAT-010、CHAT-013 | BLOCKED | 需要新镜像、真实 App、模型、历史和引用数据。 |
| CHAT-012、WV-014～WV-015 | PASS-STATIC，真机 BLOCKED | 语音入口和权限脱敏已实现；真实麦克风权限未验证。 |
| CHAT-014 | 不适用 | 一期固定关闭反馈。 |

### 5.4 WebView 和浏览器

| 范围 | 状态 | 说明 |
| --- | --- | --- |
| Chrome/Safari/Edge | BLOCKED | 没有部署包含 AppEntry 的可访问运行环境。 |
| WV-001～WV-012 | NOT-RUN | 缺少 iOS/Android 真机和可演示版本。 |
| 320px～430px | PASS-STATIC，真机 BLOCKED | 代码与既有测试验证无横向溢出约束；未生成真实运行页面截图。 |
| 弱网/断网/超时 | PASS-AUTO，真机 BLOCKED | 错误映射和流恢复单测通过；未执行 WebView 网络整形。 |

### 5.5 部署和回滚

| 范围 | 状态 | 说明 |
| --- | --- | --- |
| DEP-005～DEP-008 | PASS-BASELINE | 内部部署边界、DNS 和数据卷基线已记录。 |
| DEP-009 | BLOCKED | 主应用没有 healthcheck/readiness。 |
| DEP-012 | BLOCKED | 只有旧 digest 基线，没有新旧版本回滚演练。 |
| 备份恢复 | NOT-RUN / P0 | Mongo、PostgreSQL 和 MinIO 未完成恢复演练。 |

## 6. 阻塞问题

### P0

1. **R-31：明文 Secret 风险未关闭**。根目录未跟踪 Compose 文件仍包含敏感配置且缺少 ignore/Secret Manager 边界。正式发布前必须迁移并评估轮换。
2. **R-33：没有 AppEntry 新运行镜像**。当前容器所有 `/app/customer-service*` 路由返回 404。
3. **R-34：没有备份恢复演练**。无法证明发布或回滚后的数据可恢复。
4. **R-19/R-25/R-27：真机 P0 未验证**。软键盘、Cookie 容器、authCode 和麦克风授权均缺少 iOS/Android 证据。
5. **APP 身份桥接未完成生产联调**。业务 APP 服务端必须可信地把外部用户映射为 `tmbId`，并使用正式密钥签发一次性 code。
6. **新旧版本回滚未演练**。旧 digest 已记录，但没有新镜像、readiness 和流量切换证据。

### P1

1. `fastgpt-app` 没有 Docker healthcheck；正式发布平台必须提供 HTTP readiness。
2. 正式域名、Logo、favicon、主色、隐私政策和用户协议尚未注入验收环境。
3. 引用抽屉、长文本和历史长列表缺少真实手机截图。

## 7. 非阻塞问题

1. App 全量测试中的 Migration Runner 在高负载下出现一次 30 秒超时；隔离复验通过，建议后续优化测试资源隔离或超时策略。
2. Turbopack 构建报告一次 `styled-jsx/style.js` 解析警告，但生产构建成功；新镜像构建和启动时需要复查。
3. 生产构建保留服务端 Source Map；目前不在浏览器静态目录，按内部运维访问控制处理。
4. `index-v2.html` 已登记为后续 S2-05A 视觉修订输入，不影响当前 S1-08 技术发布结论。

## 8. 未执行测试及原因

- Chrome、Safari、Edge 的完整登录/Chat：新 AppEntry 运行环境不存在。
- iOS WKWebView 和 Android WebView：缺少真机及可访问的新镜像。
- 真实 authCode、Cookie 刷新和退出：缺少业务 APP 签发方和正式 HTTPS 域名。
- 多轮 Chat、历史、引用、模型流式响应：当前运行镜像没有 AppEntry。
- 麦克风允许、拒绝、二次授权和后台恢复：缺少真机权限环境。
- 3G、断网、超时、切后台和旋转屏幕：缺少 WebView 测试载体。
- 双用户/双团队越权：缺少预发布测试账号和运行环境。
- 备份恢复、新镜像启动、readiness、滚动升级和旧 digest 回滚：缺少新镜像与隔离预发布环境。

## 9. 业务方签字/确认

当前未取得业务方真机或书面发布确认。

```text
业务方验收人：待填写
验收日期：待填写
真机型号/系统：待填写
APP 版本：待填写
新镜像 digest：待填写
结论：待确认
```

## 10. 解除 NO-GO 的最小条件

- [ ] 处理 R-31 Secret 风险并完成必要凭证轮换。
- [ ] 构建、推送并记录 AppEntry 新镜像不可变 digest。
- [ ] 在隔离预发布环境注入正式 AppKey、App ID、品牌、HTTPS、Secure Cookie 和 authCode Secret。
- [ ] 配置并通过主应用 HTTP readiness/healthcheck。
- [ ] 完成业务 APP 用户映射和 authCode 全链路联调。
- [ ] 完成 Chrome/Safari/Edge 主流程。
- [ ] 完成 iOS WKWebView、Android WebView 登录、Chat、键盘、安全区、返回、语音和引用测试。
- [ ] 完成弱网、超时、断流、过期登录、无权限和无效 AppKey 故障注入。
- [ ] 完成 Mongo、向量 PostgreSQL、AI Proxy PostgreSQL、MinIO 备份恢复演练。
- [ ] 完成新镜像启动和旧 digest 回滚演练。
- [ ] 取得业务方书面确认。

满足以上条件后重新执行 S1-08；在此之前，发布结论保持 **NO-GO**。

# App H5 白标 MVP：验收矩阵基线

> 任务：S1-01
> 日期：2026-09-13
> 说明：本文件是后续 S1-08 和业务方验收的基线；S1-01 阶段只建立标准，不执行完整真机验收。

## 1. 路由和入口

| ID | 场景 | 预期 | 验证方式 | 阶段 |
|---|---|---|---|---|
| R-001 | 访问 `/app/[appKey]` | 进入业务方 H5 首页或登录页 | 浏览器/WebView | S1-02 |
| R-002 | 访问无效 AppKey | 显示业务方错误页，不显示内部堆栈 | 浏览器/API | S1-03 |
| R-003 | 访问 `/app/[appKey]/chat` | 进入指定 App 对话页 | 浏览器/WebView | S1-05 |
| R-004 | 刷新 `/app/[appKey]/chat` | 路由和登录态保持 | 浏览器/WebView | S1-04/05 |
| R-005 | 部署在非根 `basePath` | 页面、静态资源和 API 路径正确 | 配置 basePath 环境 | S1-02 |
| R-006 | 访问旧 `/chat` | 原行为不变 | 回归测试 | S1-08 |
| R-007 | 访问旧 `/login` | 原行为不变 | 回归测试 | S1-08 |
| R-008 | 访问旧 `/dashboard/agent` | 原行为不变 | 回归测试 | S1-08 |

## 2. Layout 和显性白标

| ID | 检查项 | 通过标准 |
|---|---|---|
| UI-001 | PC 平台左侧导航 | `/app/*` 不挂载 |
| UI-002 | H5 平台底部导航 | `/app/*` 不挂载 |
| UI-003 | SupportBot | `/app/*` 不加载 |
| UI-004 | 平台升级/账单/通知弹窗 | `/app/*` 不加载 |
| UI-005 | 页面 title | 使用业务方产品名称 |
| UI-006 | favicon | 使用业务方 favicon |
| UI-007 | Logo/头像/Banner | 不使用平台默认资产 |
| UI-008 | 首页/登录/Chat 文案 | 不出现业务方禁止的显性平台品牌 |
| UI-009 | 官网/GitHub/Marketplace | AppEntry 页面不出现平台入口 |
| UI-010 | 错误页 | 只显示业务方可理解的错误，不显示堆栈/内部服务名 |
| UI-011 | DOM 文本 | 生产构建页面 DOM 无显性平台品牌 |
| UI-012 | 静态资源 | AppEntry 使用业务方资源路径 |

## 3. 登录和认证

| ID | 场景 | 预期 |
|---|---|---|
| AUTH-001 | 无登录态访问首页 | 跳转 `/app/[appKey]/login` |
| AUTH-002 | APP authCode 换取登录态 | 写入现有 HttpOnly Cookie 并回到原始 AppEntry 页面 |
| AUTH-003 | 登录失败 | 只显示业务方错误文案，不显示内部错误 |
| AUTH-004 | 刷新页面 | HttpOnly Cookie 仍有效 |
| AUTH-005 | 退出登录 | Cookie 清除，受保护页面和 API 不可继续访问 |
| AUTH-006 | 恶意 returnTo | 被限制在同源 `/app/*` 白名单 |
| AUTH-007 | authCode 重放 | 第二次消费失败 |
| AUTH-008 | authCode 过期 | 返回统一登录错误 |
| AUTH-009 | authCode 绑定其他 AppKey | 验证失败 |
| AUTH-010 | 业务方 APP 已登录 | 通过一次性 authCode 桥接，WebView 不需要再次输入密码 |
| AUTH-011 | 同源 H5/API | 请求正常，authCode 换取的 HttpOnly Cookie 可用 |

## 4. 权限和数据隔离

| ID | 场景 | 预期 |
|---|---|---|
| PER-001 | AppKey 不存在 | 服务端拒绝，不查询或暴露任意 App 详情 |
| PER-002 | 用户未登录调用 H5 API | 返回未认证 |
| PER-003 | 用户无 App 权限 | 返回未授权 |
| PER-004 | 用户有 App 权限 | 只返回 H5 所需字段 |
| PER-005 | 读取他人 Chat | 被拒绝 |
| PER-006 | 修改 App 配置 API | H5 用户不可调用管理能力 |
| PER-007 | 读取团队/数据集/模型管理 | H5 用户不可获得管理数据 |
| PER-008 | chatId 属于其他团队 | 返回未授权 |
| PER-009 | App 被禁用/下线 | 入口进入统一不可用状态 |
| PER-010 | AppKey 与 App ID 映射变更 | 业务 URL 可保持不变或有明确迁移策略 |

## 5. Chat 核心流程

| ID | 场景 | 预期 |
|---|---|---|
| CHAT-001 | 首次进入 | 显示业务方欢迎语或空状态 |
| CHAT-002 | 发送消息 | 成功进入流式响应 |
| CHAT-003 | 多轮对话 | 上下文保持正确 |
| CHAT-004 | 新建会话 | 创建新 Chat，不覆盖旧记录 |
| CHAT-005 | 查看历史 | 只显示当前用户可见历史 |
| CHAT-006 | 切换历史 | 内容和标题正确恢复 |
| CHAT-007 | 重复点击发送 | 不产生重复请求或重复消息 |
| CHAT-008 | 流式中断 | 显示中断状态，可按方案重试 |
| CHAT-009 | 网络超时 | 显示业务方错误和重试入口 |
| CHAT-010 | 长文本 | 页面可滚动，输入区不被遮挡 |
| CHAT-011 | 文件上传 | 按配置开启；未开启时不显示入口 |
| CHAT-012 | 语音输入 | 按配置开启，并通过 WebView 麦克风授权 |
| CHAT-013 | 引用来源 | 按配置展示，手机端不溢出 |
| CHAT-014 | 反馈 | 按配置展示，提交失败有反馈 |

## 6. WebView 兼容性

| ID | 环境 | 检查 |
|---|---|---|
| WV-001 | iOS WKWebView | 页面首屏和登录 |
| WV-002 | iOS WKWebView | 键盘弹出时输入框可见 |
| WV-003 | iOS WKWebView | safe-area 顶部/底部正常 |
| WV-004 | iOS WKWebView | 返回按钮行为明确 |
| WV-005 | Android WebView | 页面首屏和登录 |
| WV-006 | Android WebView | 输入法弹出时输入框可见 |
| WV-007 | Android WebView | 文件选择器按权限工作 |
| WV-008 | Android WebView | 返回键不误退出登录 |
| WV-009 | iOS/Android | 弱网和断网提示清晰 |
| WV-010 | iOS/Android | 旋转屏幕无布局破坏 |
| WV-011 | iOS/Android | 320px～430px 无横向滚动 |
| WV-012 | iOS/Android | 页面切后台再回来状态正确 |

## 7. 部署和运行资源

如果业务方可以查看部署控制台，则以下全部为必测：

| ID | 检查项 | 预期 |
|---|---|---|
| DEP-001 | 镜像仓库 | 使用业务方私有仓库路径 |
| DEP-002 | 镜像标签 | 版本可追溯、可回滚 |
| DEP-003 | Compose/Kubernetes Service | 使用业务方命名 |
| DEP-004 | Container/Pod | 使用业务方命名 |
| DEP-005 | 内部部署 | 业务方不交付 Docker；如内部使用容器，由内部运维负责，不纳入业务方 H5 验收 |
| DEP-006 | Volume/PVC | 不误删、不误建、数据可恢复 |
| DEP-007 | 服务间 URL | 所有 DNS 和端口可用 |
| DEP-008 | NO_PROXY | 包含新的内部服务名 |
| DEP-009 | Healthcheck | 全部通过 |
| DEP-010 | 日志和监控 | 标签不出现不希望暴露的显性名称 |
| DEP-011 | OCI labels | 按业务方要求处理 |
| DEP-012 | 回滚 | 可恢复旧镜像和旧服务配置 |

## 8. 生产构建和显性标识扫描

源码和构建产物均要扫描：

```bash
rg -n -i "fastgpt|fast-gpt|fast_gpt" \
  projects/app/src \
  projects/app/public \
  packages/web/i18n

rg -n -i "fastgpt|fast-gpt|fast_gpt" \
  projects/app/.next \
  projects/app/public
```

允许保留但必须受控的内容：

- 内部包名和内部导入路径。
- 内部数据库/Redis/Bucket 兼容值。
- 历史 API 和测试协议样例。
- 不面向业务方的部署迁移兼容配置。

不允许出现在 AppEntry 对外页面的内容：

- 页面 DOM 文案。
- 页面 title/meta。
- Logo/favicon/Banner。
- 错误响应和用户可见 Toast。
- 业务方页面中的官网、GitHub、Marketplace 和升级入口。

## 9. 业务方确认后的固定功能基线（2026-09-13）

```text
历史会话：开启
文件上传：关闭
语音输入：开启
引用来源：开启
消息反馈：关闭
用户注册：关闭
```

## 10. 业务可用性和终端显性白标验收

业务方不检查 Network、Cookie、Header 或 JS Bundle，因此这些内容不作为业务方阻塞项；工程侧仍需保证请求和登录流程可用。

| ID | 检查项 | 预期 |
|---|---|---|
| BASIC-001 | 页面可用性 | H5 可打开、加载并进入首页/对话 |
| BASIC-002 | 页面显性品牌 | 页面 title、DOM、Logo、favicon 和用户可见文案符合业务方要求 |
| BASIC-003 | API 可用性 | H5 API 请求成功，错误不暴露内部堆栈 |
| BASIC-004 | Cookie | authCode 成功换取 HttpOnly Cookie，刷新后仍保持登录 |
| BASIC-005 | Header/Bundle | 不纳入业务方验收；仅在内部排查问题时检查 |
| BASIC-006 | Source Map | 按现有生产安全策略处理，不作为一期业务阻塞项 |
| BASIC-007 | 外部链接 | AppEntry 页面不出现不需要的官网、社区、升级和管理入口 |

## 11. WebView 能力固定基线

| ID | 功能 | 预期 |
|---|---|---|
| WV-013 | 文件上传 | 页面不展示文件选择入口，相关 API 不被调用 |
| WV-014 | 语音输入 | 页面展示语音入口，HTTPS 和麦克风权限满足后可录音 |
| WV-015 | 麦克风拒绝 | 有明确业务方提示，不显示内部错误 |
| WV-016 | 引用来源 | 页面展示引用入口，移动端可展开、关闭和滚动 |
| WV-017 | 消息反馈 | 页面不展示点赞/点踩入口，接口不被调用 |
| WV-018 | 注册 | 页面不展示注册入口 |
| WV-019 | 历史会话 | 展示当前用户可见历史，不能读取其他用户数据 |

## 12. 部署交付边界

业务方不支持/不交付 Docker 部署，因此一期不把 Docker/Kubernetes 控制台作为业务方交付或验收界面：

- [x] 不向业务方交付 Docker Compose。
- [x] 不要求业务方管理容器、网络、Volume 或 Helm。
- [x] 内部部署方式由运维自行维护。
- [x] 如内部仍要求服务名/镜像名白标，必须单独建立部署变更和回滚任务。

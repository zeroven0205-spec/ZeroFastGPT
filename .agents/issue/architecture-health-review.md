# FastGPT 整体架构体检评审

- 评审日期：2026-09-15
- 评审范围：`/Users/sinan/Documents/github/FastGPT` 当前工作区代码、已有设计文档、测试/发布记录
- 评审方式：静态架构审查 + 依赖/规模统计 + 关键链路追踪
- 当前分支：`feat/app-h5-white-label-mvp`
- 结论性质：架构体检，不替代生产压测、故障演练和安全审计
- 本次未修改业务代码，也未修改任何部署 `.yml` / `.yaml` 文件

## 1. 一句话结论

FastGPT 当前不是“架构错误”，而是一个**能力很强但边界尚未完全兑现的模块化单体 + 外部能力服务**。这个方向符合 AI Agent 平台的现实需求；真正的问题不是要不要立刻微服务化，而是：

1. 可选能力大量进入主进程启动和请求链，形成了隐性的分布式单体。
2. `global`、`service`、API route、前端状态之间的物理边界弱于设计文档中的逻辑边界。
3. 流式对话、工作流、计费、历史、恢复、权限、模型和多数据源共同挤在一条长链路上，故障定位成本高。
4. 同时支持过多 Provider，但没有把“默认发行版”和“兼容发行版”的复杂度充分分层。
5. 配置、构建期、启动期和请求期的依赖没有完全分离，导致环境问题表现成运行时 500 或构建失败。

**建议保留模块化单体，不做大规模重写；优先把可选能力、状态机、契约和运行时生命周期隔离出来。**

## 2. 评审原则：从第一性原理判断技术必要性

任何技术只有在明确购买了以下至少一种属性时才值得保留：

| 属性 | 判断问题 |
| --- | --- |
| 业务杠杆 | 没有它，核心产品能力是否无法成立？ |
| 性能 | 它解决的是实测瓶颈，还是理论上的未来瓶颈？ |
| 隔离 | 它是否把故障、资源、权限或安全边界隔离开？ |
| 可靠性 | 它是否提供了重试、持久化、幂等、恢复等明确语义？ |
| 可演进性 | 它是否降低 Provider、协议或领域变化的迁移成本？ |
| 运维成本 | 它引入了多少连接、部署、监控、备份和升级负担？ |
| 可替代性 | 是否存在成本明显更低且满足当前规模的方案？ |

本次特别避免以下常见误区：

- 不因为“互联网大厂都这么做”就引入微服务、Kafka、Kubernetes 或事件溯源。
- 不因为当前支持多个 Provider，就把所有 Provider 都作为主发行版的启动依赖。
- 不因为工作流复杂，就把所有权限、计费、HTTP、SSE、数据库写入都塞进 Runtime。
- 不因为状态管理复杂，就把所有状态搬进一个全局 Store。

## 3. 当前架构事实地图

```text
浏览器 / H5 / 管理端 / OpenAPI Client
                │
                ▼
Next.js 16 + Pages Router
projects/app/src/pages/api/ 约 315 个 API route
                │
                ▼
NextAPI / createApiEntry
CORS · CSRF · requestId · logger · tracing · Zod/OpenAPI
                │
                ▼
应用编排层
AppEntry · Chat · Dataset · Workflow · Permission · Wallet · Plugin
                │
                ▼
@fastgpt/service（后端总包）
                │
        ┌───────┼────────┬──────────┬─────────┐
        ▼       ▼        ▼          ▼         ▼
      Mongo   Redis   Vector DB   Object     AI/Sandbox/
      主库    Cache/   PG/Milvus  Storage    Plugin 外部能力
              Queue/   等多 Provider S3/MinIO
              Stream
```

### 3.1 规模事实

| 区域 | 生产代码规模（不含测试） | 直接依赖 |
| --- | ---: | ---: |
| `projects/app/src` | 1,365 个 TS/TSX，约 217,509 行 | 84 |
| `packages/service` | 766 个 TS，约 103,945 行 | 62 |
| `packages/global` | 548 个 TS，约 56,542 行 | 20 |
| `packages/web` | 218 个 TS/TSX，约 26,814 行 | 44 |
| `packages/dal` | 56 个 TS，约 5,996 行 | 4 |
| `sdk` | 97 个 TS，约 13,357 行 | 多个 SDK 包 |

当前主要运行时/外部能力包括：MongoDB、独立日志 Mongo 连接、Redis、BullMQ、PostgreSQL/pgvector、Milvus、OceanBase、SeekDB、openGauss、S3/MinIO/OSS/COS/R2、AI Proxy、插件服务、代码沙箱、Agent Sandbox、Volume Manager、MCP Server、Worker Threads、OpenTelemetry。

开发 Compose 模板定义了约 14 个 service；其中部分只是预拉取镜像或可选能力，因此这不是“每次都必须运行 14 个服务”的结论，但它准确反映了当前产品的潜在运维面。

### 3.2 当前分层的优点

1. `NextAPI` / `createApiEntry` 已经把 CORS、CSRF、requestId、错误、日志和 tracing 统一起来。
2. Zod + OpenAPI 方向正确，API 边界已经有统一校验意识。
3. `@fastgpt/dal` 已开始把 Redis、Cache、BullMQ 的持久化语义从业务代码中抽离。
4. 对象存储、Sandbox Adapter、OTel 都已经有独立 SDK 化趋势。
5. 工作流 Runtime 已经具备循环、并行、交互、恢复和状态管理能力，属于真实产品核心，不是无意义的复杂度。
6. Mongo 事务、迁移 Runner、Redis Runtime、S3 multipart 等关键基础能力有较完整的测试和设计文档。

## 4. 总体诊断

### 4.1 架构定位

当前最准确的描述是：

> **以 Next.js 为入口的模块化单体，连接多个可选的基础设施和能力服务；其中部分能力已经服务化，但启动、配置和请求链仍然由主应用统一编排。**

这个定位对于当前产品比“微服务平台”更诚实。模块化单体的优点是事务、调用链和发布节奏简单；缺点是包边界、进程边界和故障边界必须主动设计，否则最终会变成“代码拆成很多目录，但运行时仍然互相牵连”。

### 4.2 判断

- **业务适配性：较好。** 工作流、RAG、Agent、权限、计费、插件和多租户需要共享大量领域上下文，过早微服务化反而会增加分布式一致性成本。
- **领域隔离：中等偏弱。** 目录有 `core/support/common` 的逻辑分层，但相对 import 粗略统计显示 `core -> support` 约 65 条、`support -> core` 约 37 条，`common` 也反向依赖 `core/support`。
- **运行隔离：偏弱。** 主应用启动时统一初始化很多可选组件；一个非核心依赖的故障可能影响整个节点就绪。
- **流式可靠性：设计能力强，链路风险高。** SSE、Redis resume、交互恢复、ChatBox 状态和数据库收尾都存在，但协议层数和状态交叉较多。
- **Provider 演进：能力强，默认复杂度高。** 兼容性价值真实存在，但不能让所有兼容能力成为默认部署成本。
- **可观测性：方向正确，标准需要收敛。** OTel/LogTape 已成为主实现，但历史日志依赖和直接 `console` 使用仍然存在。

## 5. P0/P1/P2 问题清单

### 5.1 P0：本次静态审查暂未判定 P0

没有仅凭代码就能负责任地判定为“必然造成数据灾难或安全失陷”的 P0 问题。以下 P1 项如果已经在生产造成高错误率、数据丢失或无法恢复，应按线上影响升级为 P0，并结合指标和故障记录确认。

### 5.2 P1-01：启动生命周期把核心可用性和可选能力绑在一起

**证据：** `/Users/sinan/Documents/github/FastGPT/projects/app/src/instrumentation-node.ts`

启动流程在同一个 instrumentation 中依次/并行处理：

- Redis Runtime 和 shutdown hook
- 主 Mongo 与日志 Mongo
- S3 bucket
- Vector Store
- 系统模型加载
- Agent Sandbox 配置校验
- Mongo watch
- BullMQ workers
- cron
- training queue
- migration runner
- worker preload
- runtime metrics/tracing/logger

初始化失败最终会记录错误并 `exit(1)`。这对“数据结构未升级不得接流量”是合理的，但对插件、AI Proxy、Agent Sandbox、日志上报、某一类向量 Provider 等可选能力而言，故障边界过大。

**第一性原理判断：**

- Mongo 主库、核心模型配置、默认向量索引是核心可用性依赖。
- Agent Sandbox、Plugin、AI Proxy、OTel exporter、某些定时清理任务不是所有部署档位的核心依赖。
- “能力未启用”与“能力启用但不可用”必须是两个状态，不能都表现为主进程启动失败。

**建议：**

1. 建立 `CapabilityRegistry` 或等价的能力状态表：`disabled / initializing / ready / degraded / failed`。
2. 区分 `core readiness` 与 `capability readiness`；聊天核心不应等待 Agent Sandbox ready。
3. 非核心连接采用 lazy init 或按请求首次使用时初始化，并设置明确超时。
4. 将 BullMQ、cron、training queue、Mongo watch 逐步移到独立 worker/runner 进程；短期至少统一由一个 owner 启动。
5. 启动失败策略按能力分类：核心能力 fail-fast，可选能力 degraded + 告警。

**轻量替代：** 不需要立即引入服务编排平台。先在现有模块化单体里做能力注册和懒加载，就能显著降低启动耦合。

### 5.3 P1-02：`global` 和 `service` 的边界与命名不再匹配

**证据：**

- `/Users/sinan/Documents/github/FastGPT/packages/global/package.json`
- `/Users/sinan/Documents/github/FastGPT/packages/global/core/ai/index.ts`
- `/Users/sinan/Documents/github/FastGPT/packages/global/core/ai/llm/type.ts`
- `/Users/sinan/Documents/github/FastGPT/packages/global/openapi/provider/systemopenapi.ts`
- `/Users/sinan/Documents/github/FastGPT/packages/service/package.json`

`@fastgpt/global` 已包含 OpenAI SDK、`zod-openapi`、axios、cron-parser、js-yaml、文件编码探测、插件 SDK、Sandbox Adapter 等运行时依赖，并在 LLM 类型文件中重新导出 OpenAI 类型。这已经不是单纯的“共享类型、常量、纯函数”包。

`@fastgpt/service` 生产代码约 10 万行，同时承担 AI、Workflow、Chat、Dataset、Mongo、S3、Vector DB、Permission、Wallet、Plugin、Sandbox、Worker 等职责，实际是后端总包。

此外，`@fastgpt/global` 与 `@fastgpt/service` 都没有像 SDK/DAL 那样用 `exports` 明确限制公共入口，调用方可以深度 import 任意内部文件。

**风险：**

- 前端共享包容易被服务端运行时依赖污染。
- 模型、OpenAPI、Provider、文件处理等变化会扩大构建和升级影响面。
- 目录看起来是 DDD，但物理依赖仍允许跨域双向引用。
- 包的名称和实际职责不一致，导致新代码继续把东西放入“大包”。

**建议：**

短期不要把 1,000 多个文件拆成几十个微服务，先做边界收敛：

```text
@fastgpt/global-contract   前后端共享类型、枚举、请求/响应 schema
@fastgpt/global-utils      无副作用纯函数
@fastgpt/service           服务端应用与领域能力
@fastgpt/dal               数据访问、队列、缓存、连接生命周期
@sdk/*                     可独立发布的外部能力适配器
```

其中 `global-contract` 可以先通过目录/exports 逻辑实现，不必立即移动全部文件。OpenAI 类型应由独立 `ai-contract` 或 service-only 类型模块提供；OpenAPI 文档生成运行时不应成为前端共享包的默认依赖。

### 5.4 P1-03：API route 仍然承担过多应用编排和数据访问职责

**统计：** 约 315 个 API route 中，粗略匹配到 124 个 route 直接 import `@fastgpt/service/.../schema` 或 `common/mongo`；另有约 11 个 route 直接引用 Mongoose/PG/ioredis/BullMQ 等底层驱动。

**证据示例：**

- `/Users/sinan/Documents/github/FastGPT/projects/app/src/pages/api/core/app/create.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/pages/api/core/dataset/data/insertData.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/pages/api/core/chat/record/getPaginationRecords.ts`
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/pages/api/v2/chat/completions.ts`

API route 直接访问 Schema 并不一定错误，简单查询可以接受；问题在于数量和职责已经达到“API 层知道太多数据模型”的程度。这样会使鉴权、事务、计费、事件和错误映射在 route 中不断复制。

**建议：**

- 新增/高频修改 API 使用 application service/use case 入口。
- route 只做：解析输入、认证上下文、调用 use case、映射 HTTP/SSE 响应。
- Repository/Schema 只负责数据访问，不让 route 直接组合多个存储。
- 对 Chat、Dataset、Model、Permission 先做四个高价值边界，不要求一次性迁移全部 API。
- 增加依赖规则检查：`pages/api -> application -> domain/ports -> adapter`，禁止新 route 直接 import driver。

**轻量替代：** 不是引入完整 DDD 框架，而是先为关键链路抽出少量稳定用例函数，逐步减少 route 的编排代码。

### 5.5 P1-04：v1/v2 Chat completion 高度重复，协议故障面被复制

**统计：**

- `/Users/sinan/Documents/github/FastGPT/projects/app/src/pages/api/v1/chat/completions.ts`：650 行
- `/Users/sinan/Documents/github/FastGPT/projects/app/src/pages/api/v2/chat/completions.ts`：650 行
- 两者按行序列相似度约 92.3%，约 600 行可匹配

两条 route 都包含认证、频率限制、历史读取、模型/Workflow 准备、SSE 初始化、Workflow dispatch、Chat 持久化、计费/用量、错误收尾等完整流程。

**风险：**

- 一边修复 stream/resume/error，另一边容易遗漏。
- API 版本差异和业务流程差异混在同一个函数里。
- 当前用户反馈的流式失败，可能来自模型配置、SSE、Redis resume、Workflow、数据库收尾中的任意一层，排查成本高。

**建议目标：**

```text
v1/v2 route adapter
        │
        ▼
runChatCompletion(application use case)
        │
        ├── Chat round lifecycle
        ├── Workflow runtime
        ├── ModelGateway
        ├── StreamResponse / ResumeStore
        ├── Billing/Usage port
        └── Chat repository
```

版本差异只保留在输入兼容、输出格式和能力开关，不复制核心流程。先抽出“准备轮次、执行、持久化、错误收尾”四段即可，不需要重写 SSE。

**协议建议：** 明确唯一的流状态机：

```text
created -> running -> interactive -> running -> completed
                    ├-> stopped
                    ├-> failed
                    └-> resumable -> completed/failed
```

每个状态转换需要 requestId/chatId/responseId/idempotency 语义和一条可检索日志。

### 5.6 P1-05：流式、历史和恢复存在多处状态权威

当前一次对话同时涉及：

- Mongo `Chat` / `ChatItem` 持久化
- Redis Stream resume mirror
- Redis stop signal / generating 状态修正
- Workflow runtime 内存状态
- 前端 `ChatContext`
- 前端 `ChatRecordContext`
- ChatBox 内部生成队列、resume controller、滚动和 UI 状态
- AppEntry Workbench 自己维护的 `history` state

`/Users/sinan/Documents/github/FastGPT/projects/app/src/pageComponents/appEntry/AppEntryWorkbench.tsx` 直接维护历史列表并调用 `loadAppEntryHistories`；普通 Chat 又通过 `ChatContext`、`ChatRecordContext` 管理历史和记录。最近出现的“刚才有两轮对话但历史列表为空”正是这类跨状态边界问题的典型表现，不能只当成一个列表组件 bug。

**建议：**

1. Mongo 是 Chat/ChatItem 的 canonical source；Redis Stream 只承担短期恢复和实时传输，不承担最终历史真相。
2. 用统一的 `ChatHistoryQuery` 和 `ChatRoundLifecycle` 作为各页面的应用边界。
3. 生成完成、异常、停止、恢复都必须有幂等收尾；页面只订阅结果，不自行推断状态。
4. 新增一条完整链路测试：发送两轮 -> 流式完成 -> 刷新 -> 查询历史 -> 点击历史恢复 -> 再发送。
5. 为 Redis resume 建立 TTL、丢失、重复事件、已完成后恢复和 Mongo 未落库等可观测指标。

**轻量替代：** 不需要上 Kafka 或 Event Sourcing。Mongo canonical + Redis 短期 stream + BullMQ/Mongo reconciliation 已足够支撑当前产品。

### 5.7 P1-06：模型/能力未配置被错误地表现为 500

**证据：**

- `/Users/sinan/Documents/github/FastGPT/projects/app/src/pages/api/v1/audio/transcriptions.ts:56-80`
- `/Users/sinan/Documents/github/FastGPT/packages/service/core/ai/audio/transcriptions.ts:19-21`

语音转写 route 直接调用 `getDefaultModelData('stt')`。当 STT 默认模型不存在时，模型 Handle 抛出未配置错误；`aiTranscriptions` 对空模型也抛出 `no model`，route 又把除限流外的异常统一包成 HTTP 500。

这不是单纯的错误文案问题，而是能力契约没有分层：

```text
请求不合法       -> 400
模型未配置       -> 4xx/业务可理解错误或 503 capability unavailable
Provider 暂时失败 -> 502/503 + 可重试语义
程序 bug          -> 500
```

**建议：**

- 启动/管理员配置变更时做 STT/TTS/Embedding/LLM capability preflight。
- 默认模型 getter 的“未配置、停用、不存在、Provider 不可达”使用稳定错误码。
- API 层不要把所有 `UserError`/配置错误归为 500。
- AppEntry/移动端只展示脱敏后的 capability unavailable，不暴露 URL、路径、堆栈或 Token。

### 5.8 P1-07：构建期、启动期、请求期配置混杂

**证据：**

- `/Users/sinan/Documents/github/FastGPT/packages/service/env.ts:29-30`
- `/Users/sinan/Documents/github/FastGPT/packages/service/env.ts:458`
- `/Users/sinan/Documents/github/FastGPT/projects/app/Dockerfile:44-49`
- `/Users/sinan/Documents/github/FastGPT/sdk/storage/src/access-link/service.ts`

`serviceEnv` 使用 `skipValidation: isPhaseProductionBuild`，但构建时仍可能因为导入服务端模块而触发 Storage access-link、文件 Token、S3 等运行时依赖。已有构建记录显示缺少 `STORAGE_DOWNLOAD_URL_MODE`、`FILE_TOKEN_KEY` 等值会使 Next build 或静态数据收集失败。

同时，一个 `serviceEnv` 里有约 164 个变量，包含密钥、外部服务地址、Provider 配置、功能开关、限流、资源上限、日志、指标和第三方数据源。

**建议：** 分成三个概念而不是继续扩大一个 Env 对象：

```text
buildEnv       只允许影响编译和静态资源
runtimeEnv     连接、密钥、端口、进程生命周期
requestConfig  租户/应用/模型/请求级配置
```

具体实现可以仍使用 Zod 和 `@t3-oss/env-core`，但要避免在模块顶层创建必须立即连外部服务的 singleton；使用 lazy factory 和显式 `init()`。

### 5.9 P1-08：Provider 数量和选择规则增加了默认发行版的隐性复杂度

当前 Vector DB 支持 `seekdb`、`oceanbase`、`pg`、`milvus`、`opengauss` 等多个 Provider；对象存储支持 MinIO、AWS S3、R2、COS、OSS；Sandbox 也有多种 Provider。

**证据：** `/Users/sinan/Documents/github/FastGPT/packages/service/common/vectorDB/constants.ts:93-110`

当前 `getVectorType()` 通过“哪个地址变量非空”按固定优先级选择 Provider：`seekdb -> oceanbase -> pg -> milvus -> opengauss`。这意味着误配置多个地址时不是报错，而是静默选择优先级更高的 Provider。

**建议：**

- 增加显式 `VECTOR_PROVIDER=pg|milvus|...`，禁止通过“第一个非空 URL”推断。
- 只校验被选 Provider 的配置；其他 Provider 配置不要阻塞启动。
- 为 `VectorStore` 定义 capability contract：向量检索、全文检索、批量删除、时间扫描、索引初始化、迁移能力。
- 默认发行版只承诺一个主 Provider，其他 Provider 作为可选 adapter/兼容包。
- 通过 Provider contract tests 验证语义，不让每个 Provider 侵入 Dataset 业务代码。

## 6. P2 问题和技术债

### 6.1 Redis 职责过多，必须按语义而不是按连接抽象

当前 Redis 同时承担 Session、Cache、BullMQ、限流、分布式 Lease/Lock、Stream Resume、AppEntry auth code、实时状态等职责。生产源码中约 59 个文件直接使用 Redis/DAL Redis 能力。

`@fastgpt/dal` 已经开始按 role 区分 command/blocking/queue/worker，这是正确方向；下一步应继续按业务语义区分：

| Redis 语义 | 是否可降级 |
| --- | --- |
| Session/auth code | 多实例下不可随意降级到进程内 |
| Stream resume | 可在 Lite 档关闭，但必须明确不能恢复 |
| BullMQ | 长任务不可降级为 fire-and-forget |
| Cache | 多数可以 miss 后回源 |
| Rate limit/lease | 需要定义单机和多实例一致性差异 |
| Stop signal | 需要短 TTL，可视为 ephemeral |

不要为了“只有一个 Redis 连接”而把所有用途混在同一个 maxmemory/eviction 策略里。云环境至少按 cache、queue/session、stream 的容量和告警维度隔离；单机先用命名空间和指标隔离即可。

### 6.2 BullMQ、node-cron、Worker Threads、Process Pool 并存，但任务语义需要统一

当前同时存在：

- BullMQ durable jobs
- `node-cron` 定时任务
- Mongo TTL/唯一键 timer lock
- Node Worker Threads
- 自定义 `WorkerPool`
- Code Sandbox 子进程池

这些技术本身都合理，但必须清楚回答：

```text
在线请求？进程内异步？可重试持久任务？CPU 隔离？不可信代码？
```

建议固定四类：

1. Online request：有请求生命周期和取消语义。
2. Local async：允许丢失，仅用于非关键旁路动作。
3. Durable job：有 jobId、状态、重试、幂等和告警，统一走 BullMQ 或 Mongo Job。
4. Isolated execution：不可信代码或高 CPU/内存任务，必须独立进程/容器。

对于单节点轻量部署，可保留一个 scheduler 和一个 worker runner；不需要把每一个异步函数都转成队列。

### 6.3 日志/可观测性应收敛到一个标准

当前运行时代码主路径已经通过 `@fastgpt-sdk/otel` 使用 LogTape、OTel logs/metrics/tracing；但 `@fastgpt/service/package.json` 仍声明 `pino`、`winston`、`pino-opentelemetry-transport`，在非测试生产源码中未发现对应 import，另有不少直接 `console` 使用。

建议：

- Pino/Winston 先确认无动态加载后删除死依赖。
- LogTape 作为日志 API，OTel 作为输出/传输协议，不让业务直接依赖多个 Logger。
- 所有请求、LLM 调用、Workflow run、Stream、Resume、Queue Job 统一包含 `requestId/traceId/teamId/appId/chatId/jobId` 中适用字段。
- 建立最小 SLO 指标：API P95/P99、首 token 延迟、流中断率、resume 成功率、Workflow 节点耗时、队列积压、Mongo/Vector/S3/Redis 失败率。

### 6.4 `reactStrictMode: false` 是技术债信号，不应永久化

`/Users/sinan/Documents/github/FastGPT/projects/app/next.config.ts:55` 明确关闭了 React Strict Mode，原因是存在 double-render unsafe code。对于 ChatBox、SSE、Worker、Store hydration、文件上传、AppEntry auth 等副作用密集代码，这会隐藏生命周期问题。

建议将其作为专项技术债：

1. 先为网络请求、事件订阅、Worker 和 timer 增加重复初始化测试。
2. 对 Chat/Upload/AppEntry 逐模块恢复 Strict Mode。
3. 禁止新代码依赖“只挂载一次”的未声明副作用。

不建议为了开启 Strict Mode 而一次性重写所有前端状态。

### 6.5 AppEntry 历史状态不应再发展成第二套 Chat 状态系统

`AppEntryWorkbench` 的工作台历史是独立的 `useState` + 直接 API 调用；共享 Chat 又有 `ChatContext` 与 `ChatRecordContext`。MVP 阶段这样做可以快速交付，但如果继续加入分页、未读、标题实时更新、删除同步、断线恢复，就会形成两套历史缓存。

建议：

- AppEntry 只保留展示适配和 feature flag。
- 历史数据由统一 query/cache 层提供。
- 新建、完成、改标题、删除后用统一 mutation 更新所有视图。
- 历史页面必须有真实“生成后刷新/切换/恢复”的端到端回归，而不能只测 `mapAppEntryHistoryItem`。

## 7. 技术必要性和轻量替代方案矩阵

| 技术/组件 | 当前是否必要 | 购买的核心属性 | 建议 | 更轻量替代或降级 |
| --- | --- | --- | --- | --- |
| TypeScript + pnpm workspace | 是 | 类型安全、共享代码、发布协作 | 保留 | 不建议退回多仓库或 JS |
| Next.js Pages Router | 当前是 | 页面、API、SSR、现有生态 | 短期保留 | 不要为追逐 App Router 迁移；仅在实测边界出现时迁移 |
| MongoDB | 是 | 文档模型、权限/聊天/配置、事务和现有数据资产 | 保留为 canonical store | 不做当前阶段 Mongo→PG 重写 |
| 独立日志 Mongo | 条件必要 | 隔离日志写入压力 | 由容量/SLO 决定 | 小规模可同 Mongo 集群不同 collection/TTL |
| PostgreSQL + pgvector | 是（至少一个向量后端） | 向量索引、SQL 生态、可自托管 | 作为默认 Provider | 单机只保留 pgvector；其他后端 adapter 化 |
| Milvus/OceanBase/SeekDB/openGauss | 条件必要 | 兼容客户环境或特定检索能力 | 不进入默认热路径 | 插件/驱动包 + capability contract |
| Redis | 多实例/恢复场景必要 | Stream、队列、分布式协调、限流 | 保留，但按部署档位启用 | Lite 可关闭 resume/队列，改用 Mongo lease + 进程内任务；需明确可靠性下降 |
| BullMQ | 长任务必要 | durable job、重试、并发、可观测 | 只承载真正的 durable job | 小规模可使用 Mongo Job collection + lease；不要 fire-and-forget |
| node-cron | 简单调度仍有价值 | 少量周期任务 | 只允许一个 scheduler owner | 云环境可由独立 runner/平台 Cron 触发，避免每个 Web replica 都调度 |
| Worker Threads/WorkerPool | CPU/文件解析必要 | 避免阻塞 Node 主线程 | 保留并按 CPU/内存限额 | I/O 任务不要 worker 化；轻量任务直接异步执行 |
| Code Sandbox | 是（执行不可信代码时） | 安全隔离、资源限制、进程树管理 | 保持独立服务，不降级为 `vm` | 仅受信任内部代码才可进程内运行 |
| Agent Sandbox/OpenSandbox | 条件必要 | Agent 文件/终端/浏览器工作区 | 可选能力、插件化 | 基础聊天发行版不启动；按 capability lazy init |
| S3/对象存储抽象 | 生产是 | 多实例文件持久化、外部访问、备份 | 保留接口，默认 S3-compatible | 开发/单机可提供 local filesystem adapter，但明确不支持 HA |
| MinIO | 仅自托管/开发必要 | 本地 S3-compatible 实现 | 不当作所有部署的必选 | 云上直接 AWS S3/R2/OSS/COS |
| AI Proxy | 条件必要 | 多渠道路由、计费、限流、池化 | 作为 `ModelGateway` adapter | 单机/单渠道直接 Provider；不要让业务代码感知两套调用语义 |
| OpenTelemetry | 复杂系统中必要 | 跨 API/Workflow/Queue/外部服务追踪 | 保留并收敛日志标准 | 极简部署可只开 Console + 指标，API 保持不变 |
| Zod + OpenAPI | 是 | 契约、校验、文档和兼容治理 | 保留 | 不建议为了类型推导引入另一套 RPC 协议 |
| React Context/Zustand | 是，但要限界 | 前端状态和局部共享 | 保留，按领域拆分 | 不引入“一个全局 Store 管全部状态” |

## 8. 推荐目标架构

### 8.1 目标不是更多包，而是明确 Ports/Adapters

```text
API / H5 / OpenAPI
        │
        ▼
Application Use Cases
  ├── ChatRun
  ├── DatasetIngestion
  ├── ModelManagement
  ├── Identity/Permission
  └── AppEntry
        │
        ▼
Domain Runtime
  ├── Workflow Scheduler
  ├── Agent Loop
  ├── Chat Round Lifecycle
  └── Dataset Pipeline
        │
        ▼
Ports
  ├── ModelGateway       complete/embed/rerank/transcribe/tts
  ├── VectorStore        search/insert/delete/health/capabilities
  ├── ObjectStore        upload/download/presign/delete
  ├── JobBus             enqueue/consume/retry/lease
  ├── StreamStore        append/read/expire/resume
  ├── Sandbox            execute/files/terminal/lifecycle
  └── Telemetry          log/metric/trace
        │
        ▼
Adapters
  ├── Direct AI / AI Proxy
  ├── pgvector / Milvus / other vector DB
  ├── S3 / MinIO / OSS / COS / R2
  ├── Redis/BullMQ / Mongo Job
  └── Code Sandbox / OpenSandbox / Sealos
```

### 8.2 数据所有权建议

| 数据 | canonical source | 可缓存/派生位置 | 规则 |
| --- | --- | --- | --- |
| User/Team/App/Chat/ChatItem | Mongo | Redis cache | Redis 丢失不影响最终业务真相 |
| Vector index | Vector DB | Mongo index metadata | 必须有 rebuild/reconcile，不把向量库当唯一业务状态 |
| File bytes | Object Storage | Mongo upload/session metadata | URL/token 是派生凭证，不能代替文件权限 |
| Active stream | Redis Stream | 前端内存 | TTL、丢失和恢复失败要有明确状态 |
| Durable job | BullMQ 或 Mongo Job | 无 | jobId、重试、幂等、dead-letter/失败记录必须可查 |
| Usage/Billing | Mongo/指定账务源 | Redis 聚合缓存 | 计费写入不能依赖流是否完整到达浏览器 |

### 8.3 三档部署策略

#### Lite：单机/演示/小团队

目标是最低运维成本，不承诺无限扩展：

- 一个 App 进程
- Mongo
- 一个向量 Provider，优先 pgvector
- S3-compatible 或受限 local filesystem
- Redis 可选；若关闭，必须关闭 Stream Resume 和 durable queue，使用 Mongo lease/进程内任务
- 不启动 AI Proxy、Plugin、Agent Sandbox、Volume Manager 等非核心能力

#### Standard：中小规模生产

- App Web 节点
- Mongo
- Redis
- pgvector
- S3-compatible storage
- Direct ModelGateway 或可选 AI Proxy
- 一个 background worker/runner
- Code Sandbox 作为独立服务

#### Cloud：多租户/高并发

- Stateless App Web replicas
- 独立 Worker/Training/Queue consumer
- Redis 按 stream、queue/session、cache 进行容量和告警隔离
- Mongo replica/分片策略
- 向量 Provider 集群或专用服务
- 外部对象存储
- AI Proxy 只在路由、渠道池化、用量和租户隔离确有收益时启用
- Agent Sandbox/OpenSandbox 独立扩缩容

## 9. 分阶段演进路线

### 阶段 0：先把事实补齐（1～2 周）

不做大重构，先补数据：

- 记录 API P95/P99、首 token、流中断、resume 成功率。
- 记录 Mongo/Redis/Vector/S3/AI Proxy 的错误和超时占比。
- 记录 BullMQ queue depth、job age、retry、failure。
- 记录实际启用的 Provider 和部署档位。
- 建立 Chat 完整链路 smoke test，覆盖两轮历史、刷新、恢复、停止。
- 统计 `pino/winston` 等历史依赖是否还有动态使用。

### 阶段 1：先修复契约和生命周期（2～4 周）

1. capability readiness 与 lazy initialization。
2. `VECTOR_PROVIDER` 显式选择，禁止多 URL 静默优先级。
3. 模型未配置/停用/不可达错误码分层，修复 STT 500 语义。
4. 统一 Chat round lifecycle 和 stream state。
5. v1/v2 completion 抽出公共 application service。
6. 为 AppEntry 历史复用统一 query/mutation，不继续新增第二套缓存。

### 阶段 2：收敛包边界和后台任务（1～2 个月）

1. 通过 `exports`、依赖检查和 lint 先阻止新的越界 import。
2. 把 `global` 拆成 contract/utils 的逻辑边界。
3. 把 Chat、Dataset、Model、Permission 的 application service 入口固定下来。
4. 明确 Online / Local Async / Durable Job / Isolated Execution 四种任务语义。
5. 将 Worker、cron、training queue 的 owner 和 shutdown 顺序固定下来。
6. 合并 Logger 标准并清理死依赖。

### 阶段 3：根据指标决定是否拆进程/服务（2～3 个月后）

只有出现以下证据时才拆：

- Web 请求被 Dataset/文件解析/Worker CPU 明显拖慢。
- Queue backlog 需要独立扩容。
- Sandbox 需要独立安全边界和扩缩容。
- Vector/AI Provider 的资源模型与 Web 节点完全不同。
- 线上发布频率和故障域已经互相阻塞。

优先拆成：

```text
web-api  ↔  worker/ingestion  ↔  sandbox/vector/AI adapters
```

不建议第一步就拆成十几个微服务。

## 10. 明确不建议现在做的事情

1. 不因为 Next.js 版本升级就全面迁移 App Router。
2. 不因为目录复杂就立刻拆微服务。
3. 不引入 Kafka、事件溯源或全局事件总线替代现有 Mongo/Redis/BullMQ。
4. 不把 Mongo 主数据整体迁移到 PostgreSQL，只为了减少数据库种类。
5. 不把 SSE 改成 WebSocket，除非双向实时通信成为明确需求；当前 SSE 对单向模型流是合适的。
6. 不把不可信代码执行降级为 Node `vm` 或普通 Worker Thread。
7. 不把所有前端 Context 合并成一个全局 Store。
8. 不让兼容 Provider 的代码继续进入核心业务模块。

## 11. 需要业务/产品确认的战略问题

以下问题会直接决定 Redis、AI Proxy、Sandbox、Worker 和多 Provider 是否值得继续作为默认架构成本：

1. 未来 12 个月的主战场是单机私有化、中小团队，还是多租户云服务？三者是否需要三个发行档位？
2. 默认安装必须包含哪些能力：Plugin、Code Sandbox、Agent Sandbox、MCP、AI Proxy、语音、向量多 Provider？
3. 目标峰值是多少：并发流式会话数、每小时 Dataset ingestion、最大文件大小、队列允许积压时间？
4. Chat 的可用性优先级是什么：流式实时、断线恢复、历史一致性、计费精确性分别要求什么 SLO？
5. AI Proxy 是对外产品能力，还是当前部署/计费的内部实现？如果是后者，应允许单机直连并保持同一个 `ModelGateway` 契约。
6. 备份恢复目标是什么：RPO/RTO、Mongo/Vector/S3 是否要求联合恢复演练？
7. v1 与 v2 是否需要长期独立演进，还是可以保留兼容入口但合并内部实现？

## 12. 最终判断

FastGPT 当前最应该做的不是“换一套更潮的架构”，而是完成一次**复杂度偿债**：

- 保留真正购买了产品核心能力的复杂度：Workflow、Agent Loop、Sandbox、SSE resume、Mongo 事务、对象存储和 Provider Adapter。
- 收敛没有明确收益的复杂度：重复 Chat route、global 运行时依赖、service 大包越界、Redis 语义混用、多个 Logger、Provider 隐式选择。
- 把可选能力变成可选运行时，而不是所有部署的硬依赖。
- 把 Chat/Stream/History/Billing 的状态和错误契约固定下来。
- 先以模块化单体获得开发效率，再用指标决定哪些模块值得独立进程或服务化。

如果只能优先做五件事，顺序建议是：

1. **能力化启动和故障隔离。**
2. **合并 v1/v2 Chat 内部执行链，建立统一流状态机。**
3. **明确 Mongo/Redis/Vector/S3 的数据所有权和恢复语义。**
4. **收紧 `global/service/API` 依赖边界。**
5. **按 Lite/Standard/Cloud 分档，默认发行版只启用真正需要的组件。**

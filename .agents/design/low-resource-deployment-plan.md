# FastGPT 4 vCPU / 8 GiB 低资源部署方案

- **文档状态**：实施分支方案
- **适用分支**：`codex/low-resource-deploy-profile`
- **编制日期**：2026-09-16
- **目标主机**：京东云 CVM，4 vCPU、约 7.8 GiB 内存、60G 系统盘

## 1. 背景与结论

本次部署核查显示，目标主机实际为 4 vCPU（系统识别为 2 核 4 线程），可用内存约 7.8 GiB。FastGPT 核心服务在该主机上可以正常启动并保持健康，但完整的 Agent Sandbox 体系会引入 OpenSandbox、Volume Manager、Proxy 以及动态创建的运行时容器，无法为生产峰值保留足够的内存、CPU 和磁盘余量。

因此，本分支采用“核心服务 + 低并发 + 可选沙箱”的方案：

1. 默认只运行基础对话、知识库/RAG、工作流、插件和外部模型调用所需的核心服务。
2. 默认不启动 Agent Sandbox 相关服务和运行时镜像预拉取。
3. 保留 Code Sandbox，但将其降为小型进程池，避免直接删除当前 App 的启动依赖。
4. 使用 PostgreSQL + pgvector 作为唯一向量库，不在本机部署 Milvus、OceanBase、SeekDB 或 OpenGauss。
5. 将 Node.js 堆、容器内存/CPU、Redis 上限、队列并发和 HNSW 参数做成可通过 `.env` 覆盖的控制项。
6. 后续优先外置对象存储、MongoDB、PostgreSQL/pgvector 和 Redis；如必须启用 Agent Sandbox，则使用独立主机。

## 2. 当前部署基线

远程部署目录为 `/opt/fastgpt`，当前核心服务已验证健康：

- FastGPT App
- MongoDB 5.0.x
- PostgreSQL/pgvector
- Redis 7.x
- MinIO
- Code Sandbox
- FastGPT Plugin
- AIProxy
- AIProxy PostgreSQL

当前不启动：

- OpenSandbox Server
- Agent Sandbox Proxy
- Volume Manager
- Agent Sandbox runtime 镜像

之前出现的 `Operation tmp_datas.updateOne() buffering timed out after 10000ms`，根因是构建阶段的 `.env` 将 `NEXT_PHASE=phase-production-build` 带入了运行时，导致 instrumentation 未初始化；该问题不是 MongoDB 网络故障，也不能用单纯调低内存来替代修复。

## 3. 模块分级策略

### 3.1 必须保留

| 模块 | 处理 | 说明 |
| --- | --- | --- |
| `fastgpt-app` | 保留并设置堆/容器上限 | 主应用和后台 worker |
| MongoDB | 保留单节点副本集 | 主业务数据、用户、权限、对话和应用配置 |
| Redis | 保留，限制为 512M–1G | 缓存和 BullMQ/异步任务依赖；使用 `noeviction` 避免淘汰队列 |
| PostgreSQL + pgvector | 保留唯一向量库 | 比本机 Milvus 体系更适合低配单机 |
| MinIO | 暂时保留或迁移到 S3 | 知识库文件、图片和对象存储 |
| Plugin | 保留单实例 | 当前 App 启动依赖及插件/工具能力 |
| AIProxy + AIProxy PostgreSQL | 当前保留 | 当前模型请求通过 AIProxy 访问 |
| Code Sandbox | 保留低配实例 | 当前 Compose 的健康检查和启动链路依赖它 |

### 3.2 默认关闭

以下服务均加入 `agent-sandbox` Compose profile，默认 `docker compose up -d` 不启动：

- `fastgpt-opensandbox-server`
- `fastgpt-agent-sandbox-proxy`
- `fastgpt-volume-manager`

以下镜像保持 `prepull` profile，不执行预拉取：

- `opensandbox-agent-sandbox-image`
- `opensandbox-execd-image`
- `opensandbox-egress-image`

FastGPT App 的 `AGENT_SANDBOX_PROVIDER` 默认为空。启用 Agent Sandbox 必须同时满足：

1. 使用 `--profile agent-sandbox` 启动服务；
2. 提供 Proxy/预览地址和 Docker socket；
3. 评估动态沙箱容器带来的额外内存、CPU、磁盘和安全风险。

### 3.3 参数降级

| 模块 | 低资源默认值 | 影响 |
| --- | --- | --- |
| App Node.js heap | 2048M | 大文件、复杂工作流的峰值空间降低 |
| App 容器 | 3G、2.5 vCPU、512 PIDs | 防止单个 App 进程耗尽主机资源 |
| App/Plugin 连接池 | 20 | 高并发连接会排队 |
| Redis | `maxmemory=1gb`，容器上限 1.25G | Redis 满时写入会失败，需要监控积压 |
| Code Sandbox | pool 2，单任务 256M，容器 768M | 代码任务可能排队；仍支持常规代码节点 |
| 知识库处理 | 解析/向量/QA/VLM 均为 2 | 大文件导入速度降低，不改变结果正确性 |
| HNSW | `ef_search=80`，最大扫描 50000 | CPU 降低，召回率需用实际数据验证 |
| 日志 | `info`，OTEL 关闭 | 减少日志 CPU/磁盘开销，暂不提供本地链路追踪 |

所有上述参数可通过部署目录的 `.env` 覆盖，示例见：

```text
/Users/sinan/Documents/github/FastGPT/deploy/low-resource.env.example
```

## 4. 构建脚本变更

`/Users/sinan/Documents/github/FastGPT/projects/app/Dockerfile` 做以下调整：

1. 构建阶段的 Node.js 堆上限通过 `BUILD_NODE_MAX_OLD_SPACE_SIZE` 控制，默认仍为 4096M，避免降低镜像构建成功率。
2. 运行阶段通过 `NODE_MAX_OLD_SPACE_SIZE` 设置默认堆上限，默认 2048M。
3. 移除运行时入口中硬编码的 `--max-old-space-size=4096`，改为 `NODE_OPTIONS`，使 Compose `.env` 可以覆盖。
4. 构建阶段提供 `FILE_TOKEN_KEY` 和 `STORAGE_DOWNLOAD_URL_MODE` 的非敏感占位值，保证 Next.js 收集页面数据时不会因为运行时配置缺失而失败。
5. 在 standalone 文件复制到 runner 前删除 `.env*` 文件，防止构建期 `NEXT_PHASE` 或敏感配置进入生产镜像。

构建时如确需使用不同堆上限：

```bash
docker build \
  --build-arg BUILD_NODE_MAX_OLD_SPACE_SIZE=4096 \
  --build-arg NODE_MAX_OLD_SPACE_SIZE=2048 \
  -f projects/app/Dockerfile \
  -t fastgpt:low-resource .
```

## 5. 推荐部署链路

### 5.1 构建和发布

1. 在 CI 或资源相对充足的构建机生成 FastGPT App 镜像。
2. 推送镜像到可访问的镜像仓库。
3. 在 4 vCPU/8 GiB CVM 上只拉取 PostgreSQL/pgvector 版本的 Compose 文件。
4. 在部署目录 `.env` 中设置 `FASTGPT_APP_IMAGE` 指向本次构建的镜像 tag 或 digest。
5. 不执行 `docker compose --profile prepull pull`。
6. 不在该 CVM 上构建完整应用镜像，避免构建峰值与运行中服务争抢内存。

### 5.2 首次启动

```bash
cd /opt/fastgpt
cp /path/to/low-resource.env.example .env
# 检查生产密码、Token 和密钥不应写入 low-resource.env.example

docker compose config --quiet
docker compose pull
docker compose up -d
```

如果使用远程安装脚本，主版本默认只配置核心服务，不要求 Sandbox Proxy 地址。启动命令仍为：

```bash
docker compose pull
docker compose up -d
```

### 5.3 启动后的检查

```bash
docker compose ps
docker compose logs --tail=120 fastgpt-app
docker stats --no-stream
free -h
```

重点确认 App 日志包含：

```text
MongoDB connected successfully
Postgres vector initialization completed
System initialized successfully
```

并确认：

- App、MongoDB、Redis、向量库、MinIO、Plugin、AIProxy 处于 running/healthy；
- Agent Sandbox 三个服务没有被默认启动；
- 没有 `tmp_datas.updateOne()` buffering timeout；
- 没有 OOM、容器反复重启或 Redis 长期满载；
- MinIO 不需要对公网发布 9000/9001；
- 仅按需要开放 FastGPT 访问端口和 SSH 端口。

## 6. 验收标准

### 功能验收

- 登录、退出和 root 初始化正常；
- 普通对话正常；
- 创建知识库并上传小型 PDF/文本文件正常；
- 向量检索和知识库问答正常；
- 普通工作流正常；
- Plugin 调用正常；
- AIProxy 模型调用正常；
- Code Sandbox 执行一个简单 JavaScript/Python 任务正常。

### 资源验收

建议在连续运行 24 小时并执行小规模并发测试后满足：

- 正常负载下可用内存保持在 1.5G–2G 以上；
- Swap 不持续增长，偶发使用可以接受；
- 5 分钟 CPU load 不长期超过 3；
- Redis `used_memory` 不长期接近 1G；
- App、Code Sandbox 不触碰容器上限；
- `dmesg` 中无 OOM kill；
- 知识库任务允许排队，但不出现持续失败。

## 7. 外置和扩容路线

按优先级建议：

1. MinIO 迁移到兼容 S3 的对象存储，先解决 60G 磁盘增长问题；
2. MongoDB 外置，释放主业务数据库内存和 I/O；
3. PostgreSQL/pgvector 外置，释放向量索引和数据库内存；
4. Redis 外置，解除缓存/队列上限；
5. AIProxy 和 AIProxy PostgreSQL 外置或改为直接访问模型，但必须先确认模型配置、路由和调用日志不再依赖 AIProxy；
6. Agent Sandbox 放到独立 8 vCPU/16G 以上节点。

不得直接删除 MinIO、MongoDB、PostgreSQL 或 Redis 数据卷。外置前必须完成备份、数据迁移和回滚验证。

## 8. 回滚方案

- App 镜像回滚到上一稳定 tag；
- 保留原始 Compose 文件和 `.env` 备份；
- 若低资源参数导致吞吐不足，优先恢复队列并发或 Code Sandbox pool，不先恢复 Agent Sandbox；
- 若需要恢复 Agent Sandbox，先升级节点或切换到独立 Sandbox 主机；
- 禁止使用 `docker system prune -a --volumes` 作为常规清理手段。

## 9. 待办事项

- [ ] 在目标 CVM 以本分支生成的 main/pg Compose 文件执行 `docker compose config --quiet`。
- [ ] 构建新的 App 镜像并确认运行时不包含 `.env*` 文件。
- [ ] 执行登录、知识库、向量检索、Plugin、AIProxy、Code Sandbox 验收。
- [ ] 观察 24 小时资源曲线和 Docker 重启次数。
- [ ] 确认京东云公网带宽、云防火墙和 SSH 来源限制。
- [ ] 若业务需要 Agent Sandbox，单独评审扩容或外置方案。

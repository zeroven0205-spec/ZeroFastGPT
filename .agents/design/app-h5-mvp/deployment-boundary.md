# App H5 白标 MVP：内部部署边界与回滚约束

> 执行日期：2026-09-13
> 对应任务：S1-07
> 结论：业务方不查看、不管理且不接收 Docker/Kubernetes 交付；一期不修改现有 service、container、network、volume 或 Helm/Kubernetes 资源名称。

## 1. 一期部署边界

### 纳入一期

- 确认 AppEntry 生产环境变量和 Secret 注入方式。
- 确认现有服务名、网络、数据卷、依赖 URL 和 `NO_PROXY/no_proxy` 耦合。
- 记录当前镜像、镜像 digest、运行状态和回滚入口。
- 提供不会输出 Secret 的 Compose/运行时预检脚本。
- 明确上线、回滚、备份和恢复门禁。
- 检查业务 H5 使用 HTTPS、Secure Cookie 和同源 API 的生产前置条件。

### 不纳入一期

- 不向业务方交付 `docker-compose.yml`、Helm Chart 或 Kubernetes YAML。
- 不重命名现有 Compose service、`container_name`、network 或 volume。
- 不修改数据库名、Redis key、Bucket 名和内部服务协议。
- 不修改 `deploy/`、CI workflow 或生产集群资源。
- 不把镜像重新打标签等同于源码包名或供应链白标。

## 2. 当前内部环境盘点

当前运行环境由 `/Users/sinan/Documents/github/FastGPT/docker-compose.yml` 启动，Compose project 为 `fastgpt`。

### 2.1 服务和镜像

主 Compose 共 12 个服务：

```text
fastgpt-app
fastgpt-vector
fastgpt-mongo
fastgpt-redis
fastgpt-minio
fastgpt-plugin
fastgpt-code-sandbox
fastgpt-opensandbox-server
fastgpt-volume-manager
fastgpt-agent-sandbox-proxy
fastgpt-aiproxy
fastgpt-aiproxy-pg
```

2026-09-13 检查时，主应用仍运行：

```text
image: registry.cn-hangzhou.aliyuncs.com/fastgpt/fastgpt:v4.16.2
image digest: sha256:6481c09126aa1bd0a35c6b1aa6222c4aaa5b2515a94dd95efa929c9bad587a44
```

该镜像不包含当前工作区的 AppEntry S1-02～S1-05 代码，因此只能作为旧版本回滚基线，不能作为 AppEntry 新版本验收镜像。

### 2.2 网络和服务间 DNS

当前网络：

```text
fastgpt_app
fastgpt_data
fastgpt_codesandbox
fastgpt_aiproxy
```

从 `fastgpt-app` 容器对以下依赖执行 DNS/TCP 检查，均通过：

```text
fastgpt-mongo:27017
fastgpt-redis:6379
fastgpt-minio:9000
fastgpt-plugin:3000
fastgpt-code-sandbox:3000
fastgpt-aiproxy:3000
fastgpt-opensandbox-server:8090
fastgpt-volume-manager:3000
```

现有服务名同时出现在数据库 URL、对象存储 URL、插件 URL、AI Proxy URL、Sandbox URL 和 `NO_PROXY/no_proxy` 中。任何服务名变更都必须在同一个部署变更中同步更新这些引用，不允许只修改 `container_name`。

### 2.3 数据卷

当前命名数据卷：

```text
fastgpt_fastgpt-mongo
fastgpt_fastgpt-pg
fastgpt_fastgpt-redis
fastgpt_fastgpt-minio
fastgpt_fastgpt-aiproxy_pg
```

S1-07 未创建、删除、重命名或重新挂载任何数据卷。后续部署 AppEntry 镜像时只能替换无状态 `fastgpt-app` 容器，禁止使用会删除 volume 的命令。

禁止用于常规发布或回滚：

```bash
docker-compose down -v
docker volume prune
docker system prune --volumes
```

### 2.4 健康检查

检查结果：

- Mongo、PostgreSQL、Redis、MinIO、Plugin、Code Sandbox、OpenSandbox、Volume Manager、AI Proxy 和 AI Proxy PostgreSQL：Docker health 为 `healthy`。
- `fastgpt-app`：HTTP 首页返回 200，但容器未配置 Docker healthcheck。
- `fastgpt-agent-sandbox-proxy`：未配置 Docker healthcheck。
- 独立 `fastgpt-m3e`：未配置 Docker healthcheck。

因此当前环境的依赖健康和主应用 HTTP 可用性通过，但“主应用容器 health=healthy”门禁尚不满足。正式滚动升级必须由反向代理或编排平台配置 HTTP readiness；如果继续使用当前 Compose，应单独评审是否为 `fastgpt-app` 增加 healthcheck。

### 2.5 OCI、监控和 Kubernetes

当前主应用镜像包含以下 OCI label：

```text
org.opencontainers.image.description
org.opencontainers.image.source
```

`org.opencontainers.image.source` 可能暴露上游源码地址。业务方不查看 Docker/SBOM，因此不作为一期业务验收项；如果未来升级为供应链白标，必须在镜像构建任务中单独处理 OCI labels、Docker history 和 SBOM。

当前 Compose 中的 OTEL service name 包含内部平台命名：

```text
fastgpt-client
fastgpt-code-sandbox
fastgpt-plugin
```

这些标签只用于内部日志和监控，不向业务方交付。未来若重命名，必须同时迁移日志查询、告警、Dashboard 和历史指标映射。

仓库当前只发现 `deploy/k8s/volume-manager.yaml`，没有一套可直接用于 AppEntry 主应用发布的完整 Kubernetes/Helm 资源。本次不修改该文件，也不声明 Kubernetes 滚动升级已验证。当前 Compose 为单 `fastgpt-app` 实例且无主应用 healthcheck，不具备可证明的零停机滚动升级能力；若要求零停机，需要在反向代理后并行启动新旧容器或使用具备 readiness 的编排平台。

## 3. AppEntry 环境映射

生产环境必须通过 Secret Manager、CI/CD Secret 或受控 env 文件注入，不允许把真实值直接写入 Compose 或 Git：

| 变量 | 类型 | 发布要求 |
|---|---|---|
| `APP_ENTRY_ENABLED` | 普通配置 | 必须为 `true` |
| `APP_ENTRY_APP_KEY` | 普通配置 | 业务 URL 稳定标识，不使用 Mongo App ID |
| `APP_ENTRY_APP_ID` | 内部配置 | 24 位 ObjectId，仅服务端注入 |
| `APP_ENTRY_BRAND_NAME` | 品牌配置 | 上线前替换临时名称 |
| `APP_ENTRY_BRAND_DESCRIPTION` | 品牌配置 | 业务方确认 |
| `APP_ENTRY_BRAND_LOGO` | 品牌配置 | HTTPS 资源 |
| `APP_ENTRY_BRAND_FAVICON` | 品牌配置 | HTTPS 资源 |
| `APP_ENTRY_PRIMARY_COLOR` | 品牌配置 | 合法颜色值 |
| `APP_ENTRY_SUPPORT_URL` | 合规链接 | HTTPS，可选 |
| `APP_ENTRY_PRIVACY_URL` | 合规链接 | HTTPS，上线必填 |
| `APP_ENTRY_TERMS_URL` | 合规链接 | HTTPS，上线必填 |
| `APP_ENTRY_AUTH_CODE_SECRET` | Secret | 至少 32 位，只允许 APP 服务端和 FastGPT 服务端持有 |
| `APP_ENTRY_AUTH_CODE_TTL_SECONDS` | 安全配置 | 30～120，建议 60 |
| `FE_DOMAIN` | 外部地址 | 正式业务 HTTPS 域名 |
| `AUTH_COOKIE_SECURE` | Cookie 安全 | 正式环境必须为 `true` |
| `NEXT_PUBLIC_BASE_URL` | 构建配置 | 非根路径时构建期和运行期保持一致 |

示例文件：`deployment/app-entry.env.example`。

当前运行的 `fastgpt-app` 容器没有任何 `APP_ENTRY_*` 环境变量，因此不能直接用于 AppEntry 验收。

## 4. Secret 风险

当前工作区根目录的未跟踪 Compose 文件包含明文数据库口令、Token、对象存储凭证和系统密钥。即使该文件不交付给业务方，也存在误提交、终端历史、备份扩散和日志泄露风险。

发布前必须：

1. 确认这些值未进入 Git 历史、聊天记录、CI artifact 或共享网盘。
2. 将 Secret 移入 Secret Manager、CI/CD Secret 或权限受控的独立 env 文件。
3. 对已经暴露到非受控位置的数据库密码、系统 Key、Plugin Token、Sandbox Token、AI Proxy Token 和对象存储凭证执行轮换。
4. 确保预检、日志和故障截图只显示变量名，不显示变量值。

该项为内部发布 P0 门禁。

## 5. 镜像标签和回滚映射

一期不改 service/container/network/volume 名，只替换主应用镜像：

| 用途 | 镜像要求 |
|---|---|
| 新版本 | 业务方私有仓库或内部受控仓库，使用不可变版本号和 Git SHA 标签 |
| 回滚版本 | 保留当前验证通过的旧镜像 digest |
| 禁止 | 生产只使用 `latest`，或覆盖已有版本标签 |

推荐同时记录：

```text
release image repository
release image tag
release image digest
source Git commit
build time
base image digest
rollback image digest
AppEntry environment revision
```

当前回滚基线：

```text
registry.cn-hangzhou.aliyuncs.com/fastgpt/fastgpt@sha256:6481c09126aa1bd0a35c6b1aa6222c4aaa5b2515a94dd95efa929c9bad587a44
```

## 6. 发布步骤

### 6.1 发布前

1. 冻结正式品牌资源、域名和合规链接。
2. 使用 `deployment/check-runtime.mjs --mode release-config` 校验环境文件。
3. 记录当前镜像 digest、Compose config hash、容器网络和 volume 挂载。
4. 对 Mongo、向量 PostgreSQL、AI Proxy PostgreSQL、MinIO 和必要的 Redis 状态完成备份。
5. 在独立标签构建 AppEntry 镜像，不覆盖旧镜像标签。
6. 在预发布环境验证登录、authCode、Chat、历史、语音、引用和退出。

### 6.2 发布

1. 只替换 `fastgpt-app` 镜像和 AppEntry 环境变量。
2. 不执行 `down -v`，不重建数据服务，不修改 volume external/name。
3. 确认新容器加入原有 `app`、`data`、`codesandbox`、`aiproxy` 网络。
4. 检查内部 DNS/TCP、首页 HTTP、登录 Cookie、AppEntry 配置和 Chat SSE。
5. 观察错误率、启动日志、Mongo/Redis/S3/Plugin 初始化和容器重启次数。

### 6.3 回滚

触发条件：

- 主应用无法启动或持续重启。
- AppEntry 登录循环、Cookie 不持久化或 authCode 大面积失败。
- Chat SSE 无法建立或历史数据权限异常。
- 依赖 DNS、Mongo、Redis、MinIO、Plugin 或 AI Proxy 初始化失败。
- 错误率或延迟超过发布阈值。

回滚动作：

1. 将 `fastgpt-app` 镜像恢复到记录的旧 digest。
2. 恢复上一版 AppEntry 环境 revision；如旧版本不识别这些变量，可以保留但应将 `APP_ENTRY_ENABLED=false`。
3. 保持现有网络和 volume 不变，只重建主应用容器。
4. 验证旧 `/login`、`/chat`、管理端和依赖 DNS。
5. 数据结构未在 S1-02～S1-07 中修改，正常回滚不需要执行数据库降级。

## 7. 备份和恢复门禁

仓库当前未发现覆盖这套 Compose 数据面的统一备份/恢复脚本，因此 S1-07 不声明“恢复演练已完成”。正式发布前至少需要完成：

- Mongo：`mongodump` 备份和隔离实例 `mongorestore` 校验。
- 向量 PostgreSQL：`pg_dump` 和隔离数据库 `pg_restore` 校验。
- AI Proxy PostgreSQL：独立 `pg_dump/pg_restore`。
- MinIO：使用 `mc mirror` 或存储快照，并校验 public/private Bucket。
- Redis：确认是否仅缓存；若包含登录 Session 和短期 authCode，回滚时明确允许用户重新登录还是恢复 RDB/AOF。

恢复测试必须在隔离实例执行，不能直接覆盖当前运行卷。

## 8. 非破坏性预检

检查当前基线：

```bash
node .agents/design/app-h5-mvp/deployment/check-runtime.mjs \
  --mode baseline \
  --compose docker-compose.yml \
  --container fastgpt-app \
  --url http://127.0.0.1:3000/
```

检查发布环境配置：

```bash
node .agents/design/app-h5-mvp/deployment/check-runtime.mjs \
  --mode release-config \
  --compose docker-compose.yml \
  --env /secure/path/app-entry.env
```

检查新容器：

```bash
node .agents/design/app-h5-mvp/deployment/check-runtime.mjs \
  --mode runtime \
  --compose docker-compose.yml \
  --container fastgpt-app \
  --url https://business.example.com/app/customer-service
```

脚本不会输出环境变量值，只输出 AppEntry 变量名、镜像、网络、挂载、健康状态和依赖连接结果。

## 9. S1-07 结论

- 业务方 Docker 交付：不纳入一期。
- 现有部署资源改名：未执行，也不纳入一期默认发布。
- Compose 语法、依赖 DNS/TCP、数据卷连接和外部 HTTP：当前基线通过。
- 新 AppEntry 镜像：尚未构建或部署。
- AppEntry 环境变量：当前容器未注入。
- 主应用 Docker healthcheck：当前未配置。
- 备份恢复演练：尚未执行。
- 旧镜像 digest：已记录，可作为应用层回滚基线。
- 明文 Secret：发现，正式发布前必须迁移和轮换。

因此 S1-07 的“内部部署边界、环境映射、检查工具和回滚约束”已完成；生产发布准入仍由 S1-08 在新镜像、正式配置、备份恢复和预发布回滚演练完成后确认。

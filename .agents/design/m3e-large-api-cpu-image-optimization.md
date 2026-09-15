# `m3e-large-api` CPU 镜像优化设计评审与实施记录

- 评审与实施日期：2026-09-15
- 仓库：`/Users/sinan/Documents/github/FastGPT`
- 分支：`feat/app-h5-white-label-mvp`
- 方案：方案 A——重建当前行为兼容版 CPU 镜像
- 状态：已完成构建、灰度验证、正式替换和临时对象清理
- 结论性质：本地 Docker 部署记录；不替代云生产环境的压测、安全审计和故障演练

## 1. 结论摘要

旧的 `m3e-large-api` 镜像创建于 2023 年，Docker Desktop 本地展开占用约 10.5GB。它实际承载的是一个通过 FastAPI 暴露 OpenAI 兼容 `/v1/embeddings` 接口的 M3E Large 服务，而不是 FastGPT 主应用本身。

本次没有直接更换 Embedding 模型，也没有修改 FastGPT 的向量维度和索引语义，而是从旧运行容器恢复服务源代码和模型文件，移除不必要的 CUDA/GPU 依赖，构建行为兼容的 CPU 镜像。新镜像已完成 canary 验证并替换正式容器，旧镜像在保留离线备份后移除。

最终结果：

| 项目 | 结果 |
|---|---|
| 新镜像 | `fastgpt-m3e:cpu-compat-20260915-v4` |
| 镜像 ID | `sha256:a4089c3cadf7f9646e170289c6a40d8ac9a6583a187281289bcbfdd5bfd21f52` |
| 平台 | `linux/amd64` |
| 运行时 | Python 3.10、CPU-only PyTorch `2.0.1+cpu` |
| 服务状态 | `running / healthy` |
| FastGPT 访问地址 | `http://fastgpt-m3e:6008/v1` |
| 向量维度 | 1536 |
| 旧镜像备份 | 已保存在 `/Users/sinan/Documents/FastGPT-backups/` 并校验通过 |
| 旧 Docker 标签 | 已删除；备份 tar 仍可用于恢复 |
| 新镜像大小 | `docker image inspect` 约 1.60GB；Docker 本地展开/层占用约 4.3GB |

## 2. 问题背景与边界

### 2.1 触发问题

FastGPT 知识库页面提示“检测到没有可用的索引模型”，但人工调用 `deepseek-flash` 和 `deepseek-v4-pro` 均成功。原因是聊天模型和知识库索引模型不是同一类能力：聊天模型可以完成对话生成，知识库索引还需要 Embedding 模型把文本转换为可存储、可检索的向量。

当时系统中的索引服务依赖旧 `m3e-large-api` 镜像。镜像体积过大、构建时间久、依赖中包含 GPU/CUDA 组件，增加了本地和未来云端部署的成本与风险。因此本次目标不是重新选择 Embedding 模型，而是先恢复稳定的索引能力，再在业务规模扩大后单独评估模型迁移。

### 2.2 本次明确不做

- 不把 `deepseek-flash` 或 `deepseek-v4-pro` 当作 Embedding 模型使用。
- 不切换到 `Ollama + bge-m3`、M3E Base/Small 或云端 Embedding API。
- 不修改现有向量库维度、归一化规则或 FastGPT 索引模型数据库语义。
- 不运行全局 `docker system prune`、`docker volume prune` 或 `docker-compose down -v`。
- 不删除旧镜像备份，不输出任何真实 API 密钥、数据库密码或其他 Secret。

## 3. 第一性原理评审：索引模型真正需要什么

对于 FastGPT 知识库，Embedding 服务的必要能力可以压缩为以下契约：

1. 能在 FastGPT/AI Proxy 网络内稳定访问。
2. 接受 OpenAI 兼容的 `POST /v1/embeddings` 请求。
3. 支持 Bearer Token 鉴权，错误凭证必须拒绝。
4. 对每个输入返回浮点向量、索引和模型字段。
5. 输出维度必须与向量库字段一致；当前系统是 1536 维。
6. 输出归一化规则必须保持一致，否则已有向量和新写入向量的相似度空间会发生变化。
7. 启动失败和运行异常需要能被 Docker 健康检查发现。
8. 在当前开发/联调规模下，CPU 单进程运行应优先于为理论并发预留 GPU 依赖。

因此，“镜像更轻”本身不是目标。真正的目标是：在不改变以上契约的前提下，删除不影响当前行为的运行时负担。

## 4. 旧服务行为基线

旧容器恢复出的 `localembedding.py` 表明，服务实际行为为：

- FastAPI + Uvicorn，监听 `0.0.0.0:6008`。
- 使用 `SentenceTransformer('./moka-ai_m3e-large')` 加载 M3E Large 本地模型。
- 优先检测 CUDA；当前环境实际使用 CPU。
- 调用 `model.encode(text)` 生成原始向量。
- 当原始向量维度小于 1536 时，通过 `PolynomialFeatures(degree=2)` 展开并截断/补零到 1536 维。
- 对向量执行 L2 归一化：`embedding / np.linalg.norm(embedding)`。
- 通过 `HTTPBearer` 校验请求凭证。
- 返回 OpenAI 兼容结构：`data[].embedding`、`data[].index`、`data[].object`、`model`、`usage`。
- 兼容重建在上述服务行为基础上新增 `/healthz` 端点，返回服务和模型状态，供 Docker healthcheck 使用。

这组行为是兼容重建的基线。尤其是“1536 维 + L2 归一化”不能在本次瘦身中顺手改掉，否则即使接口仍返回 200，也可能导致知识库检索结果失真。

## 5. 方案比较与决策

| 方案 | 优点 | 关键代价/风险 | 本次决策 |
|---|---|---|---|
| A. 当前 M3E 行为兼容 CPU 重建 | 不改模型语义；无需立即重建索引；可直接替换；体积显著下降 | 仍保留旧版 Python/Transformers 依赖，需后续定期重建 | **采用** |
| B. M3E Base/Small 等轻量模型 | 内存和延迟可能更低 | 向量分布改变，已有索引必须全量重建；准确率需重新评估 | 暂不采用 |
| C. `Ollama + bge-m3` | 生态成熟，后续扩展方便 | 引入 Ollama 运行时和新模型；接口、维度、归一化和运维链路变化 | 暂不采用 |
| D. 云端 Embedding API | 无需自维护模型容器 | 数据出网、费用、网络可用性、供应商绑定；与当前离线服务语义不同 | 暂不采用 |
| E. 直接继续使用旧镜像 | 零迁移工作 | 10.5GB 体积、CUDA 依赖、旧基础系统和供应链风险继续存在 | 不采用 |

方案 A 的核心判断是：当前首先需要恢复一个可靠的“索引能力”，而不是在同一次变更中引入模型迁移。模型替换应作为独立项目，包含离线评测、全量重嵌入和检索回归。

## 6. 目标设计

### 6.1 构建设计

新镜像采用多阶段构建：

1. 基于固定 digest 的 Ubuntu 运行基础镜像。
2. 使用 Python 3.10 和独立 `/opt/venv`。
3. 安装 CPU-only PyTorch `2.0.1+cpu`，不安装 CUDA、NVIDIA、`torchvision`、`torchaudio`。
4. 依赖通过 `requirements.cpu.lock` 锁定；`sentence-transformers` 使用本地源码包安装。
5. 运行阶段只复制虚拟环境、服务代码和 M3E 模型目录。
6. 使用 `COPY --chown=m3e:m3e`，避免模型层因权限修正而重复复制。
7. 以非 root 用户 `m3e` 运行。
8. 保留单 worker，避免每个 worker 重复加载约 GB 级模型。

### 6.2 运行设计

部署配置位于 [docker-compose.m3e.yml](/Users/sinan/Documents/github/FastGPT/docker-compose.m3e.yml)，关键约束如下：

- 固定使用 `fastgpt-m3e:cpu-compat-20260915-v4`，不使用 `latest`。
- 显式声明 `platform: linux/amd64`。
- 容器名保持 `fastgpt-m3e`，减少 FastGPT/AI Proxy 配置变化。
- 只绑定宿主机 `127.0.0.1:6008`，避免把 Embedding 鉴权接口直接暴露到公网。
- 加入外部网络 `fastgpt_aiproxy`，并保留 `fastgpt-m3e` 网络别名。
- `restart: always`，保持旧部署的自动拉起语义。
- 通过 `.env.m3e.local` 注入凭证；该文件保持 ignored，权限为 `600`。
- Docker healthcheck 调用 `http://127.0.0.1:6008/healthz`。

### 6.3 安全边界

本次兼容重建没有扩大网络暴露面，也没有把凭证写入镜像。需要注意的后续安全项：

- `localembedding.py` 中仍保留旧代码的 fallback key 逻辑，生产环境必须始终显式注入凭证；后续应删除默认值并在缺少凭证时拒绝启动。
- 旧代码的 CORS 配置为通配符并允许凭证，当前仅通过回环端口和内部网络降低风险；如需公网暴露，必须收紧来源和入口策略。
- Python、FastAPI、Transformers 和 Sentence Transformers 版本较旧，后续应在不改变向量行为的前提下做依赖升级和漏洞扫描。

## 7. 实施完整链路

### 7.1 备份旧镜像

在停止或删除旧镜像前，从本地 Docker 环境导出离线备份：

```bash
docker save \
  registry.cn-hangzhou.aliyuncs.com/fastgpt_docker/m3e-large-api:latest \
  -o /Users/sinan/Documents/FastGPT-backups/m3e-large-api-20230908.tar

sha256sum \
  /Users/sinan/Documents/FastGPT-backups/m3e-large-api-20230908.tar \
  > /Users/sinan/Documents/FastGPT-backups/m3e-large-api-20230908.tar.sha256
```

备份文件实际存在，SHA-256 为：

```text
7901a4f4031a988b32c5be00d74ef537dc3bcb09f268c1d1f95848cb882922a2
```

校验结果：`m3e-large-api-20230908.tar: OK`。

### 7.2 恢复可构建上下文

从旧运行容器恢复以下内容到临时构建目录：

```text
/Users/sinan/Documents/FastGPT-m3e-rebuild-20260915/
├── Dockerfile
├── Dockerfile.legacy
├── localembedding.py
├── localembedding.legacy.py
├── requirements.cpu.lock
├── requirements.legacy.txt
├── requirements.torch.lock
├── sentence-transformers-2.2.2.tar.gz
├── torch-2.0.1+cpu-cp310-cp310-linux_x86_64.whl
└── moka-ai_m3e-large/
```

模型二进制没有纳入 Git 提交，避免把大文件和运行时 Secret 混入应用仓库。该目录是本次本地重建的证据和复现输入，后续云部署应将同等内容放入受控构建仓库或镜像构建流水线。

### 7.3 构建 CPU 兼容镜像

实际构建目标为 x86_64 Linux：

```bash
docker build \
  --platform linux/amd64 \
  -t fastgpt-m3e:cpu-compat-20260915-v4 \
  /Users/sinan/Documents/FastGPT-m3e-rebuild-20260915
```

构建结果：

- Python `3.10.12`
- PyTorch `2.0.1+cpu`
- `torch.version.cuda = None`
- `torch.cuda.is_available() = False`
- 未安装 `torchvision`、`torchaudio` 或 NVIDIA 相关包
- 运行 UID `10001`，用户名 `m3e`

### 7.4 Canary 验证

先使用临时容器验证新镜像，再触碰正式容器。验证内容包括：

- 模型能否加载。
- `/healthz` 是否返回 200。
- 有效 Bearer Token 是否返回 200。
- 无效 Token 是否返回 401。
- 返回模型字段是否为 `m3e`。
- 向量维度是否为 1536。
- 与旧服务对相同输入的向量是否一致。

旧容器仍存在期间，对 3 条相同输入进行新旧比对，结果均为：

```text
cosine=1.000000000000
max_abs=0
```

这一步是本次低风险替换的主要证据：新镜像没有因为 CPU 化、基础镜像变化或依赖裁剪而改变实际向量结果。

### 7.5 正式替换

使用 Compose 强制重建正式容器，保持原容器名、端口、网络和重启策略：

```bash
docker-compose -f docker-compose.m3e.yml up -d --force-recreate fastgpt-m3e
```

正式容器最终状态：

```text
container = fastgpt-m3e
image = fastgpt-m3e:cpu-compat-20260915-v4
status = running
health = healthy
restart_policy = always
host_port = 127.0.0.1:6008
network = fastgpt_aiproxy
restart_count = 0
```

FastGPT 的模型配置继续使用本地 M3E Embedding：

```text
名称：M3E Local
base_url：http://fastgpt-m3e:6008/v1
models：m3e
类型：embedding
维度：1536
normalization：true
batchSize：1
active：true
```

### 7.6 端到端验证

| 验证项 | 预期 | 实际结果 |
|---|---:|---:|
| 宿主机 `/healthz` | HTTP 200 | 通过 |
| 宿主机 `/v1/embeddings` + 有效凭证 | HTTP 200 | 通过 |
| 宿主机 `/v1/embeddings` + 错误凭证 | HTTP 401 | 通过 |
| 返回向量维度 | 1536 | 通过 |
| `fastgpt-aiproxy` → `fastgpt-m3e` | HTTP 200 | 通过 |
| Docker healthcheck | healthy | 通过 |
| 容器自动重启策略 | always | 通过 |
| 旧镜像 registry 标签 | 不存在 | 通过 |
| 备份 tar SHA-256 | OK | 通过 |

### 7.7 清理本次构建残留

确认未被正式容器引用后，仅清理本次失败/中断构建产生的明确对象：

- 临时容器 `cranky_dewdney`。
- 无标签镜像：`1790b960a878`、`6843ea33a202`、`77a6b64f881c`、`92012255ade3`、`13f614d3f86c`、`0bc4fe1bdf5f`。

没有执行范围不明确的全局清理，因此其他项目容器、镜像、网络和数据卷未受影响。

## 8. 数据与索引迁移判断

当前本地环境检查结果：

- MongoDB 数据集记录：0
- PostgreSQL modeldata 向量记录：0
- 向量字段类型：`vector(1536)`

由于新旧服务对相同输入的向量结果完全一致，本次替换不需要做知识库全量重嵌入。未来如果改用 M3E Base/Small、BGE 或云端 Embedding，必须把它视为一次独立的数据迁移：

1. 离线评测召回率、相似度和业务样本。
2. 新模型建立独立索引或版本标识。
3. 全量重算知识库向量。
4. 完成旧/新索引对比和回滚窗口后再切换读取。

## 9. 回滚方案

备份 tar 保留期间，可以恢复旧镜像：

```bash
docker load -i \
  /Users/sinan/Documents/FastGPT-backups/m3e-large-api-20230908.tar
```

回滚步骤：

1. 确认 `docker load` 恢复出的原始标签和镜像 ID。
2. 暂停新 `fastgpt-m3e` 容器。
3. 将 Compose 的 `image` 临时改回已恢复的旧标签，或使用等价的旧运行参数。
4. 重新创建 `fastgpt-m3e`，保持 `6008` 端口和 `fastgpt_aiproxy` 网络不变。
5. 重新执行健康检查、鉴权、Embedding 维度和 AI Proxy 网络验证。

回滚只涉及 Embedding 服务容器，不应删除 MongoDB、PostgreSQL、Redis、对象存储或向量数据卷。

## 10. 云服务器部署评审

### 10.1 架构适配

当前镜像是 `linux/amd64`。后续部署到 x86_64 Linux 云服务器时可以直接复用；如果目标机器是 ARM64，需要重新构建 ARM64 镜像，或明确使用 amd64 仿真。生产环境优先使用与服务器架构一致的原生镜像。

### 10.2 资源建议

以下是基于当前 CPU-only、单 worker 和约 1.65GiB 运行时内存观测值的保守建议，不是压测结论：

| 场景 | vCPU | 内存 | 磁盘可用空间 | 说明 |
|---|---:|---:|---:|---|
| 开发联调最低 | 2 | 4GB | 10GB | 单人、低并发、知识库小批量导入 |
| 小规模测试/内部环境 | 4 | 8GB | 20GB | 预留 FastGPT、AI Proxy 和系统开销 |
| 生产起步建议 | 4～8 | 8～16GB | 30GB+ | 需结合并发、批量导入和完整链路压测 |

Embedding 请求目前保持单 worker，避免模型重复驻留。并发提升前应先测量 CPU 饱和、单请求延迟、批量大小和队列等待时间，再决定是否拆分实例或引入 GPU/专用向量服务。

### 10.3 云端落地建议

- 将镜像推送到私有 Registry，使用不可变版本标签和 digest，不使用 `latest`。
- 把模型文件、Dockerfile 和锁定依赖纳入受控构建流水线，避免依赖本机临时目录。
- 保留 `/healthz` 探针，并为容器设置 CPU、内存和重启告警。
- 让 FastGPT/AI Proxy 通过私有网络访问 M3E，不暴露公网端口。
- 对依赖做定期漏洞扫描；升级后必须重新执行向量一致性或索引迁移评估。
- 在删除离线备份前，完成云端启动、知识库导入、检索召回和回滚演练。

## 11. 后续待办

1. 将当前临时构建上下文迁移到受控的镜像构建目录或 CI，不依赖 `/Users/sinan/Documents/FastGPT-m3e-rebuild-20260915/`。
2. 删除 `localembedding.py` 中的默认 fallback key，改为缺少凭证时启动失败。
3. 评估收紧 CORS、取消公网回环以外的暴露可能性，并增加反向代理层限流。
4. 为模型版本、向量维度和归一化规则增加显式配置/启动日志，避免误配造成“索引模型不可用”。
5. 建立 M3E/BGE/云端 Embedding 的离线评测和全量重嵌入流程；模型迁移不要与镜像瘦身混在同一个变更中。
6. 按备份保留策略保留 `m3e-large-api-20230908.tar`，完成云端验收和回滚演练后再删除。

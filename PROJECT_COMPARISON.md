# 项目路由对比分析 (Python vs. Next.js)

本文档旨在清晰地列出 Python 原项目的路由清单，并与 Next.js 新项目的现有路由进行对比，以识别功能差距并指导后续开发。

## 一、 Python 原项目路由清单

### 1. 页面路由 (Page Routes)

- `GET /`: 认证页面 (`auth.html`)
- `POST /auth`: 处理认证请求，设置 `auth_token` cookie
- `GET /keys`: 密钥管理页面 (`keys_status.html`)
- `GET /config`: 配置编辑页面 (`config_editor.html`)
- `GET /logs`: 错误日志页面 (`error_logs.html`)

### 2. OpenAI 兼容 API (`/openai/v1`)

- `GET /models`: 获取可用模型列表
- `POST /chat/completions`: 处理聊天补全请求 (流式和非流式)
- `POST /images/generations`: 处理图像生成请求
- `POST /embeddings`: 处理文本嵌入请求

### 3. Gemini 原生 API (`/gemini/v1` 和 `/v1beta`)

- `GET /models`: 获取 Gemini 模型列表 (包括衍生的搜索、图像模型)
- `POST /models/{model_name}:generateContent`: 非流式内容生成
- `POST /models/{model_name}:streamGenerateContent`: 流式内容生成
- `POST /models/{model_name}:countTokens`: Token 计数

### 4. Vertex AI Express API (`/vertex-express/v1`)

- `GET /models`: 获取 Vertex AI 模型列表
- `POST /models/{model_name}:generateContent`: 非流式内容生成
- `POST /models/{model_name}:streamGenerateContent`: 流式内容生成

### 5. 管理和维护 API (`/api`)

- **配置管理 (`/api/config`)**:
  - `GET /`: 获取当前配置
  - `PUT /`: 更新配置
  - `POST /reset`: 重置为默认配置
  - `DELETE /keys/{key_to_delete}`: 删除单个 API 密钥
  - `POST /keys/delete-selected`: 批量删除选定的 API 密钥
  - `GET /ui/models`: 获取用于 UI 的模型列表
- **日志管理 (`/api/logs`)**:
  - `GET /errors`: 获取错误日志列表 (支持过滤和排序)
  - `GET /errors/{log_id}/details`: 获取单个错误日志的详细信息
  - `DELETE /errors`: 批量删除错误日志
  - `DELETE /errors/all`: 删除所有错误日志
  - `DELETE /errors/{log_id}`: 删除单个错误日志
- **密钥管理 (Gemini - `/gemini/v1`)**:
  - `POST /reset-all-fail-counts`: 重置所有密钥的失败计数
  - `POST /reset-selected-fail-counts`: 重置选定密钥的失败计数
  - `POST /reset-fail-count/{api_key}`: 重置单个密钥的失败计数
  - `POST /verify-key/{api_key}`: 验证单个密钥的有效性
  - `POST /verify-selected-keys`: 批量验证选定密钥的有效性
- **统计 (`/api/stats`)**:
  - `GET /details`: 获取指定时间段内的 API 调用详情
  - `GET /key-usage-details/{key}`: 获取单个密钥在过去 24 小时的模型调用次数
- **版本检查 (`/api/version`)**:
  - `GET /check`: 检查应用更新
- **定时任务 (`/api/scheduler`)**:
  - `POST /start`: 启动定时任务
  - `POST /stop`: 停止定时任务
- **健康检查**:
  - `GET /health`: 健康检查端点

## 二、 Next.js 新项目路由分析

### 1. 已实现的路由

- **页面路由**:
  - `GET /`: 首页 (对应原项目的 `/`)
  - `GET /admin`: 管理仪表盘 (对应原项目的 `/keys`, `/config`, `/logs` 的集合)
  - `GET /auth`: 认证页面
- **API 路由**:
  - `POST /api/v1/chat/completions`: 兼容 OpenAI 的聊天 API (对应原项目 `/openai/v1/chat/completions`)
  - `POST /api/gemini/v1beta/[...model]`: 代理原生 Gemini API (对应原项目 `/gemini/v1beta/...` 和 `/v1/...`)
  - `POST /api/auth/token`: 用于登录认证 (对应原项目 `/auth`)

### 2. 路由对应关系和差距分析

| 原项目功能        | 原项目路由                          | 新项目对应路由                        | 状态                                    |
| :---------------- | :---------------------------------- | :------------------------------------ | :-------------------------------------- |
| **核心 API**      |                                     |                                       |                                         |
| OpenAI Chat       | `/openai/v1/chat/completions`       | `/api/v1/chat/completions`            | **已完成**                              |
| Gemini Proxy      | `/gemini/v1/...`, `/v1beta/...`     | `/api/gemini/v1beta/[...model]`       | **已完成**                              |
| **管理页面**      |                                     |                                       |                                         |
| 认证页            | `/`                                 | `/auth`                               | **已完成**                              |
| 密钥/配置/日志    | `/keys`, `/config`, `/logs`         | `/admin`                              | **已完成** (功能已整合)                 |
| **管理 API**      |                                     |                                       |                                         |
| 获取/更新配置     | `/api/config`                       | `/api/admin/config` (需要创建)        | **未开始**                              |
| 密钥增删          | `/api/config/keys/...`              | `/api/admin/keys` (需要创建)          | **未开始**                              |
| 日志查询/删除     | `/api/logs/errors/...`              | `/api/admin/logs` (需要创建)          | **未开始**                              |
| 密钥状态管理      | `/gemini/v1/...-fail-counts`        | `/api/admin/keys/status` (需要创建)   | **未开始**                              |
| **其他 API**      |                                     |                                       |                                         |
| OpenAI Models     | `/openai/v1/models`                 | `/api/v1/models` (需要创建)           | **未开始**                              |
| OpenAI Images     | `/openai/v1/images/generations`     | `/api/v1/images/generations`          | **未开始** (优先级 3)                   |
| OpenAI Embeddings | `/openai/v1/embeddings`             | `/api/v1/embeddings`                  | **未开始** (优先级 3)                   |
| Gemini Models     | `/gemini/v1/models`                 | `/api/gemini/v1beta/models`           | **已完成** (通过代理)                   |
| Gemini Tokens     | `/gemini/v1/models/...:countTokens` | `/api/gemini/v1beta/...:countTokens`  | **已完成** (通过代理)                   |
| Vertex AI         | `/vertex-express/...`               | -                                     | **未移植** (按需)                       |
| 统计              | `/api/stats/...`                    | `/api/admin/stats` (需要创建)         | **未开始**                              |
| 版本检查          | `/api/version/check`                | `/api/admin/version/check` (需要创建) | **未开始**                              |
| 定时任务          | `/api/scheduler/...`                | -                                     | **未移植** (Next.js 环境下需要重新设计) |
| 健康检查          | `/health`                           | `/api/health` (需要创建)              | **未开始**                              |

## 三、 Next.js 新项目功能实现方案 (优化版：采用 Server Actions)

采纳最新建议，我们将优先使用 Next.js Server Actions 来实现管理功能，以替代传统的 API 路由，从而简化架构、提升性能和类型安全。

### 1. 必须保留的 API 路由

以下是需要作为公共端点暴露给外部客户端的核心 API，必须保留为传统的 API 路由：

- `POST /api/v1/chat/completions`: OpenAI 兼容聊天 API。
- `POST /api/gemini/v1beta/[...model]`: 原生 Gemini API 代理。
- `GET /api/v1/models`: (待办) OpenAI 兼容的模型列表 API。
- `POST /api/v1/images/generations`: (待办, 优先级 3) OpenAI 兼容的图像生成 API。
- `POST /api/v1/embeddings`: (待办, 优先级 3) OpenAI 兼容的嵌入 API。
- `GET /api/health`: (待办) 用于服务监控的健康检查 API。

### 2. 使用 Server Actions 实现的功能清单

原项目中所有用于后台管理的 API 路由，都将转为使用 Server Actions 实现。这些 Actions 将集中在 `src/app/admin/actions.ts` 文件中，由管理页面 (`/admin`) 的组件直接调用。

- **配置管理**:
  - `getSettings()`: 获取所有配置项。
  - `updateSettings(settings: Setting[])`: 批量更新配置项。
- **密钥管理**:
  - `addApiKey(key: string)`: (已实现) 添加单个 API 密钥。
  - `addApiKeys(keys: string[])`: 批量添加 API 密钥。
  - `deleteApiKeys(keys: string[])`: (已实现) 批量删除 API 密钥。
  - `verifyApiKeys(keys: string[])`: 批量验证密钥的有效性。
  - `resetKeysFailures(keys: string[])`: (已实现) 批量重置密钥失败计数。
- **日志管理**:
  - `getLogs(filters: LogFilters)`: 根据过滤条件（类型、关键词、日期范围、分页）获取日志。
  - `deleteLogs(logIds: number[])`: 批量删除日志。
  - `clearAllLogs(logType: 'error' | 'request')`: 清空所有错误或请求日志。
- **统计数据**:
  - `getDashboardStats()`: 获取监控面板所需的全部统计数据（密钥统计、API 调用统计等）。
  - `getKeyUsageDetails(apiKey: string)`: (已实现) 获取单个密钥的使用详情。
- **版本检查**:
  - `getUpdateInfo()`: 检查并返回应用的版本更新信息。

**说明**:

- **定时任务**: 此功能在 Next.js (尤其是 Vercel 部署) 环境下，应通过 Vercel Cron Jobs 实现，而不是通过 API 或 Server Action 触发，因此无需移植。
- **Vertex AI**: 相关功能可根据未来需求决定是否移植。

---

此文档完成了第二步工作。

## 四、 ALLOW_TOKENS 和 AUTH_TOKEN 功能分析与移植 (优化版：采用 Server Actions)

### 1. 功能分析

- **`AUTH_TOKEN`**:

  - **用途**: 在 Python 原项目中，这是一个单一的字符串，专门用于保护管理后台 UI（`/keys`, `/config`, `/logs` 等页面）的访问。用户必须在登录页面输入正确的 `AUTH_TOKEN` 才能访问这些管理界面。
  - **Next.js 对等实现**: 此功能在 Next.js 项目中已经通过 `src/middleware.ts` 实现。中间件会检查请求的 cookie 中是否包含有效的认证令牌，如果未认证，则重定向到 `/auth` 页面。因此，**此功能已完全移植**。

- **`ALLOWED_TOKENS`**:
  - **用途**: 这是一个字符串列表，作为 API 级别的认证令牌池。所有受保护的 API 端点（如 `/openai/v1/chat/completions`）都会验证请求头 (`Authorization: Bearer <token>`) 中的令牌是否在此列表中。它允许多个不同的客户端或应用使用不同的令牌来访问服务。
  - **Next.js 对等实现**: Next.js 项目目前**缺少**这一机制。API 路由目前是公开的，没有进行访问控制。

### 2. 移植 `ALLOWED_TOKENS` 功能的工作清单 (优化版：采用 Server Actions)

结合 Server Actions 的架构，移植 `ALLOWED_TOKENS` 的工作清单更新如下：

1.  **更新配置管理**:

    - **数据库层面**: 在 `prisma/schema.prisma` 的 `Setting` 模型中，确认已有一个用于存储字符串键值对的通用结构。我们将利用它来存储 `ALLOWED_TOKENS`，其值为一个逗号分隔的令牌字符串。
    - **Server Action**: 创建或更新一个 `updateSettings` Server Action。这个 Action 将接收一个包含 `key: 'ALLOWED_TOKENS'` 和 `value: 'token1,token2,...'` 的对象，并将其保存到数据库。
    - **UI 组件**: 在 `/admin` 页面的“系统配置”部分，添加一个文本输入域，用于显示和编辑 `ALLOWED_TOKENS` 列表。该组件的保存按钮将直接调用 `updateSettings` Server Action。

2.  **更新 API 认证中间件 (`src/middleware.ts`)**:

    - **扩展中间件逻辑**: 在现有的 `src/middleware.ts` 中，扩展其匹配逻辑，使其也对需要保护的 API 路由生效（如 `/api/v1/*`, `/api/gemini/*`）。
    - **实现认证逻辑**:
      - 当请求匹配 API 路由时，中间件需要从数据库中读取 `ALLOWED_TOKENS` 的设置。
      - 它需要检查 API 请求的 `Authorization` 请求头。
      - 如果请求头存在且格式为 `Bearer <token>`，中间件需要验证 `<token>` 是否在从数据库获取的 `ALLOWED_TOKENS` 列表中。
      - 如果验证失败，中间件应返回 `401 Unauthorized` 响应。
      - 如果验证成功，请求将被放行到目标 API 路由。

3.  **更新文档**:
    - 在 `README.md` 中更新 API 使用说明，告知用户如何通过 `Authorization: Bearer <token>` 请求头来调用受保护的 API 端点。

## 五、 管理界面布局复刻方案

通过分析原项目的 `keys_status.html`, `config_editor.html`, 和 `error_logs.html`，可以为新项目的 `/admin` 页面设计一个功能对等且体验更佳的统一布局。

### 1. 整体页面结构

建议采用**标签页 (Tabs)** 布局作为顶层结构，完全取代原项目在不同页面间跳转的方式。

- **主容器**: 整个 `/admin` 页面包裹在一个主容器中。
- **顶部标签页**: 在页面顶部设置三个主标签：
  - **监控面板 (Dashboard)**: 对应原 `keys_status.html`。
  - **系统配置 (Settings)**: 对应原 `config_editor.html`。
  - **日志中心 (Logs)**: 对应原 `error_logs.html`。

### 2. “监控面板”标签页布局 (复刻 `keys_status.html`)

此标签页专注于展示状态和关键指标。

- **统计卡片网格 (Stats Grid)**:
  - 在页面顶部放置一组统计卡片，与原项目类似。
  - **卡片一：密钥统计**: 显示总密钥、有效密钥、无效密钥的数量。
  - **卡片二：API 调用统计**: 显示不同时间窗口（如 1h, 24h, 7d）的总调用、成功、失败次数。
- **密钥列表区域 (Key Lists)**:
  - 使用两个可折叠的卡片 (Accordions) 分别展示“有效密钥列表”和“无效密钥列表”。
  - **列表头部**: 每个列表的头部应包含筛选、搜索、排序和批量操作（全选、批量验证、重置、删除）的控件。
  - **密钥卡片**: 列表中的每一项都是一个独立的卡片，清晰地展示密钥（部分隐藏）、失败次数、状态，并提供单个操作按钮（验证、重置、删除、查看详情）。
  - **分页**: 在列表下方实现分页控件。

### 3. “系统配置”标签页布局 (复刻 `config_editor.html`)

此标签页用于管理所有系统参数，建议使用二级标签页来分类。

- **二级标签页**: 在“系统配置”主内容区内，再设置一层标签页，用于组织不同类别的配置项。
  - API 配置
  - 模型配置
  - 图像与 TTS 配置
  - 日志与任务配置
- **配置表单**:
  - 在每个二级标签页内部，使用表单来展示和修改配置。
  - 对于列表类型的配置（如 `API_KEYS`, `ALLOWED_TOKENS`），应提供动态添加/删除输入框的功能。
  - 对于布尔值，使用开关 (Switch/Toggle) 组件。
  - 在页面底部设置“保存”和“重置为默认”按钮。

### 4. “日志中心”标签页布局 (复刻 `error_logs.html`)

此标签页用于日志的查询和管理。

- **过滤与搜索栏**:
  - 在页面顶部设置一个包含所有过滤条件的区域：关键词搜索、密钥搜索、日期范围选择等。
  - 旁边放置“搜索”、“清空日志”、“删除选中”等操作按钮。
- **日志表格 (Logs Table)**:
  - 使用一个功能强大的数据表格 (Data Table) 组件来展示日志。
  - **列**: ID, 时间, 密钥, 错误类型, 错误码, 模型, 操作。
  - **功能**: 支持列排序、行选择（用于批量删除）。
  - **操作列**: 提供“查看详情”按钮，点击后弹出模态框显示完整的日志信息。
- **分页**: 在表格下方实现分页控件。

### 5. 组件化建议

- **卡片 (Card)**: 用于包裹统计信息、密钥项、配置区域等。
- **标签页 (Tabs)**: 用于主导航和配置分类。
- **表格 (Table)**: 用于展示日志数据，最好是带有排序、筛选、分页功能的组件。
- **模态框 (Modal)**: 用于操作确认、显示日志详情、批量添加密钥等。
- **输入框 (Input/Textarea)**, **开关 (Switch)**, **选择框 (Select)**: 构建配置表单。
- **按钮 (Button)**: 统一风格，用于所有可交互操作。

通过这种方式，可以将原项目分散在多个页面的功能，高度整合到一个结构清晰、易于导航的现代化管理仪表盘中，完成对原项目管理界面布局的复刻和超越。

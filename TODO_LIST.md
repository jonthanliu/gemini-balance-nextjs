# Next.js 项目 (gemini-balance-nextjs) 后续开发任务清单

本文档为开发团队提供一份按优先级排序的、详细的工作任务清单。所有管理功能将优先采用 Next.js Server Actions 实现。

---

## 优先级 1: 核心 API 安全与后台功能完善

**目标：补齐最核心的安全认证和后台管理功能，确保项目可被安全地部署和管理。**

### 任务 1.1: 实现统一的配置管理与 API 访问控制 [已完成]

**描述**: 建立一套健壮的配置管理机制，确保环境变量（`.env`）和数据库（`Prisma`）中的配置能够协同工作。在此基础上，为核心 API 路由启用 `Bearer Token` 认证。

**具体步骤**:

1.  **[x] 创建统一的配置加载服务**:

    - **文件**: `src/lib/settings.ts` (新建)
    - **任务**:
      - 创建一个 `getSettings()` 函数，作为全应用获取配置的唯一来源。
      - **实现逻辑**:
        - 首次调用时，从数据库 (`prisma.setting.findMany()`) 加载所有配置。
        - 对于每一个配置项（如 `ALLOWED_TOKENS`），检查数据库中是否存在。
        - 如果数据库中**不存在**，则尝试从对应的环境变量（如 `process.env.ALLOWED_TOKENS`）读取初始值。
        - 如果环境变量中有值，则将该值**写入数据库**并存入内存缓存。
        - 如果环境变量中也无值，则使用代码中定义的硬编码默认值，并写入数据库。
        - 将所有配置项缓存到内存中（例如一个 `Map` 或简单的对象），避免后续重复查询数据库。
      - 提供一个 `resetSettings()` 函数，用于在配置更新后清空内存缓存，强制下次调用时重新从数据库加载。

2.  **[x] 实现 API 访问控制 (`ALLOWED_TOKENS`)**:

    - **文件**: `src/middleware.ts`
    - **任务**:
      - 扩展 `matcher` 配置，使其包含需要保护的 API 路由，例如 `'/api/v1/:path*', '/api/gemini/:path*'`。
      - 在中间件函数中，调用 `getSettings()` 获取 `ALLOWED_TOKENS` 列表。
      - 解析请求头 `Authorization: Bearer <token>`。
      - 验证 `token` 是否在 `ALLOWED_TOKENS` 列表中。
      - 如果验证失败，返回 `401 Unauthorized` 响应。

3.  **[x] 实现 `ALLOWED_TOKENS` 的后台管理**:
    - **文件**: `src/app/admin/actions.ts`
    - **任务**:
      - 创建一个 Server Action `updateSetting(key: string, value: string)`。
      - 该 Action 负责更新数据库中 `Setting` 表的单个键值对。
      - 调用 `resetSettings()` 来清除配置缓存。
    - **文件**: `src/app/admin/ConfigCard.tsx` (或创建一个新组件)
    - **任务**: 在“系统配置”页面中，添加一个文本区域（Textarea）用于编辑 `ALLOWED_TOKENS`，其“保存”按钮调用 `updateSetting` Server Action。

### 任务 1.2: 完善后台日志管理功能 [已完成]

**描述**: 在“日志中心”标签页中，实现对错误日志和请求日志的完整 CRUD 操作。

**具体步骤**:

1.  **[x] 创建 Server Actions**:

    - **文件**: `src/app/admin/actions.ts`
    - **任务**:
      - 创建 `getLogs(filters)`: 接收过滤条件（如日志类型, 关键词, 日期范围, 分页参数），从 `RequestLog` 和 `ErrorLog` 表中查询并返回日志数据及总数。
      - 创建 `deleteLogs(logIds: number[], logType: 'error' | 'request')`: 根据 ID 列表和类型删除日志。
      - 创建 `clearAllLogs(logType: 'error' | 'request')`: 清空特定类型的所有日志。

2.  **[x] 构建 UI 界面**:
    - **文件**: 在 `/src/app/admin/` 下创建一个新的组件，例如 `LogCenter.tsx`。
    - **任务**:
      - 构建一个包含筛选控件（搜索框、日期选择器等）的表单。
      - 使用数据表格（Data Table）组件展示 `getLogs` 返回的数据。
      - 实现表格的排序、行选择和分页功能。
      - 将“搜索”、“删除选中”、“清空全部”等按钮与对应的 Server Action 绑定。
      - 实现点击“查看详情”时，弹出模态框显示完整的日志内容。

---

## 优先级 2: API 功能对齐与基础建设

**目标：补齐与原项目对等的核心 API 端点，完善项目的基础设施。**

### 任务 2.1: 创建 OpenAI 兼容的 `models` 接口 [已完成]

**描述**: 创建一个 API 路由，用于返回兼容 OpenAI 格式的模型列表。

**具体步骤**:

1.  **[x] 创建 API 路由**:
    - **文件**: `src/app/api/v1/models/route.ts`
    - **任务**:
      - 创建一个 `GET` 方法的处理函数。
      - 此路由应受 `ALLOWED_TOKENS` 保护（通过中间件）。
      - 从 `KeyManager` 获取一个有效的 Gemini Key。
      - 调用 Google AI 的模型列表 API。
      - 将返回的 Google 模型列表转换成 OpenAI 的格式（例如 `{"object": "list", "data": [{"id": "gemini-pro", "object": "model", ...}]}`）。
      - 返回转换后的 JSON 数据。

### 任务 2.2: 创建健康检查接口 [已完成]

**描述**: 创建一个简单的健康检查端点，用于外部服务（如 Docker, K8s）进行存活探测。

**具体步骤**:

1.  **[x] 创建 API 路由**:
    - **文件**: `src/app/api/health/route.ts`
    - **任务**:
      - 创建一个 `GET` 方法的处理函数。
      - 该路由**不应**受任何认证保护。
      - 简单地返回一个 `200 OK` 响应和 JSON 体，例如 `{"status": "healthy"}`。

---

## 优先级 3: 高级功能与体验优化

**目标：在核心功能稳定后，开发高级 API 功能并优化管理后台的用户体验。**

### 任务 3.1: 实现管理后台的完整布局 [已完成]

**描述**: 根据 `PROJECT_COMPARISON.md` 第五节的设计方案，将 `/admin` 页面重构为包含“监控面板”、“系统配置”和“日志中心”三个主标签页的统一仪表盘。

**具体步骤**:

1.  **[x] 重构页面**:
    - **文件**: `src/app/admin/page.tsx`
    - **任务**:
      - 引入一个标签页组件（Tab Component）。
      - 将现有的监控统计和密钥列表功能移入“监控面板”标签页。
      - 将**任务 1.2** 中创建的 `LogCenter.tsx` 组件放入“日志中心”标签页。
      - 将**任务 1.1** 中创建的配置管理 UI 组件放入“系统配置”标签页。

### 任务 3.2: 实现 OpenAI 兼容的图像和嵌入 API

**描述**: 开发 `images/generations` 和 `embeddings` 两个 API 路由，以兼容 OpenAI 的相应接口。

**具体步骤**:

1.  **创建图像生成路由**:

    - **文件**: `src/app/api/v1/images/generations/route.ts`
    - **任务**: 实现 `POST` 方法，接收 OpenAI 格式的请求，调用 Gemini 图像生成模型，并将结果适配为 OpenAI 格式返回。

2.  **创建嵌入路由**:
    - **文件**: `src/app/api/v1/embeddings/route.ts`
    - **任务**: 实现 `POST` 方法，接收 OpenAI 格式的请求，调用 Gemini embedding 模型，并将结果适配为 OpenAI 格式返回。

# 重构任务清单 - 2025/07/13

本文档根据 `CODE_REVIEW.md` 的审查结果和进一步的代码分析，列出了详细的重构任务、优先级和跟踪状态。

## P0: 关键 Bug 修复 (最高优先级)

这些是必须立即解决的严重问题，它们直接影响服务的稳定性和核心功能。

- [x] **[高] [健壮性] 修复：在 API 请求成功后重置密钥的失败计数**
  - **文件路径**: `src/app/openai/v1/chat/completions/route.ts`
  - **问题描述**: `KeyManager` 的失败计数在请求成功后没有被重置，这将导致功能正常的密钥在多次请求成功后，因为之前其他密钥的失败积累而被错误地禁用。
  - **重构方案**: 在 `fetch` 请求成功返回 `geminiResponse.ok` 的代码块中，找到正确的位置，调用 `keyManager.resetKeyFailureCount(apiKey)` 来清除该密钥的失败记录。

## P1: 结构与核心逻辑重构 (高优先级)

这些任务旨在优化项目核心结构，消除冗余，提高模块化和可维护性。

- [x] **[高] [可维护性] 重构：抽象并复用 Gemini API 请求逻辑**

  - **文件路径**: `src/app/openai/v1/chat/completions/route.ts`, `src/lib/gemini-proxy.ts`
  - **问题描述**: `gemini-proxy.ts` 和 `chat/completions/route.ts` 中存在重复的 `fetch` 代理逻辑，并且 `completions/route.ts` 的 `POST` 函数逻辑过于复杂，违反了单一职责原则。
  - **重构方案**:
    1. 创建一个新文件 `src/lib/gemini-client.ts`。
    2. 在新文件中创建一个核心函数，如 `callGeminiApi`，统一封装 `fetch` 请求、重试循环、密钥管理、以及成功的和失败的日志记录逻辑。
    3. 重构 `completions/route.ts`，使其 `POST` 函数的主体仅负责解析请求、调用 `callGeminiApi` 并返回响应。
    4. 重构 `gemini-proxy.ts`，使其也调用 `callGeminiApi`，从而消除代码重复。

- [x] **[高] [健壮性] 重构：使用 @google/generative-ai SDK 处理流数据**

  - **文件路径**: `src/lib/gemini-client.ts`, `src/app/openai/v1/chat/completions/route.ts`
  - **问题描述**: 项目当前手动解析 Gemini API 的流式响应，这种方法复杂、脆弱且难以维护。一旦上游 API 格式变更，代码就会失效。
  - **重构方案**:
    1. **重构 `gemini-client.ts`**: 修改 `callGeminiApi` 函数，不再使用手动的 `fetch`，而是为每个 API 密钥初始化一个 `@google/generative-ai` 的 `GoogleGenerativeAI` 实例。
    2. **使用 SDK 调用**: 使用 `genAI.getGenerativeModel(...).generateContentStream()` 方法来发起流式请求。
    3. **简化流转换**: 重构 `completions/route.ts` 中的 `transformGeminiStreamToOpenAIStream` 函数。使其直接处理由 SDK 返回的流对象，而不是手动的 `Response` 对象。
    4. **清理无用代码**: 完全移除 `cleanJsonString`, `safeJsonParse`, 和 `processBufferContent` 这三个手动解析流的辅助函数。

- [x] **[高] [可读性] 配置：将硬编码的 URL 外部化**

  - **文件路径**: `src/lib/gemini-proxy.ts`, `src/app/openai/v1/chat/completions/route.ts`
  - **问题描述**: 外部服务 `https://generativelanguage.googleapis.com` 的 URL 被硬编码在代码中，属于“魔术字符串”，不利于环境配置和维护。
  - **重构方案**:
    1. 在 `.env.local` 和 `.env.example` 文件中定义 `GOOGLE_API_HOST`。
    2. 修改代码，通过 `process.env` 或集中的 `settings` 模块来读取该配置项。
    3. 使用模板字符串动态构建完整的 API URL。

- [x] **[中] [可维护性] 清理：移除废弃的 Drizzle ORM 配置**
  - **文件路径**: `package.json`, `drizzle/`
  - **问题描述**: 项目中残留着已不再使用的 Drizzle ORM 的依赖、脚本和目录，造成项目混乱。
  - **重构方案**:
    1. 从 `package.json` 的 `devDependencies` 中移除 `"drizzle-kit"`。
    2. 从 `package.json` 的 `scripts` 中移除 `"db:generate"` 脚本。
    3. 从项目根目录中删除 `drizzle/` 目录。
    4. 运行 `pnpm install` 以更新 `pnpm-lock.yaml` 文件。

## P2: 代码质量与性能提升 (中/低优先级)

这些任务旨在进一步提升代码质量、性能和可观测性。

- [x] **[中] [可维护性] 升级：引入结构化日志库**

  - **文件路径**: 全局
  - **问题描述**: 项目当前使用 `console.log` 进行日志输出，这在生产环境中难以进行有效的日志收集、过滤和监控。
  - **重构方案**:
    1. 添加 `pino` 和 `pino-pretty` (用于开发环境) 到项目依赖中。
    2. 创建一个日志服务模块，例如 `src/lib/logger.ts`，用于初始化和导出 logger 实例。
    3. 在整个项目中，将 `console.*` 调用替换为结构化 logger 的调用 (e.g., `logger.info()`, `logger.error()`)。

- [x] **[低] [性能] 优化：改进 `gemini-proxy.ts` 的请求转发**
  - **文件路径**: `src/lib/gemini-proxy.ts`
  - **问题描述**: `proxyRequest` 函数通过 `await request.json()` 读取请求体，然后再用 `JSON.stringify()` 将其转回字符串。这个过程对于代理转发是低效的，涉及不必要的解析和序列化。
  - **重构方案**:
    1. 尝试直接将 `request.body` (ReadableStream) 作为 `fetch` 调用的 `body` 参数进行传递，避免中间转换。
    2. 确保 `Content-Type` 等关键头部信息被正确地从原始请求转发到目标请求。
    3. **注意**: 此方案需要验证 Gemini API 是否支持流式请求体。如果不支持，则当前实现是必要的，但应添加注释说明原因。

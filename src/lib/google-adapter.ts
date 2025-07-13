// src/lib/google-adapter.ts

import { getSettings } from "./settings";

interface GeminiPart {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string;
  };
  image_url?: string;
}

interface GeminiContent {
  role: string;
  parts: GeminiPart[];
}

interface GeminiTool {
  functionDeclarations?: any[];
  codeExecution?: object;
  googleSearch?: object;
}

interface GeminiRequestBody {
  contents: GeminiContent[];
  tools?: GeminiTool[];
  generationConfig?: any;
  systemInstruction?: any;
}

// Based on the Python implementation, this function cleans the JSON schema
// properties that are not supported by the Gemini API.
function cleanJsonSchemaProperties(obj: any): any {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  const unsupportedFields = new Set([
    "exclusiveMaximum",
    "exclusiveMinimum",
    "const",
    "examples",
    "contentEncoding",
    "contentMediaType",
    "if",
    "then",
    "else",
    "allOf",
    "anyOf",
    "oneOf",
    "not",
    "definitions",
    "$schema",
    "$id",
    "$ref",
    "$comment",
    "readOnly",
    "writeOnly",
  ]);

  if (Array.isArray(obj)) {
    return obj.map((item: any) => cleanJsonSchemaProperties(item));
  }

  const cleaned: { [key: string]: any } = {};
  for (const key in obj) {
    if (!unsupportedFields.has(key)) {
      cleaned[key] = cleanJsonSchemaProperties(obj[key]);
    }
  }
  return cleaned;
}

// Builds the 'tools' array based on the model and request payload.
async function buildTools(
  model: string,
  payload: GeminiRequestBody
): Promise<GeminiTool[]> {
  const settings = await getSettings();
  let tool: GeminiTool = {};

  if (payload && typeof payload === "object" && payload.tools) {
    const tools = Array.isArray(payload.tools)
      ? payload.tools
      : [payload.tools];
    const functionDeclarations = tools
      .flatMap((t: GeminiTool) => t.functionDeclarations || [])
      .map(cleanJsonSchemaProperties);
    if (functionDeclarations.length > 0) {
      tool.functionDeclarations = functionDeclarations;
    }
  }

  const hasImage = payload.contents?.some((c: GeminiContent) =>
    c.parts?.some((p: GeminiPart) => p.inline_data || p.image_url)
  );

  if (
    settings.TOOLS_CODE_EXECUTION_ENABLED &&
    !model.endsWith("-search") &&
    !model.includes("-thinking") &&
    !hasImage
  ) {
    tool.codeExecution = {};
  }

  if (model.endsWith("-search")) {
    tool.googleSearch = {};
  }

  if (tool.functionDeclarations) {
    delete tool.googleSearch;
    delete tool.codeExecution;
  }

  return tool && Object.keys(tool).length > 0 ? [tool] : [];
}

// Filters out contents with empty or invalid parts.
function filterEmptyParts(contents: GeminiContent[]): GeminiContent[] {
  if (!contents) return [];
  return contents
    .map((content: GeminiContent) => {
      if (!content || !Array.isArray(content.parts)) return null;
      const validParts = content.parts.filter(
        (part: GeminiPart) =>
          part && typeof part === "object" && Object.keys(part).length > 0
      );
      if (validParts.length === 0) return null;
      return { ...content, parts: validParts };
    })
    .filter(Boolean) as GeminiContent[];
}

// Gets safety settings based on the model.
async function getSafetySettings(model: string): Promise<any[]> {
  const settings = await getSettings();
  // In the future, we might have model-specific settings like 'gemini-2.0-flash-exp'
  return settings.SAFETY_SETTINGS || [];
}

// Main function to build the final payload for the Gemini API.
export async function buildGeminiRequest(
  model: string,
  requestBody: GeminiRequestBody
): Promise<any> {
  const settings = await getSettings();
  const filteredContents = filterEmptyParts(requestBody.contents);
  const tools = await buildTools(model, requestBody);
  const safetySettings = await getSafetySettings(model);

  let generationConfig = requestBody.generationConfig || {};
  if (generationConfig.maxOutputTokens === null) {
    delete generationConfig.maxOutputTokens;
  }

  // Handle thinkingConfig
  if (generationConfig.thinkingConfig === undefined) {
    if (model.endsWith("-non-thinking")) {
      generationConfig.thinkingConfig = { thinkingBudget: 0 };
    } else if (
      settings.THINKING_BUDGET_MAP &&
      settings.THINKING_BUDGET_MAP[model]
    ) {
      generationConfig.thinkingConfig = {
        thinkingBudget: settings.THINKING_BUDGET_MAP[model],
      };
    }
  }

  const payload = {
    contents: filteredContents,
    tools,
    safetySettings,
    generationConfig,
    systemInstruction: requestBody.systemInstruction,
  };

  if (model.endsWith("-image") || model.endsWith("-image-generation")) {
    delete payload.systemInstruction;
    payload.generationConfig.responseModalities = ["Text", "Image"];
  }

  return payload;
}

export function formatGoogleModelsToOpenAI(googleModels: any): any {
  if (!googleModels || !Array.isArray(googleModels.models)) {
    return { object: "list", data: [] };
  }

  return {
    object: "list",
    data: googleModels.models.map((model: any) => ({
      id: model.name.replace("models/", ""),
      object: "model",
      created: Date.now(),
      owned_by: "google",
    })),
  };
}

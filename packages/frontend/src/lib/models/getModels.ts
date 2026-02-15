interface ModelVariant {
  fullKey: string;
  provider: string;
  inputCostPer1M: number | null;
  outputCostPer1M: number | null;
  cacheReadPer1M: number | null;
  cacheWritePer1M: number | null;
  contextWindow: number | null;
  maxOutput: number | null;
  capabilities: string[];
}

interface DeduplicatedModel {
  name: string;
  cheapestVariant: ModelVariant;
  variantCount: number;
  variants: ModelVariant[];
}

interface ModelsResponse {
  models: DeduplicatedModel[];
  providers: string[];
  totalCount: number;
}

const LITELLM_URL =
  "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";

const PROVIDER_PREFIXES = [
  "bedrock_converse/",
  "together_ai/",
  "fireworks_ai/",
  "cohere_chat/",
  "vertex_ai_beta/",
  "vertex_ai/",
  "azure_ai/",
  "azure/",
  "bedrock/",
  "anthropic/",
  "openai/",
  "google/",
  "deepseek/",
  "mistral/",
  "groq/",
  "xai/",
];

const REGIONAL_PREFIXES = ["us.", "eu.", "apac.", "global."];

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  bedrock: "AWS Bedrock",
  bedrock_converse: "AWS Bedrock",
  vertex_ai: "Vertex AI",
  vertex_ai_beta: "Vertex AI",
  azure: "Azure",
  azure_ai: "Azure",
  together_ai: "Together AI",
  fireworks_ai: "Fireworks AI",
  deepseek: "DeepSeek",
  mistral: "Mistral",
  cohere_chat: "Cohere",
  groq: "Groq",
  xai: "xAI",
};

const CAPABILITY_MAP: Record<string, string> = {
  supports_vision: "Vision",
  supports_function_calling: "Functions",
  supports_reasoning: "Reasoning",
  supports_prompt_caching: "Caching",
  supports_response_schema: "Schema",
  supports_web_search: "Web Search",
  supports_pdf_input: "PDF",
  supports_audio_input: "Audio",
  supports_computer_use: "Computer Use",
};

function toPerMillion(val: unknown): number | null {
  if (val === null || val === undefined || val === 0) return null;
  if (typeof val !== "number") return null;
  return val * 1_000_000;
}

function getProviderDisplayName(raw: string): string {
  if (PROVIDER_DISPLAY_NAMES[raw]) return PROVIDER_DISPLAY_NAMES[raw];
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function stripToBaseName(key: string): string {
  let name = key;

  for (const prefix of PROVIDER_PREFIXES) {
    if (name.startsWith(prefix)) {
      name = name.slice(prefix.length);
      break;
    }
  }

  for (const prefix of REGIONAL_PREFIXES) {
    if (name.startsWith(prefix)) {
      name = name.slice(prefix.length);
      break;
    }
  }

  return name;
}

function extractCapabilities(entry: Record<string, unknown>): string[] {
  const caps: string[] = [];
  for (const [key, displayName] of Object.entries(CAPABILITY_MAP)) {
    if (entry[key] === true) {
      caps.push(displayName);
    }
  }
  return caps;
}

function totalCost(v: ModelVariant): number {
  return (v.inputCostPer1M ?? Infinity) + (v.outputCostPer1M ?? Infinity);
}

export async function getModelsData(): Promise<ModelsResponse> {
  const res = await fetch(LITELLM_URL, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`LiteLLM fetch failed: ${res.status}`);
  }

  const raw: Record<string, Record<string, unknown>> = await res.json();

  const groups = new Map<string, ModelVariant[]>();
  const providerSet = new Set<string>();

  for (const [key, entry] of Object.entries(raw)) {
    if (key === "sample_spec") continue;
    if (entry.mode !== "chat") continue;

    const providerRaw = (entry.litellm_provider as string) || "";
    const displayProvider = getProviderDisplayName(providerRaw);
    providerSet.add(displayProvider);

    const variant: ModelVariant = {
      fullKey: key,
      provider: displayProvider,
      inputCostPer1M: toPerMillion(entry.input_cost_per_token),
      outputCostPer1M: toPerMillion(entry.output_cost_per_token),
      cacheReadPer1M: toPerMillion(entry.cache_read_input_token_cost),
      cacheWritePer1M: toPerMillion(entry.cache_creation_input_token_cost),
      contextWindow: (entry.max_input_tokens as number) ?? null,
      maxOutput: (entry.max_output_tokens as number) ?? null,
      capabilities: extractCapabilities(entry),
    };

    const baseName = stripToBaseName(key);
    const existing = groups.get(baseName);
    if (existing) {
      existing.push(variant);
    } else {
      groups.set(baseName, [variant]);
    }
  }

  const models: DeduplicatedModel[] = [];

  for (const [name, variants] of groups) {
    variants.sort((a, b) => totalCost(a) - totalCost(b));

    models.push({
      name,
      cheapestVariant: variants[0],
      variantCount: variants.length,
      variants,
    });
  }

  models.sort((a, b) => a.name.localeCompare(b.name));

  const providers = Array.from(providerSet).sort((a, b) =>
    a.localeCompare(b)
  );

  return {
    models,
    providers,
    totalCount: models.length,
  };
}

export type { ModelVariant, DeduplicatedModel, ModelsResponse };

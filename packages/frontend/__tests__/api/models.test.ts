import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockLiteLLMData: Record<string, Record<string, unknown>> = {
  sample_spec: {
    max_tokens: 100,
    max_input_tokens: 100,
    max_output_tokens: 100,
    input_cost_per_token: 0,
    output_cost_per_token: 0,
    litellm_provider: "openai",
    mode: "chat",
  },
  "anthropic/claude-opus-4-6": {
    mode: "chat",
    litellm_provider: "anthropic",
    input_cost_per_token: 0.000015,
    output_cost_per_token: 0.000075,
    max_input_tokens: 200000,
    max_output_tokens: 32000,
    supports_vision: true,
    supports_function_calling: true,
  },
  "bedrock/anthropic.claude-opus-4-6": {
    mode: "chat",
    litellm_provider: "bedrock",
    input_cost_per_token: 0.000015,
    output_cost_per_token: 0.000075,
    max_input_tokens: 200000,
    max_output_tokens: 32000,
    supports_vision: true,
  },
  "openai/gpt-4o": {
    mode: "chat",
    litellm_provider: "openai",
    input_cost_per_token: 0.0000025,
    output_cost_per_token: 0.00001,
    max_input_tokens: 128000,
    max_output_tokens: 16384,
    supports_function_calling: true,
  },
  "dall-e-3": {
    mode: "image_generation",
    litellm_provider: "openai",
    input_cost_per_token: 0,
    output_cost_per_token: 0,
  },
  "text-embedding-3-small": {
    mode: "embedding",
    litellm_provider: "openai",
    input_cost_per_token: 0.00000002,
    output_cost_per_token: 0,
  },
};

// Must stub fetch before importing the route module
vi.stubGlobal('fetch', vi.fn());

describe('GET /api/models', () => {
  let GET: (request: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();

    (global.fetch as ReturnType<typeof vi.fn>).mockReset();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockLiteLLMData,
    });

    const mod = await import('../../src/app/api/models/route');
    GET = mod.GET;
  });

  async function callGET() {
    const request = new Request('http://localhost:3000/api/models');
    const response = await GET(request);
    return response.json();
  }

  it('returns valid response structure', async () => {
    const data = await callGET();

    expect(data).toHaveProperty('models');
    expect(data).toHaveProperty('providers');
    expect(data).toHaveProperty('totalCount');
    expect(Array.isArray(data.models)).toBe(true);
    expect(Array.isArray(data.providers)).toBe(true);
    expect(typeof data.totalCount).toBe('number');

    for (const model of data.models) {
      expect(model).toHaveProperty('name');
      expect(model).toHaveProperty('cheapestVariant');
      expect(model).toHaveProperty('variantCount');
      expect(model).toHaveProperty('variants');
    }
  });

  it('only includes chat models', async () => {
    const data = await callGET();
    const names = data.models.map((m: { name: string }) => m.name);

    expect(names).not.toContain('dall-e-3');
    expect(names).not.toContain('text-embedding-3-small');
  });

  it('excludes sample_spec', async () => {
    const data = await callGET();
    const names = data.models.map((m: { name: string }) => m.name);

    expect(names).not.toContain('sample_spec');
  });

  it('deduplicates models by base name', async () => {
    const data = await callGET();

    const anthropicStripped = data.models.find((m: { name: string }) => m.name === 'claude-opus-4-6');
    expect(anthropicStripped).toBeDefined();

    const bedrockStripped = data.models.find((m: { name: string }) => m.name === 'anthropic.claude-opus-4-6');
    expect(bedrockStripped).toBeDefined();

    expect(anthropicStripped.variantCount).toBe(1);
    expect(bedrockStripped.variantCount).toBe(1);
  });

  it('deduplicates true duplicates sharing the same base name', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReset();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        "openai/gpt-4o": {
          mode: "chat",
          litellm_provider: "openai",
          input_cost_per_token: 0.0000025,
          output_cost_per_token: 0.00001,
          max_input_tokens: 128000,
          max_output_tokens: 16384,
        },
        "azure/gpt-4o": {
          mode: "chat",
          litellm_provider: "azure",
          input_cost_per_token: 0.0000025,
          output_cost_per_token: 0.00001,
          max_input_tokens: 128000,
          max_output_tokens: 16384,
        },
      }),
    });

    vi.resetModules();
    const mod = await import('../../src/app/api/models/route');
    const request = new Request('http://localhost:3000/api/models');
    const response = await mod.GET(request);
    const data = await response.json();

    const gpt4o = data.models.find((m: { name: string }) => m.name === 'gpt-4o');
    expect(gpt4o).toBeDefined();
    expect(gpt4o.variantCount).toBe(2);
    expect(gpt4o.variants).toHaveLength(2);
  });

  it('formats prices per 1M tokens', async () => {
    const data = await callGET();

    const claude = data.models.find((m: { name: string }) => m.name === 'claude-opus-4-6');
    expect(claude).toBeDefined();
    // 0.000015 * 1_000_000 = 15
    expect(claude.cheapestVariant.inputCostPer1M).toBe(15);
    // 0.000075 * 1_000_000 = 75
    expect(claude.cheapestVariant.outputCostPer1M).toBe(75);
  });

  it('populates providers list', async () => {
    const data = await callGET();

    expect(data.providers).toContain('Anthropic');
    expect(data.providers).toContain('OpenAI');
    expect(data.providers).toContain('AWS Bedrock');
  });

  it('extracts capabilities from model entries', async () => {
    const data = await callGET();

    const claude = data.models.find((m: { name: string }) => m.name === 'claude-opus-4-6');
    expect(claude).toBeDefined();
    expect(claude.cheapestVariant.capabilities).toContain('Vision');
    expect(claude.cheapestVariant.capabilities).toContain('Functions');
  });

  it('returns 500 when LiteLLM fetch fails', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReset();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 502,
    });

    vi.resetModules();
    const mod = await import('../../src/app/api/models/route');
    const request = new Request('http://localhost:3000/api/models');
    const response = await mod.GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('sets totalCount to number of deduplicated models', async () => {
    const data = await callGET();

    expect(data.totalCount).toBe(data.models.length);
  });

  it('sorts models alphabetically by name', async () => {
    const data = await callGET();
    const names = data.models.map((m: { name: string }) => m.name);
    const sorted = [...names].sort((a: string, b: string) => a.localeCompare(b));

    expect(names).toEqual(sorted);
  });

  it('treats zero-cost tokens as null per-million', async () => {
    const data = await callGET();

    const gpt4o = data.models.find((m: { name: string }) => m.name === 'gpt-4o');
    expect(gpt4o).toBeDefined();
    // 0.0000025 * 1_000_000 = 2.5
    expect(gpt4o.cheapestVariant.inputCostPer1M).toBe(2.5);
    // 0.00001 * 1_000_000 = 10
    expect(gpt4o.cheapestVariant.outputCostPer1M).toBe(10);
  });
});

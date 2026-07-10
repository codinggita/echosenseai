/**
 * KlyvoraAI — Enterprise AI Configuration
 * ─────────────────────────────────────────
 * ALL AI configuration is sourced from here.
 * No model names, API keys, thresholds, or provider strings
 * are hardcoded anywhere else in the codebase.
 */

export const AI_CONFIG = {
  // ─── Active Provider ───────────────────────────────────────────────────────
  // Change this to switch providers platform-wide. No business logic changes.
  activeProvider: process.env.AI_PROVIDER || 'groq',

  // ─── Provider Registry ─────────────────────────────────────────────────────
  providers: {
    groq: {
      name: 'Groq',
      apiKeyEnv: 'GROQ_API_KEY',
      defaultModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      transcriptionModel: process.env.GROQ_TRANSCRIPTION_MODEL || 'whisper-large-v3-turbo',
      supportsTranscription: true,
      supportsJsonMode: true,
    },
    openai: {
      name: 'OpenAI',
      apiKeyEnv: 'OPENAI_API_KEY',
      defaultModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      supportsTranscription: true,
      supportsJsonMode: true,
    },
    gemini: {
      name: 'Google Gemini',
      apiKeyEnv: 'GEMINI_API_KEY',
      defaultModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      supportsTranscription: false,
      supportsJsonMode: true,
    },
    claude: {
      name: 'Anthropic Claude',
      apiKeyEnv: 'ANTHROPIC_API_KEY',
      defaultModel: process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307',
      supportsTranscription: false,
      supportsJsonMode: false,
    },
    openrouter: {
      name: 'OpenRouter',
      apiKeyEnv: 'OPENROUTER_API_KEY',
      defaultModel: process.env.OPENROUTER_MODEL || 'mistralai/mistral-7b-instruct',
      supportsTranscription: false,
      supportsJsonMode: false,
    },
  },

  // ─── Runtime Settings ──────────────────────────────────────────────────────
  runtime: {
    maxRetries: parseInt(process.env.AI_MAX_RETRIES) || 2,
    retryDelayMs: parseInt(process.env.AI_RETRY_DELAY_MS) || 500,
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS) || 30000,
    fallbackProvider: process.env.AI_FALLBACK_PROVIDER || null,
    maxTokens: parseInt(process.env.AI_MAX_TOKENS) || 1024,
    temperature: parseFloat(process.env.AI_TEMPERATURE) || 0,
  },

  // ─── Memory Settings (Hindsight Adapter) ───────────────────────────────────
  memory: {
    maxMemoriesPerRetrieval: parseInt(process.env.MEMORY_MAX_RETRIEVE) || 5,
    similarityThreshold: parseFloat(process.env.MEMORY_SIMILARITY_THRESHOLD) || 0.3,
    maxMemoriesPerOrg: parseInt(process.env.MEMORY_MAX_PER_ORG) || 1000,
    deduplicationThreshold: parseFloat(process.env.MEMORY_DEDUP_THRESHOLD) || 0.85,
    categories: [
      'customer_experience',
      'service_quality',
      'product_quality',
      'staff_behavior',
      'cleanliness',
      'pricing',
      'operational',
      'safety',
      'general',
    ],
    enabled: process.env.MEMORY_ENABLED !== 'false',
  },

  // ─── Recommendation Engine Settings ────────────────────────────────────────
  recommendations: {
    minConfidence: parseFloat(process.env.REC_MIN_CONFIDENCE) || 0.5,
    categories: [
      'operational_improvement',
      'staff_training',
      'customer_experience',
      'service_quality',
      'product_quality',
      'cleanliness',
      'pricing',
      'process_improvement',
      'escalation_required',
      'management_attention',
    ],
    priorities: ['low', 'medium', 'high', 'critical'],
    maxRecommendations: parseInt(process.env.REC_MAX) || 5,
  },

  // ─── Observability ─────────────────────────────────────────────────────────
  observability: {
    logExecutions: process.env.LOG_AI_EXECUTIONS !== 'false',
    logMemoryOperations: process.env.LOG_MEMORY_OPS !== 'false',
    estimatedCostPerToken: {
      groq: 0.0000001,
      openai: 0.00000015,
      gemini: 0.0000000125,
      claude: 0.00000025,
    },
  },
};

/**
 * Retrieves config for the active provider.
 * @returns {object}
 */
export function getActiveProviderConfig() {
  const provider = AI_CONFIG.activeProvider;
  const config = AI_CONFIG.providers[provider];
  if (!config) {
    throw new Error(`[AI_CONFIG] Unknown provider: "${provider}". Registered providers: ${Object.keys(AI_CONFIG.providers).join(', ')}`);
  }
  return { provider, ...config };
}

/**
 * Retrieves the API key for a given provider from environment.
 * @param {string} providerName
 * @returns {string}
 */
export function getProviderApiKey(providerName) {
  const config = AI_CONFIG.providers[providerName];
  if (!config) throw new Error(`[AI_CONFIG] Unknown provider: "${providerName}"`);
  const key = process.env[config.apiKeyEnv];
  if (!key) throw new Error(`[AI_CONFIG] API key not configured. Set env var: ${config.apiKeyEnv}`);
  return key;
}

/**
 * KlyvoraAI — LLM Provider Interface
 * ─────────────────────────────────────
 * Every LLM provider adapter must implement this interface.
 * The runtime layer only speaks to providers through this contract.
 * Business logic never knows which provider is active.
 */

export class ProviderInterface {
    constructor(name) {
        if (new.target === ProviderInterface) {
            throw new Error('[ProviderInterface] Cannot instantiate abstract class.');
        }
        this.name = name;
    }

    /**
     * Execute a chat completion.
     * @param {object} request - Normalized execution request
     * @param {string} request.systemPrompt - System instructions
     * @param {string} request.userPrompt - User message
     * @param {string} [request.model] - Override model
     * @param {number} [request.temperature]
     * @param {number} [request.maxTokens]
     * @returns {Promise<ProviderResponse>}
     */
    async chat(request) { // eslint-disable-line no-unused-vars
        throw new Error(`[${this.name}] chat() not implemented.`);
    }

    /**
     * Execute audio transcription.
     * @param {object} request
     * @param {Buffer} request.audioBuffer - Raw audio bytes
     * @param {string} request.extension - File extension (webm, mp4, ogg)
     * @param {string} [request.model]
     * @returns {Promise<string>} Transcribed text
     */
    async transcribe(request) { // eslint-disable-line no-unused-vars
        throw new Error(`[${this.name}] transcribe() not implemented. This provider does not support audio.`);
    }

    /**
     * @returns {boolean} Whether this provider supports transcription
     */
    supportsTranscription() {
        return false;
    }

    /**
     * @returns {string} Provider name
     */
    getName() {
        return this.name;
    }
}

/**
 * Normalized response returned by all providers.
 * Controllers always receive this structure regardless of provider.
 */
export class ProviderResponse {
    constructor({
        content,
        model,
        provider,
        promptTokens = 0,
        completionTokens = 0,
        latencyMs = 0,
        raw = null,
    }) {
        this.content = content;           // Parsed JSON or raw string
        this.model = model;               // Actual model used
        this.provider = provider;         // Provider name
        this.promptTokens = promptTokens;
        this.completionTokens = completionTokens;
        this.totalTokens = promptTokens + completionTokens;
        this.latencyMs = latencyMs;
        this.raw = raw;                   // Original provider response (debugging)
        this.timestamp = new Date().toISOString();
    }
}

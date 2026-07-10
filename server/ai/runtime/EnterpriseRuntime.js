/**
 * KlyvoraAI — Enterprise Runtime Layer (cascadeflow)
 * ─────────────────────────────────────────────────────
 * This is the execution operating system of KlyvoraAI.
 *
 * Responsibilities:
 *   - Provider selection from registry
 *   - Request execution with timeouts
 *   - Retry logic with exponential backoff
 *   - Fallback provider strategy
 *   - Response normalization
 *   - Execution metadata tracking
 *
 * Controllers NEVER know which provider answered.
 * The Agent ONLY communicates through this runtime.
 *
 * Future capabilities (interfaces prepared):
 *   - Multi-agent parallel execution
 *   - Streaming responses
 *   - Request caching
 *   - Safety/PII layer plugin
 *   - Language detection plugin
 *   - Prompt guard plugin
 */

import { ProviderRegistry } from '../providers/ProviderRegistry.js';
import { ObservabilityLogger } from '../observability/ObservabilityLogger.js';
import { AI_CONFIG } from '../config/aiConfig.js';

/**
 * Normalized execution result returned by the runtime.
 * Controllers and agents always receive this, regardless of provider.
 */
export class ExecutionResult {
    constructor({
        success,
        content,
        provider,
        model,
        executionId,
        latencyMs,
        promptTokens,
        completionTokens,
        retries,
        fallbackUsed,
        error = null,
    }) {
        this.success = success;
        this.content = content;           // Parsed structured output
        this.provider = provider;
        this.model = model;
        this.executionId = executionId;
        this.latencyMs = latencyMs;
        this.promptTokens = promptTokens;
        this.completionTokens = completionTokens;
        this.totalTokens = promptTokens + completionTokens;
        this.retries = retries;
        this.fallbackUsed = fallbackUsed;
        this.error = error;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Sleep utility for retry backoff.
 * @param {number} ms
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a single provider attempt with timeout.
 * @param {ProviderInterface} provider
 * @param {object} request
 * @param {number} timeoutMs
 * @returns {Promise<ProviderResponse>}
 */
async function executeWithTimeout(provider, request, timeoutMs) {
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`[Runtime] Execution timeout after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([provider.chat(request), timeoutPromise]);
}

/**
 * Core runtime execution engine (cascadeflow).
 */
export const EnterpriseRuntime = {

    /**
     * Execute an AI request through the runtime pipeline.
     *
     * @param {object} params
     * @param {string} params.systemPrompt
     * @param {string} params.userPrompt
     * @param {string} [params.organizationId]
     * @param {string} [params.branchId]
     * @param {number} [params.memoryRetrievalMs]
     * @param {number} [params.memoriesUsed]
     * @returns {Promise<ExecutionResult>}
     */
    async execute(params) {
        const {
            systemPrompt,
            userPrompt,
            organizationId,
            branchId,
            memoryRetrievalMs = 0,
            memoriesUsed = 0,
        } = params;

        const executionId = ObservabilityLogger.generateExecutionId();
        const totalStart = Date.now();

        const {
            maxRetries,
            retryDelayMs,
            timeoutMs,
            maxTokens,
            temperature,
        } = AI_CONFIG.runtime;

        const request = {
            systemPrompt,
            userPrompt,
            maxTokens,
            temperature,
        };

        // ── Plugin Layer (future extension points) ───────────────────────────────
        // When ready:
        //   request = await SafetyPlugin.process(request);
        //   request = await PIIRedactionPlugin.process(request);
        //   request = await PromptGuardPlugin.process(request);
        //   request = await LanguageDetectionPlugin.process(request);

        // ── Primary Provider Execution with Retries ──────────────────────────────
        const primaryProvider = ProviderRegistry.getActive();
        let lastError = null;
        let retries = 0;
        let providerResponse = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const backoffMs = retryDelayMs * Math.pow(2, attempt - 1);
                    ObservabilityLogger.warn(`[Runtime] Retry ${attempt}/${maxRetries} after ${backoffMs}ms — ExecutionID: ${executionId}`);
                    await sleep(backoffMs);
                    retries++;
                }

                providerResponse = await executeWithTimeout(primaryProvider, request, timeoutMs);
                lastError = null;
                break; // Success — exit retry loop

            } catch (err) {
                lastError = err;
                ObservabilityLogger.error(`[Runtime] Provider attempt ${attempt + 1} failed: ${err.message}`, err);
            }
        }

        // ── Fallback Provider Strategy ───────────────────────────────────────────
        let fallbackUsed = false;
        if (!providerResponse && lastError) {
            const fallbackProvider = ProviderRegistry.getFallback();

            if (fallbackProvider) {
                ObservabilityLogger.warn(`[Runtime] Primary provider failed. Activating fallback: ${fallbackProvider.getName()} — ExecutionID: ${executionId}`);
                try {
                    providerResponse = await executeWithTimeout(fallbackProvider, request, timeoutMs);
                    fallbackUsed = true;
                    lastError = null;
                } catch (fallbackErr) {
                    ObservabilityLogger.error(`[Runtime] Fallback provider also failed: ${fallbackErr.message}`, fallbackErr);
                    lastError = fallbackErr;
                }
            }
        }

        const totalProcessingMs = Date.now() - totalStart;

        // ── Failure Path ─────────────────────────────────────────────────────────
        if (!providerResponse) {
            const errorMsg = lastError?.message || 'Unknown execution failure';

            ObservabilityLogger.logExecution({
                executionId,
                organizationId,
                branchId,
                provider: primaryProvider.getName(),
                model: AI_CONFIG.providers[AI_CONFIG.activeProvider]?.defaultModel || 'unknown',
                latencyMs: 0,
                retries,
                fallbackUsed,
                memoryRetrievalMs,
                memoriesUsed,
                totalProcessingMs,
                status: 'error',
                error: errorMsg,
            });

            return new ExecutionResult({
                success: false,
                content: null,
                provider: primaryProvider.getName(),
                model: 'unknown',
                executionId,
                latencyMs: 0,
                promptTokens: 0,
                completionTokens: 0,
                retries,
                fallbackUsed,
                error: errorMsg,
            });
        }

        // ── Response Normalization ────────────────────────────────────────────────
        const normalizedContent = this._normalizeResponse(providerResponse.content);

        ObservabilityLogger.logExecution({
            executionId,
            organizationId,
            branchId,
            provider: providerResponse.provider,
            model: providerResponse.model,
            latencyMs: providerResponse.latencyMs,
            promptTokens: providerResponse.promptTokens,
            completionTokens: providerResponse.completionTokens,
            retries,
            fallbackUsed,
            memoryRetrievalMs,
            memoriesUsed,
            totalProcessingMs,
            status: 'success',
        });

        return new ExecutionResult({
            success: true,
            content: normalizedContent,
            provider: providerResponse.provider,
            model: providerResponse.model,
            executionId,
            latencyMs: providerResponse.latencyMs,
            promptTokens: providerResponse.promptTokens,
            completionTokens: providerResponse.completionTokens,
            retries,
            fallbackUsed,
        });
    },

    /**
     * Execute audio transcription through the runtime.
     * Only attempted if the active provider supports it.
     *
     * @param {object} params
     * @param {Buffer} params.audioBuffer
     * @param {string} params.extension
     * @returns {Promise<string|null>}
     */
    async transcribe(params) {
        const { audioBuffer, extension } = params;
        const provider = ProviderRegistry.getActive();

        if (!provider.supportsTranscription()) {
            ObservabilityLogger.warn(`[Runtime] Active provider "${provider.getName()}" does not support transcription.`);
            return null;
        }

        try {
            return await provider.transcribe({ audioBuffer, extension });
        } catch (err) {
            ObservabilityLogger.error(`[Runtime] Transcription failed: ${err.message}`, err);
            return null;
        }
    },

    /**
     * Normalize the raw LLM response into a guaranteed-safe structure.
     * Validates all fields, applies defaults, ensures type safety.
     *
     * @param {object} raw - Parsed JSON from provider
     * @returns {object} Normalized structured output
     */
    _normalizeResponse(raw) {
        if (!raw || typeof raw !== 'object') {
            raw = {};
        }

        const validSentiments = ['positive', 'neutral', 'negative'];
        const validEmotions = ['happy', 'satisfied', 'neutral', 'frustrated', 'angry', 'disappointed'];
        const validPriorities = AI_CONFIG.recommendations.priorities;
        const validUrgencies = ['immediate', 'within_24h', 'within_week', 'informational'];
        const validRiskLevels = ['low', 'medium', 'high', 'critical'];

        const sentiment = validSentiments.includes(String(raw.sentiment || '').toLowerCase())
            ? String(raw.sentiment).toLowerCase()
            : 'neutral';

        const emotion = validEmotions.includes(String(raw.emotion || '').toLowerCase())
            ? String(raw.emotion).toLowerCase()
            : 'neutral';

        const score = Math.min(100, Math.max(0, Number(raw.score) || 50));
        const confidence = Math.min(1, Math.max(0, Number(raw.confidence) || 0.5));

        const priority = validPriorities.includes(String(raw.priority || '').toLowerCase())
            ? String(raw.priority).toLowerCase()
            : 'medium';

        const urgency = validUrgencies.includes(String(raw.urgency || '').toLowerCase())
            ? String(raw.urgency).toLowerCase()
            : 'within_week';

        const riskLevel = validRiskLevels.includes(String(raw.riskLevel || '').toLowerCase())
            ? String(raw.riskLevel).toLowerCase()
            : 'low';

        return {
            summary: String(raw.summary || '').slice(0, 500) || 'No summary generated.',
            sentiment,
            emotion,
            score,
            topics: Array.isArray(raw.topics)
                ? raw.topics.map(t => String(t).slice(0, 50)).slice(0, 10)
                : [],
            priority,
            urgency,
            recommendation: String(raw.recommendation || '').slice(0, 500) || 'No recommendation generated.',
            immediateActions: Array.isArray(raw.immediateActions)
                ? raw.immediateActions.map(a => String(a).slice(0, 200)).slice(0, 5)
                : [],
            shortTermActions: Array.isArray(raw.shortTermActions)
                ? raw.shortTermActions.map(a => String(a).slice(0, 200)).slice(0, 5)
                : [],
            longTermImprovements: Array.isArray(raw.longTermImprovements)
                ? raw.longTermImprovements.map(a => String(a).slice(0, 200)).slice(0, 5)
                : [],
            confidence,
            detectedLanguage: String(raw.detectedLanguage || 'en').slice(0, 10),
            businessCategory: String(raw.businessCategory || 'general').slice(0, 100),
            riskLevel,
            businessImpact: String(raw.businessImpact || '').slice(0, 300),
            recurringPattern: raw.recurringPattern === true || raw.recurringPattern === 'true',
            memoryContextUsed: raw.memoryContextUsed === true || raw.memoryContextUsed === 'true',
        };
    },
};

/**
 * KlyvoraAI — Customer Intelligence Agent
 * ──────────────────────────────────────────
 * The central brain of KlyvoraAI.
 *
 * This is the ONLY entry point for all AI operations in the platform.
 * Every controller communicates through this agent.
 * The agent never exposes provider details, memory internals, or runtime details
 * to the outside world.
 *
 * Pipeline:
 *   Controller Request
 *   ↓
 *   Input Validation
 *   ↓
 *   Organization Context Verification (security)
 *   ↓
 *   Transcription (if voice)
 *   ↓
 *   Context Builder (Memory Retrieval + Industry Detection)
 *   ↓
 *   Prompt Builder (System + User Prompts)
 *   ↓
 *   Enterprise Runtime (cascadeflow)
 *   ↓
 *   Recommendation Engine
 *   ↓
 *   Memory Update (Organizational Knowledge)
 *   ↓
 *   Structured Response to Controller
 *
 * Future extension points (no redesign needed):
 *   - Multi-agent execution (parallel specialized agents)
 *   - Operations Agent
 *   - Risk Detection Agent
 *   - Executive Insights Agent
 *   - Notification Agent
 *   - Branch Performance Agent
 */

import { ContextBuilder } from '../context/ContextBuilder.js';
import { PromptBuilder } from '../prompts/PromptBuilder.js';
import { EnterpriseRuntime } from '../runtime/EnterpriseRuntime.js';
import { RecommendationEngine } from '../recommendations/RecommendationEngine.js';
import { ObservabilityLogger } from '../observability/ObservabilityLogger.js';

export const CustomerIntelligenceAgent = {

    /**
     * Primary execution: Analyze customer feedback.
     *
     * All voice, text, and QR-based feedback flows through this single method.
     *
     * @param {object} params
     * @param {string} params.feedbackText - The feedback content (pre-transcribed or text)
     * @param {string} [params.audioBuffer] - Raw audio buffer (if voice)
     * @param {string} [params.audioExtension] - Audio file extension (webm, mp4, ogg)
     * @param {string} params.organizationId - Firebase business ID (required for security)
     * @param {string} params.organizationName - Business display name
     * @param {string} [params.branchId]
     * @param {string} [params.branchName]
     * @param {string} [params.source] - voice|text|link|qr
     * @param {string} [params.customerContact]
     * @param {object} [params.template] - Kiosk configuration from Firestore
     * @param {string} [params.industry]
     * @returns {Promise<AgentResponse>}
     */
    async analyzeFeedback(params) {
        const agentStart = Date.now();
        const executionId = ObservabilityLogger.generateExecutionId();

        const {
            feedbackText: rawFeedbackText,
            audioBuffer = null,
            audioExtension = 'webm',
            organizationId,
            organizationName = 'Unknown Organization',
            branchId = null,
            branchName = null,
            source = 'unknown',
            customerContact = null,
            template = null,
            industry = null,
        } = params;

        // ── Security: Organization Context Validation ─────────────────────────────
        if (!organizationId) {
            ObservabilityLogger.warn('[Agent] analyzeFeedback() called without organizationId — rejected.');
            return this._errorResponse('Organization context is required for AI analysis.', executionId);
        }

        ObservabilityLogger.info(`[Agent] Starting analysis — ExecutionID: ${executionId} | Org: ${organizationId} | Branch: ${branchId || '-'} | Source: ${source}`);

        // ── Step 1: Audio Transcription (if voice input) ──────────────────────────
        let feedbackText = rawFeedbackText || '';

        if (audioBuffer) {
            try {
                const transcribed = await EnterpriseRuntime.transcribe({
                    audioBuffer,
                    extension: audioExtension,
                });

                if (transcribed && transcribed.trim()) {
                    feedbackText = transcribed;
                    ObservabilityLogger.info(`[Agent] Audio transcribed successfully: "${feedbackText.slice(0, 80)}..."`);
                }
            } catch (transcriptionErr) {
                ObservabilityLogger.warn(`[Agent] Transcription failed — falling back to provided text: ${transcriptionErr.message}`);
            }
        }

        // ── Early Exit: Insufficient Content ─────────────────────────────────────
        const trimmedText = feedbackText.trim();
        if (!trimmedText || trimmedText === 'No clear audio transcribed.') {
            return {
                success: true,
                text: 'No clear audio transcribed.',
                sentiment: 'neutral',
                emotion: 'neutral',
                score: 20,
                topics: [],
                summary: 'No clear feedback was captured.',
                recommendation: null,
                executionId,
                source,
                _meta: { earlyExit: true },
            };
        }

        // ── Step 2: Build AI Context (Memory + Industry + Org) ───────────────────
        const context = await ContextBuilder.build({
            organizationId,
            organizationName,
            branchId,
            branchName,
            feedbackText: trimmedText,
            source,
            customerContact,
            template,
            industry,
        });

        // ── Step 3: Build Prompts ─────────────────────────────────────────────────
        const systemPrompt = PromptBuilder.buildSystemPrompt({
            organizationName,
            branchName,
            industry: context.industry,
            relevantMemories: context.relevantMemories,
            template,
            detectedLanguage: context.detectedLanguage,
        });

        const userPrompt = PromptBuilder.buildUserPrompt({
            feedbackText: trimmedText,
            source,
            customerContact,
        });

        // ── Step 4: Execute via Enterprise Runtime (cascadeflow) ──────────────────
        const executionResult = await EnterpriseRuntime.execute({
            systemPrompt,
            userPrompt,
            organizationId,
            branchId,
            memoryRetrievalMs: context.memoryRetrievalMs,
            memoriesUsed: context.memoriesFound,
        });

        if (!executionResult.success) {
            return this._errorResponse(
                executionResult.error || 'AI analysis failed. Please try again.',
                executionId
            );
        }

        // ── Step 5: Generate Recommendations ─────────────────────────────────────
        const { recommendation, recommendationMs } = await RecommendationEngine.generate({
            analysisResult: executionResult.content,
            context,
            executionId,
            feedbackText: trimmedText,
        });

        const totalMs = Date.now() - agentStart;

        // ── Step 6: Compose Final Agent Response ──────────────────────────────────
        /** @type {AgentResponse} */
        const agentResponse = {
            success: true,

            // Core feedback analysis (backward-compatible with existing frontend)
            text: trimmedText.slice(0, 1999),
            sentiment: executionResult.content.sentiment,
            emotion: executionResult.content.emotion,
            score: executionResult.content.score,
            topics: executionResult.content.topics,

            // Extended intelligence
            summary: executionResult.content.summary,
            priority: executionResult.content.priority,
            urgency: executionResult.content.urgency,
            riskLevel: executionResult.content.riskLevel,
            businessImpact: executionResult.content.businessImpact,
            detectedLanguage: executionResult.content.detectedLanguage,
            confidence: executionResult.content.confidence,
            recurringPattern: executionResult.content.recurringPattern,
            memoryContextUsed: executionResult.content.memoryContextUsed,

            // Action plan
            recommendation: recommendation,
            immediateActions: executionResult.content.immediateActions,
            shortTermActions: executionResult.content.shortTermActions,
            longTermImprovements: executionResult.content.longTermImprovements,

            // Execution metadata (for observability / future dashboard)
            _meta: {
                executionId,
                provider: executionResult.provider,
                model: executionResult.model,
                latencyMs: executionResult.latencyMs,
                totalProcessingMs: totalMs,
                recommendationMs,
                memoryRetrievalMs: context.memoryRetrievalMs,
                memoriesUsed: context.memoriesFound,
                retries: executionResult.retries,
                fallbackUsed: executionResult.fallbackUsed,
                promptTokens: executionResult.promptTokens,
                completionTokens: executionResult.completionTokens,
                organizationId,
                branchId,
            },
        };

        ObservabilityLogger.info(
            `[Agent] Analysis complete — ExecutionID: ${executionId} | ` +
            `Sentiment: ${agentResponse.sentiment} | Score: ${agentResponse.score} | ` +
            `Risk: ${agentResponse.riskLevel} | Recurring: ${agentResponse.recurringPattern} | ` +
            `Total: ${totalMs}ms`
        );

        return agentResponse;
    },

    /**
     * Generate organizational intelligence report.
     * Used by analytics endpoints.
     *
     * @param {object} params
     * @param {string} params.organizationId
     * @param {object[]} params.feedbackList
     * @returns {Promise<object>}
     */
    async getOrganizationalIntelligence(params) {
        const { organizationId, feedbackList } = params;

        if (!organizationId) {
            return this._errorResponse('Organization context is required.', 'intel_req');
        }

        return RecommendationEngine.generateOrganizationalIntelligence(feedbackList, organizationId);
    },

    /**
     * Internal error response factory.
     * @param {string} message
     * @param {string} executionId
     * @returns {AgentResponse}
     */
    _errorResponse(message, executionId) {
        return {
            success: false,
            text: '',
            sentiment: 'neutral',
            emotion: 'neutral',
            score: 50,
            topics: [],
            summary: null,
            recommendation: null,
            error: message,
            _meta: { executionId, error: message },
        };
    },
};

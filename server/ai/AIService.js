/**
 * KlyvoraAI — AI Service Layer
 * ───────────────────────────────
 * Thin orchestration layer between Express controllers and the Agent.
 * Controllers call AIService. AIService calls the Agent.
 * No controller ever imports the Agent directly.
 *
 * This layer handles:
 *   - Input normalization before reaching the Agent
 *   - Base64 audio decoding
 *   - Error boundary (translates Agent errors to HTTP-safe responses)
 *   - Response formatting for API consumers
 */

import { CustomerIntelligenceAgent } from './agent/CustomerIntelligenceAgent.js';
import { ObservabilityLogger } from './observability/ObservabilityLogger.js';

export const AIService = {

    /**
     * Process a feedback submission through the full AI pipeline.
     *
     * @param {object} input
     * @param {string} [input.text] - Pre-captured text transcript
     * @param {string} [input.audioBase64] - Base64-encoded audio with extension prefix
     * @param {string} input.organizationId - Firebase business ID
     * @param {string} [input.organizationName]
     * @param {string} [input.branchId]
     * @param {string} [input.branchName]
     * @param {string} [input.source]
     * @param {string} [input.customerContact]
     * @param {object} [input.template]
     * @param {string} [input.industry]
     * @returns {Promise<object>} Structured agent response
     */
    async analyzeFeedback(input) {
        const {
            text: rawText,
            audioBase64,
            organizationId,
            organizationName = 'Unknown Organization',
            branchId = null,
            branchName = null,
            source = 'link',
            customerContact = null,
            template = null,
            industry = null,
        } = input;

        // Decode audio if provided
        let audioBuffer = null;
        let audioExtension = 'webm';

        if (audioBase64) {
            try {
                const parts = audioBase64.split('|');
                let pureBase64 = audioBase64;

                if (parts.length > 1) {
                    audioExtension = parts[0];
                    pureBase64 = parts[1];
                }

                audioBuffer = Buffer.from(pureBase64, 'base64');
            } catch (decodeErr) {
                ObservabilityLogger.warn(`[AIService] Audio base64 decode failed: ${decodeErr.message}`);
            }
        }

        const feedbackText = rawText || 'No clear audio transcribed.';

        // Delegate entirely to the Customer Intelligence Agent
        const agentResponse = await CustomerIntelligenceAgent.analyzeFeedback({
            feedbackText,
            audioBuffer,
            audioExtension,
            organizationId,
            organizationName,
            branchId,
            branchName,
            source,
            customerContact,
            template,
            industry,
        });

        return agentResponse;
    },

    /**
     * Get organizational intelligence for analytics.
     *
     * @param {string} organizationId
     * @param {object[]} feedbackList
     * @returns {Promise<object>}
     */
    async getOrganizationalIntelligence(organizationId, feedbackList) {
        return CustomerIntelligenceAgent.getOrganizationalIntelligence({
            organizationId,
            feedbackList,
        });
    },

    /**
     * Get observability statistics.
     * @returns {object}
     */
    getObservabilityStats() {
        return {
            executions: ObservabilityLogger.getStats(),
            recentExecutions: ObservabilityLogger.getRecentExecutions(10),
        };
    },
};

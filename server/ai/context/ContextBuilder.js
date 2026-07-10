/**
 * KlyvoraAI — Context Builder
 * ─────────────────────────────
 * Assembles all available organizational context before AI execution.
 * Takes raw inputs (orgId, branchId, feedback, template, etc.)
 * and produces a single, clean context object for the Prompt Builder.
 *
 * Flow:
 *   Agent → ContextBuilder → MemoryAdapter → PromptBuilder → Runtime
 *
 * Never concatenate strings directly. Always build structured context.
 */

import { MemoryAdapter } from '../memory/MemoryAdapter.js';

// Industry detection from known topic keywords
const INDUSTRY_KEYWORDS = {
    restaurant: ['food', 'meal', 'taste', 'service', 'waiter', 'kitchen', 'menu', 'chef', 'dining', 'restaurant', 'lunch', 'dinner', 'breakfast', 'drinks'],
    retail: ['price', 'product', 'stock', 'checkout', 'store', 'shopping', 'cashier', 'return', 'refund', 'item'],
    healthcare: ['doctor', 'nurse', 'appointment', 'treatment', 'hospital', 'clinic', 'medicine', 'patient', 'care'],
    hospitality: ['room', 'hotel', 'check-in', 'check-out', 'bed', 'housekeeping', 'staff', 'amenities', 'pool'],
    education: ['teacher', 'class', 'course', 'student', 'lecturer', 'campus', 'library', 'exam', 'study'],
    transportation: ['driver', 'bus', 'route', 'delay', 'ticket', 'seat', 'train', 'flight', 'luggage'],
    banking: ['transaction', 'account', 'loan', 'interest', 'branch', 'atm', 'card', 'bank', 'payment'],
};

/**
 * Detects industry from text content.
 * @param {string} text
 * @returns {string}
 */
function detectIndustry(text) {
    const lower = text.toLowerCase();
    let bestMatch = 'general';
    let bestScore = 0;

    for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
        const score = keywords.filter(kw => lower.includes(kw)).length;
        if (score > bestScore) {
            bestScore = score;
            bestMatch = industry;
        }
    }

    return bestMatch;
}

export const ContextBuilder = {

    /**
     * Builds a complete, structured AI context.
     *
     * @param {object} params
     * @param {string} params.organizationId - Firebase business ID (required)
     * @param {string} params.organizationName - Business name
     * @param {string} [params.branchId]
     * @param {string} [params.branchName]
     * @param {string} params.feedbackText - The feedback content
     * @param {string} [params.source] - voice|text|link|qr
     * @param {string} [params.customerContact]
     * @param {object} [params.template] - Kiosk configuration
     * @param {string} [params.industry] - Override auto-detected industry
     * @param {string} [params.detectedLanguage]
     * @returns {Promise<AIContext>}
     */
    async build(params) {
        const {
            organizationId,
            organizationName = 'Unknown Organization',
            branchId = null,
            branchName = null,
            feedbackText = '',
            source = 'unknown',
            customerContact = null,
            template = null,
            industry: industryOverride = null,
            detectedLanguage = 'en',
        } = params;

        // Auto-detect industry if not provided
        const industry = industryOverride || detectIndustry(feedbackText);

        // Retrieve relevant organizational memories
        const memoryRetrievalStart = Date.now();
        const relevantMemories = await MemoryAdapter.retrieve({
            organizationId,
            query: feedbackText,
            branchId,
            limit: 5,
        });
        const memoryRetrievalMs = Date.now() - memoryRetrievalStart;

        /** @type {AIContext} */
        const context = {
            // Org context
            organizationId,
            organizationName,
            branchId,
            branchName,
            industry,

            // Feedback context
            feedbackText,
            source,
            customerContact,
            detectedLanguage,

            // Template context
            template,

            // Memory context
            relevantMemories,
            memoryRetrievalMs,
            memoriesFound: relevantMemories.length,
        };

        return context;
    },
};

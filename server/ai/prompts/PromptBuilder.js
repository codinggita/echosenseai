/**
 * KlyvoraAI — Prompt Builder
 * ───────────────────────────
 * Assembles all context into a structured prompt.
 * No prompts are hardcoded in controllers or agents.
 * Everything is composed here from structured context objects.
 *
 * This is the single source of truth for what the LLM receives.
 */

import { AI_CONFIG } from '../config/aiConfig.js';

export const PromptBuilder = {

    /**
     * Build the complete system prompt for the Customer Intelligence Agent.
     * Incorporates all available context: org, branch, industry, templates,
     * retrieved memories, and business configuration.
     *
     * @param {object} context
     * @param {string} context.organizationName
     * @param {string} [context.branchName]
     * @param {string} [context.industry]
     * @param {string} [context.businessType]
     * @param {object[]} [context.relevantMemories] - Retrieved org memories
     * @param {object} [context.template] - Kiosk/feedback template config
     * @param {string} [context.detectedLanguage]
     * @returns {string} Complete system prompt
     */
    buildSystemPrompt(context = {}) {
        const {
            organizationName = 'this organization',
            branchName = null,
            industry = 'general business',
            businessType = null,
            relevantMemories = [],
            template = null,
            detectedLanguage = null,
        } = context;

        const sections = [];

        // ── Role Definition ──────────────────────────────────────────────────────
        sections.push(`You are the Customer Intelligence Agent for ${organizationName}${branchName ? ` — ${branchName} branch` : ''}.`);
        sections.push(`You operate as an enterprise-grade AI analyst specialized in ${industry} customer experience intelligence.`);
        sections.push(`Your role is to extract deep business insights, detect patterns, assess risk, and generate actionable recommendations.`);

        // ── Business Context ─────────────────────────────────────────────────────
        if (businessType) {
            sections.push(`\nBUSINESS CONTEXT: This is a ${businessType} business operating in the ${industry} industry.`);
        }

        // ── Template Context ─────────────────────────────────────────────────────
        if (template && (template.kioskTitle || template.kioskMessage)) {
            sections.push(`\nFEEDBACK CHANNEL CONTEXT:`);
            if (template.kioskTitle) sections.push(`- Kiosk Title: "${template.kioskTitle}"`);
            if (template.kioskMessage) sections.push(`- Customer Prompt: "${template.kioskMessage}"`);
        }

        // ── Organizational Memory Context ────────────────────────────────────────
        if (relevantMemories.length > 0) {
            sections.push(`\nORGANIZATIONAL KNOWLEDGE (${relevantMemories.length} relevant past insights):`);
            sections.push(`This organization has encountered similar feedback before. Use this knowledge to identify patterns and improve recommendations:`);

            relevantMemories.forEach((memory, idx) => {
                sections.push(`\n[Memory ${idx + 1}] Category: ${memory.category} | Sentiment: ${memory.sentiment} | Priority: ${memory.priority}`);
                sections.push(`  Summary: ${memory.summary}`);
                if (memory.recommendation) {
                    sections.push(`  Past Recommendation: ${memory.recommendation}`);
                }
                if (memory.topics && memory.topics.length > 0) {
                    sections.push(`  Related Topics: ${memory.topics.join(', ')}`);
                }
                if (memory.reinforcementCount > 1) {
                    sections.push(`  ⚠ Recurring Pattern: This issue has appeared ${memory.reinforcementCount} times.`);
                }
            });
        } else {
            sections.push(`\nORGANIZATIONAL KNOWLEDGE: No prior relevant patterns detected for this feedback context.`);
        }

        // ── Language Instruction ─────────────────────────────────────────────────
        if (detectedLanguage && detectedLanguage !== 'en') {
            sections.push(`\nLANGUAGE: The customer provided feedback in a non-English language (detected: ${detectedLanguage}). Analyze in the original language context, but respond in English.`);
        }

        // ── Analysis Rules ───────────────────────────────────────────────────────
        sections.push(`\nANALYSIS RULES:`);
        sections.push(`1. Be objective and precise. Do NOT assume negative intent from ambiguous or test phrases.`);
        sections.push(`2. If feedback is a test, greeting, or very short with no clear sentiment, classify as "neutral".`);
        sections.push(`3. Score should reflect genuine customer experience: 0=extreme negative, 50=neutral, 100=extreme positive.`);
        sections.push(`4. Topics must be specific and actionable (e.g., "slow service", "rude staff", "dirty restrooms" — not generic like "experience").`);
        sections.push(`5. Recommendations must be concrete actions, not generic advice.`);
        sections.push(`6. Consider organizational memory when assessing priority and urgency.`);
        sections.push(`7. Detect business category based on topics and context.`);
        sections.push(`8. Risk level: "low" (minor issue), "medium" (recurring issue), "high" (brand/safety risk), "critical" (immediate escalation needed).`);

        // ── Response Format ──────────────────────────────────────────────────────
        const validSentiments = ['positive', 'neutral', 'negative'];
        const validEmotions = ['happy', 'satisfied', 'neutral', 'frustrated', 'angry', 'disappointed'];
        const validPriorities = AI_CONFIG.recommendations.priorities;
        const validRiskLevels = ['low', 'medium', 'high', 'critical'];

        sections.push(`\nCRITICAL: Respond ONLY with valid JSON matching this EXACT structure:`);
        sections.push(JSON.stringify({
            summary: "Brief 1-2 sentence summary of the customer's core message",
            sentiment: `One of: ${validSentiments.join(', ')}`,
            emotion: `One of: ${validEmotions.join(', ')}`,
            score: 'Integer 0-100 (0=extreme negative, 50=neutral, 100=extreme positive)',
            topics: ['array', 'of', 'specific', 'actionable', 'topics'],
            priority: `One of: ${validPriorities.join(', ')}`,
            urgency: 'One of: immediate, within_24h, within_week, informational',
            recommendation: 'Single most important actionable recommendation for management',
            immediateActions: ['action 1', 'action 2'],
            shortTermActions: ['action 1'],
            longTermImprovements: ['improvement 1'],
            confidence: 'Decimal 0-1 representing analysis confidence',
            detectedLanguage: 'ISO 639-1 language code (e.g. en, es, fr, hi)',
            businessCategory: 'Most relevant category from the recommendations config',
            riskLevel: `One of: ${validRiskLevels.join(', ')}`,
            businessImpact: 'Brief assessment of business impact',
            recurringPattern: 'true if organizational memory shows this is a known pattern, false otherwise',
            memoryContextUsed: 'true if organizational memory influenced this analysis, false otherwise',
        }, null, 2));

        return sections.join('\n');
    },

    /**
     * Build the user-facing part of the prompt (the actual feedback content).
     * @param {object} context
     * @param {string} context.feedbackText
     * @param {string} [context.source] - 'voice', 'text', 'link', 'qr'
     * @param {string} [context.customerContact]
     * @returns {string}
     */
    buildUserPrompt(context = {}) {
        const { feedbackText, source = 'unknown', customerContact = null } = context;

        const lines = [];
        lines.push(`Analyze the following customer feedback:`);
        lines.push(`\nFeedback Source: ${source}`);
        lines.push(`Feedback Text: "${feedbackText}"`);

        if (customerContact) {
            lines.push(`Customer Contact Provided: Yes (follow-up possible)`);
        }

        return lines.join('\n');
    },
};

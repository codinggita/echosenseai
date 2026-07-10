/**
 * KlyvoraAI — Enterprise Recommendation Engine
 * ──────────────────────────────────────────────
 * Transforms raw AI analysis into structured, actionable business recommendations.
 *
 * Responsibilities:
 *   - Generate structured recommendation objects
 *   - Assign severity, priority, business impact
 *   - Detect recurring patterns via memory context
 *   - Produce immediate/short-term/long-term action plans
 *   - Categorize recommendations by business domain
 *   - Update organizational memory after generation
 *
 * Never called directly from controllers.
 * Always invoked by the Customer Intelligence Agent.
 *
 * Future extension points:
 *   - Operations Agent
 *   - Customer Experience Agent
 *   - Risk Detection Agent
 *   - Branch Performance Agent
 *   - Executive Insights Agent
 *   - Notification Agent
 */

import { AI_CONFIG } from '../config/aiConfig.js';
import { MemoryAdapter } from '../memory/MemoryAdapter.js';
import { ObservabilityLogger } from '../observability/ObservabilityLogger.js';
import { randomUUID } from 'crypto';

/**
 * Maps sentiment + riskLevel + priority to a recommendation category.
 * @param {string} businessCategory
 * @param {string[]} topics
 * @returns {string}
 */
function inferRecommendationCategory(businessCategory, topics = []) {
    const topicString = topics.join(' ').toLowerCase();
    const categories = AI_CONFIG.recommendations.categories;

    if (topicString.includes('staff') || topicString.includes('employee') || topicString.includes('waiter') || topicString.includes('worker')) {
        return categories.includes('staff_training') ? 'staff_training' : 'operational_improvement';
    }
    if (topicString.includes('clean') || topicString.includes('hygiene') || topicString.includes('dirty')) {
        return 'cleanliness';
    }
    if (topicString.includes('price') || topicString.includes('cost') || topicString.includes('expensive') || topicString.includes('cheap')) {
        return 'pricing';
    }
    if (topicString.includes('process') || topicString.includes('procedure') || topicString.includes('system') || topicString.includes('slow')) {
        return 'process_improvement';
    }
    if (topicString.includes('product') || topicString.includes('quality') || topicString.includes('food') || topicString.includes('item')) {
        return 'product_quality';
    }
    if (topicString.includes('urgent') || topicString.includes('critical') || topicString.includes('emergency')) {
        return 'escalation_required';
    }

    // Fallback to business category mapping
    const categoryMap = {
        restaurant: 'service_quality',
        retail: 'customer_experience',
        healthcare: 'management_attention',
        hospitality: 'customer_experience',
        general: 'operational_improvement',
    };

    return categoryMap[businessCategory] || 'operational_improvement';
}

export const RecommendationEngine = {

    /**
     * Generate a structured recommendation from AI analysis output.
     *
     * @param {object} params
     * @param {object} params.analysisResult - Normalized output from EnterpriseRuntime
     * @param {object} params.context - AIContext from ContextBuilder
     * @param {string} params.executionId - For traceability
     * @param {string} params.feedbackText - Original feedback
     * @returns {Promise<EnterpriseRecommendation>}
     */
    async generate(params) {
        const recStart = Date.now();
        const { analysisResult, context, executionId, feedbackText } = params;

        const {
            summary,
            sentiment,
            emotion,
            score,
            topics,
            priority,
            urgency,
            recommendation,
            immediateActions,
            shortTermActions,
            longTermImprovements,
            confidence,
            detectedLanguage,
            businessCategory,
            riskLevel,
            businessImpact,
            recurringPattern,
            memoryContextUsed,
        } = analysisResult;

        const {
            organizationId,
            organizationName,
            branchId,
            branchName,
            industry,
        } = context;

        // Determine recommendation category
        const recCategory = inferRecommendationCategory(businessCategory || industry, topics);

        // Determine severity from risk level and sentiment
        let severity = 'low';
        if (riskLevel === 'critical' || (sentiment === 'negative' && priority === 'critical')) {
            severity = 'critical';
        } else if (riskLevel === 'high' || (sentiment === 'negative' && score < 25)) {
            severity = 'high';
        } else if (riskLevel === 'medium' || (sentiment === 'negative' && score < 50)) {
            severity = 'medium';
        } else if (sentiment === 'positive') {
            severity = 'low';
        }

        // Build supporting evidence from memory context
        const supportingEvidence = [];
        if (recurringPattern) {
            supportingEvidence.push(`This issue is a recurring pattern in organizational memory.`);
        }
        if (memoryContextUsed) {
            supportingEvidence.push(`Analysis was informed by ${context.memoriesFound} relevant organizational knowledge entries.`);
        }
        if (topics.length > 0) {
            supportingEvidence.push(`Key topics detected: ${topics.join(', ')}.`);
        }

        /** @type {EnterpriseRecommendation} */
        const rec = {
            id: `rec_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
            executionId,
            organizationId,
            organizationName,
            branchId,
            branchName,

            // Core recommendation
            title: this._generateTitle(sentiment, riskLevel, topics),
            description: summary,
            recommendation,

            // Classification
            category: recCategory,
            severity,
            priority,
            urgency,

            // Impact
            estimatedBusinessImpact: businessImpact,
            estimatedCustomerImpact: this._assessCustomerImpact(sentiment, score, topics),

            // Action plan
            immediateActions: immediateActions.slice(0, AI_CONFIG.recommendations.maxRecommendations),
            shortTermActions,
            longTermImprovements,

            // Intelligence
            confidence,
            supportingEvidence,
            relatedTopics: topics,
            detectedLanguage,
            recurringPattern,
            memoryContextUsed,
            memoriesConsidered: context.memoriesFound || 0,

            // Metadata
            feedbackSentiment: sentiment,
            feedbackEmotion: emotion,
            feedbackScore: score,
            industry: industry || businessCategory,
            createdAt: new Date().toISOString(),

            // Future fields (architecture-ready):
            // validationStatus: 'pending',
            // outcomeTracking: null,
            // resolvedAt: null,
            // resolvedBy: null,
        };

        // ── Update Organizational Memory ─────────────────────────────────────────
        if (confidence >= AI_CONFIG.recommendations.minConfidence && organizationId) {
            try {
                await MemoryAdapter.store({
                    organizationId,
                    branchId,
                    category: recCategory,
                    summary: summary,
                    sentiment,
                    emotion,
                    topics,
                    recommendation,
                    businessImpact,
                    priority,
                    detectedLanguage,
                    confidence,
                    industry: industry || businessCategory,
                });
            } catch (memErr) {
                ObservabilityLogger.warn(`[RecommendationEngine] Memory store failed (non-critical): ${memErr.message}`);
            }
        }

        const recommendationMs = Date.now() - recStart;
        ObservabilityLogger.info(
            `[RecommendationEngine] Generated rec ${rec.id} in ${recommendationMs}ms | ` +
            `severity=${severity} priority=${priority} category=${recCategory} recurring=${recurringPattern}`
        );

        return { recommendation: rec, recommendationMs };
    },

    /**
     * Generate a human-readable recommendation title.
     * @param {string} sentiment
     * @param {string} riskLevel
     * @param {string[]} topics
     * @returns {string}
     */
    _generateTitle(sentiment, riskLevel, topics) {
        const mainTopic = topics[0] ? ` — ${topics[0].replace(/\b\w/g, l => l.toUpperCase())}` : '';

        if (riskLevel === 'critical') return `Critical Issue Requires Immediate Attention${mainTopic}`;
        if (riskLevel === 'high') return `High Priority Concern Identified${mainTopic}`;
        if (sentiment === 'negative') return `Customer Dissatisfaction Detected${mainTopic}`;
        if (sentiment === 'positive') return `Positive Experience Noted${mainTopic}`;
        return `Customer Feedback Analyzed${mainTopic}`;
    },

    /**
     * Assess customer impact from score and topics.
     * @param {string} sentiment
     * @param {number} score
     * @param {string[]} topics
     * @returns {string}
     */
    _assessCustomerImpact(sentiment, score, topics) {
        if (sentiment === 'negative' && score < 25) {
            return 'High customer impact — significant dissatisfaction detected. Risk of customer churn.';
        }
        if (sentiment === 'negative' && score < 50) {
            return 'Moderate customer impact — customer experience below expectations.';
        }
        if (sentiment === 'positive' && score > 75) {
            return 'Positive customer impact — consider amplifying what is working well.';
        }
        return 'Moderate impact — monitor for trend development.';
    },

    /**
     * Generate organizational intelligence summary across multiple feedbacks.
     * Prepared for Executive Insights layer (future sprint full implementation).
     *
     * @param {object[]} feedbackList - Array of feedback records from Firestore
     * @param {string} organizationId
     * @returns {object} Organizational intelligence
     */
    generateOrganizationalIntelligence(feedbackList, organizationId) {
        const now = new Date();
        const last24h = new Date(now - 24 * 60 * 60 * 1000);
        const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

        const todayFeedbacks = feedbackList.filter(f => {
            const created = f.createdAt?.toDate ? f.createdAt.toDate() : new Date(f.createdAt);
            return created >= last24h;
        });

        const weekFeedbacks = feedbackList.filter(f => {
            const created = f.createdAt?.toDate ? f.createdAt.toDate() : new Date(f.createdAt);
            return created >= last7d;
        });

        // Top recurring topics
        const topicFrequency = {};
        feedbackList.forEach(fb => {
            (fb.topics || []).forEach(topic => {
                const key = topic.toLowerCase();
                topicFrequency[key] = (topicFrequency[key] || 0) + 1;
            });
        });

        const recurringIssues = Object.entries(topicFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([topic, count]) => ({ topic, count }));

        // Sentiment trends
        const todayNeg = todayFeedbacks.filter(f => f.sentiment === 'negative').length;
        const todayPos = todayFeedbacks.filter(f => f.sentiment === 'positive').length;
        const weekAvgScore = weekFeedbacks.length > 0
            ? Math.round(weekFeedbacks.reduce((s, f) => s + (f.score || 50), 0) / weekFeedbacks.length)
            : 0;

        const memoryStats = MemoryAdapter.getStats(organizationId);

        return {
            organizationId,
            generatedAt: now.toISOString(),
            summary: {
                todayFeedbacks: todayFeedbacks.length,
                todayNegative: todayNeg,
                todayPositive: todayPos,
                weeklyAverageScore: weekAvgScore,
                totalFeedbacks: feedbackList.length,
            },
            recurringIssues,
            operationalRisks: recurringIssues.filter(i => i.count >= 3).map(i => ({
                issue: i.topic,
                frequency: i.count,
                riskLevel: i.count >= 10 ? 'critical' : i.count >= 5 ? 'high' : 'medium',
            })),
            memoryIntelligence: memoryStats,
            // Future: add sentiment evolution, branch comparisons, executive summary
        };
    },
};

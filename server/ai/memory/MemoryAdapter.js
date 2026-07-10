/**
 * KlyvoraAI — Organizational Memory Adapter (Hindsight)
 * ───────────────────────────────────────────────────────
 * This is the ONLY place that directly manages in-memory/persistent
 * organizational knowledge. The Customer Intelligence Agent retrieves
 * memory through this adapter — never directly.
 *
 * Architecture:
 *   Agent → MemoryAdapter → Storage Backend
 *
 * Current implementation: In-memory store with persistence-ready interface.
 * Future: Swap storage backend without changing Agent or any business logic.
 *
 * Memory is NOT conversation history.
 * Memory IS organizational knowledge that accumulates over time.
 */

import { AI_CONFIG } from '../config/aiConfig.js';
import { ObservabilityLogger } from '../observability/ObservabilityLogger.js';

// ─── Memory Store (in-process, future: Redis / Firestore / Vector DB) ────────
// Structure: Map<orgId, Map<memoryId, MemoryEntry>>
const _orgMemoryStore = new Map();

let _memoryIdCounter = 0;

/**
 * Generates a unique memory ID.
 */
function generateMemoryId() {
    return `mem_${Date.now()}_${++_memoryIdCounter}`;
}

/**
 * Normalizes a topic for keyword matching.
 */
function normalizeText(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
}

/**
 * Computes a simple keyword-based similarity score between two strings.
 * Score is in [0, 1]. Future: replace with semantic embeddings.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function keywordSimilarity(a, b) {
    const wordsA = new Set(normalizeText(a).split(/\s+/).filter(w => w.length > 2));
    const wordsB = new Set(normalizeText(b).split(/\s+/).filter(w => w.length > 2));
    if (wordsA.size === 0 || wordsB.size === 0) return 0;

    let intersectionCount = 0;
    for (const w of wordsA) {
        if (wordsB.has(w)) intersectionCount++;
    }

    const union = new Set([...wordsA, ...wordsB]).size;
    return intersectionCount / union; // Jaccard similarity
}

// ─── Public Adapter API ─────────────────────────────────────────────────────

export const MemoryAdapter = {

    /**
     * Store a new piece of organizational knowledge.
     *
     * @param {object} params
     * @param {string} params.organizationId - Firebase business ID
     * @param {string} [params.branchId]
     * @param {string} params.category - Memory category from config
     * @param {string} params.summary - What happened (not raw text)
     * @param {string} params.sentiment
     * @param {string} params.emotion
     * @param {string[]} params.topics
     * @param {string} params.recommendation - What was recommended
     * @param {string} params.businessImpact - Assessed impact
     * @param {string} params.priority - low|medium|high|critical
     * @param {string} params.detectedLanguage
     * @param {number} params.confidence - 0 to 1
     * @param {string} [params.industry]
     * @returns {Promise<string>} memoryId
     */
    async store(params) {
        if (!AI_CONFIG.memory.enabled) return null;

        const startTime = Date.now();

        const {
            organizationId,
            branchId = null,
            category = 'general',
            summary,
            sentiment,
            emotion,
            topics = [],
            recommendation,
            businessImpact = '',
            priority = 'medium',
            detectedLanguage = 'en',
            confidence = 0.7,
            industry = '',
        } = params;

        if (!organizationId || !summary) {
            ObservabilityLogger.warn('[MemoryAdapter] store() called without organizationId or summary — skipped.');
            return null;
        }

        // Initialize org memory store
        if (!_orgMemoryStore.has(organizationId)) {
            _orgMemoryStore.set(organizationId, new Map());
        }
        const orgMemory = _orgMemoryStore.get(organizationId);

        // Deduplication: skip storing if highly similar memory exists
        const searchQuery = `${summary} ${topics.join(' ')}`;
        for (const [, existing] of orgMemory) {
            const existingText = `${existing.summary} ${existing.topics.join(' ')}`;
            const sim = keywordSimilarity(searchQuery, existingText);
            if (sim >= AI_CONFIG.memory.deduplicationThreshold) {
                // Update importance rather than duplicating
                existing.reinforcementCount = (existing.reinforcementCount || 1) + 1;
                existing.lastUsed = new Date().toISOString();
                ObservabilityLogger.info('[MemoryAdapter] Deduplicated memory — reinforced existing entry.', {
                    memoryId: existing.id,
                    similarity: sim.toFixed(3),
                });
                return existing.id;
            }
        }

        // Enforce org memory cap
        if (orgMemory.size >= AI_CONFIG.memory.maxMemoriesPerOrg) {
            // Evict oldest, least-reinforced memory
            let oldestEntry = null;
            let oldestTime = Infinity;
            for (const [id, entry] of orgMemory) {
                const ts = new Date(entry.createdAt).getTime();
                if (ts < oldestTime) {
                    oldestTime = ts;
                    oldestEntry = id;
                }
            }
            if (oldestEntry) orgMemory.delete(oldestEntry);
        }

        const memoryId = generateMemoryId();
        const now = new Date().toISOString();

        /** @type {MemoryEntry} */
        const memory = {
            id: memoryId,
            organizationId,
            branchId,
            category,
            summary,
            sentiment,
            emotion,
            topics,
            recommendation,
            businessImpact,
            priority,
            detectedLanguage,
            confidence,
            industry,
            createdAt: now,
            lastUsed: now,
            reinforcementCount: 1,
            // Future fields (architecture-ready):
            // importance: null,
            // expiresAt: null,
            // validationStatus: 'pending',
            // outcomeTracking: null,
        };

        orgMemory.set(memoryId, memory);

        ObservabilityLogger.logMemoryOperation({
            operation: 'store',
            organizationId,
            branchId,
            memoryId,
            category,
            durationMs: Date.now() - startTime,
        });

        return memoryId;
    },

    /**
     * Retrieve semantically relevant memories for a given context.
     * Retrieval is scoped to the organization — cross-org isolation enforced.
     *
     * @param {object} params
     * @param {string} params.organizationId
     * @param {string} params.query - Current feedback/context to match against
     * @param {string[]} [params.topics] - Current feedback topics
     * @param {string} [params.category] - Optional category filter
     * @param {string} [params.branchId] - Prefer matching branch memories
     * @param {number} [params.limit] - Max memories to return
     * @returns {Promise<MemoryEntry[]>}
     */
    async retrieve(params) {
        if (!AI_CONFIG.memory.enabled) return [];

        const startTime = Date.now();

        const {
            organizationId,
            query = '',
            topics = [],
            category = null,
            branchId = null,
            limit = AI_CONFIG.memory.maxMemoriesPerRetrieval,
        } = params;

        if (!organizationId) return [];

        const orgMemory = _orgMemoryStore.get(organizationId);
        if (!orgMemory || orgMemory.size === 0) return [];

        const searchText = `${query} ${topics.join(' ')}`;
        const scored = [];

        for (const [, memory] of orgMemory) {
            // Skip if category filter doesn't match
            if (category && memory.category !== category) continue;

            const memoryText = `${memory.summary} ${memory.topics.join(' ')} ${memory.recommendation}`;
            let score = keywordSimilarity(searchText, memoryText);

            // Boost same-branch memories
            if (branchId && memory.branchId === branchId) score += 0.15;

            // Boost frequently reinforced memories
            if (memory.reinforcementCount > 1) score += Math.min(0.1, (memory.reinforcementCount - 1) * 0.02);

            if (score >= AI_CONFIG.memory.similarityThreshold) {
                scored.push({ memory, score });
            }
        }

        // Sort by relevance descending
        scored.sort((a, b) => b.score - a.score);

        const results = scored.slice(0, limit).map(({ memory }) => {
            // Update lastUsed timestamp
            memory.lastUsed = new Date().toISOString();
            return { ...memory };
        });

        ObservabilityLogger.logMemoryOperation({
            operation: 'retrieve',
            organizationId,
            branchId,
            retrieved: results.length,
            totalStored: orgMemory.size,
            durationMs: Date.now() - startTime,
        });

        return results;
    },

    /**
     * Returns memory statistics for an organization.
     * @param {string} organizationId
     * @returns {object}
     */
    getStats(organizationId) {
        const orgMemory = _orgMemoryStore.get(organizationId);
        if (!orgMemory) return { totalMemories: 0, categories: {} };

        const categories = {};
        for (const [, memory] of orgMemory) {
            categories[memory.category] = (categories[memory.category] || 0) + 1;
        }

        return {
            totalMemories: orgMemory.size,
            categories,
            maxCapacity: AI_CONFIG.memory.maxMemoriesPerOrg,
            capacityUsed: `${Math.round((orgMemory.size / AI_CONFIG.memory.maxMemoriesPerOrg) * 100)}%`,
        };
    },

    /**
     * Clears all memories for an organization (admin use only).
     * @param {string} organizationId
     */
    clearOrganization(organizationId) {
        _orgMemoryStore.delete(organizationId);
        ObservabilityLogger.info(`[MemoryAdapter] Cleared all memories for org: ${organizationId}`);
    },
};

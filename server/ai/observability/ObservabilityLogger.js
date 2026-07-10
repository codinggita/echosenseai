/**
 * KlyvoraAI — AI Observability Logger
 * ─────────────────────────────────────
 * Every AI execution and memory operation is logged here.
 * Future: pipe to monitoring service (DataDog, Sentry, custom dashboard).
 *
 * Architecture-ready for cost tracking, latency dashboards, and alerting.
 * No UI yet — pure structured logging.
 */

import { AI_CONFIG } from '../config/aiConfig.js';
import { randomUUID } from 'crypto';

// ─── Execution Log Store ────────────────────────────────────────────────────
// Future: persist to Firestore or time-series DB
const _executionLogs = [];
const MAX_LOG_ENTRIES = 1000;

export const ObservabilityLogger = {

    /**
     * Generates a unique execution ID for tracing.
     * @returns {string}
     */
    generateExecutionId() {
        return `exec_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    },

    /**
     * Log a complete AI execution event.
     * @param {object} event
     */
    logExecution(event) {
        if (!AI_CONFIG.observability.logExecutions) return;

        const {
            executionId,
            organizationId,
            branchId,
            provider,
            model,
            latencyMs,
            promptTokens = 0,
            completionTokens = 0,
            retries = 0,
            fallbackUsed = false,
            memoryRetrievalMs = 0,
            memoriesUsed = 0,
            recommendationMs = 0,
            totalProcessingMs = 0,
            status = 'success',
            error = null,
        } = event;

        const totalTokens = promptTokens + completionTokens;
        const costEstimateUsd = AI_CONFIG.observability.estimatedCostPerToken[provider]
            ? totalTokens * AI_CONFIG.observability.estimatedCostPerToken[provider]
            : 0;

        const logEntry = {
            executionId,
            timestamp: new Date().toISOString(),
            organizationId,
            branchId,
            provider,
            model,
            latencyMs,
            promptTokens,
            completionTokens,
            totalTokens,
            estimatedCostUsd: parseFloat(costEstimateUsd.toFixed(8)),
            retries,
            fallbackUsed,
            memoryRetrievalMs,
            memoriesUsed,
            recommendationMs,
            totalProcessingMs,
            status,
            error: error ? String(error).slice(0, 500) : null,
        };

        // Keep rolling log
        if (_executionLogs.length >= MAX_LOG_ENTRIES) {
            _executionLogs.shift();
        }
        _executionLogs.push(logEntry);

        // Console output
        const statusIcon = status === 'success' ? '✓' : '✗';
        console.log(
            `[AI:${statusIcon}] ${executionId} | Provider: ${provider}/${model} | ` +
            `Latency: ${latencyMs}ms | Tokens: ${totalTokens} | ` +
            `Memory: ${memoriesUsed} retrieved in ${memoryRetrievalMs}ms | ` +
            `Retries: ${retries} | Fallback: ${fallbackUsed} | ` +
            `Cost: $${logEntry.estimatedCostUsd}` +
            (error ? ` | ERROR: ${error}` : '')
        );
    },

    /**
     * Log a memory operation.
     * @param {object} event
     */
    logMemoryOperation(event) {
        if (!AI_CONFIG.observability.logMemoryOperations) return;

        const {
            operation,
            organizationId,
            branchId,
            memoryId,
            category,
            retrieved,
            totalStored,
            durationMs,
        } = event;

        if (operation === 'store') {
            console.log(`[Memory:store] org=${organizationId} branch=${branchId || '-'} id=${memoryId} category=${category} duration=${durationMs}ms`);
        } else if (operation === 'retrieve') {
            console.log(`[Memory:retrieve] org=${organizationId} branch=${branchId || '-'} retrieved=${retrieved}/${totalStored} duration=${durationMs}ms`);
        }
    },

    /**
     * General info log.
     * @param {string} message
     * @param {object} [meta]
     */
    info(message, meta = null) {
        if (meta) {
            console.log(`[KlyvoraAI] ${message}`, meta);
        } else {
            console.log(`[KlyvoraAI] ${message}`);
        }
    },

    /**
     * Warning log.
     * @param {string} message
     * @param {object} [meta]
     */
    warn(message, meta = null) {
        if (meta) {
            console.warn(`[KlyvoraAI:WARN] ${message}`, meta);
        } else {
            console.warn(`[KlyvoraAI:WARN] ${message}`);
        }
    },

    /**
     * Error log.
     * @param {string} message
     * @param {Error|object} [err]
     */
    error(message, err = null) {
        if (err) {
            console.error(`[KlyvoraAI:ERROR] ${message}`, err);
        } else {
            console.error(`[KlyvoraAI:ERROR] ${message}`);
        }
    },

    /**
     * Returns recent execution logs (for internal inspection / future dashboard).
     * @param {number} [limit=50]
     * @returns {object[]}
     */
    getRecentExecutions(limit = 50) {
        return _executionLogs.slice(-limit);
    },

    /**
     * Returns aggregated statistics.
     * @returns {object}
     */
    getStats() {
        if (_executionLogs.length === 0) {
            return { totalExecutions: 0, averageLatencyMs: 0, totalTokens: 0, totalCostUsd: 0 };
        }

        const successLogs = _executionLogs.filter(l => l.status === 'success');
        const avgLatency = successLogs.length
            ? Math.round(successLogs.reduce((s, l) => s + l.latencyMs, 0) / successLogs.length)
            : 0;
        const totalTokens = _executionLogs.reduce((s, l) => s + l.totalTokens, 0);
        const totalCost = _executionLogs.reduce((s, l) => s + (l.estimatedCostUsd || 0), 0);

        return {
            totalExecutions: _executionLogs.length,
            successfulExecutions: successLogs.length,
            failedExecutions: _executionLogs.length - successLogs.length,
            averageLatencyMs: avgLatency,
            totalTokens,
            totalEstimatedCostUsd: parseFloat(totalCost.toFixed(6)),
            totalFallbacks: _executionLogs.filter(l => l.fallbackUsed).length,
        };
    },
};

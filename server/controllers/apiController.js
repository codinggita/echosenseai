/**
 * KlyvoraAI — API Status Controller
 * ────────────────────────────────────
 * Provides platform health, status, and observability data.
 */

import { AIService } from '../ai/AIService.js';
import { MemoryAdapter } from '../ai/memory/MemoryAdapter.js';
import { AI_CONFIG } from '../ai/config/aiConfig.js';

export const getStatus = (req, res) => {
  res.json({
    status: 'operational',
    platform: 'KlyvoraAI Enterprise Intelligence Platform',
    version: '2.0.0',
    architecture: 'enterprise-ai-agent',
    timestamp: new Date().toISOString(),
    activeProvider: AI_CONFIG.activeProvider,
    registeredProviders: Object.keys(AI_CONFIG.providers),
    memoryEnabled: AI_CONFIG.memory.enabled,
  });
};

/**
 * GET /api/ai/stats — AI observability statistics.
 * Returns execution metrics, token usage, cost estimates.
 */
export const getAIStats = (req, res) => {
  try {
    const stats = AIService.getObservabilityStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/ai/memory/:organizationId — Organizational memory statistics.
 * Returns memory usage, categories, and capacity.
 */
export const getMemoryStats = (req, res) => {
  try {
    const { organizationId } = req.params;
    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId is required.' });
    }
    const stats = MemoryAdapter.getStats(organizationId);
    res.json({ organizationId, ...stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/ai/intelligence — Organizational intelligence report.
 * Accepts a list of feedback entries and returns org-level insights.
 */
export const getOrganizationalIntelligence = async (req, res) => {
  try {
    const { organizationId, feedbackList } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId is required.' });
    }

    const intelligence = await AIService.getOrganizationalIntelligence(
      organizationId,
      feedbackList || []
    );

    res.json(intelligence);
  } catch (err) {
    console.error('[getOrganizationalIntelligence] Error:', err);
    res.status(500).json({ error: err.message });
  }
};

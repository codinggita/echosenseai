/**
 * KlyvoraAI — Analyze Controller
 * ────────────────────────────────
 * HTTP handler for the /api/analyze endpoint.
 *
 * This controller does NOT contain any AI or business logic.
 * It only:
 *   1. Validates and marshals HTTP input
 *   2. Delegates to AIService
 *   3. Formats the HTTP response
 *
 * Architecture:
 *   HTTP Request → analyzeController → AIService → CustomerIntelligenceAgent → Runtime → LLM
 *
 * The controller never imports Groq, any LLM SDK, or memory systems.
 */

import { AIService } from '../ai/AIService.js';

export const analyzeFeedback = async (req, res) => {
  try {
    const {
      text,
      audioBase64,
      organizationId,
      organizationName,
      branchId,
      branchName,
      source,
      customerContact,
      template,
      industry,
    } = req.body;

    // Basic input validation
    if (!text && !audioBase64) {
      return res.status(400).json({
        error: 'Either text or audioBase64 must be provided.',
        code: 'MISSING_INPUT',
      });
    }

    // Delegate entirely to AI Service (which routes to Agent → Runtime → LLM)
    const result = await AIService.analyzeFeedback({
      text,
      audioBase64,
      // Organization context - required for memory isolation and security
      organizationId: organizationId || null,
      organizationName: organizationName || 'Unknown Organization',
      branchId: branchId || null,
      branchName: branchName || null,
      source: source || 'link',
      customerContact: customerContact || null,
      template: template || null,
      industry: industry || null,
    });

    if (!result.success && result.error) {
      return res.status(500).json({
        error: result.error,
        code: 'AI_ANALYSIS_FAILED',
      });
    }

    // Return structured response (backward-compatible with existing frontend)
    return res.json(result);

  } catch (error) {
    console.error('[analyzeController] Unhandled error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to analyze feedback.',
      code: 'INTERNAL_ERROR',
    });
  }
};

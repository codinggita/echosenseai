import express from 'express';
import { getStatus, getAIStats, getMemoryStats, getOrganizationalIntelligence } from '../controllers/apiController.js';
import { analyzeFeedback } from '../controllers/analyzeController.js';

const router = express.Router();

// ─── Platform Status ────────────────────────────────────────────────────────
router.get('/status', getStatus);

// ─── Core Intelligence Pipeline ─────────────────────────────────────────────
// All feedback (voice, text, QR) routes through this single endpoint.
// The Customer Intelligence Agent handles the full pipeline.
router.post('/analyze', analyzeFeedback);

// ─── Observability & Intelligence ───────────────────────────────────────────
// AI execution statistics (tokens, latency, cost estimates)
router.get('/ai/stats', getAIStats);

// Organizational memory statistics (per org, memory usage, categories)
router.get('/ai/memory/:organizationId', getMemoryStats);

// Organizational intelligence report (trends, risks, recurring issues)
router.post('/ai/intelligence', getOrganizationalIntelligence);

export default router;

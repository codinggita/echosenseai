/**
 * KlyvoraAI — Provider Registry
 * ───────────────────────────────
 * Central registry for all LLM providers.
 * Adding a new provider = register it here only.
 * No changes to business logic or runtime.
 */

import { AI_CONFIG } from '../config/aiConfig.js';
import { GroqProvider } from './GroqProvider.js';

// ─── Registry ──────────────────────────────────────────────────────────────

const _registry = new Map();
const _instances = new Map();

/**
 * Register a provider factory.
 * @param {string} name - Provider identifier
 * @param {Function} factory - Constructor or factory function
 */
function register(name, factory) {
    _registry.set(name, factory);
}

/**
 * Retrieve a provider instance (singleton per provider name).
 * @param {string} name
 * @returns {ProviderInterface}
 */
function get(name) {
    if (!_registry.has(name)) {
        throw new Error(
            `[ProviderRegistry] Provider "${name}" is not registered. ` +
            `Available providers: ${[..._registry.keys()].join(', ')}`
        );
    }

    if (!_instances.has(name)) {
        const Factory = _registry.get(name);
        _instances.set(name, new Factory());
    }

    return _instances.get(name);
}

/**
 * Returns the currently configured active provider instance.
 * @returns {ProviderInterface}
 */
function getActive() {
    return get(AI_CONFIG.activeProvider);
}

/**
 * Returns the fallback provider instance (if configured).
 * @returns {ProviderInterface|null}
 */
function getFallback() {
    const { fallbackProvider } = AI_CONFIG.runtime;
    if (!fallbackProvider || fallbackProvider === AI_CONFIG.activeProvider) return null;
    if (!_registry.has(fallbackProvider)) return null;
    return get(fallbackProvider);
}

/**
 * List all registered provider names.
 * @returns {string[]}
 */
function list() {
    return [..._registry.keys()];
}

// ─── Provider Registrations ─────────────────────────────────────────────────
// To add a new provider: import its class and register it here.

register('groq', GroqProvider);

// Future registrations (commented until implemented):
// register('openai', OpenAIProvider);
// register('gemini', GeminiProvider);
// register('claude', ClaudeProvider);
// register('openrouter', OpenRouterProvider);

export const ProviderRegistry = {
    register,
    get,
    getActive,
    getFallback,
    list,
};

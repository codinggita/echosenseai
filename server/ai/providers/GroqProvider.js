/**
 * KlyvoraAI — Groq Provider Adapter
 * ────────────────────────────────────
 * Implements ProviderInterface for Groq (Whisper + Llama).
 * This is the ONLY place in the codebase that imports the Groq SDK.
 */

import Groq from 'groq-sdk';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ProviderInterface, ProviderResponse } from './ProviderInterface.js';
import { AI_CONFIG, getProviderApiKey } from '../config/aiConfig.js';

export class GroqProvider extends ProviderInterface {
    constructor() {
        super('groq');
        this._client = null;
    }

    /**
     * Lazily initializes Groq client (reuse across requests).
     */
    _getClient() {
        if (!this._client) {
            const apiKey = getProviderApiKey('groq');
            this._client = new Groq({ apiKey });
        }
        return this._client;
    }

    /**
     * @override
     */
    async chat(request) {
        const {
            systemPrompt,
            userPrompt,
            model,
            temperature,
            maxTokens,
        } = request;

        const providerConfig = AI_CONFIG.providers.groq;
        const resolvedModel = model || providerConfig.defaultModel;
        const resolvedTemp = temperature ?? AI_CONFIG.runtime.temperature;
        const resolvedMaxTokens = maxTokens ?? AI_CONFIG.runtime.maxTokens;

        const startTime = Date.now();
        const client = this._getClient();

        const completion = await client.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            model: resolvedModel,
            temperature: resolvedTemp,
            max_tokens: resolvedMaxTokens,
            response_format: { type: 'json_object' },
        });

        const latencyMs = Date.now() - startTime;
        const rawContent = completion.choices[0]?.message?.content || '{}';

        let content;
        try {
            content = JSON.parse(rawContent);
        } catch {
            // If JSON parse fails, wrap in object for consistency
            content = { raw_text: rawContent };
        }

        return new ProviderResponse({
            content,
            model: resolvedModel,
            provider: 'groq',
            promptTokens: completion.usage?.prompt_tokens || 0,
            completionTokens: completion.usage?.completion_tokens || 0,
            latencyMs,
            raw: completion,
        });
    }

    /**
     * @override
     */
    async transcribe(request) {
        const { audioBuffer, extension, model } = request;
        const providerConfig = AI_CONFIG.providers.groq;
        const resolvedModel = model || providerConfig.transcriptionModel;

        const tempFilePath = path.join(os.tmpdir(), `klyvora-audio-${Date.now()}.${extension}`);

        try {
            fs.writeFileSync(tempFilePath, audioBuffer);
            const client = this._getClient();

            const transcription = await client.audio.transcriptions.create({
                file: fs.createReadStream(tempFilePath),
                model: resolvedModel,
            });

            return transcription.text;
        } finally {
            // Always clean up temp file
            try { fs.unlinkSync(tempFilePath); } catch { /* ignore cleanup errors */ }
        }
    }

    /**
     * @override
     */
    supportsTranscription() {
        return AI_CONFIG.providers.groq.supportsTranscription;
    }
}

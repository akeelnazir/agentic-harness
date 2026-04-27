import { LLMAdapter } from './llm-adapter.ts';
import { OpenAIAdapter } from './openai-adapter.ts';
import { AnthropicAdapter } from './anthropic-adapter.ts';
import {
  LLM_PROVIDER,
  OPENAI_API_KEY,
  ANTHROPIC_API_KEY,
  OPENROUTER_API_KEY,
  OPENAI_ORG_ID,
  OPENAI_PROJECT_ID,
} from '../config.ts';

/**
 * Factory for creating LLM adapters based on provider configuration
 */
export class AdapterFactory {
  static createAdapter(model: string): LLMAdapter {
    switch (LLM_PROVIDER) {
      case 'openai':
        return this.createOpenAIAdapter(model, OPENAI_API_KEY, 'https://api.openai.com/v1', OPENAI_ORG_ID, OPENAI_PROJECT_ID);

      case 'openrouter':
        return this.createOpenAIAdapter(model, OPENROUTER_API_KEY, 'https://openrouter.ai/api/v1');

      case 'anthropic':
        return this.createAnthropicAdapter(model, ANTHROPIC_API_KEY);

      case 'lmstudio':
      default:
        return this.createOpenAIAdapter(model, 'dummy-key-for-local', 'http://127.0.0.1:1234/v1');
    }
  }

  private static createOpenAIAdapter(
    model: string,
    apiKey: string | undefined,
    baseURL: string,
    organization?: string,
    project?: string
  ): OpenAIAdapter {
    if (!apiKey) {
      throw new Error(`API key is required for provider: ${LLM_PROVIDER}`);
    }
    return new OpenAIAdapter(model, apiKey, baseURL, organization, project);
  }

  private static createAnthropicAdapter(model: string, apiKey: string | undefined): AnthropicAdapter {
    if (!apiKey) {
      throw new Error(`API key is required for provider: ${LLM_PROVIDER}`);
    }
    return new AnthropicAdapter(model, apiKey);
  }
}

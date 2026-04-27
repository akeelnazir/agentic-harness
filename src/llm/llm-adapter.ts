import type { ChatCompletionMessageParam } from '../types/types.ts';

export interface LLMResponse {
  content: string;
  toolCalls: ToolCall[];
  stopReason: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface LLMTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * Abstract adapter for LLM providers
 * Defines the interface that all LLM provider implementations must follow
 */
export abstract class LLMAdapter {
  protected model: string;

  constructor(model: string) {
    this.model = model;
  }

  /**
   * Send a request to the LLM and get a response
   */
  abstract sendRequest(
    messages: ChatCompletionMessageParam[],
    systemPrompt: string,
    tools: LLMTool[]
  ): Promise<LLMResponse>;

  /**
   * Get the model name
   */
  getModel(): string {
    return this.model;
  }
}

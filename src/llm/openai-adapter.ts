import OpenAI from 'openai';
import { LLMAdapter, type LLMResponse, type LLMTool } from './llm-adapter.ts';
import type { ChatCompletionMessageParam } from '../types/types.ts';
import type { ChatCompletionTool } from '../types/types.ts';

/**
 * OpenAI adapter for LLM requests
 * Supports OpenAI API and OpenAI-compatible services (OpenRouter, LM Studio, etc.)
 */
export class OpenAIAdapter extends LLMAdapter {
  private client: OpenAI;

  constructor(model: string, apiKey: string, baseURL?: string, organization?: string, project?: string) {
    super(model);
    this.client = new OpenAI({
      apiKey,
      baseURL,
      organization,
      project,
    });
  }

  async sendRequest(
    messages: ChatCompletionMessageParam[],
    systemPrompt: string,
    tools: LLMTool[]
  ): Promise<LLMResponse> {
    // Add system prompt to messages if not already present
    const messagesWithSystem: ChatCompletionMessageParam[] = 
      messages[0]?.role === 'system' 
        ? messages 
        : [{ role: 'system', content: systemPrompt }, ...messages];

    // Convert tools to OpenAI format
    const openaiTools: ChatCompletionTool[] = tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));

    const requestParams: any = {
      model: this.model,
      messages: messagesWithSystem,
      parallel_tool_calls: true,
      temperature: 0.2,
      stream: false,
    };

    if (openaiTools.length > 0) {
      requestParams.tools = openaiTools;
    }

    const response = await this.client.chat.completions.create(requestParams);

    if (!response?.choices || response.choices.length === 0) {
      throw new Error('No choices returned from model');
    }

    const choice = response.choices[0]!;
    const message = choice.message;

    const toolCalls = (message.tool_calls || [])
      .filter((tc) => tc.type === 'function')
      .map((tc) => ({
        id: tc.id,
        name: (tc as any).function.name,
        arguments: (tc as any).function.arguments,
      }));

    return {
      content: message.content ?? '',
      toolCalls,
      stopReason: choice.finish_reason ?? 'unknown',
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
    };
  }
}

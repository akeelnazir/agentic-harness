import Anthropic from '@anthropic-ai/sdk';
import { LLMAdapter, type LLMResponse, type LLMTool } from './llm-adapter.ts';
import type { ChatCompletionMessageParam } from '../types/types.ts';

/**
 * Anthropic adapter for LLM requests
 * Handles Anthropic's Claude models with their specific message and tool formats
 */
export class AnthropicAdapter extends LLMAdapter {
  private client: Anthropic;

  constructor(model: string, apiKey: string) {
    super(model);
    this.client = new Anthropic({ apiKey });
  }

  async sendRequest(
    messages: ChatCompletionMessageParam[],
    systemPrompt: string,
    tools: LLMTool[]
  ): Promise<LLMResponse> {
    // Convert OpenAI-style messages to Anthropic format
    // Skip system message as Anthropic uses a separate system parameter
    const anthropicMessages = messages
      .filter((msg) => msg.role !== 'system')
      .map((msg) => {
        if (msg.role === 'tool') {
          // Convert tool messages to Anthropic format
          return {
            role: 'user' as const,
            content: [
              {
                type: 'tool_result' as const,
                tool_use_id: (msg as any).tool_call_id,
                content: msg.content,
              },
            ],
          };
        }
        if (msg.role === 'assistant') {
          // Build content blocks array for Anthropic format
          const contentBlocks: any[] = [];

          // Add text content if present
          if (msg.content) {
            contentBlocks.push({
              type: 'text',
              text: msg.content as string,
            });
          }

          // Convert OpenAI tool_calls to Anthropic tool_use blocks
          if ((msg as any).tool_calls) {
            for (const toolCall of (msg as any).tool_calls) {
              contentBlocks.push({
                type: 'tool_use',
                id: toolCall.id,
                name: toolCall.function.name,
                input: JSON.parse(toolCall.function.arguments),
              });
            }
          }

          return {
            role: 'assistant' as const,
            content: contentBlocks,
          };
        }
        return {
          role: msg.role as 'user' | 'assistant',
          content: msg.content as string,
        };
      });

    // Convert tools to Anthropic format
    const anthropicTools: Anthropic.Messages.Tool[] = tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema as Anthropic.Messages.Tool['input_schema'],
    }));

    const requestParams: any = {
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: anthropicMessages as Anthropic.Messages.MessageParam[],
    };

    if (anthropicTools.length > 0) {
      requestParams.tools = anthropicTools;
    }

    const response = await this.client.messages.create(requestParams);

    let finalText = '';
    const toolCalls: Array<{ id: string; name: string; arguments: string }> = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        finalText = block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: JSON.stringify(block.input),
        });
      }
    }

    return {
      content: finalText,
      toolCalls,
      stopReason: response.stop_reason ?? 'unknown',
      inputTokens: response.usage.input_tokens || 0,
      outputTokens: response.usage.output_tokens || 0,
    };
  }
}

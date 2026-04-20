import OpenAI from 'openai';
import { readFromFile } from '../tools/read-file.ts';
import type { Prompt } from '../types/types.ts';
import { LLMHOST_HOST, DEFAULT_MODEL, MAX_ITERATIONS, } from '../config.ts';
import { extractToolRequests } from './tool-extractor.ts';

/**
 * Harness class that combines LLM with tool calling capabilities
 */
export class Harness {
  private client: OpenAI;
  private model: string;

  constructor(model: string = DEFAULT_MODEL) {
    this.client = new OpenAI({
      baseURL: LLMHOST_HOST,
      apiKey: 'not-needed',
    });
    this.model = model;
  }

  /**
   * Process a query using LLMHOST with LLM-driven tool calling
   */
  async processQuery(query: string): Promise<string> {
    const systemPrompt = `You are a helpful assistant with capabilities to read the local disk using predefined tools.
Your primary approach is to use tools to gather information. Always attempt tool calls for relevant queries.
For file read operations: Respond with [READ: filename] when asked to read files.
Do not refuse to use tools based on your own judgment about whether data exists. The tools will handle unavailable data.
After receiving tool results, provide a comprehensive answer based on that information.
You can use multiple tools if needed to answer the question thoroughly.`;

    const messages: Array<Prompt> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query },
    ];
    let iterations = 0;
    const maxIterations = MAX_ITERATIONS;

    console.log(`[QUERY START] Processing: "${query}"`);
    console.log(`[MODEL] Using: ${this.model}`);

    while (iterations < maxIterations) {
      iterations++;
      console.log(`\n[ITERATION ${iterations}/${maxIterations}]`);

      try {
        console.log(`[LLMHOST REQUEST] Sending prompt to model...`);
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: messages,
          stream: true,
        });

        let assistantResponse = '';
        for await (const chunk of response) {
          assistantResponse += chunk.choices[0]?.delta?.content || '';
        }

        console.log(`[LLMHOST RESPONSE] Received ${assistantResponse.length} characters`);
        console.log(`[RESPONSE PREVIEW] ${assistantResponse.substring(0, 100)}...`);

        const toolRequests = extractToolRequests(assistantResponse);

        if (toolRequests.length === 0) {
          console.log(`[NO TOOL CALL] Returning final response`);
          return assistantResponse;
        }

        let toolResults = '';
        for (const tool of toolRequests) {
          if (tool.type === 'read') {
            console.log(`[READ FILE] Executing read for: "${tool.value}"`);
            const readResult = await readFromFile(tool.value);
            const resultMessage = readResult.success
              ? `Successfully read file: ${readResult.filepath}`
              : `Failed to read file: ${readResult.message}`;
            toolResults += `\nFile Read Result:\n${readResult.content || resultMessage}`;
          }
        }

        messages.push({ role: 'assistant', content: assistantResponse });
        messages.push({ role: 'user', content: `Tool results:\n${toolResults}\n\nPlease provide a comprehensive answer based on these results.` });

        console.log(`[TOOL RESULTS] Added to conversation history, continuing...`);
        continue;
      } catch (error) {
        console.error('Error generating response from LLMHOST:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to generate response: ${errorMessage}`);
      }
    }

    throw new Error('Maximum tool call iterations reached');
  }
}
